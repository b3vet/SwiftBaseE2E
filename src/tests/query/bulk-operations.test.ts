import { describe, it, expect, beforeAll } from 'vitest'
import { createQueryClient } from '@/client'
import { createAuthHelper, createCollectionHelper, createCleanupHelper } from '@/helpers'
import { randomCollectionName } from '@/helpers/test-data'
import { SAMPLE_PRODUCTS, SAMPLE_USERS } from '@/fixtures'
import { assertSuccessResponse, assertErrorResponse } from '@/validators/response.validator'

describe('Bulk Operations', () => {
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

  describe('Bulk Insert', () => {
    let testCollectionName: string

    beforeAll(async () => {
      testCollectionName = randomCollectionName()
      await collectionHelper.createTestCollection(testCollectionName)
      cleanup.track('collection', testCollectionName)
    })

    it('should insert multiple documents at once', async () => {
      const documents = [
        { name: 'Item 1', value: 10 },
        { name: 'Item 2', value: 20 },
        { name: 'Item 3', value: 30 },
      ]

      const response = await queryClient.create(testCollectionName, documents)

      assertSuccessResponse(response)
      expect(Array.isArray(response.data)).toBe(true)
      expect(response.data!.length).toBe(3)

      // Each document should have an ID
      response.data!.forEach((doc: any, index: number) => {
        expect(doc.id).toBeDefined()
        expect(doc.name).toBe(documents[index].name)
        expect(doc.value).toBe(documents[index].value)
      })
    })

    it('should insert large batch of documents', async () => {
      const largeBatch = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: i * 10,
      }))

      const response = await queryClient.create(testCollectionName, largeBatch)

      assertSuccessResponse(response)
      expect(response.data!.length).toBe(100)
    })

    it('should insert documents with varying structures', async () => {
      const documents = [
        { type: 'A', field1: 'value1' },
        { type: 'B', field2: 'value2', field3: 100 },
        { type: 'C', nested: { data: 'value' } },
      ]

      const response = await queryClient.create(testCollectionName, documents)

      assertSuccessResponse(response)
      expect(response.data!.length).toBe(3)

      expect(response.data![0]).toHaveProperty('field1')
      expect(response.data![1]).toHaveProperty('field2')
      expect(response.data![2]).toHaveProperty('nested')
    })

    it('should handle empty array', async () => {
      const response = await queryClient.create(testCollectionName, [])

      // May succeed with empty array or reject
      if (!response.success) {
        expect(response.error?.code).toMatch(/BAD_REQUEST|VALIDATION_ERROR/)
      } else {
        expect(Array.isArray(response.data)).toBe(true)
        expect(response.data!.length).toBe(0)
      }
    })

    it('should preserve insertion order', async () => {
      const orderedDocs = [
        { order: 1, name: 'First' },
        { order: 2, name: 'Second' },
        { order: 3, name: 'Third' },
      ]

      const response = await queryClient.create(testCollectionName, orderedDocs)

      assertSuccessResponse(response)

      // Verify order is preserved
      response.data!.forEach((doc: any, index: number) => {
        expect(doc.order).toBe(index + 1)
      })
    })

    it('should add timestamps to all documents', async () => {
      const documents = [
        { name: 'Doc 1' },
        { name: 'Doc 2' },
        { name: 'Doc 3' },
      ]

      const response = await queryClient.create(testCollectionName, documents)

      assertSuccessResponse(response)

      response.data!.forEach((doc: any) => {
        expect(doc.createdAt).toBeDefined()
        expect(doc.updatedAt).toBeDefined()
      })
    })

    it('should handle documents with arrays and nested objects', async () => {
      const complexDocs = [
        {
          name: 'Complex 1',
          tags: ['a', 'b', 'c'],
          metadata: { weight: 10 },
        },
        {
          name: 'Complex 2',
          items: [{ id: 1 }, { id: 2 }],
          settings: { enabled: true },
        },
      ]

      const response = await queryClient.create(testCollectionName, complexDocs)

      assertSuccessResponse(response)
      expect(response.data!.length).toBe(2)
    })

    it('should handle bulk insert performance', async () => {
      const largeBatch = Array.from({ length: 500 }, (_, i) => ({
        index: i,
        value: i * 2,
        category: i % 5,
      }))

      const startTime = Date.now()
      const response = await queryClient.create(testCollectionName, largeBatch)
      const duration = Date.now() - startTime

      assertSuccessResponse(response)
      expect(response.data!.length).toBe(500)
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    })
  })

  describe('Bulk Update', () => {
    let testCollectionName: string

    beforeAll(async () => {
      const testData = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        status: 'pending',
        value: i * 10,
        category: i % 3 === 0 ? 'A' : i % 3 === 1 ? 'B' : 'C',
      }))

      const result = await collectionHelper.createCollectionWithData(
        randomCollectionName(),
        testData
      )
      testCollectionName = result.collectionName
      cleanup.track('collection', testCollectionName)
    })

    it('should update multiple documents matching criteria', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { category: 'A' } },
        { $set: { status: 'approved' } }
      )

      assertSuccessResponse(response)

      // Verify updates
      const updated = await queryClient.find(testCollectionName, {
        where: { category: 'A' },
      })

      updated.data!.forEach((doc: any) => {
        expect(doc.status).toBe('approved')
      })
    })

    it('should update with multiple field changes', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { value: { $lt: 100 } } },
        {
          $set: { processed: true },
          $inc: { value: 5 },
        }
      )

      if (response.success) {
        const updated = await queryClient.find(testCollectionName, {
          where: { processed: true },
        })

        updated.data!.forEach((doc: any) => {
          expect(doc.processed).toBe(true)
          expect(doc.value).toBeGreaterThan(0)
        })
      }
    })

    it('should update documents with complex query', async () => {
      const response = await queryClient.update(
        testCollectionName,
        {
          where: {
            $and: [
              { category: { $in: ['A', 'B'] } },
              { value: { $gte: 100 } },
            ],
          },
        },
        { $set: { priority: 'high' } }
      )

      if (response.success) {
        const updated = await queryClient.find(testCollectionName, {
          where: { priority: 'high' },
        })

        updated.data!.forEach((doc: any) => {
          expect(['A', 'B']).toContain(doc.category)
          expect(doc.value).toBeGreaterThanOrEqual(100)
        })
      }
    })

    it('should handle bulk update with no matches', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { category: 'NonExistent' } },
        { $set: { status: 'updated' } }
      )

      // Should succeed with 0 affected or return error
      if (!response.success) {
        expect(response.error?.code).toMatch(/NOT_FOUND|BAD_REQUEST/)
      }
    })

    it('should update all documents when no filter provided', async () => {
      const tempCollection = randomCollectionName()
      await collectionHelper.createCollectionWithData(tempCollection, [
        { a: 1 },
        { b: 2 },
        { c: 3 },
      ])
      cleanup.track('collection', tempCollection)

      const response = await queryClient.update(
        tempCollection,
        {},
        { $set: { updated: true } }
      )

      if (response.success) {
        const allDocs = await queryClient.find(tempCollection, {})
        allDocs.data!.forEach((doc: any) => {
          expect(doc.updated).toBe(true)
        })
      }
    })

    it('should handle bulk update performance', async () => {
      const largeCollection = randomCollectionName()
      const largeData = Array.from({ length: 300 }, (_, i) => ({
        id: i,
        status: 'initial',
        value: i,
      }))

      await collectionHelper.createCollectionWithData(largeCollection, largeData)
      cleanup.track('collection', largeCollection)

      const startTime = Date.now()
      const response = await queryClient.update(
        largeCollection,
        { where: { value: { $lt: 200 } } },
        { $set: { status: 'updated' } }
      )
      const duration = Date.now() - startTime

      if (response.success) {
        expect(duration).toBeLessThan(5000)
      }
    })
  })

  describe('Bulk Delete', () => {
    let testCollectionName: string

    beforeAll(async () => {
      testCollectionName = randomCollectionName()
      await collectionHelper.createTestCollection(testCollectionName)
      cleanup.track('collection', testCollectionName)
    })

    it('should delete multiple documents matching criteria', async () => {
      // Create test data
      await queryClient.create(testCollectionName, [
        { status: 'delete', value: 1 },
        { status: 'delete', value: 2 },
        { status: 'keep', value: 3 },
        { status: 'delete', value: 4 },
      ])

      const response = await queryClient.delete(testCollectionName, {
        where: { status: 'delete' },
      })

      assertSuccessResponse(response)

      // Verify deletion
      const remaining = await queryClient.find(testCollectionName, {})
      expect(remaining.data!.length).toBe(1)
      expect(remaining.data![0].status).toBe('keep')
    })

    it('should delete with complex query', async () => {
      await queryClient.create(testCollectionName, [
        { category: 'A', age: 5, active: true },
        { category: 'A', age: 15, active: false },
        { category: 'B', age: 5, active: true },
        { category: 'A', age: 5, active: false },
      ])

      const response = await queryClient.delete(testCollectionName, {
        where: {
          $and: [{ category: 'A' }, { age: 5 }, { active: false }],
        },
      })

      assertSuccessResponse(response)

      // Verify specific documents were deleted
      const remaining = await queryClient.find(testCollectionName, {
        where: { category: 'A', age: 5 },
      })

      remaining.data!.forEach((doc: any) => {
        if (doc.age === 5 && doc.category === 'A') {
          expect(doc.active).toBe(true)
        }
      })
    })

    it('should delete with range query', async () => {
      await queryClient.create(testCollectionName, [
        { value: 10 },
        { value: 20 },
        { value: 30 },
        { value: 40 },
        { value: 50 },
      ])

      const response = await queryClient.delete(testCollectionName, {
        where: { value: { $gte: 20, $lte: 40 } },
      })

      assertSuccessResponse(response)

      // Verify only values outside range remain
      const remaining = await queryClient.find(testCollectionName, {
        where: { value: { $in: [10, 20, 30, 40, 50] } },
      })

      remaining.data!.forEach((doc: any) => {
        expect(doc.value < 20 || doc.value > 40).toBe(true)
      })
    })

    it('should handle bulk delete with no matches', async () => {
      const response = await queryClient.delete(testCollectionName, {
        where: { nonexistent: 'value' },
      })

      // Should succeed with 0 deleted or return error
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

      // May allow or prevent delete all
      if (response.success) {
        const remaining = await queryClient.find(tempCollection, {})
        expect(remaining.data!.length).toBe(0)
      }
    })

    it('should handle bulk delete performance', async () => {
      const largeCollection = randomCollectionName()
      const largeData = Array.from({ length: 400 }, (_, i) => ({
        id: i,
        deleteFlag: i % 2 === 0,
      }))

      await collectionHelper.createCollectionWithData(largeCollection, largeData)
      cleanup.track('collection', largeCollection)

      const startTime = Date.now()
      const response = await queryClient.delete(largeCollection, {
        where: { deleteFlag: true },
      })
      const duration = Date.now() - startTime

      if (response.success) {
        expect(duration).toBeLessThan(5000)

        const remaining = await queryClient.find(largeCollection, {})
        expect(remaining.data!.length).toBe(200) // Half should remain
      }
    })
  })

  describe('Batch Operations Mix', () => {
    let testCollectionName: string

    beforeAll(async () => {
      testCollectionName = randomCollectionName()
      await collectionHelper.createTestCollection(testCollectionName)
      cleanup.track('collection', testCollectionName)
    })

    it('should perform sequential create, update, and delete', async () => {
      // Create
      const createResponse = await queryClient.create(testCollectionName, [
        { name: 'Item 1', status: 'new', value: 10 },
        { name: 'Item 2', status: 'new', value: 20 },
        { name: 'Item 3', status: 'new', value: 30 },
      ])

      assertSuccessResponse(createResponse)
      expect(createResponse.data!.length).toBe(3)

      // Update
      const updateResponse = await queryClient.update(
        testCollectionName,
        { where: { value: { $gte: 20 } } },
        { $set: { status: 'updated' } }
      )

      assertSuccessResponse(updateResponse)

      // Delete
      const deleteResponse = await queryClient.delete(testCollectionName, {
        where: { value: { $lt: 15 } },
      })

      assertSuccessResponse(deleteResponse)

      // Verify final state
      const final = await queryClient.find(testCollectionName, {
        where: { name: { $in: ['Item 1', 'Item 2', 'Item 3'] } },
      })

      expect(final.data!.length).toBe(2)
      final.data!.forEach((doc: any) => {
        expect(doc.status).toBe('updated')
      })
    })

    it('should handle concurrent bulk operations', async () => {
      const collection = randomCollectionName()
      await collectionHelper.createTestCollection(collection)
      cleanup.track('collection', collection)

      // Create initial data
      await queryClient.create(
        collection,
        Array.from({ length: 10 }, (_, i) => ({ id: i, value: i }))
      )

      // Perform concurrent operations
      const operations = await Promise.all([
        queryClient.update(
          collection,
          { where: { value: { $lt: 5 } } },
          { $set: { category: 'low' } }
        ),
        queryClient.update(
          collection,
          { where: { value: { $gte: 5 } } },
          { $set: { category: 'high' } }
        ),
        queryClient.find(collection, {}),
      ])

      // All operations should succeed
      operations.forEach(op => {
        assertSuccessResponse(op)
      })
    })
  })

  describe('Bulk Operations with Complex Data', () => {
    let testCollectionName: string

    beforeAll(async () => {
      testCollectionName = randomCollectionName()
      await collectionHelper.createTestCollection(testCollectionName)
      cleanup.track('collection', testCollectionName)
    })

    it('should bulk insert documents with nested structures', async () => {
      const complexDocs = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        user: {
          name: `User ${i}`,
          profile: {
            age: 20 + i,
            interests: [`hobby${i % 5}`, `hobby${i % 3}`],
          },
        },
        metadata: {
          tags: [`tag${i % 7}`, `tag${i % 11}`],
          scores: [i, i * 2, i * 3],
        },
      }))

      const response = await queryClient.create(testCollectionName, complexDocs)

      assertSuccessResponse(response)
      expect(response.data!.length).toBe(20)

      // Verify structure is preserved
      response.data!.forEach((doc: any) => {
        expect(doc.user).toBeDefined()
        expect(doc.user.profile).toBeDefined()
        expect(Array.isArray(doc.user.profile.interests)).toBe(true)
        expect(Array.isArray(doc.metadata.tags)).toBe(true)
      })
    })

    it('should bulk update nested fields', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { id: { $lt: 10 } } },
        { $set: { 'user.profile.verified': true } }
      )

      if (response.success) {
        const updated = await queryClient.find(testCollectionName, {
          where: { id: { $lt: 10 } },
        })

        updated.data!.forEach((doc: any) => {
          expect(doc.user.profile.verified).toBe(true)
        })
      }
    })

    it('should bulk delete documents with array queries', async () => {
      const response = await queryClient.delete(testCollectionName, {
        where: {
          'metadata.tags': { $in: ['tag0', 'tag1'] },
        },
      })

      assertSuccessResponse(response)

      // Verify documents with those tags are removed
      const remaining = await queryClient.find(testCollectionName, {})

      remaining.data!.forEach((doc: any) => {
        const hasTags = doc.metadata.tags.some((tag: string) =>
          ['tag0', 'tag1'].includes(tag)
        )
        expect(hasTags).toBe(false)
      })
    })
  })

  describe('Bulk Operations with Fixtures', () => {
    let testCollectionName: string

    beforeAll(async () => {
      testCollectionName = randomCollectionName()
      await collectionHelper.createTestCollection(testCollectionName)
      cleanup.track('collection', testCollectionName)
    })

    it('should bulk insert sample products', async () => {
      const response = await queryClient.create(
        testCollectionName,
        SAMPLE_PRODUCTS.slice(0, 20)
      )

      assertSuccessResponse(response)
      expect(response.data!.length).toBe(20)
    })

    it('should bulk update products by category', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { category: 'Electronics' } },
        {
          $set: { featured: true },
          $inc: { views: 100 },
        }
      )

      if (response.success) {
        const electronics = await queryClient.find(testCollectionName, {
          where: { category: 'Electronics' },
        })

        electronics.data!.forEach((doc: any) => {
          expect(doc.featured).toBe(true)
          expect(doc.views).toBeGreaterThanOrEqual(100)
        })
      }
    })

    it('should bulk delete out of stock products', async () => {
      const response = await queryClient.delete(testCollectionName, {
        where: { inStock: false },
      })

      if (response.success) {
        const remaining = await queryClient.find(testCollectionName, {})

        remaining.data!.forEach((doc: any) => {
          if (doc.hasOwnProperty('inStock')) {
            expect(doc.inStock).toBe(true)
          }
        })
      }
    })
  })

  describe('Transaction-like Operations', () => {
    let testCollectionName: string

    beforeAll(async () => {
      testCollectionName = randomCollectionName()
      await collectionHelper.createTestCollection(testCollectionName)
      cleanup.track('collection', testCollectionName)
    })

    it('should perform atomic-like operations in sequence', async () => {
      // Create inventory
      await queryClient.create(testCollectionName, [
        { item: 'ProductA', stock: 100, reserved: 0 },
        { item: 'ProductB', stock: 50, reserved: 0 },
      ])

      // Reserve items (decrement stock, increment reserved)
      const reserveA = await queryClient.update(
        testCollectionName,
        { where: { item: 'ProductA' } },
        {
          $inc: { stock: -10, reserved: 10 },
        }
      )

      const reserveB = await queryClient.update(
        testCollectionName,
        { where: { item: 'ProductB' } },
        {
          $inc: { stock: -5, reserved: 5 },
        }
      )

      if (reserveA.success && reserveB.success) {
        // Verify final state
        const products = await queryClient.find(testCollectionName, {})

        const productA = products.data!.find((p: any) => p.item === 'ProductA')
        const productB = products.data!.find((p: any) => p.item === 'ProductB')

        expect(productA!.stock).toBe(90)
        expect(productA!.reserved).toBe(10)
        expect(productB!.stock).toBe(45)
        expect(productB!.reserved).toBe(5)
      }
    })

    it('should handle batch updates with dependencies', async () => {
      await queryClient.create(testCollectionName, [
        { account: 'A', balance: 1000 },
        { account: 'B', balance: 500 },
      ])

      // Transfer: deduct from A, add to B
      const transferAmount = 200

      await queryClient.update(
        testCollectionName,
        { where: { account: 'A' } },
        { $inc: { balance: -transferAmount } }
      )

      await queryClient.update(
        testCollectionName,
        { where: { account: 'B' } },
        { $inc: { balance: transferAmount } }
      )

      // Verify balances
      const accounts = await queryClient.find(testCollectionName, {
        where: { account: { $in: ['A', 'B'] } },
      })

      const accountA = accounts.data!.find((a: any) => a.account === 'A')
      const accountB = accounts.data!.find((a: any) => a.account === 'B')

      expect(accountA!.balance).toBe(800)
      expect(accountB!.balance).toBe(700)

      // Total should remain constant
      const total = accountA!.balance + accountB!.balance
      expect(total).toBe(1500)
    })
  })

  describe('Performance and Stress Tests', () => {
    it('should handle very large bulk insert', async () => {
      const largeCollection = randomCollectionName()
      await collectionHelper.createTestCollection(largeCollection)
      cleanup.track('collection', largeCollection)

      const veryLargeBatch = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        value: i * 2,
        category: `cat${i % 20}`,
        tags: [`tag${i % 10}`, `tag${i % 15}`],
      }))

      const startTime = Date.now()
      const response = await queryClient.create(largeCollection, veryLargeBatch)
      const duration = Date.now() - startTime

      assertSuccessResponse(response)
      expect(response.data!.length).toBe(1000)
      expect(duration).toBeLessThan(10000) // 10 seconds max
    })

    it('should handle multiple concurrent bulk operations', async () => {
      const collection = randomCollectionName()
      await collectionHelper.createCollectionWithData(
        collection,
        Array.from({ length: 100 }, (_, i) => ({ id: i, value: i }))
      )
      cleanup.track('collection', collection)

      const operations = await Promise.all([
        queryClient.update(
          collection,
          { where: { value: { $lt: 25 } } },
          { $set: { quarter: 1 } }
        ),
        queryClient.update(
          collection,
          { where: { value: { $gte: 25, $lt: 50 } } },
          { $set: { quarter: 2 } }
        ),
        queryClient.update(
          collection,
          { where: { value: { $gte: 50, $lt: 75 } } },
          { $set: { quarter: 3 } }
        ),
        queryClient.update(
          collection,
          { where: { value: { $gte: 75 } } },
          { $set: { quarter: 4 } }
        ),
      ])

      // All should succeed
      operations.forEach(op => {
        assertSuccessResponse(op)
      })

      // Verify all documents have quarters assigned
      const all = await queryClient.find(collection, {})
      all.data!.forEach((doc: any) => {
        expect(doc.quarter).toBeDefined()
        expect([1, 2, 3, 4]).toContain(doc.quarter)
      })
    })
  })
})
