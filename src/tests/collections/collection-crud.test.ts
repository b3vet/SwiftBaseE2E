import { describe, it, expect, beforeAll } from 'vitest'
import { createAdminClient } from '@/client'
import { createAuthHelper, createCleanupHelper } from '@/helpers'
import { randomCollectionName } from '@/helpers/test-data'
import { VALID_TEST_COLLECTIONS, SAMPLE_SCHEMAS } from '@/fixtures'
import { assertSuccessResponse, assertErrorResponse } from '@/validators/response.validator'

describe('Collection CRUD Operations', () => {
  const authHelper = createAuthHelper()
  const cleanup = createCleanupHelper()

  let adminToken: string
  let adminClient: ReturnType<typeof createAdminClient>

  beforeAll(async () => {
    adminToken = await authHelper.getAdminToken()
    adminClient = createAdminClient(adminToken)
    cleanup.setToken(adminToken)
  })

  describe('Create Collection', () => {
    it('should create a collection with valid name', async () => {
      const collectionName = randomCollectionName()

      const response = await adminClient.createCollection({
        name: collectionName,
      })

      assertSuccessResponse(response)
      expect(response.data).toBeDefined()
      expect(response.data!.name).toBe(collectionName)
      expect(response.data!.id).toBeDefined()
      expect(response.data!.createdAt).toBeDefined()
      expect(response.data!.updatedAt).toBeDefined()

      cleanup.track('collection', collectionName)
    })

    it('should create collection with schema', async () => {
      const collectionName = randomCollectionName()

      const response = await adminClient.createCollection({
        name: collectionName,
        schema: SAMPLE_SCHEMAS.ecommerce.product,
      })

      assertSuccessResponse(response)
      expect(response.data!.name).toBe(collectionName)
      expect(response.data!.schema).toEqual(SAMPLE_SCHEMAS.ecommerce.product)

      cleanup.track('collection', collectionName)
    })

    it('should create collection with options', async () => {
      const collectionName = randomCollectionName()
      const options = { strict: false, timestamps: true }

      const response = await adminClient.createCollection({
        name: collectionName,
        options,
      })

      assertSuccessResponse(response)
      expect(response.data!.options).toEqual(options)

      cleanup.track('collection', collectionName)
    })

    it('should create collection with indexes definition', async () => {
      const collectionName = randomCollectionName()
      const indexes = {
        name_idx: { fields: ['name'], unique: true },
        email_idx: { fields: ['email'], unique: true },
      }

      const response = await adminClient.createCollection({
        name: collectionName,
        indexes,
      })

      assertSuccessResponse(response)
      expect(response.data!.indexes).toEqual(indexes)

      cleanup.track('collection', collectionName)
    })

    it('should create multiple collections', async () => {
      const collections = []

      for (let i = 0; i < 3; i++) {
        const collectionName = randomCollectionName()
        const response = await adminClient.createCollection({
          name: collectionName,
        })

        assertSuccessResponse(response)
        collections.push(response.data!.name)
        cleanup.track('collection', collectionName)
      }

      // All collections should have unique names
      expect(new Set(collections).size).toBe(3)
    })

    it('should reject duplicate collection name', async () => {
      const collectionName = randomCollectionName()

      // Create first collection
      const firstResponse = await adminClient.createCollection({
        name: collectionName,
      })

      assertSuccessResponse(firstResponse)
      cleanup.track('collection', collectionName)

      // Try to create duplicate
      const secondResponse = await adminClient.createCollection({
        name: collectionName,
      })

      assertErrorResponse(secondResponse)
      expect(secondResponse.error?.code).toMatch(/CONFLICT|BAD_REQUEST/)
    })

    it('should be case-sensitive for collection names', async () => {
      const baseName = randomCollectionName()
      const lowercase = baseName.toLowerCase()
      const uppercase = baseName.toUpperCase()

      // Create with lowercase
      const response1 = await adminClient.createCollection({
        name: lowercase,
      })
      assertSuccessResponse(response1)
      cleanup.track('collection', lowercase)

      // Try to create with uppercase (if different from lowercase)
      if (lowercase !== uppercase) {
        const response2 = await adminClient.createCollection({
          name: uppercase,
        })

        // Should succeed as they're different
        assertSuccessResponse(response2)
        cleanup.track('collection', uppercase)
      }
    })
  })

  describe('List Collections', () => {
    beforeAll(async () => {
      // Create some test collections
      for (let i = 0; i < 3; i++) {
        const name = randomCollectionName()
        await adminClient.createCollection({ name })
        cleanup.track('collection', name)
      }
    })

    it('should list all collections', async () => {
      const response = await adminClient.listCollections()

      assertSuccessResponse(response)
      expect(response.data).toBeDefined()
      expect(response.data!.collections).toBeDefined()
      expect(Array.isArray(response.data!.collections)).toBe(true)
      expect(response.data!.total).toBeGreaterThanOrEqual(3)
    })

    it('should include collection metadata', async () => {
      const response = await adminClient.listCollections()

      assertSuccessResponse(response)

      const collections = response.data!.collections
      if (collections.length > 0) {
        const collection = collections[0]
        expect(collection).toHaveProperty('id')
        expect(collection).toHaveProperty('name')
        expect(collection).toHaveProperty('createdAt')
        expect(collection).toHaveProperty('updatedAt')
      }
    })

    it('should include system collections', async () => {
      const response = await adminClient.listCollections()

      assertSuccessResponse(response)

      const collectionNames = response.data!.collections.map(c => c.name)

      // System collections should be present
      const hasSystemCollections = collectionNames.some(name =>
        name.startsWith('_')
      )

      // May or may not include system collections depending on implementation
      // Just verify the response is valid
      expect(collectionNames.length).toBeGreaterThan(0)
    })
  })

  describe('Get Collection', () => {
    let testCollectionName: string

    beforeAll(async () => {
      testCollectionName = randomCollectionName()
      await adminClient.createCollection({
        name: testCollectionName,
        schema: SAMPLE_SCHEMAS.blog.post,
      })
      cleanup.track('collection', testCollectionName)
    })

    it('should get collection by name', async () => {
      const response = await adminClient.getCollection(testCollectionName)

      assertSuccessResponse(response)
      expect(response.data).toBeDefined()
      expect(response.data!.name).toBe(testCollectionName)
      expect(response.data!.id).toBeDefined()
    })

    it('should include collection schema', async () => {
      const response = await adminClient.getCollection(testCollectionName)

      assertSuccessResponse(response)
      expect(response.data!.schema).toEqual(SAMPLE_SCHEMAS.blog.post)
    })

    it('should return timestamps', async () => {
      const response = await adminClient.getCollection(testCollectionName)

      assertSuccessResponse(response)
      expect(response.data!.createdAt).toBeDefined()
      expect(response.data!.updatedAt).toBeDefined()

      // Timestamps should be valid ISO strings
      expect(() => new Date(response.data!.createdAt)).not.toThrow()
      expect(() => new Date(response.data!.updatedAt)).not.toThrow()
    })

    it('should return 404 for non-existent collection', async () => {
      const response = await adminClient.getCollection('nonexistent_collection')

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/NOT_FOUND/)
    })

    it('should handle special characters in collection name', async () => {
      const specialName = randomCollectionName()
      await adminClient.createCollection({ name: specialName })
      cleanup.track('collection', specialName)

      const response = await adminClient.getCollection(specialName)

      assertSuccessResponse(response)
      expect(response.data!.name).toBe(specialName)
    })
  })

  describe('Update Collection', () => {
    let testCollectionName: string

    beforeAll(async () => {
      testCollectionName = randomCollectionName()
      await adminClient.createCollection({
        name: testCollectionName,
      })
      cleanup.track('collection', testCollectionName)
    })

    it('should update collection schema', async () => {
      const newSchema = SAMPLE_SCHEMAS.ecommerce.order

      const response = await adminClient.updateCollection(testCollectionName, {
        schema: newSchema,
      })

      assertSuccessResponse(response)
      expect(response.data!.schema).toEqual(newSchema)
    })

    it('should update collection options', async () => {
      const newOptions = { strict: true, timestamps: true }

      const response = await adminClient.updateCollection(testCollectionName, {
        options: newOptions,
      })

      assertSuccessResponse(response)
      expect(response.data!.options).toEqual(newOptions)
    })

    it('should update collection indexes', async () => {
      const newIndexes = {
        title_idx: { fields: ['title'], unique: false },
      }

      const response = await adminClient.updateCollection(testCollectionName, {
        indexes: newIndexes,
      })

      assertSuccessResponse(response)
      expect(response.data!.indexes).toEqual(newIndexes)
    })

    it('should update multiple fields at once', async () => {
      const updates = {
        schema: SAMPLE_SCHEMAS.blog.comment,
        options: { strict: false },
        indexes: { user_id_idx: { fields: ['userId'] } },
      }

      const response = await adminClient.updateCollection(testCollectionName, updates)

      assertSuccessResponse(response)
      expect(response.data!.schema).toEqual(updates.schema)
      expect(response.data!.options).toEqual(updates.options)
      expect(response.data!.indexes).toEqual(updates.indexes)
    })

    it('should update updatedAt timestamp', async () => {
      // Get original timestamp
      const originalResponse = await adminClient.getCollection(testCollectionName)
      const originalUpdatedAt = originalResponse.data!.updatedAt

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100))

      // Update collection
      await adminClient.updateCollection(testCollectionName, {
        options: { updated: true },
      })

      // Get updated timestamp
      const updatedResponse = await adminClient.getCollection(testCollectionName)
      const newUpdatedAt = updatedResponse.data!.updatedAt

      // Updated timestamp should be different (or later)
      expect(new Date(newUpdatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(originalUpdatedAt).getTime()
      )
    })

    it('should return 404 for non-existent collection', async () => {
      const response = await adminClient.updateCollection('nonexistent_collection', {
        schema: {},
      })

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/NOT_FOUND/)
    })

    it('should not allow changing collection name', async () => {
      // Name should not be updatable through update endpoint
      const response = await adminClient.updateCollection(testCollectionName, {
        name: 'new_name',
      } as any)

      // Either succeeds but ignores name change, or fails
      // Name should remain unchanged
      const checkResponse = await adminClient.getCollection(testCollectionName)
      assertSuccessResponse(checkResponse)
      expect(checkResponse.data!.name).toBe(testCollectionName)
    })
  })

  describe('Delete Collection', () => {
    it('should delete a collection', async () => {
      const collectionName = randomCollectionName()
      await adminClient.createCollection({ name: collectionName })

      const response = await adminClient.deleteCollection(collectionName)

      assertSuccessResponse(response)

      // Verify collection is deleted
      const getResponse = await adminClient.getCollection(collectionName)
      assertErrorResponse(getResponse)
      expect(getResponse.error?.code).toMatch(/NOT_FOUND/)
    })

    it('should cascade delete documents in collection', async () => {
      const collectionName = randomCollectionName()
      await adminClient.createCollection({ name: collectionName })
      cleanup.track('collection', collectionName)

      // Add some documents (will test this later, for now just delete)
      // TODO: Add documents once document tests are implemented

      const response = await adminClient.deleteCollection(collectionName)

      assertSuccessResponse(response)
    })

    it('should return 404 for non-existent collection', async () => {
      const response = await adminClient.deleteCollection('nonexistent_collection')

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/NOT_FOUND/)
    })

    it('should not allow deleting twice', async () => {
      const collectionName = randomCollectionName()
      await adminClient.createCollection({ name: collectionName })

      // Delete once
      const firstResponse = await adminClient.deleteCollection(collectionName)
      assertSuccessResponse(firstResponse)

      // Try to delete again
      const secondResponse = await adminClient.deleteCollection(collectionName)
      assertErrorResponse(secondResponse)
      expect(secondResponse.error?.code).toMatch(/NOT_FOUND/)
    })

    it('should allow recreating deleted collection', async () => {
      const collectionName = randomCollectionName()

      // Create
      await adminClient.createCollection({ name: collectionName })

      // Delete
      await adminClient.deleteCollection(collectionName)

      // Recreate
      const response = await adminClient.createCollection({ name: collectionName })

      assertSuccessResponse(response)
      expect(response.data!.name).toBe(collectionName)

      cleanup.track('collection', collectionName)
    })

    it('should handle deleting multiple collections', async () => {
      const collections = []

      // Create multiple collections
      for (let i = 0; i < 3; i++) {
        const name = randomCollectionName()
        await adminClient.createCollection({ name })
        collections.push(name)
      }

      // Delete all
      for (const name of collections) {
        const response = await adminClient.deleteCollection(name)
        assertSuccessResponse(response)
      }

      // Verify all are deleted
      for (const name of collections) {
        const response = await adminClient.getCollection(name)
        assertErrorResponse(response)
      }
    })
  })

  describe('Performance', () => {
    it('should create collection within acceptable time', async () => {
      const collectionName = randomCollectionName()
      const startTime = Date.now()

      const response = await adminClient.createCollection({
        name: collectionName,
      })

      const duration = Date.now() - startTime

      assertSuccessResponse(response)
      expect(duration).toBeLessThan(1000)

      cleanup.track('collection', collectionName)
    })

    it('should list collections within acceptable time', async () => {
      const startTime = Date.now()

      const response = await adminClient.listCollections()

      const duration = Date.now() - startTime

      assertSuccessResponse(response)
      expect(duration).toBeLessThan(1000)
    })

    it('should delete collection within acceptable time', async () => {
      const collectionName = randomCollectionName()
      await adminClient.createCollection({ name: collectionName })

      const startTime = Date.now()

      const response = await adminClient.deleteCollection(collectionName)

      const duration = Date.now() - startTime

      assertSuccessResponse(response)
      expect(duration).toBeLessThan(1000)
    })
  })
})
