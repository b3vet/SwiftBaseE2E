import { describe, it, expect, beforeAll } from 'vitest'
import { createQueryClient } from '@/client'
import { createAuthHelper, createCollectionHelper, createCleanupHelper } from '@/helpers'
import { randomCollectionName } from '@/helpers/test-data'
import { assertSuccessResponse, assertErrorResponse } from '@/validators/response.validator'

describe('Query Operators', () => {
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

  describe('Comparison Operators', () => {
    let testCollectionName: string

    beforeAll(async () => {
      const testData = [
        { name: 'Item 1', price: 10, stock: 100, rating: 4.5 },
        { name: 'Item 2', price: 20, stock: 50, rating: 3.8 },
        { name: 'Item 3', price: 30, stock: 75, rating: 4.9 },
        { name: 'Item 4', price: 40, stock: 25, rating: 4.2 },
        { name: 'Item 5', price: 50, stock: 0, rating: 5.0 },
      ]

      const result = await collectionHelper.createCollectionWithData(
        randomCollectionName(),
        testData
      )
      testCollectionName = result.collectionName
      cleanup.track('collection', testCollectionName)
    })

    describe('$eq (Equal)', () => {
      it('should find documents where field equals value', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: { price: { $eq: 30 } },
        })

        assertSuccessResponse(response)
        expect(response.data!.length).toBeGreaterThan(0)
        response.data!.forEach((doc: any) => {
          expect(doc.price).toBe(30)
        })
      })

      it('should work with string values', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: { name: { $eq: 'Item 1' } },
        })

        assertSuccessResponse(response)
        expect(response.data!.length).toBe(1)
        expect(response.data![0].name).toBe('Item 1')
      })

      it('should work with boolean values', async () => {
        await queryClient.create(testCollectionName, {
          name: 'Item 6',
          active: true,
        })

        const response = await queryClient.find(testCollectionName, {
          where: { active: { $eq: true } },
        })

        assertSuccessResponse(response)
        response.data!.forEach((doc: any) => {
          expect(doc.active).toBe(true)
        })
      })
    })

    describe('$ne (Not Equal)', () => {
      it('should find documents where field does not equal value', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: { price: { $ne: 30 } },
        })

        assertSuccessResponse(response)
        response.data!.forEach((doc: any) => {
          expect(doc.price).not.toBe(30)
        })
      })

      it('should include documents without the field', async () => {
        await queryClient.create(testCollectionName, {
          name: 'Item without price',
        })

        const response = await queryClient.find(testCollectionName, {
          where: { price: { $ne: 10 } },
        })

        assertSuccessResponse(response)
        const itemWithoutPrice = response.data!.find(
          (doc: any) => doc.name === 'Item without price'
        )
        expect(itemWithoutPrice).toBeDefined()
      })
    })

    describe('$gt (Greater Than)', () => {
      it('should find documents where field is greater than value', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: { price: { $gt: 30 } },
        })

        assertSuccessResponse(response)
        expect(response.data!.length).toBeGreaterThan(0)
        response.data!.forEach((doc: any) => {
          expect(doc.price).toBeGreaterThan(30)
        })
      })

      it('should work with decimal values', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: { rating: { $gt: 4.5 } },
        })

        assertSuccessResponse(response)
        response.data!.forEach((doc: any) => {
          expect(doc.rating).toBeGreaterThan(4.5)
        })
      })
    })

    describe('$gte (Greater Than or Equal)', () => {
      it('should find documents where field is greater than or equal to value', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: { price: { $gte: 30 } },
        })

        assertSuccessResponse(response)
        expect(response.data!.length).toBeGreaterThan(0)
        response.data!.forEach((doc: any) => {
          expect(doc.price).toBeGreaterThanOrEqual(30)
        })
      })

      it('should include exact matches', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: { price: { $gte: 30 } },
        })

        assertSuccessResponse(response)
        const exactMatch = response.data!.some((doc: any) => doc.price === 30)
        expect(exactMatch).toBe(true)
      })
    })

    describe('$lt (Less Than)', () => {
      it('should find documents where field is less than value', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: { stock: { $lt: 50 } },
        })

        assertSuccessResponse(response)
        expect(response.data!.length).toBeGreaterThan(0)
        response.data!.forEach((doc: any) => {
          expect(doc.stock).toBeLessThan(50)
        })
      })

      it('should not include boundary value', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: { stock: { $lt: 50 } },
        })

        assertSuccessResponse(response)
        const hasBoundary = response.data!.some((doc: any) => doc.stock === 50)
        expect(hasBoundary).toBe(false)
      })
    })

    describe('$lte (Less Than or Equal)', () => {
      it('should find documents where field is less than or equal to value', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: { stock: { $lte: 50 } },
        })

        assertSuccessResponse(response)
        expect(response.data!.length).toBeGreaterThan(0)
        response.data!.forEach((doc: any) => {
          expect(doc.stock).toBeLessThanOrEqual(50)
        })
      })

      it('should include exact matches', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: { stock: { $lte: 50 } },
        })

        assertSuccessResponse(response)
        const exactMatch = response.data!.some((doc: any) => doc.stock === 50)
        expect(exactMatch).toBe(true)
      })
    })

    describe('$in (In Array)', () => {
      it('should find documents where field value is in array', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: { price: { $in: [10, 30, 50] } },
        })

        assertSuccessResponse(response)
        expect(response.data!.length).toBe(3)
        response.data!.forEach((doc: any) => {
          expect([10, 30, 50]).toContain(doc.price)
        })
      })

      it('should work with string arrays', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: { name: { $in: ['Item 1', 'Item 3', 'Item 5'] } },
        })

        assertSuccessResponse(response)
        expect(response.data!.length).toBe(3)
      })

      it('should return empty for no matches', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: { price: { $in: [99, 100, 101] } },
        })

        assertSuccessResponse(response)
        expect(response.data!.length).toBe(0)
      })
    })

    describe('$nin (Not In Array)', () => {
      it('should find documents where field value is not in array', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: { price: { $nin: [10, 30, 50] } },
        })

        assertSuccessResponse(response)
        response.data!.forEach((doc: any) => {
          expect([10, 30, 50]).not.toContain(doc.price)
        })
      })

      it('should include documents without the field', async () => {
        await queryClient.create(testCollectionName, {
          name: 'Item no price',
        })

        const response = await queryClient.find(testCollectionName, {
          where: { price: { $nin: [10, 20, 30] } },
        })

        assertSuccessResponse(response)
        const itemWithoutPrice = response.data!.find(
          (doc: any) => doc.name === 'Item no price'
        )
        expect(itemWithoutPrice).toBeDefined()
      })
    })

    describe('Range Queries', () => {
      it('should combine $gte and $lte for range query', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: {
            price: { $gte: 20, $lte: 40 },
          },
        })

        assertSuccessResponse(response)
        response.data!.forEach((doc: any) => {
          expect(doc.price).toBeGreaterThanOrEqual(20)
          expect(doc.price).toBeLessThanOrEqual(40)
        })
      })

      it('should combine $gt and $lt for exclusive range', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: {
            stock: { $gt: 25, $lt: 100 },
          },
        })

        assertSuccessResponse(response)
        response.data!.forEach((doc: any) => {
          expect(doc.stock).toBeGreaterThan(25)
          expect(doc.stock).toBeLessThan(100)
        })
      })
    })
  })

  describe('Logical Operators', () => {
    let testCollectionName: string

    beforeAll(async () => {
      const testData = [
        { name: 'Product A', category: 'Electronics', price: 100, inStock: true },
        { name: 'Product B', category: 'Electronics', price: 200, inStock: false },
        { name: 'Product C', category: 'Clothing', price: 50, inStock: true },
        { name: 'Product D', category: 'Clothing', price: 75, inStock: true },
        { name: 'Product E', category: 'Books', price: 25, inStock: false },
      ]

      const result = await collectionHelper.createCollectionWithData(
        randomCollectionName(),
        testData
      )
      testCollectionName = result.collectionName
      cleanup.track('collection', testCollectionName)
    })

    describe('$and', () => {
      it('should find documents matching all conditions', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: {
            $and: [{ category: 'Electronics' }, { inStock: true }],
          },
        })

        assertSuccessResponse(response)
        response.data!.forEach((doc: any) => {
          expect(doc.category).toBe('Electronics')
          expect(doc.inStock).toBe(true)
        })
      })

      it('should work with comparison operators', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: {
            $and: [{ price: { $gte: 50 } }, { price: { $lte: 150 } }],
          },
        })

        assertSuccessResponse(response)
        response.data!.forEach((doc: any) => {
          expect(doc.price).toBeGreaterThanOrEqual(50)
          expect(doc.price).toBeLessThanOrEqual(150)
        })
      })

      it('should return empty when no documents match all conditions', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: {
            $and: [{ category: 'Electronics' }, { price: { $lt: 50 } }],
          },
        })

        assertSuccessResponse(response)
        expect(response.data!.length).toBe(0)
      })

      it('should handle multiple conditions (more than 2)', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: {
            $and: [
              { category: 'Clothing' },
              { inStock: true },
              { price: { $gte: 50 } },
            ],
          },
        })

        assertSuccessResponse(response)
        response.data!.forEach((doc: any) => {
          expect(doc.category).toBe('Clothing')
          expect(doc.inStock).toBe(true)
          expect(doc.price).toBeGreaterThanOrEqual(50)
        })
      })
    })

    describe('$or', () => {
      it('should find documents matching any condition', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: {
            $or: [{ category: 'Electronics' }, { category: 'Books' }],
          },
        })

        assertSuccessResponse(response)
        response.data!.forEach((doc: any) => {
          expect(['Electronics', 'Books']).toContain(doc.category)
        })
      })

      it('should work with different field conditions', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: {
            $or: [{ price: { $lt: 30 } }, { inStock: false }],
          },
        })

        assertSuccessResponse(response)
        response.data!.forEach((doc: any) => {
          const matchesCondition = doc.price < 30 || doc.inStock === false
          expect(matchesCondition).toBe(true)
        })
      })

      it('should return all matching documents from multiple conditions', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: {
            $or: [{ name: 'Product A' }, { name: 'Product E' }],
          },
        })

        assertSuccessResponse(response)
        expect(response.data!.length).toBe(2)
      })

      it('should handle more than 2 conditions', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: {
            $or: [
              { category: 'Electronics' },
              { category: 'Books' },
              { price: { $lt: 60 } },
            ],
          },
        })

        assertSuccessResponse(response)
        expect(response.data!.length).toBeGreaterThan(0)
      })
    })

    describe('$not', () => {
      it('should find documents not matching condition', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: {
            category: { $not: { $eq: 'Electronics' } },
          },
        })

        assertSuccessResponse(response)
        response.data!.forEach((doc: any) => {
          expect(doc.category).not.toBe('Electronics')
        })
      })

      it('should work with comparison operators', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: {
            price: { $not: { $lt: 50 } },
          },
        })

        assertSuccessResponse(response)
        response.data!.forEach((doc: any) => {
          expect(doc.price).toBeGreaterThanOrEqual(50)
        })
      })
    })

    describe('Complex Logical Combinations', () => {
      it('should combine $and and $or', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: {
            $and: [
              { $or: [{ category: 'Electronics' }, { category: 'Clothing' }] },
              { inStock: true },
            ],
          },
        })

        assertSuccessResponse(response)
        response.data!.forEach((doc: any) => {
          expect(['Electronics', 'Clothing']).toContain(doc.category)
          expect(doc.inStock).toBe(true)
        })
      })

      it('should nest multiple logical operators', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: {
            $or: [
              {
                $and: [{ category: 'Electronics' }, { price: { $lt: 150 } }],
              },
              {
                $and: [{ category: 'Books' }, { inStock: false }],
              },
            ],
          },
        })

        assertSuccessResponse(response)
        expect(response.data!.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Array Operators', () => {
    let testCollectionName: string

    beforeAll(async () => {
      const testData = [
        {
          name: 'Product 1',
          tags: ['electronics', 'sale', 'featured'],
          ratings: [4, 5, 4, 5],
          reviews: [
            { user: 'Alice', rating: 5 },
            { user: 'Bob', rating: 4 },
          ],
        },
        {
          name: 'Product 2',
          tags: ['clothing', 'new'],
          ratings: [3, 4, 3],
          reviews: [{ user: 'Charlie', rating: 3 }],
        },
        {
          name: 'Product 3',
          tags: ['electronics', 'new', 'featured'],
          ratings: [5, 5, 5],
          reviews: [
            { user: 'Dave', rating: 5 },
            { user: 'Eve', rating: 5 },
            { user: 'Frank', rating: 5 },
          ],
        },
        {
          name: 'Product 4',
          tags: ['books'],
          ratings: [4, 4],
          reviews: [],
        },
      ]

      const result = await collectionHelper.createCollectionWithData(
        randomCollectionName(),
        testData
      )
      testCollectionName = result.collectionName
      cleanup.track('collection', testCollectionName)
    })

    describe('$all', () => {
      it('should find documents where array contains all specified values', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: {
            tags: { $all: ['electronics', 'featured'] },
          },
        })

        assertSuccessResponse(response)
        response.data!.forEach((doc: any) => {
          expect(doc.tags).toContain('electronics')
          expect(doc.tags).toContain('featured')
        })
      })

      it('should require all values to be present', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: {
            tags: { $all: ['electronics', 'sale', 'featured'] },
          },
        })

        assertSuccessResponse(response)
        expect(response.data!.length).toBe(1)
        expect(response.data![0].name).toBe('Product 1')
      })

      it('should return empty when not all values present', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: {
            tags: { $all: ['electronics', 'clothing'] },
          },
        })

        assertSuccessResponse(response)
        expect(response.data!.length).toBe(0)
      })

      it('should work with numeric arrays', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: {
            ratings: { $all: [5] },
          },
        })

        assertSuccessResponse(response)
        response.data!.forEach((doc: any) => {
          expect(doc.ratings).toContain(5)
        })
      })
    })

    describe('$elemMatch', () => {
      it('should find documents with array element matching conditions', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: {
            reviews: {
              $elemMatch: { user: 'Alice', rating: 5 },
            },
          },
        })

        assertSuccessResponse(response)
        expect(response.data!.length).toBeGreaterThan(0)
        response.data!.forEach((doc: any) => {
          const hasMatch = doc.reviews.some(
            (r: any) => r.user === 'Alice' && r.rating === 5
          )
          expect(hasMatch).toBe(true)
        })
      })

      it('should work with comparison operators', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: {
            reviews: {
              $elemMatch: { rating: { $gte: 5 } },
            },
          },
        })

        assertSuccessResponse(response)
        response.data!.forEach((doc: any) => {
          const hasMatch = doc.reviews.some((r: any) => r.rating >= 5)
          expect(hasMatch).toBe(true)
        })
      })

      it('should require single element to match all conditions', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: {
            reviews: {
              $elemMatch: { user: 'Alice', rating: { $gte: 4 } },
            },
          },
        })

        assertSuccessResponse(response)
        response.data!.forEach((doc: any) => {
          const hasMatch = doc.reviews.some(
            (r: any) => r.user === 'Alice' && r.rating >= 4
          )
          expect(hasMatch).toBe(true)
        })
      })
    })

    describe('$size', () => {
      it('should find documents where array has specified size', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: {
            tags: { $size: 2 },
          },
        })

        assertSuccessResponse(response)
        response.data!.forEach((doc: any) => {
          expect(doc.tags.length).toBe(2)
        })
      })

      it('should work with empty arrays', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: {
            reviews: { $size: 0 },
          },
        })

        assertSuccessResponse(response)
        response.data!.forEach((doc: any) => {
          expect(doc.reviews.length).toBe(0)
        })
      })

      it('should return empty for non-matching sizes', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: {
            tags: { $size: 10 },
          },
        })

        assertSuccessResponse(response)
        expect(response.data!.length).toBe(0)
      })

      it('should work with larger arrays', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: {
            tags: { $size: 3 },
          },
        })

        assertSuccessResponse(response)
        expect(response.data!.length).toBe(2)
      })
    })

    describe('Array Query Combinations', () => {
      it('should combine $all and $size', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: {
            tags: {
              $all: ['electronics', 'featured'],
              $size: 3,
            },
          },
        })

        assertSuccessResponse(response)
        response.data!.forEach((doc: any) => {
          expect(doc.tags).toContain('electronics')
          expect(doc.tags).toContain('featured')
          expect(doc.tags.length).toBe(3)
        })
      })

      it('should use $in with array fields', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: {
            tags: { $in: ['sale', 'new'] },
          },
        })

        assertSuccessResponse(response)
        response.data!.forEach((doc: any) => {
          const hasMatch =
            doc.tags.includes('sale') || doc.tags.includes('new')
          expect(hasMatch).toBe(true)
        })
      })
    })
  })

  describe('Element Operators', () => {
    let testCollectionName: string

    beforeAll(async () => {
      const testData = [
        { name: 'Doc 1', field1: 'value', field2: null },
        { name: 'Doc 2', field1: 'value' },
        { name: 'Doc 3', field1: null, field2: 'value' },
        { name: 'Doc 4', field2: 'value' },
      ]

      const result = await collectionHelper.createCollectionWithData(
        randomCollectionName(),
        testData
      )
      testCollectionName = result.collectionName
      cleanup.track('collection', testCollectionName)
    })

    describe('$exists', () => {
      it('should find documents where field exists', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: {
            field1: { $exists: true },
          },
        })

        assertSuccessResponse(response)
        response.data!.forEach((doc: any) => {
          expect(doc).toHaveProperty('field1')
        })
      })

      it('should find documents where field does not exist', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: {
            field1: { $exists: false },
          },
        })

        assertSuccessResponse(response)
        response.data!.forEach((doc: any) => {
          expect(doc).not.toHaveProperty('field1')
        })
      })

      it('should include null values when checking existence', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: {
            field2: { $exists: true },
          },
        })

        assertSuccessResponse(response)
        // Should include docs with null values
        const hasNull = response.data!.some((doc: any) => doc.field2 === null)
        expect(hasNull).toBe(true)
      })
    })

    describe('$type', () => {
      it('should find documents where field is of specified type', async () => {
        await queryClient.create(testCollectionName, [
          { name: 'Type Test 1', value: 'string' },
          { name: 'Type Test 2', value: 42 },
          { name: 'Type Test 3', value: true },
        ])

        const response = await queryClient.find(testCollectionName, {
          where: {
            value: { $type: 'string' },
          },
        })

        if (response.success) {
          response.data!.forEach((doc: any) => {
            if (doc.name && doc.name.startsWith('Type Test')) {
              expect(typeof doc.value).toBe('string')
            }
          })
        }
      })

      it('should find numeric types', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: {
            value: { $type: 'number' },
          },
        })

        if (response.success) {
          response.data!.forEach((doc: any) => {
            if (doc.value !== undefined && doc.value !== null) {
              expect(typeof doc.value).toBe('number')
            }
          })
        }
      })
    })
  })

  describe('Performance with Operators', () => {
    let largeCollectionName: string

    beforeAll(async () => {
      const largeData = Array.from({ length: 200 }, (_, i) => ({
        id: i,
        value: i,
        category: i % 5 === 0 ? 'A' : i % 5 === 1 ? 'B' : 'C',
        tags: [`tag${i % 10}`, `tag${i % 20}`],
        active: i % 2 === 0,
      }))

      const result = await collectionHelper.createCollectionWithData(
        randomCollectionName(),
        largeData
      )
      largeCollectionName = result.collectionName
      cleanup.track('collection', largeCollectionName)
    })

    it('should perform $in query efficiently', async () => {
      const startTime = Date.now()
      const response = await queryClient.find(largeCollectionName, {
        where: { category: { $in: ['A', 'B'] } },
      })
      const duration = Date.now() - startTime

      assertSuccessResponse(response)
      expect(duration).toBeLessThan(2000)
    })

    it('should perform range queries efficiently', async () => {
      const startTime = Date.now()
      const response = await queryClient.find(largeCollectionName, {
        where: { value: { $gte: 50, $lte: 150 } },
      })
      const duration = Date.now() - startTime

      assertSuccessResponse(response)
      expect(duration).toBeLessThan(2000)
    })

    it('should perform $and queries efficiently', async () => {
      const startTime = Date.now()
      const response = await queryClient.find(largeCollectionName, {
        where: {
          $and: [
            { category: 'A' },
            { value: { $gte: 50 } },
            { active: true },
          ],
        },
      })
      const duration = Date.now() - startTime

      assertSuccessResponse(response)
      expect(duration).toBeLessThan(2000)
    })

    it('should perform $or queries efficiently', async () => {
      const startTime = Date.now()
      const response = await queryClient.find(largeCollectionName, {
        where: {
          $or: [
            { category: 'A' },
            { value: { $lt: 20 } },
            { active: false },
          ],
        },
      })
      const duration = Date.now() - startTime

      assertSuccessResponse(response)
      expect(duration).toBeLessThan(2000)
    })
  })
})
