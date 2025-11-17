import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createAuthClient, createAdminClient, createQueryClient, createStorageClient } from '@/client'
import { createAuthHelper, createCollectionHelper, createCleanupHelper } from '@/helpers'
import { randomCollectionName } from '@/helpers/test-data'
import { assertSuccessResponse } from '@/validators/response.validator'

describe('Data Consistency and State Management', () => {
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

  describe('Concurrent Operation Consistency', () => {
    it('should handle concurrent reads consistently', async () => {
      const collectionName = randomCollectionName()
      await collectionHelper.createCollectionWithData(collectionName, [
        { id: 1, value: 'a' },
        { id: 2, value: 'b' },
        { id: 3, value: 'c' },
      ])
      cleanup.track('collection', collectionName)

      const queryClient = createQueryClient(adminToken)

      // Perform multiple concurrent reads
      const reads = Array.from({ length: 10 }, () =>
        queryClient.find(collectionName, {})
      )

      const responses = await Promise.all(reads)

      // All reads should return same data
      responses.forEach(response => {
        assertSuccessResponse(response)
        expect(response.data!.length).toBe(3)
      })

      // Verify data consistency across reads
      const firstResult = JSON.stringify(
        responses[0].data!.sort((a, b) => a.id - b.id)
      )

      responses.forEach(response => {
        const result = JSON.stringify(
          response.data!.sort((a, b) => a.id - b.id)
        )
        expect(result).toBe(firstResult)
      })
    })

    it('should handle concurrent writes without data loss', async () => {
      const collectionName = randomCollectionName()
      await collectionHelper.createTestCollection(collectionName)
      cleanup.track('collection', collectionName)

      const queryClient = createQueryClient(adminToken)

      // Perform concurrent writes
      const writes = Array.from({ length: 20 }, (_, i) =>
        queryClient.create(collectionName, { value: i })
      )

      const responses = await Promise.all(writes)

      // All writes should succeed
      responses.forEach(response => {
        assertSuccessResponse(response)
      })

      // Verify all documents were created
      const findResponse = await queryClient.find(collectionName, {})

      assertSuccessResponse(findResponse)
      expect(findResponse.data!.length).toBe(20)

      // Verify no duplicate values
      const values = findResponse.data!.map((d: any) => d.value)
      const uniqueValues = new Set(values)
      expect(uniqueValues.size).toBe(20)
    })

    it('should handle concurrent updates to same document', async () => {
      const collectionName = randomCollectionName()
      const result = await collectionHelper.createCollectionWithData(
        collectionName,
        [{ counter: 0 }]
      )
      cleanup.track('collection', collectionName)

      const docId = result.documents![0].id
      const queryClient = createQueryClient(adminToken)

      // Perform concurrent increments
      const updates = Array.from({ length: 10 }, () =>
        queryClient.update(
          collectionName,
          { where: { id: docId } },
          { $inc: { counter: 1 } }
        )
      )

      const responses = await Promise.all(updates)

      // All updates should succeed
      responses.forEach(response => {
        assertSuccessResponse(response)
      })

      // Verify final counter value
      const finalResponse = await queryClient.findOne(collectionName, {
        where: { id: docId },
      })

      assertSuccessResponse(finalResponse)
      expect(finalResponse.data!.counter).toBe(10)
    })

    it('should maintain referential integrity across collections', async () => {
      const usersCollection = randomCollectionName()
      const postsCollection = randomCollectionName()

      await collectionHelper.createTestCollection(usersCollection)
      cleanup.track('collection', usersCollection)

      await collectionHelper.createTestCollection(postsCollection)
      cleanup.track('collection', postsCollection)

      const queryClient = createQueryClient(adminToken)

      // Create user
      const userResponse = await queryClient.create(usersCollection, {
        name: 'John Doe',
        email: 'john@example.com',
      })

      assertSuccessResponse(userResponse)
      const userId = userResponse.data!.id

      // Create posts referencing user
      const postsResponse = await queryClient.create(postsCollection, [
        { title: 'Post 1', authorId: userId },
        { title: 'Post 2', authorId: userId },
        { title: 'Post 3', authorId: userId },
      ])

      assertSuccessResponse(postsResponse)

      // Verify relationships
      const userPostsResponse = await queryClient.find(postsCollection, {
        where: { authorId: userId },
      })

      assertSuccessResponse(userPostsResponse)
      expect(userPostsResponse.data!.length).toBe(3)

      // Verify user still exists
      const userCheckResponse = await queryClient.findOne(usersCollection, {
        where: { id: userId },
      })

      assertSuccessResponse(userCheckResponse)
      expect(userCheckResponse.data!.id).toBe(userId)
    })
  })

  describe('Transaction-like Behavior', () => {
    it('should maintain consistency in multi-step operations', async () => {
      const accountsCollection = randomCollectionName()
      await collectionHelper.createCollectionWithData(accountsCollection, [
        { accountId: 'A', balance: 1000 },
        { accountId: 'B', balance: 500 },
      ])
      cleanup.track('collection', accountsCollection)

      const queryClient = createQueryClient(adminToken)

      // Transfer money from A to B
      const transferAmount = 200

      // Step 1: Deduct from A
      const deductResponse = await queryClient.update(
        accountsCollection,
        { where: { accountId: 'A' } },
        { $inc: { balance: -transferAmount } }
      )

      assertSuccessResponse(deductResponse)

      // Step 2: Add to B
      const addResponse = await queryClient.update(
        accountsCollection,
        { where: { accountId: 'B' } },
        { $inc: { balance: transferAmount } }
      )

      assertSuccessResponse(addResponse)

      // Verify balances
      const accountAResponse = await queryClient.findOne(accountsCollection, {
        where: { accountId: 'A' },
      })

      assertSuccessResponse(accountAResponse)
      expect(accountAResponse.data!.balance).toBe(800)

      const accountBResponse = await queryClient.findOne(accountsCollection, {
        where: { accountId: 'B' },
      })

      assertSuccessResponse(accountBResponse)
      expect(accountBResponse.data!.balance).toBe(700)

      // Verify total balance remains constant
      const allAccountsResponse = await queryClient.find(accountsCollection, {})

      assertSuccessResponse(allAccountsResponse)

      const totalBalance = allAccountsResponse.data!.reduce(
        (sum: number, acc: any) => sum + acc.balance,
        0
      )

      expect(totalBalance).toBe(1500)
    })

    it('should handle inventory management consistency', async () => {
      const productsCollection = randomCollectionName()
      const ordersCollection = randomCollectionName()

      await collectionHelper.createCollectionWithData(productsCollection, [
        { productId: 'P1', name: 'Product 1', stock: 10 },
        { productId: 'P2', name: 'Product 2', stock: 5 },
      ])
      cleanup.track('collection', productsCollection)

      await collectionHelper.createTestCollection(ordersCollection)
      cleanup.track('collection', ordersCollection)

      const queryClient = createQueryClient(adminToken)

      // Place order
      const orderItems = [
        { productId: 'P1', quantity: 2 },
        { productId: 'P2', quantity: 1 },
      ]

      // Create order
      const orderResponse = await queryClient.create(ordersCollection, {
        items: orderItems,
        status: 'pending',
      })

      assertSuccessResponse(orderResponse)

      // Update stock for each item
      for (const item of orderItems) {
        const updateStockResponse = await queryClient.update(
          productsCollection,
          { where: { productId: item.productId } },
          { $inc: { stock: -item.quantity } }
        )

        assertSuccessResponse(updateStockResponse)
      }

      // Verify stock levels
      const product1Response = await queryClient.findOne(productsCollection, {
        where: { productId: 'P1' },
      })

      assertSuccessResponse(product1Response)
      expect(product1Response.data!.stock).toBe(8)

      const product2Response = await queryClient.findOne(productsCollection, {
        where: { productId: 'P2' },
      })

      assertSuccessResponse(product2Response)
      expect(product2Response.data!.stock).toBe(4)

      // Mark order as completed
      const completeOrderResponse = await queryClient.update(
        ordersCollection,
        { where: { id: orderResponse.data!.id } },
        { $set: { status: 'completed' } }
      )

      assertSuccessResponse(completeOrderResponse)
    })
  })

  describe('State Transitions', () => {
    it('should enforce valid state transitions', async () => {
      const workflowCollection = randomCollectionName()
      await collectionHelper.createCollectionWithData(workflowCollection, [
        { taskId: 'T1', status: 'draft' },
      ])
      cleanup.track('collection', workflowCollection)

      const queryClient = createQueryClient(adminToken)

      // Valid transition: draft -> in_review
      const toReviewResponse = await queryClient.update(
        workflowCollection,
        { where: { taskId: 'T1' } },
        { $set: { status: 'in_review', reviewStartedAt: new Date().toISOString() } }
      )

      assertSuccessResponse(toReviewResponse)

      // Valid transition: in_review -> approved
      const approveResponse = await queryClient.update(
        workflowCollection,
        { where: { taskId: 'T1' } },
        { $set: { status: 'approved', approvedAt: new Date().toISOString() } }
      )

      assertSuccessResponse(approveResponse)

      // Valid transition: approved -> published
      const publishResponse = await queryClient.update(
        workflowCollection,
        { where: { taskId: 'T1' } },
        { $set: { status: 'published', publishedAt: new Date().toISOString() } }
      )

      assertSuccessResponse(publishResponse)

      // Verify final state
      const finalStateResponse = await queryClient.findOne(workflowCollection, {
        where: { taskId: 'T1' },
      })

      assertSuccessResponse(finalStateResponse)
      expect(finalStateResponse.data!.status).toBe('published')
      expect(finalStateResponse.data!.publishedAt).toBeDefined()
    })

    it('should track state history', async () => {
      const documentsCollection = randomCollectionName()
      await collectionHelper.createCollectionWithData(documentsCollection, [
        {
          docId: 'D1',
          status: 'draft',
          statusHistory: [{ status: 'draft', timestamp: new Date().toISOString() }],
        },
      ])
      cleanup.track('collection', documentsCollection)

      const queryClient = createQueryClient(adminToken)

      // Transition through states
      const states = ['in_review', 'approved', 'published']

      for (const status of states) {
        const updateResponse = await queryClient.update(
          documentsCollection,
          { where: { docId: 'D1' } },
          {
            $set: { status },
            $push: {
              statusHistory: { status, timestamp: new Date().toISOString() },
            },
          }
        )

        assertSuccessResponse(updateResponse)
      }

      // Verify history
      const docResponse = await queryClient.findOne(documentsCollection, {
        where: { docId: 'D1' },
      })

      assertSuccessResponse(docResponse)
      expect(docResponse.data!.statusHistory.length).toBe(4) // draft + 3 transitions
      expect(docResponse.data!.status).toBe('published')
    })
  })

  describe('Data Integrity', () => {
    it('should maintain data integrity across operations', async () => {
      const collectionName = randomCollectionName()
      await collectionHelper.createCollectionWithData(collectionName, [
        { id: 1, value: 'original', version: 1 },
      ])
      cleanup.track('collection', collectionName)

      const queryClient = createQueryClient(adminToken)

      // Update with version tracking
      const updateResponse = await queryClient.update(
        collectionName,
        { where: { id: 1, version: 1 } },
        { $set: { value: 'updated' }, $inc: { version: 1 } }
      )

      assertSuccessResponse(updateResponse)

      // Verify update
      const verifyResponse = await queryClient.findOne(collectionName, {
        where: { id: 1 },
      })

      assertSuccessResponse(verifyResponse)
      expect(verifyResponse.data!.value).toBe('updated')
      expect(verifyResponse.data!.version).toBe(2)

      // Attempt update with old version (should fail or no-op)
      const conflictResponse = await queryClient.update(
        collectionName,
        { where: { id: 1, version: 1 } },
        { $set: { value: 'conflict' } }
      )

      // Should not update (no match) or handle gracefully
      const finalResponse = await queryClient.findOne(collectionName, {
        where: { id: 1 },
      })

      assertSuccessResponse(finalResponse)
      // Value should still be 'updated', not 'conflict'
      expect(finalResponse.data!.value).toBe('updated')
    })

    it('should validate related data consistency', async () => {
      const categoriesCollection = randomCollectionName()
      const productsCollection = randomCollectionName()

      await collectionHelper.createCollectionWithData(categoriesCollection, [
        { categoryId: 'C1', name: 'Electronics' },
      ])
      cleanup.track('collection', categoriesCollection)

      await collectionHelper.createCollectionWithData(productsCollection, [
        { name: 'Laptop', categoryId: 'C1' },
        { name: 'Mouse', categoryId: 'C1' },
      ])
      cleanup.track('collection', productsCollection)

      const queryClient = createQueryClient(adminToken)

      // Verify products belong to existing category
      const categoryResponse = await queryClient.findOne(categoriesCollection, {
        where: { categoryId: 'C1' },
      })

      assertSuccessResponse(categoryResponse)

      const productsResponse = await queryClient.find(productsCollection, {
        where: { categoryId: 'C1' },
      })

      assertSuccessResponse(productsResponse)
      expect(productsResponse.data!.length).toBe(2)

      // All products should reference valid category
      for (const product of productsResponse.data!) {
        expect(product.categoryId).toBe('C1')
      }
    })

    it('should handle cascading updates', async () => {
      const usersCollection = randomCollectionName()
      const postsCollection = randomCollectionName()

      await collectionHelper.createCollectionWithData(usersCollection, [
        { userId: 'U1', username: 'john_doe' },
      ])
      cleanup.track('collection', usersCollection)

      await collectionHelper.createCollectionWithData(postsCollection, [
        { title: 'Post 1', authorId: 'U1', authorName: 'john_doe' },
        { title: 'Post 2', authorId: 'U1', authorName: 'john_doe' },
      ])
      cleanup.track('collection', postsCollection)

      const queryClient = createQueryClient(adminToken)

      // Update username
      const updateUsernameResponse = await queryClient.update(
        usersCollection,
        { where: { userId: 'U1' } },
        { $set: { username: 'john_smith' } }
      )

      assertSuccessResponse(updateUsernameResponse)

      // Cascade update to posts
      const cascadeResponse = await queryClient.update(
        postsCollection,
        { where: { authorId: 'U1' } },
        { $set: { authorName: 'john_smith' } }
      )

      assertSuccessResponse(cascadeResponse)

      // Verify consistency
      const postsResponse = await queryClient.find(postsCollection, {
        where: { authorId: 'U1' },
      })

      assertSuccessResponse(postsResponse)

      postsResponse.data!.forEach((post: any) => {
        expect(post.authorName).toBe('john_smith')
      })
    })
  })

  describe('Concurrent User Operations', () => {
    it('should handle multiple users modifying different data', async () => {
      const collectionName = randomCollectionName()
      await collectionHelper.createTestCollection(collectionName)
      cleanup.track('collection', collectionName)

      // Create two users
      const user1Result = await authHelper.createAndLoginUser()
      const user2Result = await authHelper.createAndLoginUser()

      const user1Client = createQueryClient(user1Result.token)
      const user2Client = createQueryClient(user2Result.token)

      // Users create their own data concurrently
      const operations = [
        user1Client.create(collectionName, { userId: user1Result.userId, data: 'user1' }),
        user2Client.create(collectionName, { userId: user2Result.userId, data: 'user2' }),
        user1Client.create(collectionName, { userId: user1Result.userId, data: 'user1-2' }),
        user2Client.create(collectionName, { userId: user2Result.userId, data: 'user2-2' }),
      ]

      const responses = await Promise.all(operations)

      responses.forEach(response => {
        assertSuccessResponse(response)
      })

      // Verify all data created
      const adminClient = createQueryClient(adminToken)
      const allDataResponse = await adminClient.find(collectionName, {})

      assertSuccessResponse(allDataResponse)
      expect(allDataResponse.data!.length).toBe(4)

      // Verify user1's data
      const user1DataResponse = await adminClient.find(collectionName, {
        where: { userId: user1Result.userId },
      })

      assertSuccessResponse(user1DataResponse)
      expect(user1DataResponse.data!.length).toBe(2)

      // Verify user2's data
      const user2DataResponse = await adminClient.find(collectionName, {
        where: { userId: user2Result.userId },
      })

      assertSuccessResponse(user2DataResponse)
      expect(user2DataResponse.data!.length).toBe(2)
    })

    it('should maintain consistency with file operations', async () => {
      const user1Result = await authHelper.createAndLoginUser()
      const user2Result = await authHelper.createAndLoginUser()

      const user1Storage = createStorageClient(user1Result.token)
      const user2Storage = createStorageClient(user2Result.token)

      // Both users upload files concurrently
      const uploads = [
        user1Storage.uploadFile(Buffer.from('User 1 file 1', 'utf-8'), 'u1-f1.txt', 'text/plain'),
        user2Storage.uploadFile(Buffer.from('User 2 file 1', 'utf-8'), 'u2-f1.txt', 'text/plain'),
        user1Storage.uploadFile(Buffer.from('User 1 file 2', 'utf-8'), 'u1-f2.txt', 'text/plain'),
        user2Storage.uploadFile(Buffer.from('User 2 file 2', 'utf-8'), 'u2-f2.txt', 'text/plain'),
      ]

      const uploadResponses = await Promise.all(uploads)

      uploadResponses.forEach(response => {
        assertSuccessResponse(response)
        cleanup.track('file', response.data!.id)
      })

      // Verify files are unique
      const fileIds = uploadResponses.map(r => r.data!.id)
      const uniqueIds = new Set(fileIds)
      expect(uniqueIds.size).toBe(4)

      // Each user can access their own files
      for (let i = 0; i < 2; i++) {
        const downloadResponse = await user1Storage.downloadFile(fileIds[i * 2])
        assertSuccessResponse(downloadResponse)
      }

      for (let i = 0; i < 2; i++) {
        const downloadResponse = await user2Storage.downloadFile(fileIds[i * 2 + 1])
        assertSuccessResponse(downloadResponse)
      }
    })
  })
})
