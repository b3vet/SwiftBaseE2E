import { describe, it, expect, beforeAll } from 'vitest'
import { createAdminClient, createQueryClient } from '@/client'
import { createAuthHelper, createCollectionHelper, createCleanupHelper } from '@/helpers'
import { randomCollectionName } from '@/helpers/test-data'
import { SAMPLE_PRODUCTS } from '@/fixtures'
import { assertSuccessResponse, assertErrorResponse } from '@/validators/response.validator'

describe('Collection Statistics', () => {
  const authHelper = createAuthHelper()
  const cleanup = createCleanupHelper()

  let adminToken: string
  let adminClient: ReturnType<typeof createAdminClient>
  let collectionHelper: ReturnType<typeof createCollectionHelper>
  let queryClient: ReturnType<typeof createQueryClient>

  beforeAll(async () => {
    adminToken = await authHelper.getAdminToken()
    adminClient = createAdminClient(adminToken)
    collectionHelper = createCollectionHelper(adminToken)
    queryClient = createQueryClient(adminToken)
    cleanup.setToken(adminToken)
  })

  describe('Basic Statistics', () => {
    let testCollectionName: string

    beforeAll(async () => {
      testCollectionName = randomCollectionName()
      await adminClient.createCollection({ name: testCollectionName })
      cleanup.track('collection', testCollectionName)
    })

    it('should get statistics for empty collection', async () => {
      const response = await adminClient.getCollectionStats(testCollectionName)

      assertSuccessResponse(response)
      expect(response.data).toBeDefined()
      expect(response.data!.collection).toBe(testCollectionName)
      expect(response.data!.documentCount).toBe(0)
      expect(response.data!.totalSize).toBeGreaterThanOrEqual(0)
    })

    it('should include collection name in stats', async () => {
      const response = await adminClient.getCollectionStats(testCollectionName)

      assertSuccessResponse(response)
      expect(response.data!.collection).toBe(testCollectionName)
    })

    it('should include document count', async () => {
      const response = await adminClient.getCollectionStats(testCollectionName)

      assertSuccessResponse(response)
      expect(response.data!).toHaveProperty('documentCount')
      expect(typeof response.data!.documentCount).toBe('number')
      expect(response.data!.documentCount).toBeGreaterThanOrEqual(0)
    })

    it('should include total size', async () => {
      const response = await adminClient.getCollectionStats(testCollectionName)

      assertSuccessResponse(response)
      expect(response.data!).toHaveProperty('totalSize')
      expect(typeof response.data!.totalSize).toBe('number')
      expect(response.data!.totalSize).toBeGreaterThanOrEqual(0)
    })

    it('should include average document size', async () => {
      const response = await adminClient.getCollectionStats(testCollectionName)

      assertSuccessResponse(response)
      expect(response.data!).toHaveProperty('averageDocumentSize')
      expect(typeof response.data!.averageDocumentSize).toBe('number')
    })

    it('should include timestamps', async () => {
      const response = await adminClient.getCollectionStats(testCollectionName)

      assertSuccessResponse(response)
      expect(response.data!).toHaveProperty('createdAt')
      expect(response.data!).toHaveProperty('updatedAt')
    })

    it('should return 404 for non-existent collection', async () => {
      const response = await adminClient.getCollectionStats('nonexistent_collection')

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/NOT_FOUND/)
    })
  })

  describe('Statistics with Documents', () => {
    let collectionName: string

    beforeAll(async () => {
      // Create collection with documents
      const result = await collectionHelper.createCollectionWithData(
        randomCollectionName(),
        SAMPLE_PRODUCTS.slice(0, 5)
      )
      collectionName = result.collectionName
      cleanup.track('collection', collectionName)
    })

    it('should reflect document count', async () => {
      const response = await adminClient.getCollectionStats(collectionName)

      assertSuccessResponse(response)
      expect(response.data!.documentCount).toBe(5)
    })

    it('should calculate total size', async () => {
      const response = await adminClient.getCollectionStats(collectionName)

      assertSuccessResponse(response)
      expect(response.data!.totalSize).toBeGreaterThan(0)
    })

    it('should calculate average document size', async () => {
      const response = await adminClient.getCollectionStats(collectionName)

      assertSuccessResponse(response)

      const avgSize = response.data!.averageDocumentSize
      const totalSize = response.data!.totalSize
      const docCount = response.data!.documentCount

      // Average should be reasonable
      expect(avgSize).toBeGreaterThan(0)

      // Average * count should approximately equal total
      // (allowing for rounding)
      if (docCount > 0) {
        const calculatedTotal = Math.round(avgSize * docCount)
        expect(Math.abs(calculatedTotal - totalSize)).toBeLessThan(totalSize * 0.1)
      }
    })

    it('should update count when documents are added', async () => {
      const testCollection = randomCollectionName()
      await adminClient.createCollection({ name: testCollection })
      cleanup.track('collection', testCollection)

      // Get initial stats
      const stats1 = await adminClient.getCollectionStats(testCollection)
      assertSuccessResponse(stats1)
      const initialCount = stats1.data!.documentCount

      // Add documents
      await queryClient.create(testCollection, [
        { name: 'Item 1' },
        { name: 'Item 2' },
      ])

      // Get updated stats
      const stats2 = await adminClient.getCollectionStats(testCollection)
      assertSuccessResponse(stats2)

      expect(stats2.data!.documentCount).toBe(initialCount + 2)
    })

    it('should update count when documents are deleted', async () => {
      const testCollection = randomCollectionName()
      const result = await collectionHelper.createCollectionWithData(
        testCollection,
        [{ name: 'Item 1' }, { name: 'Item 2' }, { name: 'Item 3' }]
      )
      cleanup.track('collection', testCollection)

      // Get initial count
      const stats1 = await adminClient.getCollectionStats(testCollection)
      assertSuccessResponse(stats1)
      expect(stats1.data!.documentCount).toBe(3)

      // Delete one document
      await queryClient.delete(testCollection, {
        where: { name: 'Item 1' },
      })

      // Get updated count
      const stats2 = await adminClient.getCollectionStats(testCollection)
      assertSuccessResponse(stats2)
      expect(stats2.data!.documentCount).toBe(2)
    })
  })

  describe('Index Information', () => {
    let testCollectionName: string

    beforeAll(async () => {
      testCollectionName = randomCollectionName()
      await adminClient.createCollection({
        name: testCollectionName,
        indexes: {
          name_idx: { fields: ['name'], unique: true },
          email_idx: { fields: ['email'], unique: true },
        },
      })
      cleanup.track('collection', testCollectionName)
    })

    it('should include index information', async () => {
      const response = await adminClient.getCollectionStats(testCollectionName)

      assertSuccessResponse(response)
      expect(response.data!).toHaveProperty('indexes')
      expect(Array.isArray(response.data!.indexes)).toBe(true)
    })

    it('should list all indexes', async () => {
      const response = await adminClient.getCollectionStats(testCollectionName)

      assertSuccessResponse(response)

      const indexes = response.data!.indexes
      expect(indexes.length).toBeGreaterThanOrEqual(0)

      // Each index should have name and size
      indexes.forEach((index: any) => {
        expect(index).toHaveProperty('name')
        expect(index).toHaveProperty('size')
        expect(typeof index.name).toBe('string')
        expect(typeof index.size).toBe('number')
      })
    })

    it('should show index sizes', async () => {
      const response = await adminClient.getCollectionStats(testCollectionName)

      assertSuccessResponse(response)

      const indexes = response.data!.indexes
      indexes.forEach((index: any) => {
        expect(index.size).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('Statistics Accuracy', () => {
    it('should accurately count documents in large collection', async () => {
      const collectionName = randomCollectionName()

      // Create collection with many documents
      const documents = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: i * 10,
      }))

      await collectionHelper.createCollectionWithData(collectionName, documents)
      cleanup.track('collection', collectionName)

      // Get stats
      const response = await adminClient.getCollectionStats(collectionName)

      assertSuccessResponse(response)
      expect(response.data!.documentCount).toBe(50)
    })

    it('should handle collection with varied document sizes', async () => {
      const collectionName = randomCollectionName()

      const documents = [
        { small: 'a' },
        { medium: 'a'.repeat(100) },
        { large: 'a'.repeat(1000) },
      ]

      await collectionHelper.createCollectionWithData(collectionName, documents)
      cleanup.track('collection', collectionName)

      const response = await adminClient.getCollectionStats(collectionName)

      assertSuccessResponse(response)
      expect(response.data!.documentCount).toBe(3)
      expect(response.data!.totalSize).toBeGreaterThan(0)
      expect(response.data!.averageDocumentSize).toBeGreaterThan(0)
    })

    it('should update statistics in real-time', async () => {
      const collectionName = randomCollectionName()
      await adminClient.createCollection({ name: collectionName })
      cleanup.track('collection', collectionName)

      // Add documents progressively and check stats
      for (let i = 0; i < 3; i++) {
        await queryClient.create(collectionName, { count: i })

        const response = await adminClient.getCollectionStats(collectionName)
        assertSuccessResponse(response)
        expect(response.data!.documentCount).toBe(i + 1)
      }
    })
  })

  describe('Statistics for Multiple Collections', () => {
    it('should return different stats for different collections', async () => {
      // Create two collections with different data
      const collection1 = randomCollectionName()
      const collection2 = randomCollectionName()

      await collectionHelper.createCollectionWithData(
        collection1,
        [{ a: 1 }, { b: 2 }]
      )

      await collectionHelper.createCollectionWithData(
        collection2,
        [{ x: 1 }, { y: 2 }, { z: 3 }]
      )

      cleanup.track('collection', collection1)
      cleanup.track('collection', collection2)

      // Get stats for both
      const stats1 = await adminClient.getCollectionStats(collection1)
      const stats2 = await adminClient.getCollectionStats(collection2)

      assertSuccessResponse(stats1)
      assertSuccessResponse(stats2)

      // Should have different counts
      expect(stats1.data!.documentCount).toBe(2)
      expect(stats2.data!.documentCount).toBe(3)
    })

    it('should handle getting stats for multiple collections concurrently', async () => {
      // Create collections
      const collections = []
      for (let i = 0; i < 3; i++) {
        const name = randomCollectionName()
        await collectionHelper.createCollectionWithData(
          name,
          Array.from({ length: i + 1 }, (_, j) => ({ value: j }))
        )
        collections.push(name)
        cleanup.track('collection', name)
      }

      // Get stats concurrently
      const responses = await Promise.all(
        collections.map(name => adminClient.getCollectionStats(name))
      )

      // All should succeed
      responses.forEach((response, index) => {
        assertSuccessResponse(response)
        expect(response.data!.documentCount).toBe(index + 1)
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle stats for collection with no indexes', async () => {
      const collectionName = randomCollectionName()
      await adminClient.createCollection({ name: collectionName })
      cleanup.track('collection', collectionName)

      const response = await adminClient.getCollectionStats(collectionName)

      assertSuccessResponse(response)
      expect(response.data!.indexes).toBeDefined()
      // May be empty array
      expect(Array.isArray(response.data!.indexes)).toBe(true)
    })

    it('should handle stats after collection update', async () => {
      const collectionName = randomCollectionName()
      await collectionHelper.createCollectionWithData(
        collectionName,
        [{ a: 1 }]
      )
      cleanup.track('collection', collectionName)

      // Get initial stats
      const stats1 = await adminClient.getCollectionStats(collectionName)
      assertSuccessResponse(stats1)

      // Update collection metadata
      await adminClient.updateCollection(collectionName, {
        options: { updated: true },
      })

      // Get stats again
      const stats2 = await adminClient.getCollectionStats(collectionName)
      assertSuccessResponse(stats2)

      // Document count should remain same
      expect(stats2.data!.documentCount).toBe(stats1.data!.documentCount)
    })

    it('should handle zero average for empty collection', async () => {
      const collectionName = randomCollectionName()
      await adminClient.createCollection({ name: collectionName })
      cleanup.track('collection', collectionName)

      const response = await adminClient.getCollectionStats(collectionName)

      assertSuccessResponse(response)
      expect(response.data!.averageDocumentSize).toBe(0)
    })
  })

  describe('Performance', () => {
    it('should return stats within acceptable time', async () => {
      const collectionName = randomCollectionName()
      await collectionHelper.createCollectionWithData(
        collectionName,
        SAMPLE_PRODUCTS.slice(0, 5)
      )
      cleanup.track('collection', collectionName)

      const startTime = Date.now()
      const response = await adminClient.getCollectionStats(collectionName)
      const duration = Date.now() - startTime

      assertSuccessResponse(response)
      expect(duration).toBeLessThan(1000)
    })

    it('should handle stats for large collection efficiently', async () => {
      const collectionName = randomCollectionName()

      // Create collection with many documents
      const documents = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        value: i,
      }))

      await collectionHelper.createCollectionWithData(collectionName, documents)
      cleanup.track('collection', collectionName)

      const startTime = Date.now()
      const response = await adminClient.getCollectionStats(collectionName)
      const duration = Date.now() - startTime

      assertSuccessResponse(response)
      expect(response.data!.documentCount).toBe(100)
      expect(duration).toBeLessThan(2000)
    })
  })
})
