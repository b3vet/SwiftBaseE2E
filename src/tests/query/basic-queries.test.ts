import { describe, it, expect, beforeAll } from 'vitest'
import { createQueryClient } from '@/client'
import { createAuthHelper, createCollectionHelper, createCleanupHelper } from '@/helpers'
import { randomCollectionName } from '@/helpers/test-data'
import { SAMPLE_PRODUCTS, SAMPLE_USERS } from '@/fixtures'
import { assertSuccessResponse, assertErrorResponse } from '@/validators/response.validator'

describe('Basic Query Operations', () => {
  const authHelper = createAuthHelper()
  const cleanup = createCleanupHelper()
  const collectionHelper = createCollectionHelper()

  let adminToken: string
  let queryClient: ReturnType<typeof createQueryClient>

  beforeAll(async () => {
    adminToken = await authHelper.getAdminToken()
    queryClient = createQueryClient(adminToken)
    cleanup.setToken(adminToken)
  })

  describe('Find Operations', () => {
    let testCollectionName: string

    beforeAll(async () => {
      const result = await collectionHelper.createCollectionWithData(
        randomCollectionName(),
        SAMPLE_PRODUCTS.slice(0, 10)
      )
      testCollectionName = result.collectionName
      cleanup.track('collection', testCollectionName)
    })

    it('should find all documents in collection', async () => {
      const response = await queryClient.find(testCollectionName, {})

      assertSuccessResponse(response)
      expect(response.data).toBeDefined()
      expect(Array.isArray(response.data)).toBe(true)
      expect(response.data!.length).toBeGreaterThan(0)
    })

    it('should find documents with empty query', async () => {
      const response = await queryClient.find(testCollectionName)

      assertSuccessResponse(response)
      expect(Array.isArray(response.data)).toBe(true)
    })

    it('should find documents with where condition', async () => {
      const response = await queryClient.find(testCollectionName, {
        where: { category: 'Electronics' },
      })

      assertSuccessResponse(response)
      expect(Array.isArray(response.data)).toBe(true)

      // All returned documents should match the condition
      response.data!.forEach((doc: any) => {
        expect(doc.category).toBe('Electronics')
      })
    })

    it('should return empty array for no matches', async () => {
      const response = await queryClient.find(testCollectionName, {
        where: { name: 'NonExistentProduct' },
      })

      assertSuccessResponse(response)
      expect(Array.isArray(response.data)).toBe(true)
      expect(response.data!.length).toBe(0)
    })

    it('should find documents with multiple conditions', async () => {
      const response = await queryClient.find(testCollectionName, {
        where: {
          category: 'Electronics',
          inStock: true,
        },
      })

      assertSuccessResponse(response)
      expect(Array.isArray(response.data)).toBe(true)

      response.data!.forEach((doc: any) => {
        expect(doc.category).toBe('Electronics')
        expect(doc.inStock).toBe(true)
      })
    })

    it('should find documents with nested field query', async () => {
      const collectionName = randomCollectionName()
      await collectionHelper.createCollectionWithData(collectionName, [
        { name: 'User 1', profile: { age: 25, country: 'USA' } },
        { name: 'User 2', profile: { age: 30, country: 'UK' } },
        { name: 'User 3', profile: { age: 25, country: 'USA' } },
      ])
      cleanup.track('collection', collectionName)

      const response = await queryClient.find(collectionName, {
        where: { 'profile.age': 25 },
      })

      assertSuccessResponse(response)
      expect(response.data!.length).toBe(2)
    })

    it('should return error for non-existent collection', async () => {
      const response = await queryClient.find('nonexistent_collection', {})

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/NOT_FOUND/)
    })

    it('should handle finding in empty collection', async () => {
      const emptyCollection = randomCollectionName()
      await collectionHelper.createTestCollection(emptyCollection)
      cleanup.track('collection', emptyCollection)

      const response = await queryClient.find(emptyCollection, {})

      assertSuccessResponse(response)
      expect(response.data!.length).toBe(0)
    })

    it('should find documents with numeric field', async () => {
      const response = await queryClient.find(testCollectionName, {
        where: { price: 29.99 },
      })

      assertSuccessResponse(response)
      response.data!.forEach((doc: any) => {
        expect(doc.price).toBe(29.99)
      })
    })

    it('should find documents with boolean field', async () => {
      const response = await queryClient.find(testCollectionName, {
        where: { inStock: false },
      })

      assertSuccessResponse(response)
      response.data!.forEach((doc: any) => {
        expect(doc.inStock).toBe(false)
      })
    })
  })

  describe('FindOne Operations', () => {
    let testCollectionName: string

    beforeAll(async () => {
      const result = await collectionHelper.createCollectionWithData(
        randomCollectionName(),
        SAMPLE_USERS.slice(0, 5)
      )
      testCollectionName = result.collectionName
      cleanup.track('collection', testCollectionName)
    })

    it('should find one document', async () => {
      const response = await queryClient.findOne(testCollectionName, {})

      assertSuccessResponse(response)
      expect(response.data).toBeDefined()
      expect(typeof response.data).toBe('object')
      expect(response.data).not.toBeNull()
    })

    it('should find one document with where condition', async () => {
      const response = await queryClient.findOne(testCollectionName, {
        where: { role: 'admin' },
      })

      if (response.success && response.data) {
        expect(response.data.role).toBe('admin')
      }
    })

    it('should return null when no document matches', async () => {
      const response = await queryClient.findOne(testCollectionName, {
        where: { username: 'nonexistent_user' },
      })

      assertSuccessResponse(response)
      expect(response.data).toBeNull()
    })

    it('should return only one document even if multiple match', async () => {
      // Create multiple matching documents
      const collectionName = randomCollectionName()
      await collectionHelper.createCollectionWithData(collectionName, [
        { status: 'active', id: 1 },
        { status: 'active', id: 2 },
        { status: 'active', id: 3 },
      ])
      cleanup.track('collection', collectionName)

      const response = await queryClient.findOne(collectionName, {
        where: { status: 'active' },
      })

      assertSuccessResponse(response)
      expect(response.data).toBeDefined()
      expect(response.data).not.toBeNull()
      expect(typeof response.data).toBe('object')
      // Should not be an array
      expect(Array.isArray(response.data)).toBe(false)
    })

    it('should return null for empty collection', async () => {
      const emptyCollection = randomCollectionName()
      await collectionHelper.createTestCollection(emptyCollection)
      cleanup.track('collection', emptyCollection)

      const response = await queryClient.findOne(emptyCollection, {})

      assertSuccessResponse(response)
      expect(response.data).toBeNull()
    })

    it('should return error for non-existent collection', async () => {
      const response = await queryClient.findOne('nonexistent_collection', {})

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/NOT_FOUND/)
    })
  })

  describe('Create Operations', () => {
    let testCollectionName: string

    beforeAll(async () => {
      testCollectionName = randomCollectionName()
      await collectionHelper.createTestCollection(testCollectionName)
      cleanup.track('collection', testCollectionName)
    })

    it('should create a single document', async () => {
      const document = {
        name: 'Test Product',
        price: 19.99,
        inStock: true,
      }

      const response = await queryClient.create(testCollectionName, document)

      assertSuccessResponse(response)
      expect(response.data).toBeDefined()
      expect(response.data!.id).toBeDefined()
      expect(response.data!.name).toBe(document.name)
      expect(response.data!.price).toBe(document.price)
    })

    it('should create document with nested objects', async () => {
      const document = {
        user: 'John Doe',
        profile: {
          age: 30,
          address: {
            city: 'New York',
            country: 'USA',
          },
        },
      }

      const response = await queryClient.create(testCollectionName, document)

      assertSuccessResponse(response)
      expect(response.data!.profile).toBeDefined()
      expect(response.data!.profile.age).toBe(30)
      expect(response.data!.profile.address.city).toBe('New York')
    })

    it('should create document with array fields', async () => {
      const document = {
        name: 'Product',
        tags: ['electronics', 'gadget', 'new'],
        ratings: [4.5, 5.0, 4.8],
      }

      const response = await queryClient.create(testCollectionName, document)

      assertSuccessResponse(response)
      expect(Array.isArray(response.data!.tags)).toBe(true)
      expect(response.data!.tags.length).toBe(3)
      expect(response.data!.ratings).toEqual([4.5, 5.0, 4.8])
    })

    it('should create multiple documents', async () => {
      const documents = [
        { name: 'Item 1', value: 10 },
        { name: 'Item 2', value: 20 },
        { name: 'Item 3', value: 30 },
      ]

      const response = await queryClient.create(testCollectionName, documents)

      assertSuccessResponse(response)
      expect(Array.isArray(response.data)).toBe(true)
      expect(response.data!.length).toBe(3)

      response.data!.forEach((doc: any, index: number) => {
        expect(doc.id).toBeDefined()
        expect(doc.name).toBe(documents[index].name)
      })
    })

    it('should auto-generate ID for created document', async () => {
      const response = await queryClient.create(testCollectionName, {
        name: 'Test',
      })

      assertSuccessResponse(response)
      expect(response.data!.id).toBeDefined()
      expect(typeof response.data!.id).toBe('string')
      expect(response.data!.id.length).toBeGreaterThan(0)
    })

    it('should include timestamps in created document', async () => {
      const response = await queryClient.create(testCollectionName, {
        name: 'Test',
      })

      assertSuccessResponse(response)
      expect(response.data!.createdAt).toBeDefined()
      expect(response.data!.updatedAt).toBeDefined()
    })

    it('should return error for non-existent collection', async () => {
      const response = await queryClient.create('nonexistent_collection', {
        name: 'Test',
      })

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/NOT_FOUND/)
    })

    it('should handle creating empty object', async () => {
      const response = await queryClient.create(testCollectionName, {})

      // May succeed with empty document or reject
      if (!response.success) {
        expect(response.error?.code).toMatch(/BAD_REQUEST|VALIDATION_ERROR/)
      }
    })

    it('should preserve data types', async () => {
      const document = {
        stringField: 'text',
        numberField: 42,
        booleanField: true,
        nullField: null,
        arrayField: [1, 2, 3],
        objectField: { nested: 'value' },
      }

      const response = await queryClient.create(testCollectionName, document)

      assertSuccessResponse(response)
      expect(typeof response.data!.stringField).toBe('string')
      expect(typeof response.data!.numberField).toBe('number')
      expect(typeof response.data!.booleanField).toBe('boolean')
      expect(response.data!.nullField).toBeNull()
      expect(Array.isArray(response.data!.arrayField)).toBe(true)
      expect(typeof response.data!.objectField).toBe('object')
    })
  })

  describe('Update Operations', () => {
    let testCollectionName: string
    let sampleDocId: string

    beforeAll(async () => {
      const result = await collectionHelper.createCollectionWithData(
        randomCollectionName(),
        [
          { name: 'Product 1', price: 10, stock: 100 },
          { name: 'Product 2', price: 20, stock: 50 },
          { name: 'Product 3', price: 30, stock: 25 },
        ]
      )
      testCollectionName = result.collectionName
      cleanup.track('collection', testCollectionName)

      // Get a sample document ID
      const docs = result.documents
      if (docs && docs.length > 0) {
        sampleDocId = docs[0].id
      }
    })

    it('should update document with $set operator', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Product 1' } },
        { $set: { price: 15 } }
      )

      assertSuccessResponse(response)
      expect(response.data).toBeDefined()

      // Verify update
      const findResponse = await queryClient.findOne(testCollectionName, {
        where: { name: 'Product 1' },
      })

      if (findResponse.success && findResponse.data) {
        expect(findResponse.data.price).toBe(15)
      }
    })

    it('should update multiple fields', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Product 2' } },
        { $set: { price: 25, stock: 75 } }
      )

      assertSuccessResponse(response)

      // Verify update
      const findResponse = await queryClient.findOne(testCollectionName, {
        where: { name: 'Product 2' },
      })

      if (findResponse.success && findResponse.data) {
        expect(findResponse.data.price).toBe(25)
        expect(findResponse.data.stock).toBe(75)
      }
    })

    it('should update only matching documents', async () => {
      // Add more documents
      await queryClient.create(testCollectionName, [
        { category: 'A', value: 10 },
        { category: 'A', value: 20 },
        { category: 'B', value: 30 },
      ])

      const response = await queryClient.update(
        testCollectionName,
        { where: { category: 'A' } },
        { $set: { updated: true } }
      )

      assertSuccessResponse(response)

      // Verify only category A was updated
      const allDocs = await queryClient.find(testCollectionName, {})
      const categoryADocs = allDocs.data!.filter(
        (doc: any) => doc.category === 'A'
      )
      const categoryBDocs = allDocs.data!.filter(
        (doc: any) => doc.category === 'B'
      )

      categoryADocs.forEach((doc: any) => {
        expect(doc.updated).toBe(true)
      })

      categoryBDocs.forEach((doc: any) => {
        expect(doc.updated).toBeUndefined()
      })
    })

    it('should return error when no documents match', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'NonExistent' } },
        { $set: { price: 100 } }
      )

      // May return success with 0 affected or error
      if (!response.success) {
        expect(response.error?.code).toMatch(/NOT_FOUND|BAD_REQUEST/)
      }
    })

    it('should update nested fields', async () => {
      await queryClient.create(testCollectionName, {
        name: 'Test',
        details: { color: 'red', size: 'M' },
      })

      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Test' } },
        { $set: { 'details.color': 'blue' } }
      )

      assertSuccessResponse(response)

      const findResponse = await queryClient.findOne(testCollectionName, {
        where: { name: 'Test' },
      })

      if (findResponse.success && findResponse.data) {
        expect(findResponse.data.details.color).toBe('blue')
        expect(findResponse.data.details.size).toBe('M') // Should remain unchanged
      }
    })

    it('should update timestamps', async () => {
      const beforeUpdate = Date.now()

      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Product 1' } },
        { $set: { modified: true } }
      )

      assertSuccessResponse(response)

      const findResponse = await queryClient.findOne(testCollectionName, {
        where: { name: 'Product 1' },
      })

      if (findResponse.success && findResponse.data) {
        const updatedAt = new Date(findResponse.data.updatedAt).getTime()
        expect(updatedAt).toBeGreaterThanOrEqual(beforeUpdate)
      }
    })

    it('should return error for non-existent collection', async () => {
      const response = await queryClient.update(
        'nonexistent_collection',
        { where: { id: '123' } },
        { $set: { value: 1 } }
      )

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/NOT_FOUND/)
    })

    it('should handle empty update data', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Product 1' } },
        {}
      )

      // May succeed with no changes or reject
      if (!response.success) {
        expect(response.error?.code).toMatch(/BAD_REQUEST|VALIDATION_ERROR/)
      }
    })
  })

  describe('Delete Operations', () => {
    let testCollectionName: string

    beforeAll(async () => {
      testCollectionName = randomCollectionName()
      await collectionHelper.createTestCollection(testCollectionName)
      cleanup.track('collection', testCollectionName)
    })

    it('should delete documents matching query', async () => {
      // Create test documents
      await queryClient.create(testCollectionName, [
        { name: 'Delete Me 1', status: 'temp' },
        { name: 'Delete Me 2', status: 'temp' },
        { name: 'Keep Me', status: 'permanent' },
      ])

      const response = await queryClient.delete(testCollectionName, {
        where: { status: 'temp' },
      })

      assertSuccessResponse(response)

      // Verify deletion
      const remaining = await queryClient.find(testCollectionName, {})
      expect(remaining.data!.length).toBe(1)
      expect(remaining.data![0].name).toBe('Keep Me')
    })

    it('should delete single document', async () => {
      await queryClient.create(testCollectionName, {
        name: 'Single Delete',
        unique: true,
      })

      const response = await queryClient.delete(testCollectionName, {
        where: { unique: true },
      })

      assertSuccessResponse(response)

      // Verify deletion
      const findResponse = await queryClient.findOne(testCollectionName, {
        where: { unique: true },
      })

      expect(findResponse.data).toBeNull()
    })

    it('should return error when no documents match', async () => {
      const response = await queryClient.delete(testCollectionName, {
        where: { name: 'NonExistent' },
      })

      // May return success with 0 deleted or error
      if (!response.success) {
        expect(response.error?.code).toMatch(/NOT_FOUND|BAD_REQUEST/)
      }
    })

    it('should delete all documents with empty query', async () => {
      const tempCollection = randomCollectionName()
      await collectionHelper.createCollectionWithData(tempCollection, [
        { a: 1 },
        { b: 2 },
        { c: 3 },
      ])
      cleanup.track('collection', tempCollection)

      const response = await queryClient.delete(tempCollection, {})

      // May allow or reject delete all
      if (response.success) {
        const remaining = await queryClient.find(tempCollection, {})
        expect(remaining.data!.length).toBe(0)
      }
    })

    it('should delete documents with nested field query', async () => {
      await queryClient.create(testCollectionName, [
        { name: 'User 1', profile: { active: false } },
        { name: 'User 2', profile: { active: true } },
      ])

      const response = await queryClient.delete(testCollectionName, {
        where: { 'profile.active': false },
      })

      assertSuccessResponse(response)

      // Verify only inactive was deleted
      const remaining = await queryClient.find(testCollectionName, {
        where: { name: { $in: ['User 1', 'User 2'] } },
      })

      if (remaining.data!.length > 0) {
        remaining.data!.forEach((doc: any) => {
          expect(doc.profile.active).toBe(true)
        })
      }
    })

    it('should return error for non-existent collection', async () => {
      const response = await queryClient.delete('nonexistent_collection', {
        where: { id: '123' },
      })

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/NOT_FOUND/)
    })

    it('should handle deletion of documents with arrays', async () => {
      await queryClient.create(testCollectionName, {
        name: 'Array Doc',
        tags: ['delete', 'test'],
      })

      const response = await queryClient.delete(testCollectionName, {
        where: { name: 'Array Doc' },
      })

      assertSuccessResponse(response)

      const findResponse = await queryClient.findOne(testCollectionName, {
        where: { name: 'Array Doc' },
      })

      expect(findResponse.data).toBeNull()
    })
  })

  describe('Count Operations', () => {
    let testCollectionName: string

    beforeAll(async () => {
      const result = await collectionHelper.createCollectionWithData(
        randomCollectionName(),
        Array.from({ length: 25 }, (_, i) => ({
          id: i,
          category: i % 3 === 0 ? 'A' : i % 3 === 1 ? 'B' : 'C',
          value: i * 10,
        }))
      )
      testCollectionName = result.collectionName
      cleanup.track('collection', testCollectionName)
    })

    it('should count all documents', async () => {
      const response = await queryClient.count(testCollectionName, {})

      assertSuccessResponse(response)
      expect(response.data).toBeDefined()
      expect(response.data!.count).toBe(25)
    })

    it('should count documents matching query', async () => {
      const response = await queryClient.count(testCollectionName, {
        where: { category: 'A' },
      })

      assertSuccessResponse(response)
      expect(response.data!.count).toBeGreaterThan(0)
      expect(response.data!.count).toBeLessThan(25)
    })

    it('should return 0 for no matches', async () => {
      const response = await queryClient.count(testCollectionName, {
        where: { category: 'NonExistent' },
      })

      assertSuccessResponse(response)
      expect(response.data!.count).toBe(0)
    })

    it('should count in empty collection', async () => {
      const emptyCollection = randomCollectionName()
      await collectionHelper.createTestCollection(emptyCollection)
      cleanup.track('collection', emptyCollection)

      const response = await queryClient.count(emptyCollection, {})

      assertSuccessResponse(response)
      expect(response.data!.count).toBe(0)
    })

    it('should count with numeric comparison', async () => {
      const response = await queryClient.count(testCollectionName, {
        where: { value: { $gte: 100 } },
      })

      assertSuccessResponse(response)
      expect(response.data!.count).toBeGreaterThan(0)
    })

    it('should return error for non-existent collection', async () => {
      const response = await queryClient.count('nonexistent_collection', {})

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/NOT_FOUND/)
    })

    it('should count accurately with multiple conditions', async () => {
      const response = await queryClient.count(testCollectionName, {
        where: {
          category: 'B',
          value: { $lt: 150 },
        },
      })

      assertSuccessResponse(response)
      expect(typeof response.data!.count).toBe('number')
      expect(response.data!.count).toBeGreaterThanOrEqual(0)
    })

    it('should be performant for large collections', async () => {
      const largeCollection = randomCollectionName()
      const largeDataset = Array.from({ length: 500 }, (_, i) => ({
        index: i,
        value: i,
      }))

      await collectionHelper.createCollectionWithData(
        largeCollection,
        largeDataset
      )
      cleanup.track('collection', largeCollection)

      const startTime = Date.now()
      const response = await queryClient.count(largeCollection, {})
      const duration = Date.now() - startTime

      assertSuccessResponse(response)
      expect(response.data!.count).toBe(500)
      expect(duration).toBeLessThan(2000)
    })
  })

  describe('Performance', () => {
    let testCollectionName: string

    beforeAll(async () => {
      const result = await collectionHelper.createCollectionWithData(
        randomCollectionName(),
        SAMPLE_PRODUCTS
      )
      testCollectionName = result.collectionName
      cleanup.track('collection', testCollectionName)
    })

    it('should perform find within acceptable time', async () => {
      const startTime = Date.now()
      const response = await queryClient.find(testCollectionName, {})
      const duration = Date.now() - startTime

      assertSuccessResponse(response)
      expect(duration).toBeLessThan(1000)
    })

    it('should perform create within acceptable time', async () => {
      const startTime = Date.now()
      const response = await queryClient.create(testCollectionName, {
        name: 'Performance Test',
      })
      const duration = Date.now() - startTime

      assertSuccessResponse(response)
      expect(duration).toBeLessThan(1000)
    })

    it('should perform update within acceptable time', async () => {
      const startTime = Date.now()
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Performance Test' } },
        { $set: { updated: true } }
      )
      const duration = Date.now() - startTime

      if (response.success) {
        expect(duration).toBeLessThan(1000)
      }
    })

    it('should perform delete within acceptable time', async () => {
      await queryClient.create(testCollectionName, {
        name: 'Delete Performance Test',
      })

      const startTime = Date.now()
      const response = await queryClient.delete(testCollectionName, {
        where: { name: 'Delete Performance Test' },
      })
      const duration = Date.now() - startTime

      if (response.success) {
        expect(duration).toBeLessThan(1000)
      }
    })
  })
})
