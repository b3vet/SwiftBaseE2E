import { getEnvironment } from '@/config/environment'
import { API_VERSION_HEADER } from '@/config/constants'
import type { ApiResponse, RequestOptions, AuthenticatedRequestOptions } from '@/types'

/**
 * HTTP client for making API requests to SwiftBase
 */
export class ApiClient {
  private baseUrl: string
  private apiVersion: string
  private defaultTimeout: number

  constructor(
    baseUrl?: string,
    apiVersion?: string,
    timeout?: number
  ) {
    const env = getEnvironment()
    this.baseUrl = baseUrl || env.SWIFTBASE_URL
    this.apiVersion = apiVersion || env.SWIFTBASE_API_VERSION
    this.defaultTimeout = timeout || env.TEST_TIMEOUT
  }

  /**
   * Make HTTP request
   */
  async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      query,
      timeout = this.defaultTimeout,
    } = options

    // Build URL with query parameters
    const url = this.buildUrl(endpoint, query)

    // Build headers
    const requestHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      [API_VERSION_HEADER]: this.apiVersion,
      ...headers,
    }

    // Build request options
    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders,
      signal: AbortSignal.timeout(timeout),
    }

    // Add body for POST/PUT/PATCH requests
    if (body && method !== 'GET' && method !== 'DELETE') {
      requestOptions.body = JSON.stringify(body)
    }

    try {
      const response = await fetch(url, requestOptions)
      const data = await response.json()

      // Log request/response in debug mode
      if (getEnvironment().DEBUG_MODE) {
        console.log(`[${method}] ${endpoint}`, {
          status: response.status,
          success: data.success,
        })
      }

      return data as ApiResponse<T>
    } catch (error) {
      if (error instanceof Error) {
        // Handle timeout
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
          return {
            success: false,
            error: {
              code: 'TIMEOUT',
              message: 'Request timeout',
              timestamp: new Date().toISOString(),
            },
          }
        }

        // Handle network errors
        return {
          success: false,
          error: {
            code: 'NETWORK_ERROR',
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        }
      }

      throw error
    }
  }

  /**
   * Make authenticated request
   */
  async authenticatedRequest<T = any>(
    endpoint: string,
    token: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      },
    })
  }

  /**
   * GET request
   */
  async get<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    body?: any,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body })
  }

  /**
   * PUT request
   */
  async put<T = any>(
    endpoint: string,
    body?: any,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body })
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    endpoint: string,
    body?: any,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body })
  }

  /**
   * DELETE request
   */
  async delete<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }

  /**
   * OPTIONS request (for CORS preflight)
   */
  async options(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<Response> {
    const url = this.buildUrl(endpoint)
    return fetch(url, { ...options, method: 'OPTIONS' })
  }

  /**
   * Build full URL with query parameters
   */
  private buildUrl(endpoint: string, query?: Record<string, string | number | boolean>): string {
    const url = new URL(endpoint, this.baseUrl)

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        url.searchParams.append(key, String(value))
      })
    }

    return url.toString()
  }

  /**
   * Get base URL
   */
  getBaseUrl(): string {
    return this.baseUrl
  }

  /**
   * Get API version
   */
  getApiVersion(): string {
    return this.apiVersion
  }
}

/**
 * Create a new API client instance
 */
export function createApiClient(
  baseUrl?: string,
  apiVersion?: string,
  timeout?: number
): ApiClient {
  return new ApiClient(baseUrl, apiVersion, timeout)
}

/**
 * Default API client instance
 */
export const apiClient = createApiClient()
