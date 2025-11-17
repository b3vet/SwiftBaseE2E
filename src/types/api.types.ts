/**
 * Standard API response structure
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T | null
  error?: ApiError | null
  metadata?: ResponseMetadata | null
}

/**
 * API error structure
 */
export interface ApiError {
  code: string
  message: string
  metadata?: Record<string, any> | null
  timestamp: string
}

/**
 * Response metadata
 */
export interface ResponseMetadata {
  timestamp: string
  requestId?: string | null
  duration?: number | null
  version?: string
  pagination?: PaginationMetadata | null
}

/**
 * Pagination metadata
 */
export interface PaginationMetadata {
  total?: number | null
  count: number
  limit?: number | null
  offset?: number | null
  hasMore?: boolean | null
}

/**
 * Health check response
 */
export interface HealthResponse {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  version?: string
  database?: {
    connected: boolean
    tables?: number
    size?: string
  }
}

/**
 * API info response
 */
export interface ApiInfoResponse {
  name: string
  version: string
  description: string
}

/**
 * HTTP request options
 */
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS'
  headers?: Record<string, string>
  body?: any
  query?: Record<string, string | number | boolean>
  timeout?: number
}

/**
 * Authenticated request options
 */
export interface AuthenticatedRequestOptions extends RequestOptions {
  token: string
}
