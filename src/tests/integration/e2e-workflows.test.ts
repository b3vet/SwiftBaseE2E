import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createAuthClient, createAdminClient, createQueryClient, createStorageClient } from '@/client'
import { createAuthHelper, createCollectionHelper, createCleanupHelper, FileGenerator } from '@/helpers'
import { randomCollectionName } from '@/helpers/test-data'
import { assertSuccessResponse } from '@/validators/response.validator'

describe('End-to-End User Workflows', () => {
  const authHelper = createAuthHelper()
  const cleanup = createCleanupHelper()
  const collectionHelper = createCollectionHelper()

  let adminToken: string

  beforeAll(async () => {
    adminToken = await authHelper.getAdminToken()
    cleanup.setToken(adminToken)
  })

  afterAll(async () => {
    await cleanup.cleanAll()
  })

  describe('Complete User Journey: Blog Platform', () => {
    it('should complete full blog user workflow', async () => {
      const authClient = createAuthClient()
      const adminClient = createAdminClient(adminToken)

      // 1. User Registration
      const email = `blogger-${Date.now()}@example.com`
      const password = 'SecureBlog123!'

      const registerResponse = await authClient.registerUser({
        email,
        password,
        metadata: { role: 'blogger', joinedFrom: 'web' },
      })

      assertSuccessResponse(registerResponse)
      const userToken = registerResponse.data!.accessToken
      const userId = registerResponse.data!.user.id

      // 2. Admin creates blog collections
      const postsCollection = `blog_posts_${Date.now()}`
      const commentsCollection = `blog_comments_${Date.now()}`

      const postsResponse = await adminClient.createCollection({
        name: postsCollection,
        schema: {
          title: { type: 'string', required: true },
          content: { type: 'string', required: true },
          authorId: { type: 'string', required: true },
          tags: { type: 'array' },
          published: { type: 'boolean' },
        },
      })

      assertSuccessResponse(postsResponse)
      cleanup.track('collection', postsCollection)

      const commentsResponse = await adminClient.createCollection({
        name: commentsCollection,
      })

      assertSuccessResponse(commentsResponse)
      cleanup.track('collection', commentsCollection)

      // 3. User creates blog posts
      const queryClient = createQueryClient(userToken)

      const post1Response = await queryClient.create(postsCollection, {
        title: 'My First Blog Post',
        content: 'This is the content of my first blog post.',
        authorId: userId,
        tags: ['introduction', 'first-post'],
        published: true,
      })

      assertSuccessResponse(post1Response)
      const post1Id = post1Response.data!.id

      const post2Response = await queryClient.create(postsCollection, {
        title: 'Second Post - Draft',
        content: 'Work in progress content.',
        authorId: userId,
        tags: ['draft'],
        published: false,
      })

      assertSuccessResponse(post2Response)

      // 4. Upload featured image for post
      const storageClient = createStorageClient(userToken)

      const imageBuffer = FileGenerator.generateBuffer(50 * 1024) // 50KB
      const imageResponse = await storageClient.uploadFile(
        imageBuffer,
        'featured-image.png',
        'image/png'
      )

      assertSuccessResponse(imageResponse)
      cleanup.track('file', imageResponse.data!.id)

      // Update post with image reference
      const updatePostResponse = await queryClient.update(
        postsCollection,
        { where: { id: post1Id } },
        { $set: { featuredImage: imageResponse.data!.id } }
      )

      assertSuccessResponse(updatePostResponse)

      // 5. Query published posts
      const publishedPostsResponse = await queryClient.find(postsCollection, {
        where: { published: true, authorId: userId },
        sort: { createdAt: -1 },
      })

      assertSuccessResponse(publishedPostsResponse)
      expect(publishedPostsResponse.data!.length).toBe(1)
      expect(publishedPostsResponse.data![0].title).toBe('My First Blog Post')

      // 6. Add comments to post
      const comment1Response = await queryClient.create(commentsCollection, {
        postId: post1Id,
        authorId: userId,
        content: 'Great first post!',
        approved: true,
      })

      assertSuccessResponse(comment1Response)

      const comment2Response = await queryClient.create(commentsCollection, {
        postId: post1Id,
        authorId: userId,
        content: 'Looking forward to more.',
        approved: true,
      })

      assertSuccessResponse(comment2Response)

      // 7. Query comments for post
      const commentsForPostResponse = await queryClient.find(
        commentsCollection,
        {
          where: { postId: post1Id, approved: true },
          sort: { createdAt: 1 },
        }
      )

      assertSuccessResponse(commentsForPostResponse)
      expect(commentsForPostResponse.data!.length).toBe(2)

      // 8. Update post stats
      const postStatsResponse = await queryClient.update(
        postsCollection,
        { where: { id: post1Id } },
        { $inc: { views: 1, commentCount: 2 } }
      )

      assertSuccessResponse(postStatsResponse)

      // 9. Search posts by tag
      const tagSearchResponse = await queryClient.find(postsCollection, {
        where: { tags: { $in: ['introduction'] } },
      })

      assertSuccessResponse(tagSearchResponse)
      expect(tagSearchResponse.data!.length).toBeGreaterThan(0)

      // 10. User publishes draft
      const publishDraftResponse = await queryClient.update(
        postsCollection,
        { where: { published: false, authorId: userId } },
        { $set: { published: true, publishedAt: new Date().toISOString() } }
      )

      assertSuccessResponse(publishDraftResponse)

      // 11. Verify all published posts
      const allPublishedResponse = await queryClient.find(postsCollection, {
        where: { published: true, authorId: userId },
      })

      assertSuccessResponse(allPublishedResponse)
      expect(allPublishedResponse.data!.length).toBe(2)

      // 12. Download featured image
      const imageDownloadResponse = await storageClient.downloadFile(
        imageResponse.data!.id
      )

      assertSuccessResponse(imageDownloadResponse)
      expect(imageDownloadResponse.data!.length).toBe(imageBuffer.length)

      // 13. Get user statistics
      const userPostsCount = await queryClient.count(postsCollection, {
        where: { authorId: userId },
      })

      assertSuccessResponse(userPostsCount)
      expect(userPostsCount.data!.count).toBe(2)

      const userCommentsCount = await queryClient.count(commentsCollection, {
        where: { authorId: userId },
      })

      assertSuccessResponse(userCommentsCount)
      expect(userCommentsCount.data!.count).toBe(2)
    }, 30000)
  })

  describe('Complete User Journey: E-commerce Platform', () => {
    it('should complete full e-commerce workflow', async () => {
      const authClient = createAuthClient()
      const adminClient = createAdminClient(adminToken)

      // 1. Customer Registration
      const email = `customer-${Date.now()}@example.com`
      const password = 'ShopSafe123!'

      const registerResponse = await authClient.registerUser({
        email,
        password,
        metadata: { customerType: 'retail' },
      })

      assertSuccessResponse(registerResponse)
      const customerToken = registerResponse.data!.accessToken
      const customerId = registerResponse.data!.user.id

      // 2. Admin sets up collections
      const productsCollection = `products_${Date.now()}`
      const ordersCollection = `orders_${Date.now()}`
      const cartCollection = `cart_${Date.now()}`

      await adminClient.createCollection({ name: productsCollection })
      cleanup.track('collection', productsCollection)

      await adminClient.createCollection({ name: ordersCollection })
      cleanup.track('collection', ordersCollection)

      await adminClient.createCollection({ name: cartCollection })
      cleanup.track('collection', cartCollection)

      // 3. Admin adds products
      const adminQueryClient = createQueryClient(adminToken)

      const productsResponse = await adminQueryClient.create(
        productsCollection,
        [
          {
            name: 'Laptop',
            price: 999.99,
            stock: 10,
            category: 'Electronics',
          },
          {
            name: 'Mouse',
            price: 29.99,
            stock: 50,
            category: 'Electronics',
          },
          { name: 'Desk', price: 299.99, stock: 5, category: 'Furniture' },
        ]
      )

      assertSuccessResponse(productsResponse)
      const [laptop, mouse, desk] = productsResponse.data!

      // 4. Customer browses products
      const customerQueryClient = createQueryClient(customerToken)

      const browseResponse = await customerQueryClient.find(productsCollection, {
        where: { stock: { $gt: 0 } },
        sort: { price: 1 },
      })

      assertSuccessResponse(browseResponse)
      expect(browseResponse.data!.length).toBe(3)

      // 5. Customer adds items to cart
      const addToCartResponse = await customerQueryClient.create(
        cartCollection,
        [
          { customerId, productId: laptop.id, quantity: 1 },
          { customerId, productId: mouse.id, quantity: 2 },
        ]
      )

      assertSuccessResponse(addToCartResponse)

      // 6. Customer views cart
      const cartResponse = await customerQueryClient.find(cartCollection, {
        where: { customerId },
      })

      assertSuccessResponse(cartResponse)
      expect(cartResponse.data!.length).toBe(2)

      // Calculate total
      let cartTotal = 0
      for (const item of cartResponse.data!) {
        const productResponse = await customerQueryClient.findOne(
          productsCollection,
          { where: { id: item.productId } }
        )

        if (productResponse.success && productResponse.data) {
          cartTotal += productResponse.data.price * item.quantity
        }
      }

      expect(cartTotal).toBeCloseTo(1059.97, 2) // 999.99 + (29.99 * 2)

      // 7. Customer places order
      const orderResponse = await customerQueryClient.create(ordersCollection, {
        customerId,
        items: cartResponse.data,
        total: cartTotal,
        status: 'pending',
        orderDate: new Date().toISOString(),
      })

      assertSuccessResponse(orderResponse)
      const orderId = orderResponse.data!.id

      // 8. Update product stock
      for (const item of cartResponse.data!) {
        const updateStockResponse = await adminQueryClient.update(
          productsCollection,
          { where: { id: item.productId } },
          { $inc: { stock: -item.quantity } }
        )

        assertSuccessResponse(updateStockResponse)
      }

      // 9. Clear cart
      const clearCartResponse = await customerQueryClient.delete(cartCollection, {
        where: { customerId },
      })

      assertSuccessResponse(clearCartResponse)

      // 10. Verify stock updated
      const updatedLaptopResponse = await customerQueryClient.findOne(
        productsCollection,
        { where: { id: laptop.id } }
      )

      assertSuccessResponse(updatedLaptopResponse)
      expect(updatedLaptopResponse.data!.stock).toBe(9)

      const updatedMouseResponse = await customerQueryClient.findOne(
        productsCollection,
        { where: { id: mouse.id } }
      )

      assertSuccessResponse(updatedMouseResponse)
      expect(updatedMouseResponse.data!.stock).toBe(48)

      // 11. Admin processes order
      const processOrderResponse = await adminQueryClient.update(
        ordersCollection,
        { where: { id: orderId } },
        {
          $set: {
            status: 'processing',
            processedAt: new Date().toISOString(),
          },
        }
      )

      assertSuccessResponse(processOrderResponse)

      // 12. Customer checks order status
      const orderStatusResponse = await customerQueryClient.findOne(
        ordersCollection,
        { where: { id: orderId } }
      )

      assertSuccessResponse(orderStatusResponse)
      expect(orderStatusResponse.data!.status).toBe('processing')

      // 13. Admin ships order
      const shipOrderResponse = await adminQueryClient.update(
        ordersCollection,
        { where: { id: orderId } },
        {
          $set: {
            status: 'shipped',
            trackingNumber: 'TRACK123456',
            shippedAt: new Date().toISOString(),
          },
        }
      )

      assertSuccessResponse(shipOrderResponse)

      // 14. Customer retrieves order history
      const orderHistoryResponse = await customerQueryClient.find(
        ordersCollection,
        {
          where: { customerId },
          sort: { orderDate: -1 },
        }
      )

      assertSuccessResponse(orderHistoryResponse)
      expect(orderHistoryResponse.data!.length).toBe(1)
      expect(orderHistoryResponse.data![0].status).toBe('shipped')
    }, 45000)
  })

  describe('Complete User Journey: Project Management', () => {
    it('should complete full project management workflow', async () => {
      const authClient = createAuthClient()
      const adminClient = createAdminClient(adminToken)

      // 1. Team members register
      const pmEmail = `pm-${Date.now()}@example.com`
      const devEmail = `dev-${Date.now()}@example.com`
      const password = 'TeamWork123!'

      const pmRegisterResponse = await authClient.registerUser({
        email: pmEmail,
        password,
        metadata: { role: 'project_manager' },
      })

      assertSuccessResponse(pmRegisterResponse)
      const pmToken = pmRegisterResponse.data!.accessToken
      const pmUserId = pmRegisterResponse.data!.user.id

      const devRegisterResponse = await authClient.registerUser({
        email: devEmail,
        password,
        metadata: { role: 'developer' },
      })

      assertSuccessResponse(devRegisterResponse)
      const devToken = devRegisterResponse.data!.accessToken
      const devUserId = devRegisterResponse.data!.user.id

      // 2. Setup project collections
      const projectsCollection = `projects_${Date.now()}`
      const tasksCollection = `tasks_${Date.now()}`
      const commentsCollection = `task_comments_${Date.now()}`

      await adminClient.createCollection({ name: projectsCollection })
      cleanup.track('collection', projectsCollection)

      await adminClient.createCollection({ name: tasksCollection })
      cleanup.track('collection', tasksCollection)

      await adminClient.createCollection({ name: commentsCollection })
      cleanup.track('collection', commentsCollection)

      // 3. PM creates project
      const pmQueryClient = createQueryClient(pmToken)

      const projectResponse = await pmQueryClient.create(projectsCollection, {
        name: 'SwiftBase MVP',
        description: 'Build the minimum viable product',
        ownerId: pmUserId,
        status: 'active',
        teamMembers: [pmUserId, devUserId],
        startDate: new Date().toISOString(),
      })

      assertSuccessResponse(projectResponse)
      const projectId = projectResponse.data!.id

      // 4. PM creates tasks
      const tasksResponse = await pmQueryClient.create(tasksCollection, [
        {
          projectId,
          title: 'Setup database schema',
          description: 'Design and implement database schema',
          assignedTo: devUserId,
          status: 'todo',
          priority: 'high',
          createdBy: pmUserId,
        },
        {
          projectId,
          title: 'Implement authentication',
          description: 'Add user authentication with JWT',
          assignedTo: devUserId,
          status: 'todo',
          priority: 'high',
          createdBy: pmUserId,
        },
        {
          projectId,
          title: 'Create API documentation',
          description: 'Document all API endpoints',
          assignedTo: pmUserId,
          status: 'todo',
          priority: 'medium',
          createdBy: pmUserId,
        },
      ])

      assertSuccessResponse(tasksResponse)
      const [task1, task2, task3] = tasksResponse.data!

      // 5. Developer views assigned tasks
      const devQueryClient = createQueryClient(devToken)

      const assignedTasksResponse = await devQueryClient.find(tasksCollection, {
        where: { assignedTo: devUserId, status: { $ne: 'done' } },
        sort: { priority: -1 },
      })

      assertSuccessResponse(assignedTasksResponse)
      expect(assignedTasksResponse.data!.length).toBe(2)

      // 6. Developer starts working on task
      const startTaskResponse = await devQueryClient.update(
        tasksCollection,
        { where: { id: task1.id } },
        {
          $set: {
            status: 'in_progress',
            startedAt: new Date().toISOString(),
          },
        }
      )

      assertSuccessResponse(startTaskResponse)

      // 7. Developer adds progress comment
      const commentResponse = await devQueryClient.create(commentsCollection, {
        taskId: task1.id,
        userId: devUserId,
        comment: 'Started working on the schema. Created initial tables.',
        timestamp: new Date().toISOString(),
      })

      assertSuccessResponse(commentResponse)

      // 8. Developer uploads design document
      const devStorageClient = createStorageClient(devToken)

      const docBuffer = Buffer.from('Database Schema Design\n\nTables:\n...', 'utf-8')
      const docResponse = await devStorageClient.uploadFile(
        docBuffer,
        'database-schema.txt',
        'text/plain'
      )

      assertSuccessResponse(docResponse)
      cleanup.track('file', docResponse.data!.id)

      // Attach to task
      const attachDocResponse = await devQueryClient.update(
        tasksCollection,
        { where: { id: task1.id } },
        { $push: { attachments: docResponse.data!.id } }
      )

      assertSuccessResponse(attachDocResponse)

      // 9. Developer completes task
      const completeTaskResponse = await devQueryClient.update(
        tasksCollection,
        { where: { id: task1.id } },
        {
          $set: {
            status: 'done',
            completedAt: new Date().toISOString(),
          },
        }
      )

      assertSuccessResponse(completeTaskResponse)

      // 10. PM reviews completed tasks
      const completedTasksResponse = await pmQueryClient.find(tasksCollection, {
        where: { projectId, status: 'done' },
      })

      assertSuccessResponse(completedTasksResponse)
      expect(completedTasksResponse.data!.length).toBe(1)

      // 11. PM updates project progress
      const projectProgressResponse = await pmQueryClient.update(
        projectsCollection,
        { where: { id: projectId } },
        {
          $set: {
            completedTasks: 1,
            totalTasks: 3,
            progressPercentage: 33,
          },
        }
      )

      assertSuccessResponse(projectProgressResponse)

      // 12. Generate project statistics
      const totalTasksCount = await pmQueryClient.count(tasksCollection, {
        where: { projectId },
      })

      assertSuccessResponse(totalTasksCount)
      expect(totalTasksCount.data!.count).toBe(3)

      const completedCount = await pmQueryClient.count(tasksCollection, {
        where: { projectId, status: 'done' },
      })

      assertSuccessResponse(completedCount)
      expect(completedCount.data!.count).toBe(1)

      const inProgressCount = await pmQueryClient.count(tasksCollection, {
        where: { projectId, status: 'in_progress' },
      })

      assertSuccessResponse(inProgressCount)
      expect(inProgressCount.data!.count).toBe(0)

      // 13. PM views all task comments
      const allCommentsResponse = await pmQueryClient.find(commentsCollection, {
        where: { taskId: task1.id },
        sort: { timestamp: 1 },
      })

      assertSuccessResponse(allCommentsResponse)
      expect(allCommentsResponse.data!.length).toBeGreaterThan(0)

      // 14. Download task attachments
      const taskWithAttachmentsResponse = await pmQueryClient.findOne(
        tasksCollection,
        { where: { id: task1.id } }
      )

      assertSuccessResponse(taskWithAttachmentsResponse)

      if (
        taskWithAttachmentsResponse.data!.attachments &&
        taskWithAttachmentsResponse.data!.attachments.length > 0
      ) {
        const pmStorageClient = createStorageClient(pmToken)
        const attachmentId = taskWithAttachmentsResponse.data!.attachments[0]

        const downloadResponse = await pmStorageClient.downloadFile(attachmentId)

        assertSuccessResponse(downloadResponse)
        expect(downloadResponse.data!.length).toBeGreaterThan(0)
      }
    }, 60000)
  })

  describe('Session Persistence and Recovery', () => {
    it('should maintain session across multiple operations', async () => {
      const authClient = createAuthClient()

      const email = `session-${Date.now()}@example.com`
      const password = 'Session123!'

      const registerResponse = await authClient.registerUser({
        email,
        password,
      })

      assertSuccessResponse(registerResponse)
      const token = registerResponse.data!.accessToken

      // Use token for multiple operations over time
      const queryClient = createQueryClient(token)
      const collectionName = `session_test_${Date.now()}`

      await collectionHelper.setToken(adminToken)
      await collectionHelper.createTestCollection(collectionName)
      cleanup.track('collection', collectionName)

      // Operation 1
      const create1 = await queryClient.create(collectionName, { value: 1 })
      assertSuccessResponse(create1)

      // Wait
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Operation 2
      const create2 = await queryClient.create(collectionName, { value: 2 })
      assertSuccessResponse(create2)

      // Wait
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Operation 3
      const findAll = await queryClient.find(collectionName, {})
      assertSuccessResponse(findAll)
      expect(findAll.data!.length).toBe(2)
    })

    it('should handle token refresh workflow', async () => {
      const authClient = createAuthClient()

      const email = `refresh-${Date.now()}@example.com`
      const password = 'Refresh123!'

      const registerResponse = await authClient.registerUser({
        email,
        password,
      })

      assertSuccessResponse(registerResponse)
      const refreshToken = registerResponse.data!.refreshToken

      // Use access token
      const accessToken = registerResponse.data!.accessToken
      const queryClient = createQueryClient(accessToken)

      // Make some requests
      const collectionName = `refresh_test_${Date.now()}`
      await collectionHelper.setToken(adminToken)
      await collectionHelper.createTestCollection(collectionName)
      cleanup.track('collection', collectionName)

      const createResponse = await queryClient.create(collectionName, {
        test: 'data',
      })
      assertSuccessResponse(createResponse)

      // Refresh token
      const refreshResponse = await authClient.refreshToken({
        refreshToken,
      })

      assertSuccessResponse(refreshResponse)
      expect(refreshResponse.data!.accessToken).toBeDefined()
      expect(refreshResponse.data!.accessToken).not.toBe(accessToken)

      // Use new token
      const newQueryClient = createQueryClient(
        refreshResponse.data!.accessToken
      )

      const findResponse = await newQueryClient.find(collectionName, {})
      assertSuccessResponse(findResponse)
      expect(findResponse.data!.length).toBe(1)
    })
  })
})
