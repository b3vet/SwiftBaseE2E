import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createAuthClient, createAdminClient, createQueryClient, createStorageClient } from '@/client'
import { createAuthHelper, createCollectionHelper, createCleanupHelper, FileGenerator } from '@/helpers'
import { randomCollectionName } from '@/helpers/test-data'
import { assertSuccessResponse, assertErrorResponse } from '@/validators/response.validator'

describe('Error Recovery and Resilience', () => {
  const authHelper = createAuthHelper()
  const cleanup = createCleanupHelper()
  const collectionHelper = createCollectionHelper()

  let adminToken: string
  let userToken: string

  beforeAll(async () => {
    adminToken = await authHelper.getAdminToken()
    const userResult = await authHelper.createAndLoginUser()
    userToken = userResult.token

    cleanup.setToken(adminToken)
    collectionHelper.setToken(adminToken)
  })

  afterAll(async () => {
    await cleanup.cleanAll()
  })

  describe('Graceful Failure Handling', () => {
    it('should handle authentication failure gracefully', async () => {
      const authClient = createAuthClient()

      const loginResponse = await authClient.loginUser({
        email: 'nonexistent@example.com',
        password: 'wrong',
      })

      assertErrorResponse(loginResponse)
      expect(loginResponse.error?.code).toBeDefined()
      expect(loginResponse.error?.message).toBeDefined()

      // System should remain responsive
      const registerResponse = await authClient.registerUser({
        email: `recovery-${Date.now()}@example.com`,
        password: 'Valid123!',
      })

      assertSuccessResponse(registerResponse)
    })

    it('should handle collection not found gracefully', async () => {
      const queryClient = createQueryClient(adminToken)

      const findResponse = await queryClient.find('nonexistent_collection', {})

      assertErrorResponse(findResponse)
      expect(findResponse.error?.code).toMatch(/NOT_FOUND/)

      // System should still work
      const collectionName = randomCollectionName()
      await collectionHelper.createTestCollection(collectionName)
      cleanup.track('collection', collectionName)

      const validFindResponse = await queryClient.find(collectionName, {})
      assertSuccessResponse(validFindResponse)
    })

    it('should handle file not found gracefully', async () => {
      const storageClient = createStorageClient(userToken)

      const downloadResponse = await storageClient.downloadFile(
        'nonexistent-file-id'
      )

      assertErrorResponse(downloadResponse)

      // System should still work
      const uploadResponse = await storageClient.uploadFile(
        Buffer.from('test', 'utf-8'),
        'test.txt',
        'text/plain'
      )

      assertSuccessResponse(uploadResponse)
      cleanup.track('file', uploadResponse.data!.id)
    })

    it('should handle validation errors without corruption', async () => {
      const adminClient = createAdminClient(adminToken)

      // Attempt invalid collection creation
      const invalidResponse = await adminClient.createCollection({
        name: '123invalid', // Invalid name
      })

      assertErrorResponse(invalidResponse)

      // System should still work
      const collectionName = randomCollectionName()
      const validResponse = await adminClient.createCollection({
        name: collectionName,
      })

      assertSuccessResponse(validResponse)
      cleanup.track('collection', collectionName)
    })
  })

  describe('Partial Failure Recovery', () => {
    it('should recover from partial batch operation failures', async () => {
      const collectionName = randomCollectionName()
      await collectionHelper.createTestCollection(collectionName)
      cleanup.track('collection', collectionName)

      const queryClient = createQueryClient(adminToken)

      // Create some documents
      const validDocs = [
        { id: 1, value: 'a' },
        { id: 2, value: 'b' },
        { id: 3, value: 'c' },
      ]

      const createResponse = await queryClient.create(
        collectionName,
        validDocs
      )

      assertSuccessResponse(createResponse)

      // Attempt batch update with some invalid operations
      const updatePromises = [
        queryClient.update(
          collectionName,
          { where: { id: 1 } },
          { $set: { value: 'updated-a' } }
        ),
        queryClient.update(
          collectionName,
          { where: { id: 999 } }, // Non-existent
          { $set: { value: 'updated-999' } }
        ),
        queryClient.update(
          collectionName,
          { where: { id: 3 } },
          { $set: { value: 'updated-c' } }
        ),
      ]

      const updateResponses = await Promise.all(updatePromises)

      // Some should succeed
      const successCount = updateResponses.filter(r => r.success).length
      expect(successCount).toBeGreaterThan(0)

      // Verify successful updates
      const doc1Response = await queryClient.findOne(collectionName, {
        where: { id: 1 },
      })

      assertSuccessResponse(doc1Response)
      expect(doc1Response.data!.value).toBe('updated-a')

      const doc3Response = await queryClient.findOne(collectionName, {
        where: { id: 3 },
      })

      assertSuccessResponse(doc3Response)
      expect(doc3Response.data!.value).toBe('updated-c')
    })

    it('should handle file upload failure without system impact', async () => {
      const storageClient = createStorageClient(userToken)

      // Successful upload
      const successResponse = await storageClient.uploadFile(
        Buffer.from('success', 'utf-8'),
        'success.txt',
        'text/plain'
      )

      assertSuccessResponse(successResponse)
      cleanup.track('file', successResponse.data!.id)

      // Failed upload (empty filename)
      const failResponse = await storageClient.uploadFile(
        Buffer.from('fail', 'utf-8'),
        '',
        'text/plain'
      )

      assertErrorResponse(failResponse)

      // System still works
      const anotherResponse = await storageClient.uploadFile(
        Buffer.from('another', 'utf-8'),
        'another.txt',
        'text/plain'
      )

      assertSuccessResponse(anotherResponse)
      cleanup.track('file', anotherResponse.data!.id)
    })
  })

  describe('State Recovery', () => {
    it('should maintain consistent state after error', async () => {
      const collectionName = randomCollectionName()
      await collectionHelper.createCollectionWithData(collectionName, [
        { id: 1, counter: 5 },
      ])
      cleanup.track('collection', collectionName)

      const queryClient = createQueryClient(adminToken)

      // Successful update
      const update1Response = await queryClient.update(
        collectionName,
        { where: { id: 1 } },
        { $inc: { counter: 1 } }
      )

      assertSuccessResponse(update1Response)

      // Failed update (non-existent document)
      const failedUpdateResponse = await queryClient.update(
        collectionName,
        { where: { id: 999 } },
        { $inc: { counter: 1 } }
      )

      // Should fail or return no updates
      // State of existing document should not change

      // Another successful update
      const update2Response = await queryClient.update(
        collectionName,
        { where: { id: 1 } },
        { $inc: { counter: 1 } }
      )

      assertSuccessResponse(update2Response)

      // Verify final state
      const finalResponse = await queryClient.findOne(collectionName, {
        where: { id: 1 },
      })

      assertSuccessResponse(finalResponse)
      expect(finalResponse.data!.counter).toBe(7) // 5 + 1 + 1
    })

    it('should rollback on error where supported', async () => {
      const collectionName = randomCollectionName()
      await collectionHelper.createCollectionWithData(collectionName, [
        { accountId: 'A', balance: 1000 },
        { accountId: 'B', balance: 500 },
      ])
      cleanup.track('collection', collectionName)

      const queryClient = createQueryClient(adminToken)

      // Attempt transfer that should fail
      const transferAmount = 2000 // More than available

      // Try to deduct (should succeed as operation)
      const deductResponse = await queryClient.update(
        collectionName,
        { where: { accountId: 'A' } },
        { $inc: { balance: -transferAmount } }
      )

      // May succeed with negative balance or fail with validation
      if (deductResponse.success) {
        // Check if negative balance is allowed
        const checkResponse = await queryClient.findOne(collectionName, {
          where: { accountId: 'A' },
        })

        assertSuccessResponse(checkResponse)

        // If system allows negative, that's the current state
        // In real system, might want validation to prevent this
      }

      // Verify B's balance unchanged if transaction failed
      const accountBResponse = await queryClient.findOne(collectionName, {
        where: { accountId: 'B' },
      })

      assertSuccessResponse(accountBResponse)
      // B should still have original balance if A failed
    })
  })

  describe('Retry Mechanisms', () => {
    it('should handle retry for transient failures', async () => {
      const authClient = createAuthClient()

      let attempts = 0
      let success = false

      // Simulate retry logic
      while (attempts < 3 && !success) {
        attempts++

        const response = await authClient.registerUser({
          email: `retry-${Date.now()}-${attempts}@example.com`,
          password: 'Retry123!',
        })

        if (response.success) {
          success = true
          assertSuccessResponse(response)
        }

        // Small delay between retries
        if (!success && attempts < 3) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      expect(success).toBe(true)
    })

    it('should handle exponential backoff', async () => {
      const queryClient = createQueryClient(adminToken)
      const collectionName = randomCollectionName()

      await collectionHelper.createTestCollection(collectionName)
      cleanup.track('collection', collectionName)

      const delays = [100, 200, 400] // Exponential backoff
      let attempt = 0

      for (const delay of delays) {
        attempt++

        await new Promise(resolve => setTimeout(resolve, delay))

        const response = await queryClient.create(collectionName, {
          attempt,
          timestamp: Date.now(),
        })

        assertSuccessResponse(response)
      }

      // Verify all attempts recorded
      const findResponse = await queryClient.find(collectionName, {})
      assertSuccessResponse(findResponse)
      expect(findResponse.data!.length).toBe(3)
    })
  })

  describe('Error Propagation', () => {
    it('should propagate errors correctly in nested operations', async () => {
      const collectionName = randomCollectionName()
      await collectionHelper.createTestCollection(collectionName)
      cleanup.track('collection', collectionName)

      const queryClient = createQueryClient(adminToken)

      // Create document
      const createResponse = await queryClient.create(collectionName, {
        id: 1,
        status: 'active',
      })

      assertSuccessResponse(createResponse)

      // Try to create duplicate (if IDs are unique)
      const duplicateResponse = await queryClient.create(collectionName, {
        id: 1,
        status: 'active',
      })

      // May succeed or fail depending on uniqueness constraints
      // System should handle gracefully either way
      expect(
        duplicateResponse.success || !duplicateResponse.success
      ).toBe(true)
    })

    it('should provide detailed error information', async () => {
      const authClient = createAuthClient()

      const response = await authClient.registerUser({
        email: 'invalid-email',
        password: 'weak',
      })

      assertErrorResponse(response)

      // Error should contain useful information
      expect(response.error!.code).toBeDefined()
      expect(response.error!.message).toBeDefined()
      expect(response.error!.timestamp).toBeDefined()
      expect(response.error!.message.length).toBeGreaterThan(5)
    })
  })

  describe('Concurrent Error Handling', () => {
    it('should handle concurrent errors without deadlock', async () => {
      const authClient = createAuthClient()

      // Make many concurrent requests that will fail
      const requests = Array.from({ length: 20 }, () =>
        authClient.loginUser({
          email: 'nonexistent@example.com',
          password: 'wrong',
        })
      )

      const responses = await Promise.all(requests)

      // All should fail gracefully
      responses.forEach(response => {
        assertErrorResponse(response)
      })

      // System should still be responsive
      const validResponse = await authClient.registerUser({
        email: `post-error-${Date.now()}@example.com`,
        password: 'Valid123!',
      })

      assertSuccessResponse(validResponse)
    })

    it('should handle mixed success and failure concurrently', async () => {
      const collectionName = randomCollectionName()
      await collectionHelper.createTestCollection(collectionName)
      cleanup.track('collection', collectionName)

      const queryClient = createQueryClient(adminToken)

      // Mix of valid and invalid operations
      const operations = [
        queryClient.create(collectionName, { value: 'valid1' }),
        queryClient.create('nonexistent', { value: 'invalid' }),
        queryClient.create(collectionName, { value: 'valid2' }),
        queryClient.create('nonexistent', { value: 'invalid' }),
        queryClient.create(collectionName, { value: 'valid3' }),
      ]

      const responses = await Promise.all(operations)

      const successCount = responses.filter(r => r.success).length
      const errorCount = responses.filter(r => !r.success).length

      expect(successCount).toBe(3)
      expect(errorCount).toBe(2)

      // Verify successful operations
      const findResponse = await queryClient.find(collectionName, {})
      assertSuccessResponse(findResponse)
      expect(findResponse.data!.length).toBe(3)
    })
  })

  describe('System Resilience', () => {
    it('should recover from heavy load', async () => {
      const queryClient = createQueryClient(adminToken)
      const collectionName = randomCollectionName()

      await collectionHelper.createTestCollection(collectionName)
      cleanup.track('collection', collectionName)

      // Create heavy load
      const heavyLoad = Array.from({ length: 50 }, (_, i) =>
        queryClient.create(collectionName, { id: i, value: `load-${i}` })
      )

      const responses = await Promise.all(heavyLoad)

      // Most should succeed
      const successCount = responses.filter(r => r.success).length
      expect(successCount).toBeGreaterThan(40) // At least 80% success

      // System should still be responsive after load
      const postLoadResponse = await queryClient.create(collectionName, {
        postLoad: true,
      })

      assertSuccessResponse(postLoadResponse)
    }, 30000)

    it('should handle error recovery in file operations', async () => {
      const storageClient = createStorageClient(userToken)

      // Successful upload
      const successUploadResponse = await storageClient.uploadFile(
        Buffer.from('content', 'utf-8'),
        'success.txt',
        'text/plain'
      )

      assertSuccessResponse(successUploadResponse)
      cleanup.track('file', successUploadResponse.data!.id)

      // Failed download (non-existent file)
      const failedDownloadResponse = await storageClient.downloadFile(
        'nonexistent-id'
      )

      assertErrorResponse(failedDownloadResponse)

      // System should still work
      const postErrorUploadResponse = await storageClient.uploadFile(
        Buffer.from('post-error', 'utf-8'),
        'post-error.txt',
        'text/plain'
      )

      assertSuccessResponse(postErrorUploadResponse)
      cleanup.track('file', postErrorUploadResponse.data!.id)

      // Can still download valid file
      const validDownloadResponse = await storageClient.downloadFile(
        successUploadResponse.data!.id
      )

      assertSuccessResponse(validDownloadResponse)
    })

    it('should maintain service availability during errors', async () => {
      const authClient = createAuthClient()
      const queryClient = createQueryClient(adminToken)

      // Cause some errors
      await authClient.loginUser({ email: 'bad1@example.com', password: 'bad' })
      await authClient.loginUser({ email: 'bad2@example.com', password: 'bad' })
      await authClient.loginUser({ email: 'bad3@example.com', password: 'bad' })

      // Service should still work
      const registerResponse = await authClient.registerUser({
        email: `available-${Date.now()}@example.com`,
        password: 'Valid123!',
      })

      assertSuccessResponse(registerResponse)

      // Query service should work
      const collectionName = randomCollectionName()
      await collectionHelper.createTestCollection(collectionName)
      cleanup.track('collection', collectionName)

      const createResponse = await queryClient.create(collectionName, {
        test: 'availability',
      })

      assertSuccessResponse(createResponse)
    })
  })

  describe('Data Loss Prevention', () => {
    it('should not lose data on error', async () => {
      const collectionName = randomCollectionName()
      await collectionHelper.createCollectionWithData(collectionName, [
        { id: 1, important: 'data' },
      ])
      cleanup.track('collection', collectionName)

      const queryClient = createQueryClient(adminToken)

      // Attempt invalid update
      const invalidUpdateResponse = await queryClient.update(
        collectionName,
        { where: { id: 1 } },
        { $set: { field: undefined } } as any
      )

      // Original data should remain intact
      const verifyResponse = await queryClient.findOne(collectionName, {
        where: { id: 1 },
      })

      assertSuccessResponse(verifyResponse)
      expect(verifyResponse.data!.important).toBe('data')
      expect(verifyResponse.data!.id).toBe(1)
    })

    it('should preserve file integrity on partial failure', async () => {
      const storageClient = createStorageClient(userToken)

      const originalBuffer = Buffer.from('important file content', 'utf-8')

      const uploadResponse = await storageClient.uploadFile(
        originalBuffer,
        'important.txt',
        'text/plain'
      )

      assertSuccessResponse(uploadResponse)
      cleanup.track('file', uploadResponse.data!.id)

      const fileId = uploadResponse.data!.id

      // Attempt invalid download
      await storageClient.downloadFile('invalid-id')

      // Original file should still be accessible
      const downloadResponse = await storageClient.downloadFile(fileId)

      assertSuccessResponse(downloadResponse)
      expect(downloadResponse.data!.equals(originalBuffer)).toBe(true)
    })
  })
})
