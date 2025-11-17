import { describe, it, expect, beforeAll } from 'vitest'
import { createQueryClient } from '@/client'
import { createAuthHelper, createCollectionHelper, createCleanupHelper } from '@/helpers'
import { randomCollectionName } from '@/helpers/test-data'
import { assertSuccessResponse, assertErrorResponse } from '@/validators/response.validator'

describe('Query Features', () => {
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

  describe('Sorting', () => {
    let testCollectionName: string

    beforeAll(async () => {
      const testData = [
        { name: 'Product D', price: 40, rating: 4.2, stock: 15 },
        { name: 'Product A', price: 10, rating: 4.8, stock: 100 },
        { name: 'Product C', price: 30, rating: 3.5, stock: 50 },
        { name: 'Product B', price: 20, rating: 4.5, stock: 75 },
        { name: 'Product E', price: 50, rating: 4.0, stock: 5 },
      ]

      const result = await collectionHelper.createCollectionWithData(
        randomCollectionName(),
        testData
      )
      testCollectionName = result.collectionName
      cleanup.track('collection', testCollectionName)
    })

    describe('Ascending Sort', () => {
      it('should sort by single field ascending', async () => {
        const response = await queryClient.find(testCollectionName, {
          sort: { price: 1 },
        })

        assertSuccessResponse(response)
        expect(response.data!.length).toBeGreaterThan(0)

        // Verify ascending order
        for (let i = 1; i < response.data!.length; i++) {
          expect(response.data![i].price).toBeGreaterThanOrEqual(
            response.data![i - 1].price
          )
        }
      })

      it('should sort strings alphabetically ascending', async () => {
        const response = await queryClient.find(testCollectionName, {
          sort: { name: 1 },
        })

        assertSuccessResponse(response)

        // Verify alphabetical order
        for (let i = 1; i < response.data!.length; i++) {
          expect(
            response.data![i].name.localeCompare(response.data![i - 1].name)
          ).toBeGreaterThanOrEqual(0)
        }
      })

      it('should sort by numeric field ascending', async () => {
        const response = await queryClient.find(testCollectionName, {
          sort: { rating: 1 },
        })

        assertSuccessResponse(response)

        for (let i = 1; i < response.data!.length; i++) {
          expect(response.data![i].rating).toBeGreaterThanOrEqual(
            response.data![i - 1].rating
          )
        }
      })
    })

    describe('Descending Sort', () => {
      it('should sort by single field descending', async () => {
        const response = await queryClient.find(testCollectionName, {
          sort: { price: -1 },
        })

        assertSuccessResponse(response)

        // Verify descending order
        for (let i = 1; i < response.data!.length; i++) {
          expect(response.data![i].price).toBeLessThanOrEqual(
            response.data![i - 1].price
          )
        }
      })

      it('should sort strings reverse alphabetically', async () => {
        const response = await queryClient.find(testCollectionName, {
          sort: { name: -1 },
        })

        assertSuccessResponse(response)

        for (let i = 1; i < response.data!.length; i++) {
          expect(
            response.data![i].name.localeCompare(response.data![i - 1].name)
          ).toBeLessThanOrEqual(0)
        }
      })
    })

    describe('Multi-field Sort', () => {
      it('should sort by multiple fields', async () => {
        await queryClient.create(testCollectionName, [
          { category: 'A', priority: 1, name: 'Item 1' },
          { category: 'A', priority: 2, name: 'Item 2' },
          { category: 'B', priority: 1, name: 'Item 3' },
          { category: 'A', priority: 1, name: 'Item 4' },
        ])

        const response = await queryClient.find(testCollectionName, {
          where: {
            category: { $in: ['A', 'B'] },
          },
          sort: { category: 1, priority: 1 },
        })

        assertSuccessResponse(response)

        const categorized = response.data!.filter(
          (d: any) => d.category === 'A' || d.category === 'B'
        )

        // Verify primary sort by category
        for (let i = 1; i < categorized.length; i++) {
          if (categorized[i].category === categorized[i - 1].category) {
            // Within same category, verify secondary sort by priority
            expect(categorized[i].priority).toBeGreaterThanOrEqual(
              categorized[i - 1].priority
            )
          }
        }
      })

      it('should handle mixed ascending and descending', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: { price: { $gte: 0 } },
          sort: { price: 1, rating: -1 },
        })

        assertSuccessResponse(response)

        // Verify price ascending
        const priceList = response.data!.map((d: any) => d.price)
        for (let i = 1; i < priceList.length; i++) {
          expect(priceList[i]).toBeGreaterThanOrEqual(priceList[i - 1])
        }
      })
    })

    describe('Sort with Filters', () => {
      it('should sort filtered results', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: { price: { $gte: 20 } },
          sort: { price: 1 },
        })

        assertSuccessResponse(response)

        // All should match filter
        response.data!.forEach((doc: any) => {
          expect(doc.price).toBeGreaterThanOrEqual(20)
        })

        // And be sorted
        for (let i = 1; i < response.data!.length; i++) {
          expect(response.data![i].price).toBeGreaterThanOrEqual(
            response.data![i - 1].price
          )
        }
      })
    })
  })

  describe('Pagination', () => {
    let testCollectionName: string

    beforeAll(async () => {
      const testData = Array.from({ length: 50 }, (_, i) => ({
        id: i,
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

    describe('Limit', () => {
      it('should limit number of returned documents', async () => {
        const response = await queryClient.find(testCollectionName, {
          limit: 10,
        })

        assertSuccessResponse(response)
        expect(response.data!.length).toBeLessThanOrEqual(10)
      })

      it('should respect limit smaller than total', async () => {
        const response = await queryClient.find(testCollectionName, {
          limit: 5,
        })

        assertSuccessResponse(response)
        expect(response.data!.length).toBe(5)
      })

      it('should return all when limit exceeds total', async () => {
        const emptyCollection = randomCollectionName()
        await collectionHelper.createCollectionWithData(emptyCollection, [
          { a: 1 },
          { b: 2 },
        ])
        cleanup.track('collection', emptyCollection)

        const response = await queryClient.find(emptyCollection, {
          limit: 100,
        })

        assertSuccessResponse(response)
        expect(response.data!.length).toBe(2)
      })

      it('should work with limit of 1', async () => {
        const response = await queryClient.find(testCollectionName, {
          limit: 1,
        })

        assertSuccessResponse(response)
        expect(response.data!.length).toBe(1)
      })

      it('should handle limit 0', async () => {
        const response = await queryClient.find(testCollectionName, {
          limit: 0,
        })

        // May return empty or all documents depending on implementation
        assertSuccessResponse(response)
      })
    })

    describe('Skip/Offset', () => {
      it('should skip specified number of documents', async () => {
        const allResponse = await queryClient.find(testCollectionName, {
          sort: { id: 1 },
        })

        const skipped = await queryClient.find(testCollectionName, {
          skip: 10,
          sort: { id: 1 },
        })

        assertSuccessResponse(skipped)

        if (allResponse.data!.length > 10) {
          expect(skipped.data![0].id).toBe(allResponse.data![10].id)
        }
      })

      it('should return empty when skip exceeds total', async () => {
        const response = await queryClient.find(testCollectionName, {
          skip: 1000,
        })

        assertSuccessResponse(response)
        expect(response.data!.length).toBe(0)
      })

      it('should combine skip and limit', async () => {
        const response = await queryClient.find(testCollectionName, {
          skip: 10,
          limit: 5,
          sort: { id: 1 },
        })

        assertSuccessResponse(response)
        expect(response.data!.length).toBeLessThanOrEqual(5)

        // Should start from index 10
        if (response.data!.length > 0) {
          expect(response.data![0].id).toBeGreaterThanOrEqual(10)
        }
      })
    })

    describe('Pagination Patterns', () => {
      it('should paginate through results', async () => {
        const pageSize = 10
        const pages: any[][] = []

        for (let page = 0; page < 3; page++) {
          const response = await queryClient.find(testCollectionName, {
            skip: page * pageSize,
            limit: pageSize,
            sort: { id: 1 },
          })

          assertSuccessResponse(response)
          pages.push(response.data!)
        }

        // Pages should not overlap
        const allIds = pages.flat().map((doc: any) => doc.id)
        const uniqueIds = new Set(allIds)
        expect(uniqueIds.size).toBe(allIds.length)
      })

      it('should handle page beyond total results', async () => {
        const response = await queryClient.find(testCollectionName, {
          skip: 100,
          limit: 10,
        })

        assertSuccessResponse(response)
        expect(response.data!.length).toBe(0)
      })

      it('should work with filters and pagination', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: { category: 'A' },
          skip: 2,
          limit: 5,
          sort: { id: 1 },
        })

        assertSuccessResponse(response)
        expect(response.data!.length).toBeLessThanOrEqual(5)

        response.data!.forEach((doc: any) => {
          expect(doc.category).toBe('A')
        })
      })
    })
  })

  describe('Field Selection / Projection', () => {
    let testCollectionName: string

    beforeAll(async () => {
      const testData = [
        {
          name: 'Product 1',
          price: 100,
          description: 'A long description',
          metadata: { weight: 10, dimensions: '10x10x10' },
          tags: ['a', 'b'],
        },
        {
          name: 'Product 2',
          price: 200,
          description: 'Another long description',
          metadata: { weight: 20, dimensions: '20x20x20' },
          tags: ['c', 'd'],
        },
      ]

      const result = await collectionHelper.createCollectionWithData(
        randomCollectionName(),
        testData
      )
      testCollectionName = result.collectionName
      cleanup.track('collection', testCollectionName)
    })

    describe('Include Fields', () => {
      it('should return only specified fields', async () => {
        const response = await queryClient.find(testCollectionName, {
          select: { name: 1, price: 1 },
        })

        assertSuccessResponse(response)
        expect(response.data!.length).toBeGreaterThan(0)

        response.data!.forEach((doc: any) => {
          expect(doc).toHaveProperty('name')
          expect(doc).toHaveProperty('price')
          // Should not have other fields (except id which may always be included)
          expect(doc).not.toHaveProperty('description')
        })
      })

      it('should include single field', async () => {
        const response = await queryClient.find(testCollectionName, {
          select: { name: 1 },
        })

        assertSuccessResponse(response)

        response.data!.forEach((doc: any) => {
          expect(doc).toHaveProperty('name')
          expect(doc).not.toHaveProperty('price')
          expect(doc).not.toHaveProperty('description')
        })
      })

      it('should include nested fields', async () => {
        const response = await queryClient.find(testCollectionName, {
          select: { name: 1, 'metadata.weight': 1 },
        })

        assertSuccessResponse(response)

        response.data!.forEach((doc: any) => {
          expect(doc).toHaveProperty('name')
          if (doc.metadata) {
            expect(doc.metadata).toHaveProperty('weight')
          }
        })
      })
    })

    describe('Exclude Fields', () => {
      it('should exclude specified fields', async () => {
        const response = await queryClient.find(testCollectionName, {
          select: { description: 0, tags: 0 },
        })

        assertSuccessResponse(response)

        response.data!.forEach((doc: any) => {
          expect(doc).not.toHaveProperty('description')
          expect(doc).not.toHaveProperty('tags')
          expect(doc).toHaveProperty('name')
          expect(doc).toHaveProperty('price')
        })
      })

      it('should exclude single field', async () => {
        const response = await queryClient.find(testCollectionName, {
          select: { description: 0 },
        })

        assertSuccessResponse(response)

        response.data!.forEach((doc: any) => {
          expect(doc).not.toHaveProperty('description')
          expect(doc).toHaveProperty('name')
          expect(doc).toHaveProperty('price')
        })
      })
    })

    describe('Projection with Queries', () => {
      it('should combine field selection with filters', async () => {
        const response = await queryClient.find(testCollectionName, {
          where: { price: { $gte: 100 } },
          select: { name: 1, price: 1 },
        })

        assertSuccessResponse(response)

        response.data!.forEach((doc: any) => {
          expect(doc.price).toBeGreaterThanOrEqual(100)
          expect(doc).toHaveProperty('name')
          expect(doc).not.toHaveProperty('description')
        })
      })

      it('should combine field selection with sorting', async () => {
        const response = await queryClient.find(testCollectionName, {
          select: { name: 1, price: 1 },
          sort: { price: -1 },
        })

        assertSuccessResponse(response)

        // Verify sorted
        for (let i = 1; i < response.data!.length; i++) {
          expect(response.data![i].price).toBeLessThanOrEqual(
            response.data![i - 1].price
          )
        }

        // Verify projection
        response.data!.forEach((doc: any) => {
          expect(doc).toHaveProperty('name')
          expect(doc).toHaveProperty('price')
          expect(doc).not.toHaveProperty('description')
        })
      })

      it('should combine field selection with pagination', async () => {
        const response = await queryClient.find(testCollectionName, {
          select: { name: 1 },
          limit: 1,
        })

        assertSuccessResponse(response)
        expect(response.data!.length).toBe(1)
        expect(response.data![0]).toHaveProperty('name')
        expect(response.data![0]).not.toHaveProperty('price')
      })
    })
  })

  describe('Combined Query Features', () => {
    let testCollectionName: string

    beforeAll(async () => {
      const testData = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        name: `Product ${String.fromCharCode(65 + (i % 26))}`,
        price: (i + 1) * 10,
        category: i % 3 === 0 ? 'Electronics' : i % 3 === 1 ? 'Clothing' : 'Books',
        rating: 3 + (i % 3),
        inStock: i % 2 === 0,
        tags: [`tag${i % 5}`, `tag${i % 7}`],
      }))

      const result = await collectionHelper.createCollectionWithData(
        randomCollectionName(),
        testData
      )
      testCollectionName = result.collectionName
      cleanup.track('collection', testCollectionName)
    })

    it('should combine where, sort, limit, and select', async () => {
      const response = await queryClient.find(testCollectionName, {
        where: {
          category: 'Electronics',
          price: { $gte: 50 },
        },
        sort: { price: 1 },
        limit: 5,
        select: { name: 1, price: 1, category: 1 },
      })

      assertSuccessResponse(response)
      expect(response.data!.length).toBeLessThanOrEqual(5)

      response.data!.forEach((doc: any) => {
        // Filter applied
        expect(doc.category).toBe('Electronics')
        expect(doc.price).toBeGreaterThanOrEqual(50)

        // Projection applied
        expect(doc).toHaveProperty('name')
        expect(doc).toHaveProperty('price')
        expect(doc).not.toHaveProperty('rating')
      })

      // Sort applied
      for (let i = 1; i < response.data!.length; i++) {
        expect(response.data![i].price).toBeGreaterThanOrEqual(
          response.data![i - 1].price
        )
      }
    })

    it('should combine complex where, skip, limit, and sort', async () => {
      const response = await queryClient.find(testCollectionName, {
        where: {
          $and: [
            { inStock: true },
            {
              $or: [{ category: 'Electronics' }, { category: 'Books' }],
            },
          ],
        },
        skip: 2,
        limit: 10,
        sort: { price: -1 },
      })

      assertSuccessResponse(response)
      expect(response.data!.length).toBeLessThanOrEqual(10)

      response.data!.forEach((doc: any) => {
        expect(doc.inStock).toBe(true)
        expect(['Electronics', 'Books']).toContain(doc.category)
      })

      // Sorted descending
      for (let i = 1; i < response.data!.length; i++) {
        expect(response.data![i].price).toBeLessThanOrEqual(
          response.data![i - 1].price
        )
      }
    })

    it('should handle all features with array operators', async () => {
      const response = await queryClient.find(testCollectionName, {
        where: {
          tags: { $in: ['tag0', 'tag1'] },
          rating: { $gte: 4 },
        },
        sort: { rating: -1, price: 1 },
        skip: 1,
        limit: 5,
        select: { name: 1, rating: 1, tags: 1 },
      })

      assertSuccessResponse(response)

      response.data!.forEach((doc: any) => {
        expect(doc.rating).toBeGreaterThanOrEqual(4)
        expect(doc).toHaveProperty('tags')
        expect(doc).not.toHaveProperty('category')
      })
    })

    it('should maintain performance with all features', async () => {
      const startTime = Date.now()

      const response = await queryClient.find(testCollectionName, {
        where: {
          price: { $gte: 50, $lte: 200 },
          category: { $in: ['Electronics', 'Clothing'] },
        },
        sort: { price: 1, rating: -1 },
        skip: 5,
        limit: 10,
        select: { name: 1, price: 1, rating: 1 },
      })

      const duration = Date.now() - startTime

      assertSuccessResponse(response)
      expect(duration).toBeLessThan(2000)
    })
  })

  describe('Edge Cases', () => {
    let testCollectionName: string

    beforeAll(async () => {
      testCollectionName = randomCollectionName()
      await collectionHelper.createTestCollection(testCollectionName)
      cleanup.track('collection', testCollectionName)
    })

    it('should handle sorting empty collection', async () => {
      const response = await queryClient.find(testCollectionName, {
        sort: { name: 1 },
      })

      assertSuccessResponse(response)
      expect(response.data!.length).toBe(0)
    })

    it('should handle pagination on empty collection', async () => {
      const response = await queryClient.find(testCollectionName, {
        skip: 10,
        limit: 5,
      })

      assertSuccessResponse(response)
      expect(response.data!.length).toBe(0)
    })

    it('should handle projection on empty collection', async () => {
      const response = await queryClient.find(testCollectionName, {
        select: { name: 1, price: 1 },
      })

      assertSuccessResponse(response)
      expect(response.data!.length).toBe(0)
    })

    it('should handle sorting by non-existent field', async () => {
      await queryClient.create(testCollectionName, [
        { name: 'A' },
        { name: 'B' },
      ])

      const response = await queryClient.find(testCollectionName, {
        sort: { nonexistent: 1 },
      })

      // Should not error, may return unsorted or handle gracefully
      assertSuccessResponse(response)
    })

    it('should handle projection of non-existent field', async () => {
      const response = await queryClient.find(testCollectionName, {
        select: { nonexistent: 1 },
      })

      assertSuccessResponse(response)
    })

    it('should handle negative limit gracefully', async () => {
      const response = await queryClient.find(testCollectionName, {
        limit: -1,
      })

      // May error or treat as unlimited
      if (!response.success) {
        expect(response.error?.code).toMatch(/BAD_REQUEST|VALIDATION_ERROR/)
      }
    })

    it('should handle negative skip gracefully', async () => {
      const response = await queryClient.find(testCollectionName, {
        skip: -1,
      })

      // May error or treat as 0
      if (!response.success) {
        expect(response.error?.code).toMatch(/BAD_REQUEST|VALIDATION_ERROR/)
      }
    })
  })

  describe('Performance', () => {
    let largeCollectionName: string

    beforeAll(async () => {
      const largeData = Array.from({ length: 500 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: i * 10,
        category: i % 10,
      }))

      const result = await collectionHelper.createCollectionWithData(
        randomCollectionName(),
        largeData
      )
      largeCollectionName = result.collectionName
      cleanup.track('collection', largeCollectionName)
    })

    it('should sort large dataset efficiently', async () => {
      const startTime = Date.now()

      const response = await queryClient.find(largeCollectionName, {
        sort: { value: -1 },
      })

      const duration = Date.now() - startTime

      assertSuccessResponse(response)
      expect(duration).toBeLessThan(3000)
    })

    it('should paginate large dataset efficiently', async () => {
      const startTime = Date.now()

      const response = await queryClient.find(largeCollectionName, {
        skip: 250,
        limit: 50,
      })

      const duration = Date.now() - startTime

      assertSuccessResponse(response)
      expect(response.data!.length).toBe(50)
      expect(duration).toBeLessThan(2000)
    })

    it('should project large dataset efficiently', async () => {
      const startTime = Date.now()

      const response = await queryClient.find(largeCollectionName, {
        select: { name: 1 },
      })

      const duration = Date.now() - startTime

      assertSuccessResponse(response)
      expect(duration).toBeLessThan(2000)
    })
  })
})
