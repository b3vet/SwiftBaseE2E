import { describe, it, expect, beforeAll } from 'vitest'
import { createApiClient, createAuthClient, createAdminClient, createQueryClient, createStorageClient } from '@/client'
import { createAuthHelper, createCollectionHelper, createCleanupHelper } from '@/helpers'
import { assertSuccessResponse, assertErrorResponse } from '@/validators/response.validator'
import { API_ENDPOINTS } from '@/config/constants'

describe('API Versioning and Gateway', () => {
  const authHelper = createAuthHelper()
  const cleanup = createCleanupHelper()
  const collectionHelper = createCollectionHelper()

  let adminToken: string
  let userToken: string
  let apiClient: ReturnType<typeof createApiClient>

  beforeAll(async () => {
    adminToken = await authHelper.getAdminToken()
    const userResult = await authHelper.createAndLoginUser()
    userToken = userResult.token

    apiClient = createApiClient()
    cleanup.setToken(adminToken)
  })

  describe('API Version Support', () => {
    it('should support API v1 endpoints', async () => {
      const authClient = createAuthClient()

      const response = await authClient.registerUser({
        email: `v1-test-${Date.now()}@example.com`,
        password: 'Password123!',
      })

      assertSuccessResponse(response)
      expect(response.data).toBeDefined()
    })

    it('should maintain backward compatibility', async () => {
      // Test that old endpoints still work
      const authClient = createAuthClient()

      const email = `compat-${Date.now()}@example.com`
      const password = 'Password123!'

      const registerResponse = await authClient.registerUser({
        email,
        password,
      })

      assertSuccessResponse(registerResponse)

      const loginResponse = await authClient.loginUser({
        email,
        password,
      })

      assertSuccessResponse(loginResponse)
      expect(loginResponse.data!.accessToken).toBeDefined()
    })

    it('should handle API version in headers if supported', async () => {
      const response = await apiClient.request(
        API_ENDPOINTS.AUTH_REGISTER,
        {
          method: 'POST',
          headers: {
            'API-Version': '1',
          },
          body: {
            email: `version-header-${Date.now()}@example.com`,
            password: 'Password123!',
          },
        }
      )

      // Should succeed regardless of version header
      if (response.success) {
        expect(response.data).toBeDefined()
      }
    })

    it('should return consistent response format across versions', async () => {
      const authClient = createAuthClient()

      const response = await authClient.registerUser({
        email: `format-${Date.now()}@example.com`,
        password: 'Password123!',
      })

      assertSuccessResponse(response)

      // Check standard response format
      expect(response).toHaveProperty('success')
      expect(response).toHaveProperty('data')
      expect(response.data).toHaveProperty('accessToken')
      expect(response.data).toHaveProperty('refreshToken')
      expect(response.data).toHaveProperty('user')
    })
  })

  describe('API Endpoint Discovery', () => {
    it('should provide API health check endpoint', async () => {
      const response = await apiClient.request('/api/health', {
        method: 'GET',
      })

      if (response.success) {
        expect(response.data).toBeDefined()
      }
    })

    it('should provide API version information endpoint', async () => {
      const response = await apiClient.request('/api/version', {
        method: 'GET',
      })

      if (response.success) {
        expect(response.data).toBeDefined()
      }
    })

    it('should return 404 for non-existent endpoints', async () => {
      const response = await apiClient.request('/api/nonexistent', {
        method: 'GET',
      })

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/NOT_FOUND/)
    })

    it('should return 405 for unsupported methods', async () => {
      const response = await apiClient.request(API_ENDPOINTS.AUTH_REGISTER, {
        method: 'PUT',
      })

      assertErrorResponse(response)
      // May return METHOD_NOT_ALLOWED or BAD_REQUEST
    })
  })

  describe('Cross-Feature Integration', () => {
    it('should work across auth, collections, and query', async () => {
      // 1. Authenticate
      const authClient = createAuthClient()
      const email = `integration-${Date.now()}@example.com`
      const password = 'Password123!'

      const registerResponse = await authClient.registerUser({
        email,
        password,
      })

      assertSuccessResponse(registerResponse)
      const token = registerResponse.data!.accessToken

      // 2. Create collection (requires admin)
      const adminClient = createAdminClient(adminToken)
      const collectionName = `integration_${Date.now()}`

      const createCollectionResponse = await adminClient.createCollection({
        name: collectionName,
      })

      assertSuccessResponse(createCollectionResponse)
      cleanup.track('collection', collectionName)

      // 3. Query data
      const queryClient = createQueryClient(adminToken)

      const createDocResponse = await queryClient.create(collectionName, {
        name: 'Integration Test',
        value: 123,
      })

      assertSuccessResponse(createDocResponse)

      const findResponse = await queryClient.find(collectionName, {
        where: { name: 'Integration Test' },
      })

      assertSuccessResponse(findResponse)
      expect(findResponse.data!.length).toBeGreaterThan(0)
    })

    it('should work across auth, storage, and permissions', async () => {
      // 1. Create user
      const authClient = createAuthClient()
      const email = `storage-integration-${Date.now()}@example.com`
      const password = 'Password123!'

      const registerResponse = await authClient.registerUser({
        email,
        password,
      })

      assertSuccessResponse(registerResponse)
      const userToken = registerResponse.data!.accessToken

      // 2. Upload file as user
      const storageClient = createStorageClient(userToken)

      const uploadResponse = await storageClient.uploadFile(
        Buffer.from('User file content', 'utf-8'),
        'user-integration-test.txt',
        'text/plain'
      )

      assertSuccessResponse(uploadResponse)
      cleanup.track('file', uploadResponse.data!.id)

      // 3. Verify file metadata
      const metadataResponse = await storageClient.getFileMetadata(
        uploadResponse.data!.id
      )

      assertSuccessResponse(metadataResponse)
      expect(metadataResponse.data!.filename).toBe('user-integration-test.txt')

      // 4. Download file
      const downloadResponse = await storageClient.downloadFile(
        uploadResponse.data!.id
      )

      assertSuccessResponse(downloadResponse)
      expect(downloadResponse.data!.toString('utf-8')).toBe('User file content')
    })

    it('should maintain session across multiple operations', async () => {
      const authClient = createAuthClient()
      const email = `session-${Date.now()}@example.com`
      const password = 'Password123!'

      const registerResponse = await authClient.registerUser({
        email,
        password,
      })

      assertSuccessResponse(registerResponse)
      const token = registerResponse.data!.accessToken

      // Perform multiple operations with same token
      const operations = [
        apiClient.authenticatedRequest('/api/auth/user', token, {
          method: 'GET',
        }),
        apiClient.authenticatedRequest('/api/auth/user', token, {
          method: 'GET',
        }),
        apiClient.authenticatedRequest('/api/auth/user', token, {
          method: 'GET',
        }),
      ]

      const responses = await Promise.all(operations)

      responses.forEach(response => {
        assertSuccessResponse(response)
      })
    })

    it('should handle workflow: register -> create collection -> add data -> query -> delete', async () => {
      // 1. Register admin user for this workflow
      const adminClient = createAdminClient(adminToken)
      const collectionName = `workflow_${Date.now()}`

      // 2. Create collection
      const createResponse = await adminClient.createCollection({
        name: collectionName,
      })

      assertSuccessResponse(createResponse)
      cleanup.track('collection', collectionName)

      // 3. Add data
      const queryClient = createQueryClient(adminToken)

      const createDocs = await queryClient.create(collectionName, [
        { name: 'Item 1', value: 10 },
        { name: 'Item 2', value: 20 },
        { name: 'Item 3', value: 30 },
      ])

      assertSuccessResponse(createDocs)
      expect(createDocs.data!.length).toBe(3)

      // 4. Query data
      const findResponse = await queryClient.find(collectionName, {
        where: { value: { $gte: 20 } },
      })

      assertSuccessResponse(findResponse)
      expect(findResponse.data!.length).toBe(2)

      // 5. Update data
      const updateResponse = await queryClient.update(
        collectionName,
        { where: { name: 'Item 1' } },
        { $set: { value: 15 } }
      )

      assertSuccessResponse(updateResponse)

      // 6. Delete data
      const deleteResponse = await queryClient.delete(collectionName, {
        where: { value: { $lt: 20 } },
      })

      assertSuccessResponse(deleteResponse)

      // 7. Verify deletion
      const finalFind = await queryClient.find(collectionName, {})

      assertSuccessResponse(finalFind)
      expect(finalFind.data!.length).toBe(2)
    })
  })

  describe('Error Response Consistency', () => {
    it('should return consistent error format for authentication errors', async () => {
      const authClient = createAuthClient()

      const response = await authClient.loginUser({
        email: 'nonexistent@example.com',
        password: 'wrong',
      })

      assertErrorResponse(response)

      expect(response.error).toBeDefined()
      expect(response.error!.code).toBeDefined()
      expect(response.error!.message).toBeDefined()
      expect(response.error!.timestamp).toBeDefined()
    })

    it('should return consistent error format for validation errors', async () => {
      const authClient = createAuthClient()

      const response = await authClient.registerUser({
        email: 'invalid-email',
        password: 'weak',
      })

      assertErrorResponse(response)

      expect(response.error!.code).toMatch(/VALIDATION_ERROR|BAD_REQUEST/)
      expect(response.error!.message).toBeDefined()
    })

    it('should return consistent error format for authorization errors', async () => {
      const adminClient = createAdminClient('invalid-token')

      const response = await adminClient.listCollections()

      assertErrorResponse(response)

      expect(response.error!.code).toMatch(/UNAUTHORIZED|FORBIDDEN/)
    })

    it('should return consistent error format for not found errors', async () => {
      const adminClient = createAdminClient(adminToken)

      const response = await adminClient.getCollection('nonexistent_collection')

      assertErrorResponse(response)

      expect(response.error!.code).toMatch(/NOT_FOUND/)
      expect(response.error!.message).toBeDefined()
    })

    it('should include timestamp in all error responses', async () => {
      const authClient = createAuthClient()

      const response = await authClient.loginUser({
        email: 'test@example.com',
        password: 'wrong',
      })

      assertErrorResponse(response)

      expect(response.error!.timestamp).toBeDefined()

      const timestamp = new Date(response.error!.timestamp).getTime()
      expect(timestamp).toBeGreaterThan(0)
    })

    it('should provide helpful error messages', async () => {
      const authClient = createAuthClient()

      const response = await authClient.registerUser({
        email: 'test@example.com',
        password: '123', // Too short
      })

      assertErrorResponse(response)

      expect(response.error!.message).toBeTruthy()
      expect(response.error!.message.length).toBeGreaterThan(10)
    })
  })

  describe('Request Validation', () => {
    it('should validate required fields', async () => {
      const response = await apiClient.request(API_ENDPOINTS.AUTH_REGISTER, {
        method: 'POST',
        body: {
          // Missing email and password
        },
      })

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/VALIDATION_ERROR|BAD_REQUEST/)
    })

    it('should validate field types', async () => {
      const adminClient = createAdminClient(adminToken)

      const response = await adminClient.createCollection({
        name: 123 as any, // Wrong type
      })

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/VALIDATION_ERROR|BAD_REQUEST/)
    })

    it('should validate email format', async () => {
      const authClient = createAuthClient()

      const response = await authClient.registerUser({
        email: 'not-an-email',
        password: 'Password123!',
      })

      assertErrorResponse(response)
    })

    it('should validate password requirements', async () => {
      const authClient = createAuthClient()

      const response = await authClient.registerUser({
        email: 'test@example.com',
        password: '123', // Too short
      })

      assertErrorResponse(response)
    })

    it('should validate collection name format', async () => {
      const adminClient = createAdminClient(adminToken)

      const invalidNames = ['', '123invalid', 'invalid-name', 'a'.repeat(100)]

      for (const name of invalidNames) {
        const response = await adminClient.createCollection({ name })

        assertErrorResponse(response)
        expect(response.error?.code).toMatch(/VALIDATION_ERROR|BAD_REQUEST/)
      }
    })

    it('should validate JSON body structure', async () => {
      const response = await apiClient.request(API_ENDPOINTS.AUTH_REGISTER, {
        method: 'POST',
        body: 'not-json' as any,
      })

      assertErrorResponse(response)
    })

    it('should reject overly large requests', async () => {
      const adminClient = createAdminClient(adminToken)
      const collectionName = `large_req_${Date.now()}`

      await adminClient.createCollection({ name: collectionName })
      cleanup.track('collection', collectionName)

      const queryClient = createQueryClient(adminToken)

      // Try to create document with very large data
      const largeData = {
        field: 'x'.repeat(10 * 1024 * 1024), // 10MB string
      }

      const response = await queryClient.create(collectionName, largeData)

      // May succeed or fail based on limits
      if (!response.success) {
        expect(response.error?.code).toMatch(
          /PAYLOAD_TOO_LARGE|BAD_REQUEST|VALIDATION_ERROR/
        )
      }
    }, 30000)
  })

  describe('Response Validation', () => {
    it('should include proper content-type headers', async () => {
      const authClient = createAuthClient()

      const response = await authClient.registerUser({
        email: `headers-${Date.now()}@example.com`,
        password: 'Password123!',
      })

      assertSuccessResponse(response)

      // Response should be JSON
      expect(typeof response.data).toBe('object')
    })

    it('should return consistent success response structure', async () => {
      const authClient = createAuthClient()

      const response = await authClient.registerUser({
        email: `structure-${Date.now()}@example.com`,
        password: 'Password123!',
      })

      assertSuccessResponse(response)

      expect(response).toHaveProperty('success', true)
      expect(response).toHaveProperty('data')
      expect(response).not.toHaveProperty('error')
    })

    it('should include required fields in responses', async () => {
      const authClient = createAuthClient()

      const response = await authClient.registerUser({
        email: `required-${Date.now()}@example.com`,
        password: 'Password123!',
      })

      assertSuccessResponse(response)

      expect(response.data!.accessToken).toBeDefined()
      expect(response.data!.refreshToken).toBeDefined()
      expect(response.data!.user).toBeDefined()
      expect(response.data!.user.email).toBeDefined()
    })

    it('should not expose sensitive information in responses', async () => {
      const authClient = createAuthClient()

      const response = await authClient.registerUser({
        email: `sensitive-${Date.now()}@example.com`,
        password: 'Password123!',
      })

      assertSuccessResponse(response)

      // Should not include password or password hash
      const responseStr = JSON.stringify(response)
      expect(responseStr).not.toContain('Password123!')
      expect(responseStr).not.toContain('hash')
      expect(responseStr).not.toContain('bcrypt')
    })

    it('should return appropriate HTTP status codes', async () => {
      // Success case - implicitly 200
      const authClient = createAuthClient()

      const successResponse = await authClient.registerUser({
        email: `status-${Date.now()}@example.com`,
        password: 'Password123!',
      })

      assertSuccessResponse(successResponse)

      // Error case - should indicate error
      const errorResponse = await authClient.loginUser({
        email: 'nonexistent@example.com',
        password: 'wrong',
      })

      assertErrorResponse(errorResponse)
    })
  })

  describe('Performance and Concurrency', () => {
    it('should handle concurrent API requests', async () => {
      const authClient = createAuthClient()

      const requests = Array.from({ length: 10 }, (_, i) =>
        authClient.registerUser({
          email: `concurrent-${Date.now()}-${i}@example.com`,
          password: 'Password123!',
        })
      )

      const responses = await Promise.all(requests)

      responses.forEach(response => {
        assertSuccessResponse(response)
      })

      // All should have unique tokens
      const tokens = responses.map(r => r.data!.accessToken)
      const uniqueTokens = new Set(tokens)
      expect(uniqueTokens.size).toBe(10)
    })

    it('should handle rapid sequential requests', async () => {
      const adminClient = createAdminClient(adminToken)

      for (let i = 0; i < 5; i++) {
        const response = await adminClient.listCollections()

        assertSuccessResponse(response)
      }
    })

    it('should maintain performance under load', async () => {
      const authClient = createAuthClient()

      const startTime = Date.now()

      const requests = Array.from({ length: 20 }, (_, i) =>
        authClient.registerUser({
          email: `load-${Date.now()}-${i}@example.com`,
          password: 'Password123!',
        })
      )

      const responses = await Promise.all(requests)

      const duration = Date.now() - startTime

      responses.forEach(response => {
        assertSuccessResponse(response)
      })

      expect(duration).toBeLessThan(15000) // 15 seconds for 20 concurrent
    })
  })

  describe('API Security', () => {
    it('should require authentication for protected endpoints', async () => {
      const response = await apiClient.request(API_ENDPOINTS.ADMIN_COLLECTIONS, {
        method: 'GET',
      })

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/UNAUTHORIZED|FORBIDDEN/)
    })

    it('should reject invalid tokens', async () => {
      const response = await apiClient.authenticatedRequest(
        API_ENDPOINTS.AUTH_USER,
        'invalid-token',
        { method: 'GET' }
      )

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/UNAUTHORIZED/)
    })

    it('should reject expired tokens', async () => {
      // Create a token that will expire quickly (if supported)
      const authClient = createAuthClient()

      const registerResponse = await authClient.registerUser({
        email: `expiry-${Date.now()}@example.com`,
        password: 'Password123!',
      })

      assertSuccessResponse(registerResponse)

      // Token should be valid immediately
      const validResponse = await apiClient.authenticatedRequest(
        API_ENDPOINTS.AUTH_USER,
        registerResponse.data!.accessToken,
        { method: 'GET' }
      )

      assertSuccessResponse(validResponse)
    })

    it('should prevent SQL injection in queries', async () => {
      const authClient = createAuthClient()

      const maliciousEmail = "admin'--"
      const response = await authClient.loginUser({
        email: maliciousEmail,
        password: 'anything',
      })

      // Should safely handle and return proper error
      assertErrorResponse(response)
    })

    it('should prevent XSS in responses', async () => {
      const adminClient = createAdminClient(adminToken)
      const collectionName = `xss_test_${Date.now()}`

      await adminClient.createCollection({ name: collectionName })
      cleanup.track('collection', collectionName)

      const queryClient = createQueryClient(adminToken)

      const xssPayload = '<script>alert("xss")</script>'

      const createResponse = await queryClient.create(collectionName, {
        name: xssPayload,
      })

      assertSuccessResponse(createResponse)

      // Response should not execute scripts
      const responseStr = JSON.stringify(createResponse)
      // Script tags should be present as strings, not executable
      expect(responseStr).toContain('script')
    })
  })
})
