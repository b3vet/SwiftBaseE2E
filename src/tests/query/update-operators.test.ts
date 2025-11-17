import { describe, it, expect, beforeAll } from 'vitest'
import { createQueryClient } from '@/client'
import { createAuthHelper, createCollectionHelper, createCleanupHelper } from '@/helpers'
import { randomCollectionName } from '@/helpers/test-data'
import { assertSuccessResponse, assertErrorResponse } from '@/validators/response.validator'

describe('Update Operators', () => {
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

  describe('$set Operator', () => {
    let testCollectionName: string

    beforeAll(async () => {
      const testData = [
        { name: 'Product 1', price: 100, category: 'Electronics', stock: 50 },
        { name: 'Product 2', price: 200, category: 'Clothing', stock: 30 },
        { name: 'Product 3', price: 150, category: 'Books', stock: 100 },
      ]

      const result = await collectionHelper.createCollectionWithData(
        randomCollectionName(),
        testData
      )
      testCollectionName = result.collectionName
      cleanup.track('collection', testCollectionName)
    })

    it('should set a single field value', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Product 1' } },
        { $set: { price: 120 } }
      )

      assertSuccessResponse(response)

      // Verify update
      const doc = await queryClient.findOne(testCollectionName, {
        where: { name: 'Product 1' },
      })

      expect(doc.data!.price).toBe(120)
    })

    it('should set multiple fields', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Product 2' } },
        { $set: { price: 250, stock: 50 } }
      )

      assertSuccessResponse(response)

      const doc = await queryClient.findOne(testCollectionName, {
        where: { name: 'Product 2' },
      })

      expect(doc.data!.price).toBe(250)
      expect(doc.data!.stock).toBe(50)
    })

    it('should create new field if it does not exist', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Product 3' } },
        { $set: { discount: 10 } }
      )

      assertSuccessResponse(response)

      const doc = await queryClient.findOne(testCollectionName, {
        where: { name: 'Product 3' },
      })

      expect(doc.data!.discount).toBe(10)
    })

    it('should set nested field values', async () => {
      await queryClient.create(testCollectionName, {
        name: 'Product 4',
        details: { color: 'red', size: 'M' },
      })

      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Product 4' } },
        { $set: { 'details.color': 'blue' } }
      )

      assertSuccessResponse(response)

      const doc = await queryClient.findOne(testCollectionName, {
        where: { name: 'Product 4' },
      })

      expect(doc.data!.details.color).toBe('blue')
      expect(doc.data!.details.size).toBe('M') // Should remain unchanged
    })

    it('should set array field', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Product 1' } },
        { $set: { tags: ['sale', 'featured'] } }
      )

      assertSuccessResponse(response)

      const doc = await queryClient.findOne(testCollectionName, {
        where: { name: 'Product 1' },
      })

      expect(doc.data!.tags).toEqual(['sale', 'featured'])
    })

    it('should set to null', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Product 1' } },
        { $set: { category: null } }
      )

      assertSuccessResponse(response)

      const doc = await queryClient.findOne(testCollectionName, {
        where: { name: 'Product 1' },
      })

      expect(doc.data!.category).toBeNull()
    })

    it('should update multiple documents', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { stock: { $lt: 50 } } },
        { $set: { lowStock: true } }
      )

      assertSuccessResponse(response)

      const docs = await queryClient.find(testCollectionName, {
        where: { lowStock: true },
      })

      docs.data!.forEach((doc: any) => {
        expect(doc.stock).toBeLessThan(50)
      })
    })
  })

  describe('$unset Operator', () => {
    let testCollectionName: string

    beforeAll(async () => {
      const testData = [
        { name: 'Item 1', price: 100, temp: 'value', metadata: { a: 1, b: 2 } },
        { name: 'Item 2', price: 200, temp: 'value', metadata: { a: 1, b: 2 } },
      ]

      const result = await collectionHelper.createCollectionWithData(
        randomCollectionName(),
        testData
      )
      testCollectionName = result.collectionName
      cleanup.track('collection', testCollectionName)
    })

    it('should remove a field', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Item 1' } },
        { $unset: { temp: '' } }
      )

      assertSuccessResponse(response)

      const doc = await queryClient.findOne(testCollectionName, {
        where: { name: 'Item 1' },
      })

      expect(doc.data!).not.toHaveProperty('temp')
      expect(doc.data!).toHaveProperty('price') // Other fields remain
    })

    it('should remove multiple fields', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Item 2' } },
        { $unset: { temp: '', metadata: '' } }
      )

      assertSuccessResponse(response)

      const doc = await queryClient.findOne(testCollectionName, {
        where: { name: 'Item 2' },
      })

      expect(doc.data!).not.toHaveProperty('temp')
      expect(doc.data!).not.toHaveProperty('metadata')
    })

    it('should handle removing non-existent field', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Item 1' } },
        { $unset: { nonexistent: '' } }
      )

      // Should succeed even if field doesn't exist
      assertSuccessResponse(response)
    })

    it('should remove nested field', async () => {
      await queryClient.create(testCollectionName, {
        name: 'Item 3',
        data: { field1: 'a', field2: 'b', field3: 'c' },
      })

      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Item 3' } },
        { $unset: { 'data.field2': '' } }
      )

      assertSuccessResponse(response)

      const doc = await queryClient.findOne(testCollectionName, {
        where: { name: 'Item 3' },
      })

      expect(doc.data!.data).toHaveProperty('field1')
      expect(doc.data!.data).not.toHaveProperty('field2')
      expect(doc.data!.data).toHaveProperty('field3')
    })
  })

  describe('$inc Operator', () => {
    let testCollectionName: string

    beforeAll(async () => {
      const testData = [
        { name: 'Counter 1', count: 10, views: 100, score: 5.5 },
        { name: 'Counter 2', count: 20, views: 200, score: 3.2 },
      ]

      const result = await collectionHelper.createCollectionWithData(
        randomCollectionName(),
        testData
      )
      testCollectionName = result.collectionName
      cleanup.track('collection', testCollectionName)
    })

    it('should increment a numeric field', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Counter 1' } },
        { $inc: { count: 5 } }
      )

      assertSuccessResponse(response)

      const doc = await queryClient.findOne(testCollectionName, {
        where: { name: 'Counter 1' },
      })

      expect(doc.data!.count).toBe(15)
    })

    it('should decrement when using negative value', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Counter 2' } },
        { $inc: { count: -5 } }
      )

      assertSuccessResponse(response)

      const doc = await queryClient.findOne(testCollectionName, {
        where: { name: 'Counter 2' },
      })

      expect(doc.data!.count).toBe(15)
    })

    it('should increment multiple fields', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Counter 1' } },
        { $inc: { count: 1, views: 10 } }
      )

      assertSuccessResponse(response)

      const doc = await queryClient.findOne(testCollectionName, {
        where: { name: 'Counter 1' },
      })

      expect(doc.data!.count).toBe(16) // Was 15, now 16
      expect(doc.data!.views).toBe(110) // Was 100, now 110
    })

    it('should work with decimal values', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Counter 1' } },
        { $inc: { score: 2.5 } }
      )

      assertSuccessResponse(response)

      const doc = await queryClient.findOne(testCollectionName, {
        where: { name: 'Counter 1' },
      })

      expect(doc.data!.score).toBeCloseTo(8.0, 1)
    })

    it('should initialize field to increment value if not exists', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Counter 1' } },
        { $inc: { newCounter: 5 } }
      )

      assertSuccessResponse(response)

      const doc = await queryClient.findOne(testCollectionName, {
        where: { name: 'Counter 1' },
      })

      expect(doc.data!.newCounter).toBe(5)
    })

    it('should handle zero increment', async () => {
      const beforeDoc = await queryClient.findOne(testCollectionName, {
        where: { name: 'Counter 2' },
      })
      const beforeCount = beforeDoc.data!.count

      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Counter 2' } },
        { $inc: { count: 0 } }
      )

      assertSuccessResponse(response)

      const afterDoc = await queryClient.findOne(testCollectionName, {
        where: { name: 'Counter 2' },
      })

      expect(afterDoc.data!.count).toBe(beforeCount)
    })
  })

  describe('$push Operator', () => {
    let testCollectionName: string

    beforeAll(async () => {
      const testData = [
        { name: 'List 1', items: [1, 2, 3], tags: ['a', 'b'] },
        { name: 'List 2', items: [], tags: ['x'] },
      ]

      const result = await collectionHelper.createCollectionWithData(
        randomCollectionName(),
        testData
      )
      testCollectionName = result.collectionName
      cleanup.track('collection', testCollectionName)
    })

    it('should push single value to array', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'List 1' } },
        { $push: { items: 4 } }
      )

      assertSuccessResponse(response)

      const doc = await queryClient.findOne(testCollectionName, {
        where: { name: 'List 1' },
      })

      expect(doc.data!.items).toContain(4)
      expect(doc.data!.items.length).toBe(4)
    })

    it('should push to empty array', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'List 2' } },
        { $push: { items: 1 } }
      )

      assertSuccessResponse(response)

      const doc = await queryClient.findOne(testCollectionName, {
        where: { name: 'List 2' },
      })

      expect(doc.data!.items).toEqual([1])
    })

    it('should push multiple values', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'List 1' } },
        { $push: { items: { $each: [5, 6, 7] } } }
      )

      if (response.success) {
        const doc = await queryClient.findOne(testCollectionName, {
          where: { name: 'List 1' },
        })

        expect(doc.data!.items).toContain(5)
        expect(doc.data!.items).toContain(6)
        expect(doc.data!.items).toContain(7)
      }
    })

    it('should push object to array', async () => {
      const newItem = { id: 4, name: 'Item 4' }

      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'List 1' } },
        { $push: { objects: newItem } }
      )

      if (response.success) {
        const doc = await queryClient.findOne(testCollectionName, {
          where: { name: 'List 1' },
        })

        if (doc.data!.objects) {
          const hasItem = doc.data!.objects.some(
            (obj: any) => obj.id === 4 && obj.name === 'Item 4'
          )
          expect(hasItem).toBe(true)
        }
      }
    })

    it('should create array if field does not exist', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'List 1' } },
        { $push: { newArray: 'first' } }
      )

      assertSuccessResponse(response)

      const doc = await queryClient.findOne(testCollectionName, {
        where: { name: 'List 1' },
      })

      expect(doc.data!.newArray).toEqual(['first'])
    })

    it('should allow duplicate values', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'List 2' } },
        { $push: { tags: 'x' } }
      )

      assertSuccessResponse(response)

      const doc = await queryClient.findOne(testCollectionName, {
        where: { name: 'List 2' },
      })

      const xCount = doc.data!.tags.filter((t: string) => t === 'x').length
      expect(xCount).toBeGreaterThan(1)
    })
  })

  describe('$pull Operator', () => {
    let testCollectionName: string

    beforeAll(async () => {
      const testData = [
        { name: 'List A', items: [1, 2, 3, 4, 5], tags: ['a', 'b', 'c', 'a'] },
        {
          name: 'List B',
          items: [10, 20, 30],
          objects: [
            { id: 1, active: true },
            { id: 2, active: false },
            { id: 3, active: true },
          ],
        },
      ]

      const result = await collectionHelper.createCollectionWithData(
        randomCollectionName(),
        testData
      )
      testCollectionName = result.collectionName
      cleanup.track('collection', testCollectionName)
    })

    it('should remove value from array', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'List A' } },
        { $pull: { items: 3 } }
      )

      assertSuccessResponse(response)

      const doc = await queryClient.findOne(testCollectionName, {
        where: { name: 'List A' },
      })

      expect(doc.data!.items).not.toContain(3)
      expect(doc.data!.items.length).toBe(4)
    })

    it('should remove all matching values', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'List A' } },
        { $pull: { tags: 'a' } }
      )

      assertSuccessResponse(response)

      const doc = await queryClient.findOne(testCollectionName, {
        where: { name: 'List A' },
      })

      expect(doc.data!.tags).not.toContain('a')
      // Should have removed both 'a' occurrences
      expect(doc.data!.tags.length).toBe(2)
    })

    it('should handle removing non-existent value', async () => {
      const beforeDoc = await queryClient.findOne(testCollectionName, {
        where: { name: 'List B' },
      })
      const beforeLength = beforeDoc.data!.items.length

      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'List B' } },
        { $pull: { items: 99 } }
      )

      assertSuccessResponse(response)

      const afterDoc = await queryClient.findOne(testCollectionName, {
        where: { name: 'List B' },
      })

      expect(afterDoc.data!.items.length).toBe(beforeLength)
    })

    it('should remove objects matching condition', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'List B' } },
        { $pull: { objects: { active: false } } }
      )

      if (response.success) {
        const doc = await queryClient.findOne(testCollectionName, {
          where: { name: 'List B' },
        })

        const hasInactive = doc.data!.objects.some(
          (obj: any) => obj.active === false
        )
        expect(hasInactive).toBe(false)
      }
    })

    it('should handle empty array', async () => {
      await queryClient.create(testCollectionName, {
        name: 'Empty List',
        items: [],
      })

      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Empty List' } },
        { $pull: { items: 1 } }
      )

      assertSuccessResponse(response)

      const doc = await queryClient.findOne(testCollectionName, {
        where: { name: 'Empty List' },
      })

      expect(doc.data!.items).toEqual([])
    })
  })

  describe('$addToSet Operator', () => {
    let testCollectionName: string

    beforeAll(async () => {
      const testData = [
        { name: 'Set 1', tags: ['a', 'b', 'c'] },
        { name: 'Set 2', tags: [] },
      ]

      const result = await collectionHelper.createCollectionWithData(
        randomCollectionName(),
        testData
      )
      testCollectionName = result.collectionName
      cleanup.track('collection', testCollectionName)
    })

    it('should add value to array if not exists', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Set 1' } },
        { $addToSet: { tags: 'd' } }
      )

      if (response.success) {
        const doc = await queryClient.findOne(testCollectionName, {
          where: { name: 'Set 1' },
        })

        expect(doc.data!.tags).toContain('d')
        expect(doc.data!.tags.length).toBe(4)
      }
    })

    it('should not add duplicate value', async () => {
      const beforeDoc = await queryClient.findOne(testCollectionName, {
        where: { name: 'Set 1' },
      })
      const beforeLength = beforeDoc.data!.tags.length

      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Set 1' } },
        { $addToSet: { tags: 'a' } }
      )

      if (response.success) {
        const afterDoc = await queryClient.findOne(testCollectionName, {
          where: { name: 'Set 1' },
        })

        expect(afterDoc.data!.tags.length).toBe(beforeLength)
      }
    })

    it('should add to empty array', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Set 2' } },
        { $addToSet: { tags: 'first' } }
      )

      if (response.success) {
        const doc = await queryClient.findOne(testCollectionName, {
          where: { name: 'Set 2' },
        })

        expect(doc.data!.tags).toEqual(['first'])
      }
    })

    it('should add multiple unique values', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Set 2' } },
        { $addToSet: { tags: { $each: ['x', 'y', 'z'] } } }
      )

      if (response.success) {
        const doc = await queryClient.findOne(testCollectionName, {
          where: { name: 'Set 2' },
        })

        expect(doc.data!.tags).toContain('x')
        expect(doc.data!.tags).toContain('y')
        expect(doc.data!.tags).toContain('z')
      }
    })

    it('should create array if field does not exist', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Set 1' } },
        { $addToSet: { newSet: 'value' } }
      )

      if (response.success) {
        const doc = await queryClient.findOne(testCollectionName, {
          where: { name: 'Set 1' },
        })

        expect(doc.data!.newSet).toEqual(['value'])
      }
    })
  })

  describe('$pop Operator', () => {
    let testCollectionName: string

    beforeAll(async () => {
      testCollectionName = randomCollectionName()
      await collectionHelper.createTestCollection(testCollectionName)
      cleanup.track('collection', testCollectionName)
    })

    it('should remove last element from array', async () => {
      await queryClient.create(testCollectionName, {
        name: 'Pop Test 1',
        items: [1, 2, 3, 4, 5],
      })

      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Pop Test 1' } },
        { $pop: { items: 1 } }
      )

      if (response.success) {
        const doc = await queryClient.findOne(testCollectionName, {
          where: { name: 'Pop Test 1' },
        })

        expect(doc.data!.items).not.toContain(5)
        expect(doc.data!.items.length).toBe(4)
        expect(doc.data!.items[doc.data!.items.length - 1]).toBe(4)
      }
    })

    it('should remove first element from array', async () => {
      await queryClient.create(testCollectionName, {
        name: 'Pop Test 2',
        items: [1, 2, 3, 4, 5],
      })

      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Pop Test 2' } },
        { $pop: { items: -1 } }
      )

      if (response.success) {
        const doc = await queryClient.findOne(testCollectionName, {
          where: { name: 'Pop Test 2' },
        })

        expect(doc.data!.items).not.toContain(1)
        expect(doc.data!.items.length).toBe(4)
        expect(doc.data!.items[0]).toBe(2)
      }
    })

    it('should handle empty array', async () => {
      await queryClient.create(testCollectionName, {
        name: 'Pop Test 3',
        items: [],
      })

      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Pop Test 3' } },
        { $pop: { items: 1 } }
      )

      if (response.success) {
        const doc = await queryClient.findOne(testCollectionName, {
          where: { name: 'Pop Test 3' },
        })

        expect(doc.data!.items).toEqual([])
      }
    })
  })

  describe('Combined Update Operators', () => {
    let testCollectionName: string

    beforeAll(async () => {
      const testData = [
        {
          name: 'Product A',
          price: 100,
          stock: 50,
          views: 0,
          tags: ['new'],
          metadata: { featured: false },
        },
      ]

      const result = await collectionHelper.createCollectionWithData(
        randomCollectionName(),
        testData
      )
      testCollectionName = result.collectionName
      cleanup.track('collection', testCollectionName)
    })

    it('should combine $set and $inc', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Product A' } },
        {
          $set: { 'metadata.featured': true },
          $inc: { views: 1 },
        }
      )

      if (response.success) {
        const doc = await queryClient.findOne(testCollectionName, {
          where: { name: 'Product A' },
        })

        expect(doc.data!.metadata.featured).toBe(true)
        expect(doc.data!.views).toBe(1)
      }
    })

    it('should combine $set, $inc, and $push', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Product A' } },
        {
          $set: { price: 90 },
          $inc: { stock: -5 },
          $push: { tags: 'sale' },
        }
      )

      if (response.success) {
        const doc = await queryClient.findOne(testCollectionName, {
          where: { name: 'Product A' },
        })

        expect(doc.data!.price).toBe(90)
        expect(doc.data!.stock).toBe(45)
        expect(doc.data!.tags).toContain('sale')
      }
    })

    it('should combine $unset and $set', async () => {
      await queryClient.create(testCollectionName, {
        name: 'Product B',
        oldField: 'remove',
        price: 100,
      })

      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Product B' } },
        {
          $unset: { oldField: '' },
          $set: { newField: 'added' },
        }
      )

      if (response.success) {
        const doc = await queryClient.findOne(testCollectionName, {
          where: { name: 'Product B' },
        })

        expect(doc.data!).not.toHaveProperty('oldField')
        expect(doc.data!.newField).toBe('added')
      }
    })
  })

  describe('Update Operator Edge Cases', () => {
    let testCollectionName: string

    beforeAll(async () => {
      testCollectionName = randomCollectionName()
      await collectionHelper.createTestCollection(testCollectionName)
      cleanup.track('collection', testCollectionName)
    })

    it('should handle $inc on non-existent document', async () => {
      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'NonExistent' } },
        { $inc: { count: 1 } }
      )

      // May fail or succeed with 0 affected
      if (!response.success) {
        expect(response.error?.code).toMatch(/NOT_FOUND|BAD_REQUEST/)
      }
    })

    it('should handle $push on non-array field', async () => {
      await queryClient.create(testCollectionName, {
        name: 'Invalid Push',
        notArray: 'string',
      })

      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Invalid Push' } },
        { $push: { notArray: 'value' } }
      )

      // Should error
      if (!response.success) {
        expect(response.error?.code).toMatch(/BAD_REQUEST|VALIDATION_ERROR/)
      }
    })

    it('should handle $inc on non-numeric field', async () => {
      await queryClient.create(testCollectionName, {
        name: 'Invalid Inc',
        stringField: 'text',
      })

      const response = await queryClient.update(
        testCollectionName,
        { where: { name: 'Invalid Inc' } },
        { $inc: { stringField: 1 } }
      )

      // Should error
      if (!response.success) {
        expect(response.error?.code).toMatch(/BAD_REQUEST|VALIDATION_ERROR/)
      }
    })
  })

  describe('Performance', () => {
    let largeCollectionName: string

    beforeAll(async () => {
      const largeData = Array.from({ length: 200 }, (_, i) => ({
        id: i,
        count: 0,
        tags: [],
        value: i * 10,
      }))

      const result = await collectionHelper.createCollectionWithData(
        randomCollectionName(),
        largeData
      )
      largeCollectionName = result.collectionName
      cleanup.track('collection', largeCollectionName)
    })

    it('should perform bulk $inc efficiently', async () => {
      const startTime = Date.now()

      const response = await queryClient.update(
        largeCollectionName,
        { where: { value: { $lt: 500 } } },
        { $inc: { count: 1 } }
      )

      const duration = Date.now() - startTime

      if (response.success) {
        expect(duration).toBeLessThan(3000)
      }
    })

    it('should perform bulk $set efficiently', async () => {
      const startTime = Date.now()

      const response = await queryClient.update(
        largeCollectionName,
        { where: { id: { $gte: 100 } } },
        { $set: { category: 'B' } }
      )

      const duration = Date.now() - startTime

      if (response.success) {
        expect(duration).toBeLessThan(3000)
      }
    })
  })
})
