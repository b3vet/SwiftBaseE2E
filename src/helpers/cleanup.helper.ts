import { createAdminClient, createStorageClient, createQueryClient } from '@/client'
import type { AdminClient, StorageClient, QueryClient } from '@/client'

/**
 * Resource types that can be tracked and cleaned up
 */
export type ResourceType = 'collection' | 'file' | 'user' | 'document'

/**
 * Resource tracking entry
 */
interface TrackedResource {
  type: ResourceType
  id: string
  metadata?: Record<string, any>
}

/**
 * Cleanup helper for managing test resources
 */
export class CleanupHelper {
  private resources: TrackedResource[] = []
  private adminClient?: AdminClient
  private storageClient?: StorageClient
  private queryClient?: QueryClient

  constructor(adminToken?: string) {
    if (adminToken) {
      this.adminClient = createAdminClient(adminToken)
      this.storageClient = createStorageClient(adminToken)
      this.queryClient = createQueryClient(adminToken)
    }
  }

  /**
   * Track a resource for cleanup
   */
  track(type: ResourceType, id: string, metadata?: Record<string, any>): void {
    this.resources.push({ type, id, metadata })
  }

  /**
   * Track multiple resources
   */
  trackMany(type: ResourceType, ids: string[]): void {
    ids.forEach(id => this.track(type, id))
  }

  /**
   * Get all tracked resources of a specific type
   */
  getTracked(type: ResourceType): TrackedResource[] {
    return this.resources.filter(r => r.type === type)
  }

  /**
   * Clean up all tracked resources
   */
  async cleanAll(): Promise<{
    success: number
    failed: number
    errors: Array<{ type: ResourceType; id: string; error: string }>
  }> {
    let success = 0
    let failed = 0
    const errors: Array<{ type: ResourceType; id: string; error: string }> = []

    // Clean in reverse order (LIFO)
    const resourcesToClean = [...this.resources].reverse()

    for (const resource of resourcesToClean) {
      try {
        await this.cleanResource(resource)
        success++
      } catch (error) {
        failed++
        errors.push({
          type: resource.type,
          id: resource.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Clear tracked resources
    this.resources = []

    return { success, failed, errors }
  }

  /**
   * Clean up resources of a specific type
   */
  async cleanByType(type: ResourceType): Promise<void> {
    const resourcesOfType = this.resources.filter(r => r.type === type)

    for (const resource of resourcesOfType) {
      await this.cleanResource(resource)
    }

    // Remove cleaned resources from tracking
    this.resources = this.resources.filter(r => r.type !== type)
  }

  /**
   * Clean a specific resource
   */
  private async cleanResource(resource: TrackedResource): Promise<void> {
    switch (resource.type) {
      case 'collection':
        await this.cleanCollection(resource.id)
        break
      case 'file':
        await this.cleanFile(resource.id)
        break
      case 'document':
        await this.cleanDocument(resource.id, resource.metadata?.collection)
        break
      case 'user':
        // User cleanup would go here if needed
        // For now, we don't delete users as it might affect other tests
        break
      default:
        throw new Error(`Unknown resource type: ${resource.type}`)
    }
  }

  /**
   * Clean up a collection
   */
  private async cleanCollection(name: string): Promise<void> {
    if (!this.adminClient) {
      throw new Error('Admin client not initialized')
    }

    const response = await this.adminClient.deleteCollection(name)

    if (!response.success && response.error?.code !== 'NOT_FOUND') {
      throw new Error(`Failed to delete collection ${name}: ${response.error?.message}`)
    }
  }

  /**
   * Clean up a file
   */
  private async cleanFile(fileId: string): Promise<void> {
    if (!this.storageClient) {
      throw new Error('Storage client not initialized')
    }

    const response = await this.storageClient.deleteFile(fileId)

    if (!response.success && response.error?.code !== 'NOT_FOUND') {
      throw new Error(`Failed to delete file ${fileId}: ${response.error?.message}`)
    }
  }

  /**
   * Clean up a document
   */
  private async cleanDocument(documentId: string, collection?: string): Promise<void> {
    if (!this.queryClient) {
      throw new Error('Query client not initialized')
    }

    if (!collection) {
      throw new Error('Collection name required for document cleanup')
    }

    const response = await this.queryClient.deleteById(collection, documentId)

    if (!response.success && response.error?.code !== 'NOT_FOUND') {
      throw new Error(`Failed to delete document ${documentId}: ${response.error?.message}`)
    }
  }

  /**
   * Get cleanup summary
   */
  getSummary(): {
    total: number
    byType: Record<ResourceType, number>
  } {
    const byType: Record<string, number> = {}

    this.resources.forEach(resource => {
      byType[resource.type] = (byType[resource.type] || 0) + 1
    })

    return {
      total: this.resources.length,
      byType: byType as Record<ResourceType, number>,
    }
  }

  /**
   * Clear all tracked resources without cleanup
   */
  clear(): void {
    this.resources = []
  }

  /**
   * Set admin token for cleanup operations
   */
  setToken(token: string): void {
    if (this.adminClient) this.adminClient.setToken(token)
    if (this.storageClient) this.storageClient.setToken(token)
    if (this.queryClient) this.queryClient.setToken(token)
  }
}

/**
 * Create a new cleanup helper instance
 */
export function createCleanupHelper(adminToken?: string): CleanupHelper {
  return new CleanupHelper(adminToken)
}
