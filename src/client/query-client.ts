import { ApiClient, createApiClient } from './api-client'
import { API_ENDPOINTS } from '@/config/constants'
import type {
  ApiResponse,
  QueryRequest,
  QueryResult,
  BulkOperationsRequest,
  BulkOperationsResponse,
  MongoQuery,
  QueryAction,
} from '@/types'

/**
 * Query client for MongoDB-style queries and bulk operations
 */
export class QueryClient {
  private client: ApiClient
  private token: string

  constructor(token: string, client?: ApiClient) {
    this.token = token
    this.client = client || createApiClient()
  }

  /**
   * Execute a query
   */
  async query<T = any>(
    request: QueryRequest
  ): Promise<ApiResponse<QueryResult<T>>> {
    return this.client.authenticatedRequest<QueryResult<T>>(
      API_ENDPOINTS.QUERY,
      this.token,
      { method: 'POST', body: request }
    )
  }

  /**
   * Find documents
   */
  async find<T = any>(
    collection: string,
    query?: MongoQuery
  ): Promise<ApiResponse<QueryResult<T>>> {
    return this.query<T>({
      action: 'find',
      collection,
      query,
    })
  }

  /**
   * Find one document
   */
  async findOne<T = any>(
    collection: string,
    query?: MongoQuery
  ): Promise<ApiResponse<QueryResult<T>>> {
    return this.query<T>({
      action: 'findOne',
      collection,
      query,
    })
  }

  /**
   * Create document(s)
   */
  async create<T = any>(
    collection: string,
    data: Record<string, any> | Record<string, any>[]
  ): Promise<ApiResponse<QueryResult<T>>> {
    return this.query<T>({
      action: 'create',
      collection,
      data,
    })
  }

  /**
   * Update document(s)
   */
  async update<T = any>(
    collection: string,
    query: MongoQuery,
    data: Record<string, any>,
    options?: { multi?: boolean; returnNew?: boolean }
  ): Promise<ApiResponse<QueryResult<T>>> {
    return this.query<T>({
      action: 'update',
      collection,
      query,
      data,
      options,
    })
  }

  /**
   * Delete document(s)
   */
  async delete<T = any>(
    collection: string,
    query: MongoQuery,
    options?: { multi?: boolean }
  ): Promise<ApiResponse<QueryResult<T>>> {
    return this.query<T>({
      action: 'delete',
      collection,
      query,
      options,
    })
  }

  /**
   * Count documents
   */
  async count(
    collection: string,
    query?: MongoQuery
  ): Promise<ApiResponse<QueryResult>> {
    return this.query({
      action: 'count',
      collection,
      query,
    })
  }

  /**
   * Execute custom query
   */
  async custom<T = any>(
    queryName: string,
    params?: Record<string, any>
  ): Promise<ApiResponse<QueryResult<T>>> {
    return this.query<T>({
      action: 'custom',
      collection: '', // Not used for custom queries
      custom: queryName,
      params,
    })
  }

  /**
   * Execute bulk operations
   */
  async bulk(
    request: BulkOperationsRequest
  ): Promise<ApiResponse<BulkOperationsResponse>> {
    return this.client.authenticatedRequest<BulkOperationsResponse>(
      API_ENDPOINTS.BULK,
      this.token,
      { method: 'POST', body: request }
    )
  }

  /**
   * Helper: Find by ID
   */
  async findById<T = any>(
    collection: string,
    id: string
  ): Promise<ApiResponse<QueryResult<T>>> {
    return this.findOne<T>(collection, {
      where: { _id: id },
    })
  }

  /**
   * Helper: Update by ID
   */
  async updateById<T = any>(
    collection: string,
    id: string,
    data: Record<string, any>,
    returnNew = true
  ): Promise<ApiResponse<QueryResult<T>>> {
    return this.update<T>(
      collection,
      { where: { _id: id } },
      data,
      { returnNew }
    )
  }

  /**
   * Helper: Delete by ID
   */
  async deleteById(
    collection: string,
    id: string
  ): Promise<ApiResponse<QueryResult>> {
    return this.delete(collection, { where: { _id: id } })
  }

  /**
   * Helper: Find with pagination
   */
  async findPaginated<T = any>(
    collection: string,
    where?: Record<string, any>,
    limit = 20,
    offset = 0,
    orderBy?: Record<string, 'asc' | 'desc'>
  ): Promise<ApiResponse<QueryResult<T>>> {
    return this.find<T>(collection, {
      where,
      limit,
      offset,
      orderBy,
    })
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
 * Create a new query client instance
 */
export function createQueryClient(token: string, client?: ApiClient): QueryClient {
  return new QueryClient(token, client)
}
