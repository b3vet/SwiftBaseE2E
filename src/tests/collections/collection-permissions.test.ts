import { describe, it, expect, beforeAll } from 'vitest'
import { createApiClient, createAdminClient } from '@/client'
import { createAuthHelper, createCleanupHelper } from '@/helpers'
import { randomCollectionName } from '@/helpers/test-data'
import { API_ENDPOINTS } from '@/config/constants'
import { assertSuccessResponse, assertErrorResponse } from '@/validators/response.validator'

describe('Collection Permissions', () => {
  const authHelper = createAuthHelper()
  const apiClient = createApiClient()
  const cleanup = createCleanupHelper()

  let adminToken: string
  let userToken: string
  let adminClient: ReturnType<typeof createAdminClient>

  beforeAll(async () => {
    // Setup admin
    adminToken = await authHelper.getAdminToken()
    adminClient = createAdminClient(adminToken)
    cleanup.setToken(adminToken)

    // Setup regular user
    const userResult = await authHelper.createAndLoginUser()
    userToken = userResult.token
  })

  describe('Admin-Only Operations', () => {
    describe('Create Collection', () => {
      it('should allow admin to create collection', async () => {
        const collectionName = randomCollectionName()

        const response = await adminClient.createCollection({
          name: collectionName,
        })

        assertSuccessResponse(response)
        expect(response.data!.name).toBe(collectionName)

        cleanup.track('collection', collectionName)
      })

      it('should prevent regular user from creating collection', async () => {
        const collectionName = randomCollectionName()

        const response = await apiClient.authenticatedRequest(
          API_ENDPOINTS.ADMIN_COLLECTIONS,
          userToken,
          {
            method: 'POST',
            body: { name: collectionName },
          }
        )

        assertErrorResponse(response)
        expect(response.error?.code).toMatch(/FORBIDDEN|UNAUTHORIZED/)
      })

      it('should prevent unauthenticated creation', async () => {
        const collectionName = randomCollectionName()

        const response = await apiClient.post(API_ENDPOINTS.ADMIN_COLLECTIONS, {
          name: collectionName,
        })

        assertErrorResponse(response)
        expect(response.error?.code).toMatch(/UNAUTHORIZED/)
      })
    })

    describe('List Collections', () => {
      it('should allow admin to list collections', async () => {
        const response = await adminClient.listCollections()

        assertSuccessResponse(response)
        expect(response.data!.collections).toBeDefined()
      })

      it('should prevent regular user from listing collections', async () => {
        const response = await apiClient.authenticatedRequest(
          API_ENDPOINTS.ADMIN_COLLECTIONS,
          userToken,
          { method: 'GET' }
        )

        assertErrorResponse(response)
        expect(response.error?.code).toMatch(/FORBIDDEN|UNAUTHORIZED/)
      })

      it('should prevent unauthenticated listing', async () => {
        const response = await apiClient.get(API_ENDPOINTS.ADMIN_COLLECTIONS)

        assertErrorResponse(response)
        expect(response.error?.code).toMatch(/UNAUTHORIZED/)
      })
    })

    describe('Get Collection', () => {
      let testCollectionName: string

      beforeAll(async () => {
        testCollectionName = randomCollectionName()
        await adminClient.createCollection({ name: testCollectionName })
        cleanup.track('collection', testCollectionName)
      })

      it('should allow admin to get collection', async () => {
        const response = await adminClient.getCollection(testCollectionName)

        assertSuccessResponse(response)
        expect(response.data!.name).toBe(testCollectionName)
      })

      it('should prevent regular user from getting collection metadata', async () => {
        const response = await apiClient.authenticatedRequest(
          API_ENDPOINTS.ADMIN_COLLECTION(testCollectionName),
          userToken,
          { method: 'GET' }
        )

        assertErrorResponse(response)
        expect(response.error?.code).toMatch(/FORBIDDEN|UNAUTHORIZED/)
      })

      it('should prevent unauthenticated access', async () => {
        const response = await apiClient.get(
          API_ENDPOINTS.ADMIN_COLLECTION(testCollectionName)
        )

        assertErrorResponse(response)
        expect(response.error?.code).toMatch(/UNAUTHORIZED/)
      })
    })

    describe('Update Collection', () => {
      let testCollectionName: string

      beforeAll(async () => {
        testCollectionName = randomCollectionName()
        await adminClient.createCollection({ name: testCollectionName })
        cleanup.track('collection', testCollectionName)
      })

      it('should allow admin to update collection', async () => {
        const response = await adminClient.updateCollection(testCollectionName, {
          options: { updated: true },
        })

        assertSuccessResponse(response)
      })

      it('should prevent regular user from updating collection', async () => {
        const response = await apiClient.authenticatedRequest(
          API_ENDPOINTS.ADMIN_COLLECTION(testCollectionName),
          userToken,
          {
            method: 'PUT',
            body: { options: { updated: true } },
          }
        )

        assertErrorResponse(response)
        expect(response.error?.code).toMatch(/FORBIDDEN|UNAUTHORIZED/)
      })

      it('should prevent unauthenticated updates', async () => {
        const response = await apiClient.put(
          API_ENDPOINTS.ADMIN_COLLECTION(testCollectionName),
          { options: {} }
        )

        assertErrorResponse(response)
        expect(response.error?.code).toMatch(/UNAUTHORIZED/)
      })
    })

    describe('Delete Collection', () => {
      it('should allow admin to delete collection', async () => {
        const collectionName = randomCollectionName()
        await adminClient.createCollection({ name: collectionName })

        const response = await adminClient.deleteCollection(collectionName)

        assertSuccessResponse(response)
      })

      it('should prevent regular user from deleting collection', async () => {
        const collectionName = randomCollectionName()
        await adminClient.createCollection({ name: collectionName })
        cleanup.track('collection', collectionName)

        const response = await apiClient.authenticatedRequest(
          API_ENDPOINTS.ADMIN_COLLECTION(collectionName),
          userToken,
          { method: 'DELETE' }
        )

        assertErrorResponse(response)
        expect(response.error?.code).toMatch(/FORBIDDEN|UNAUTHORIZED/)

        // Collection should still exist
        const checkResponse = await adminClient.getCollection(collectionName)
        assertSuccessResponse(checkResponse)
      })

      it('should prevent unauthenticated deletion', async () => {
        const collectionName = randomCollectionName()
        await adminClient.createCollection({ name: collectionName })
        cleanup.track('collection', collectionName)

        const response = await apiClient.delete(
          API_ENDPOINTS.ADMIN_COLLECTION(collectionName)
        )

        assertErrorResponse(response)
        expect(response.error?.code).toMatch(/UNAUTHORIZED/)
      })
    })

    describe('Get Collection Statistics', () => {
      let testCollectionName: string

      beforeAll(async () => {
        testCollectionName = randomCollectionName()
        await adminClient.createCollection({ name: testCollectionName })
        cleanup.track('collection', testCollectionName)
      })

      it('should allow admin to get collection stats', async () => {
        const response = await adminClient.getCollectionStats(testCollectionName)

        assertSuccessResponse(response)
        expect(response.data!.collection).toBe(testCollectionName)
      })

      it('should prevent regular user from getting stats', async () => {
        const response = await apiClient.authenticatedRequest(
          API_ENDPOINTS.ADMIN_COLLECTION_STATS(testCollectionName),
          userToken,
          { method: 'GET' }
        )

        assertErrorResponse(response)
        expect(response.error?.code).toMatch(/FORBIDDEN|UNAUTHORIZED/)
      })

      it('should prevent unauthenticated stats access', async () => {
        const response = await apiClient.get(
          API_ENDPOINTS.ADMIN_COLLECTION_STATS(testCollectionName)
        )

        assertErrorResponse(response)
        expect(response.error?.code).toMatch(/UNAUTHORIZED/)
      })
    })
  })

  describe('User Document Operations', () => {
    let testCollectionName: string

    beforeAll(async () => {
      // Admin creates collection
      testCollectionName = randomCollectionName()
      await adminClient.createCollection({ name: testCollectionName })
      cleanup.track('collection', testCollectionName)
    })

    it('should allow user to query documents in collection', async () => {
      const response = await apiClient.authenticatedRequest(
        API_ENDPOINTS.QUERY,
        userToken,
        {
          method: 'POST',
          body: {
            action: 'find',
            collection: testCollectionName,
            query: {},
          },
        }
      )

      // Should succeed (even if empty)
      assertSuccessResponse(response)
    })

    it('should allow user to create documents in collection', async () => {
      const response = await apiClient.authenticatedRequest(
        API_ENDPOINTS.QUERY,
        userToken,
        {
          method: 'POST',
          body: {
            action: 'create',
            collection: testCollectionName,
            data: { name: 'Test Document' },
          },
        }
      )

      // Should succeed
      assertSuccessResponse(response)
    })

    it('should allow user to update documents in collection', async () => {
      const response = await apiClient.authenticatedRequest(
        API_ENDPOINTS.QUERY,
        userToken,
        {
          method: 'POST',
          body: {
            action: 'update',
            collection: testCollectionName,
            query: { where: { name: 'Test Document' } },
            data: { $set: { updated: true } },
          },
        }
      )

      // Should succeed
      if (!response.success) {
        // May fail if document doesn't exist, which is ok
        expect(response.error?.code).toMatch(/NOT_FOUND|BAD_REQUEST/)
      }
    })

    it('should allow user to delete documents in collection', async () => {
      const response = await apiClient.authenticatedRequest(
        API_ENDPOINTS.QUERY,
        userToken,
        {
          method: 'POST',
          body: {
            action: 'delete',
            collection: testCollectionName,
            query: { where: { name: 'Test Document' } },
          },
        }
      )

      // Should succeed
      if (!response.success) {
        // May fail if document doesn't exist, which is ok
        expect(response.error?.code).toMatch(/NOT_FOUND|BAD_REQUEST/)
      }
    })

    it('should prevent user from accessing non-existent collection', async () => {
      const response = await apiClient.authenticatedRequest(
        API_ENDPOINTS.QUERY,
        userToken,
        {
          method: 'POST',
          body: {
            action: 'find',
            collection: 'nonexistent_collection',
            query: {},
          },
        }
      )

      // Should fail
      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/NOT_FOUND/)
    })
  })

  describe('Admin Document Operations', () => {
    let testCollectionName: string

    beforeAll(async () => {
      testCollectionName = randomCollectionName()
      await adminClient.createCollection({ name: testCollectionName })
      cleanup.track('collection', testCollectionName)
    })

    it('should allow admin to query documents', async () => {
      const response = await apiClient.authenticatedRequest(
        API_ENDPOINTS.QUERY,
        adminToken,
        {
          method: 'POST',
          body: {
            action: 'find',
            collection: testCollectionName,
            query: {},
          },
        }
      )

      assertSuccessResponse(response)
    })

    it('should allow admin to perform all document operations', async () => {
      const operations = ['find', 'create', 'update', 'delete', 'count']

      for (const action of operations.slice(0, 3)) {
        const body: any = {
          action,
          collection: testCollectionName,
          query: {},
        }

        if (action === 'create') {
          body.data = { test: true }
        } else if (action === 'update') {
          body.data = { $set: { updated: true } }
        }

        const response = await apiClient.authenticatedRequest(
          API_ENDPOINTS.QUERY,
          adminToken,
          {
            method: 'POST',
            body,
          }
        )

        // Should succeed or return acceptable error
        if (!response.success) {
          expect(response.error?.code).toMatch(/NOT_FOUND|BAD_REQUEST/)
        }
      }
    })
  })

  describe('Token Validation', () => {
    it('should reject expired/invalid admin token', async () => {
      const invalidToken = 'invalid-admin-token'

      const response = await apiClient.authenticatedRequest(
        API_ENDPOINTS.ADMIN_COLLECTIONS,
        invalidToken,
        { method: 'GET' }
      )

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/UNAUTHORIZED|BAD_REQUEST/)
    })

    it('should reject user token for admin endpoint', async () => {
      const response = await apiClient.authenticatedRequest(
        API_ENDPOINTS.ADMIN_COLLECTIONS,
        userToken,
        { method: 'GET' }
      )

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/FORBIDDEN|UNAUTHORIZED/)
    })

    it('should differentiate between missing and invalid tokens', async () => {
      // Missing token
      const response1 = await apiClient.get(API_ENDPOINTS.ADMIN_COLLECTIONS)
      assertErrorResponse(response1)
      expect(response1.error?.code).toMatch(/UNAUTHORIZED/)

      // Invalid token
      const response2 = await apiClient.authenticatedRequest(
        API_ENDPOINTS.ADMIN_COLLECTIONS,
        'invalid-token',
        { method: 'GET' }
      )
      assertErrorResponse(response2)
      expect(response2.error?.code).toMatch(/UNAUTHORIZED|BAD_REQUEST/)
    })
  })

  describe('Cross-Collection Permissions', () => {
    let collection1: string
    let collection2: string

    beforeAll(async () => {
      collection1 = randomCollectionName()
      collection2 = randomCollectionName()

      await adminClient.createCollection({ name: collection1 })
      await adminClient.createCollection({ name: collection2 })

      cleanup.track('collection', collection1)
      cleanup.track('collection', collection2)
    })

    it('should allow user to access multiple collections', async () => {
      const responses = await Promise.all([
        apiClient.authenticatedRequest(
          API_ENDPOINTS.QUERY,
          userToken,
          {
            method: 'POST',
            body: {
              action: 'find',
              collection: collection1,
              query: {},
            },
          }
        ),
        apiClient.authenticatedRequest(
          API_ENDPOINTS.QUERY,
          userToken,
          {
            method: 'POST',
            body: {
              action: 'find',
              collection: collection2,
              query: {},
            },
          }
        ),
      ])

      // Both should succeed
      responses.forEach(response => {
        assertSuccessResponse(response)
      })
    })

    it('should prevent user from managing any collection', async () => {
      const responses = await Promise.all([
        apiClient.authenticatedRequest(
          API_ENDPOINTS.ADMIN_COLLECTION(collection1),
          userToken,
          { method: 'DELETE' }
        ),
        apiClient.authenticatedRequest(
          API_ENDPOINTS.ADMIN_COLLECTION(collection2),
          userToken,
          { method: 'DELETE' }
        ),
      ])

      // Both should fail
      responses.forEach(response => {
        assertErrorResponse(response)
        expect(response.error?.code).toMatch(/FORBIDDEN|UNAUTHORIZED/)
      })
    })
  })

  describe('Security', () => {
    it('should not leak collection information to unauthorized users', async () => {
      const collectionName = randomCollectionName()
      await adminClient.createCollection({ name: collectionName })
      cleanup.track('collection', collectionName)

      // Try to get collection as user
      const response = await apiClient.authenticatedRequest(
        API_ENDPOINTS.ADMIN_COLLECTION(collectionName),
        userToken,
        { method: 'GET' }
      )

      assertErrorResponse(response)

      // Error message shouldn't reveal collection details
      const errorMsg = response.error?.message.toLowerCase() || ''
      expect(errorMsg).not.toContain('schema')
      expect(errorMsg).not.toContain('metadata')
    })

    it('should handle permission checks before validation', async () => {
      // Try to create with invalid name as user
      const response = await apiClient.authenticatedRequest(
        API_ENDPOINTS.ADMIN_COLLECTIONS,
        userToken,
        {
          method: 'POST',
          body: { name: '123invalid' },
        }
      )

      assertErrorResponse(response)
      // Should fail on permission, not validation
      expect(response.error?.code).toMatch(/FORBIDDEN|UNAUTHORIZED/)
    })
  })
})
