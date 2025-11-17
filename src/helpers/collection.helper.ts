import { createAdminClient, createQueryClient, type AdminClient, type QueryClient } from '@/client'
import { TEST_DEFAULTS } from '@/config/constants'
import type { CreateCollectionRequest, MongoQuery } from '@/types'

/**
 * Collection helper for tests
 */
export class CollectionHelper {
  private adminClient: AdminClient
  private queryClient: QueryClient

  constructor(adminToken: string, adminClient?: AdminClient, queryClient?: QueryClient) {
    this.adminClient = adminClient || createAdminClient(adminToken)
    this.queryClient = queryClient || createQueryClient(adminToken)
  }

  /**
   * Create a test collection
   */
  async createTestCollection(
    name?: string,
    schema?: Record<string, any>,
    options?: Record<string, any>
  ): Promise<{ name: string; id: string }> {
    const timestamp = Date.now()
    const collectionName = name || `${TEST_DEFAULTS.COLLECTION_NAME_PREFIX}${timestamp}`

    const request: CreateCollectionRequest = {
      name: collectionName,
      schema,
      options,
    }

    const response = await this.adminClient.createCollection(request)

    if (!response.success) {
      throw new Error(`Failed to create collection: ${response.error?.message}`)
    }

    return {
      name: collectionName,
      id: response.data!.id,
    }
  }

  /**
   * Delete a collection
   */
  async deleteCollection(name: string): Promise<void> {
    const response = await this.adminClient.deleteCollection(name)

    if (!response.success) {
      throw new Error(`Failed to delete collection: ${response.error?.message}`)
    }
  }

  /**
   * Create documents in collection
   */
  async createDocuments<T = any>(
    collection: string,
    data: Record<string, any>[]
  ): Promise<T[]> {
    const response = await this.queryClient.create<T>(collection, data)

    if (!response.success) {
      throw new Error(`Failed to create documents: ${response.error?.message}`)
    }

    const created = response.data!.created
    return Array.isArray(created) ? created : [created]
  }

  /**
   * Create a single document
   */
  async createDocument<T = any>(
    collection: string,
    data: Record<string, any>
  ): Promise<T> {
    const response = await this.queryClient.create<T>(collection, data)

    if (!response.success) {
      throw new Error(`Failed to create document: ${response.error?.message}`)
    }

    const created = response.data!.created
    return Array.isArray(created) ? created[0] : created
  }

  /**
   * Find documents
   */
  async findDocuments<T = any>(
    collection: string,
    query?: MongoQuery
  ): Promise<T[]> {
    const response = await this.queryClient.find<T>(collection, query)

    if (!response.success) {
      throw new Error(`Failed to find documents: ${response.error?.message}`)
    }

    return response.data!.documents || []
  }

  /**
   * Count documents
   */
  async countDocuments(collection: string, where?: Record<string, any>): Promise<number> {
    const response = await this.queryClient.count(collection, { where })

    if (!response.success) {
      throw new Error(`Failed to count documents: ${response.error?.message}`)
    }

    return response.data!.count || 0
  }

  /**
   * Delete all documents in collection
   */
  async deleteAllDocuments(collection: string): Promise<number> {
    const response = await this.queryClient.delete(collection, {}, { multi: true })

    if (!response.success) {
      throw new Error(`Failed to delete documents: ${response.error?.message}`)
    }

    return response.data!.deleted || 0
  }

  /**
   * Create collection with sample data
   */
  async createCollectionWithData<T = any>(
    name: string,
    documents: Record<string, any>[]
  ): Promise<{ collectionName: string; collectionId: string; documents: T[] }> {
    const { name: collectionName, id: collectionId } = await this.createTestCollection(name)
    const createdDocs = await this.createDocuments<T>(collectionName, documents)

    return {
      collectionName,
      collectionId,
      documents: createdDocs,
    }
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(name: string): Promise<any> {
    const response = await this.adminClient.getCollectionStats(name)

    if (!response.success) {
      throw new Error(`Failed to get collection stats: ${response.error?.message}`)
    }

    return response.data
  }

  /**
   * Check if collection exists
   */
  async collectionExists(name: string): Promise<boolean> {
    const response = await this.adminClient.getCollection(name)
    return response.success
  }

  /**
   * Update admin token
   */
  setToken(token: string): void {
    this.adminClient.setToken(token)
    this.queryClient.setToken(token)
  }
}

/**
 * Create a new collection helper instance
 */
export function createCollectionHelper(
  adminToken: string,
  adminClient?: AdminClient,
  queryClient?: QueryClient
): CollectionHelper {
  return new CollectionHelper(adminToken, adminClient, queryClient)
}
