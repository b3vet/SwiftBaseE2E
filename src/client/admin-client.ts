import { ApiClient, createApiClient } from './api-client'
import { API_ENDPOINTS } from '@/config/constants'
import type {
  ApiResponse,
  Collection,
  CreateCollectionRequest,
  UpdateCollectionRequest,
  CollectionStats,
  ListCollectionsResponse,
} from '@/types'

/**
 * Admin client for collection management and admin operations
 */
export class AdminClient {
  private client: ApiClient
  private token: string

  constructor(token: string, client?: ApiClient) {
    this.token = token
    this.client = client || createApiClient()
  }

  /**
   * List all collections
   */
  async listCollections(): Promise<ApiResponse<ListCollectionsResponse>> {
    return this.client.authenticatedRequest<ListCollectionsResponse>(
      API_ENDPOINTS.ADMIN_COLLECTIONS,
      this.token,
      { method: 'GET' }
    )
  }

  /**
   * Get collection by name
   */
  async getCollection(name: string): Promise<ApiResponse<Collection>> {
    return this.client.authenticatedRequest<Collection>(
      API_ENDPOINTS.ADMIN_COLLECTION(name),
      this.token,
      { method: 'GET' }
    )
  }

  /**
   * Create a new collection
   */
  async createCollection(
    data: CreateCollectionRequest
  ): Promise<ApiResponse<Collection>> {
    return this.client.authenticatedRequest<Collection>(
      API_ENDPOINTS.ADMIN_COLLECTIONS,
      this.token,
      { method: 'POST', body: data }
    )
  }

  /**
   * Update collection
   */
  async updateCollection(
    name: string,
    data: UpdateCollectionRequest
  ): Promise<ApiResponse<Collection>> {
    return this.client.authenticatedRequest<Collection>(
      API_ENDPOINTS.ADMIN_COLLECTION(name),
      this.token,
      { method: 'PUT', body: data }
    )
  }

  /**
   * Delete collection
   */
  async deleteCollection(name: string): Promise<ApiResponse<void>> {
    return this.client.authenticatedRequest(
      API_ENDPOINTS.ADMIN_COLLECTION(name),
      this.token,
      { method: 'DELETE' }
    )
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(name: string): Promise<ApiResponse<CollectionStats>> {
    return this.client.authenticatedRequest<CollectionStats>(
      API_ENDPOINTS.ADMIN_COLLECTION_STATS(name),
      this.token,
      { method: 'GET' }
    )
  }

  /**
   * Update token
   */
  setToken(token: string): void {
    this.token = token
  }

  /**
   * Get current token
   */
  getToken(): string {
    return this.token
  }
}

/**
 * Create a new admin client instance
 */
export function createAdminClient(token: string, client?: ApiClient): AdminClient {
  return new AdminClient(token, client)
}
