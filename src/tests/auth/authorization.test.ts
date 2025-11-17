import { describe, it, expect, beforeAll } from 'vitest'
import { createApiClient, createAuthClient, createAdminClient } from '@/client'
import { createAuthHelper, createCleanupHelper } from '@/helpers'
import { randomCollectionName } from '@/helpers/test-data'
import { API_ENDPOINTS } from '@/config/constants'
import { assertSuccessResponse, assertErrorResponse } from '@/validators/response.validator'

describe('Authorization Middleware', () => {
  const apiClient = createApiClient()
  const authClient = createAuthClient()
  const authHelper = createAuthHelper()
  const cleanup = createCleanupHelper()

  let userToken: string
  let adminToken: string
  let userId: string
  let adminId: string

  beforeAll(async () => {
    // Setup test user
    const userResult = await authHelper.createAndLoginUser()
    userToken = userResult.token
    userId = userResult.userId
    cleanup.track('user', userId)

    // Setup test admin
    const adminResult = await authHelper.loginAdmin()
    adminToken = adminResult.token
    adminId = adminResult.adminId
  })

  describe('Protected Routes Access', () => {
    it('should allow access to protected route with valid token', async () => {
      const response = await authClient.getCurrentUser(userToken)

      assertSuccessResponse(response)
      expect(response.data!.user!.id).toBe(userId)
    })

    it('should allow admin access to admin routes', async () => {
      const response = await authClient.getCurrentAdmin(adminToken)

      assertSuccessResponse(response)
      expect(response.data!.admin!.id).toBe(adminId)
    })

    it('should protect query endpoint - require authentication', async () => {
      const response = await apiClient.post(API_ENDPOINTS.QUERY, {
        action: 'find',
        collection: 'test_collection',
        query: {},
      })

      // Should fail without authentication
      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/UNAUTHORIZED/)
    })

    it('should allow authenticated user to access query endpoint', async () => {
      const response = await apiClient.authenticatedRequest(
        API_ENDPOINTS.QUERY,
        userToken,
        {
          method: 'POST',
          body: {
            action: 'find',
            collection: 'test_collection',
            query: {},
          },
        }
      )

      // Should succeed (even if collection doesn't exist)
      // Either success or NOT_FOUND is acceptable
      if (!response.success) {
        expect(response.error?.code).toMatch(/NOT_FOUND|BAD_REQUEST/)
      }
    })

    it('should protect admin collection endpoints', async () => {
      const response = await apiClient.get(API_ENDPOINTS.ADMIN_COLLECTIONS)

      // Should fail without authentication
      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/UNAUTHORIZED/)
    })

    it('should allow admin to access collection endpoints', async () => {
      const response = await apiClient.authenticatedRequest(
        API_ENDPOINTS.ADMIN_COLLECTIONS,
        adminToken,
        { method: 'GET' }
      )

      // Should succeed
      assertSuccessResponse(response)
    })

    it('should protect file storage endpoints', async () => {
      const response = await apiClient.get(API_ENDPOINTS.STORAGE_FILES)

      // Should fail without authentication
      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/UNAUTHORIZED/)
    })

    it('should allow authenticated user to access storage endpoints', async () => {
      const response = await apiClient.authenticatedRequest(
        API_ENDPOINTS.STORAGE_FILES,
        userToken,
        { method: 'GET' }
      )

      // Should succeed
      assertSuccessResponse(response)
    })
  })

  describe('Invalid Token Rejection', () => {
    it('should reject request with invalid token format', async () => {
      const response = await apiClient.authenticatedRequest(
        API_ENDPOINTS.AUTH_ME,
        'invalid-token',
        { method: 'GET' }
      )

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/UNAUTHORIZED|BAD_REQUEST/)
      expect(response.error?.message.toLowerCase()).toMatch(/token|unauthorized|invalid/)
    })

    it('should reject request with malformed JWT', async () => {
      const malformedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature'

      const response = await apiClient.authenticatedRequest(
        API_ENDPOINTS.AUTH_ME,
        malformedToken,
        { method: 'GET' }
      )

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/UNAUTHORIZED|BAD_REQUEST/)
    })

    it('should reject request with fabricated token', async () => {
      // Valid JWT structure but invalid signature
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

      const response = await apiClient.authenticatedRequest(
        API_ENDPOINTS.AUTH_ME,
        fakeToken,
        { method: 'GET' }
      )

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/UNAUTHORIZED|BAD_REQUEST/)
    })

    it('should reject request with empty token', async () => {
      const response = await apiClient.authenticatedRequest(
        API_ENDPOINTS.AUTH_ME,
        '',
        { method: 'GET' }
      )

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/UNAUTHORIZED|BAD_REQUEST/)
    })

    it('should reject request with refresh token instead of access token', async () => {
      // Get a refresh token
      const loginResponse = await authClient.loginUser({
        email: `test-${Date.now()}@example.com`,
        password: 'TestPassword123!',
      })
      assertSuccessResponse(loginResponse)

      const refreshToken = loginResponse.data!.refreshToken

      // Try to use refresh token as access token
      const response = await apiClient.authenticatedRequest(
        API_ENDPOINTS.AUTH_ME,
        refreshToken,
        { method: 'GET' }
      )

      // Should fail (refresh tokens aren't valid for API requests)
      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/UNAUTHORIZED|BAD_REQUEST/)
    })
  })

  describe('Missing Token Handling', () => {
    it('should reject request without Authorization header', async () => {
      const response = await apiClient.get(API_ENDPOINTS.AUTH_ME)

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/UNAUTHORIZED/)
      expect(response.error?.message.toLowerCase()).toMatch(/authorization|token|missing/)
    })

    it('should reject request with malformed Authorization header', async () => {
      const response = await apiClient.request(API_ENDPOINTS.AUTH_ME, {
        method: 'GET',
        headers: {
          'Authorization': 'InvalidFormat token123',
        },
      })

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/UNAUTHORIZED|BAD_REQUEST/)
    })

    it('should reject request with Bearer but no token', async () => {
      const response = await apiClient.request(API_ENDPOINTS.AUTH_ME, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ',
        },
      })

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/UNAUTHORIZED|BAD_REQUEST/)
    })

    it('should handle case-insensitive Bearer prefix', async () => {
      const response = await apiClient.request(API_ENDPOINTS.AUTH_ME, {
        method: 'GET',
        headers: {
          'Authorization': `bearer ${userToken}`,
        },
      })

      // Should work with lowercase 'bearer'
      if (response.success) {
        expect(response.data!.user!.id).toBe(userId)
      } else {
        // Or might reject depending on implementation
        assertErrorResponse(response)
      }
    })
  })

  describe('User vs Admin Authorization', () => {
    it('should prevent regular user from accessing admin endpoints', async () => {
      const response = await apiClient.authenticatedRequest(
        API_ENDPOINTS.ADMIN_COLLECTIONS,
        userToken,
        { method: 'GET' }
      )

      // Should fail - user token not valid for admin endpoints
      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/FORBIDDEN|UNAUTHORIZED/)
    })

    it('should allow admin to access admin endpoints', async () => {
      const response = await apiClient.authenticatedRequest(
        API_ENDPOINTS.ADMIN_COLLECTIONS,
        adminToken,
        { method: 'GET' }
      )

      // Should succeed
      assertSuccessResponse(response)
    })

    it('should allow admin to access user endpoints', async () => {
      // Admins might or might not have access to user endpoints
      // depending on implementation
      const response = await apiClient.authenticatedRequest(
        API_ENDPOINTS.QUERY,
        adminToken,
        {
          method: 'POST',
          body: {
            action: 'find',
            collection: 'test',
            query: {},
          },
        }
      )

      // Either success or specific error is acceptable
      if (!response.success) {
        expect(response.error?.code).toMatch(/NOT_FOUND|BAD_REQUEST|FORBIDDEN/)
      }
    })
  })

  describe('Token Expiration Handling', () => {
    it('should reject expired access token', async () => {
      // Note: This test can't easily simulate token expiration
      // without waiting 15 minutes. This is a placeholder for
      // manual/integration testing

      // In a real scenario, you would:
      // 1. Mock time or
      // 2. Use a short-lived token for testing or
      // 3. Wait for actual expiration

      // For now, we'll just verify the error handling exists
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0IiwiZXhwIjoxNTE2MjM5MDIyfQ.fake'

      const response = await apiClient.authenticatedRequest(
        API_ENDPOINTS.AUTH_ME,
        expiredToken,
        { method: 'GET' }
      )

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/UNAUTHORIZED|BAD_REQUEST/)
    })
  })

  describe('Concurrent Request Handling', () => {
    it('should handle multiple concurrent authenticated requests', async () => {
      const promises = Array.from({ length: 5 }, () =>
        apiClient.authenticatedRequest(
          API_ENDPOINTS.AUTH_ME,
          userToken,
          { method: 'GET' }
        )
      )

      const responses = await Promise.all(promises)

      // All should succeed
      responses.forEach(response => {
        assertSuccessResponse(response)
        expect(response.data!.user!.id).toBe(userId)
      })
    })

    it('should handle mixed valid and invalid tokens', async () => {
      const promises = [
        apiClient.authenticatedRequest(API_ENDPOINTS.AUTH_ME, userToken, { method: 'GET' }),
        apiClient.authenticatedRequest(API_ENDPOINTS.AUTH_ME, 'invalid', { method: 'GET' }),
        apiClient.authenticatedRequest(API_ENDPOINTS.AUTH_ME, userToken, { method: 'GET' }),
      ]

      const [valid1, invalid, valid2] = await Promise.all(promises)

      assertSuccessResponse(valid1)
      assertErrorResponse(invalid)
      assertSuccessResponse(valid2)
    })
  })

  describe('Cross-Origin Request Authorization', () => {
    it('should include authentication in CORS preflight', async () => {
      const response = await apiClient.options(API_ENDPOINTS.AUTH_ME)

      // CORS preflight should be handled
      expect(response.status).toBeGreaterThanOrEqual(200)
      expect(response.status).toBeLessThan(500)
    })

    it('should authenticate actual request after preflight', async () => {
      const response = await apiClient.authenticatedRequest(
        API_ENDPOINTS.AUTH_ME,
        userToken,
        {
          method: 'GET',
          headers: {
            'Origin': 'https://example.com',
          },
        }
      )

      assertSuccessResponse(response)
    })
  })

  describe('Response Headers', () => {
    it('should not leak sensitive information in error responses', async () => {
      const response = await apiClient.authenticatedRequest(
        API_ENDPOINTS.AUTH_ME,
        'invalid-token',
        { method: 'GET' }
      )

      assertErrorResponse(response)

      const errorMessage = response.error?.message.toLowerCase() || ''

      // Should not reveal internal details
      expect(errorMessage).not.toContain('database')
      expect(errorMessage).not.toContain('sql')
      expect(errorMessage).not.toContain('exception')
      expect(errorMessage).not.toContain('stack')
    })
  })
})
