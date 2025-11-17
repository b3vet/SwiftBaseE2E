import FormData from 'form-data'
import { ApiClient, createApiClient } from './api-client'
import { API_ENDPOINTS } from '@/config/constants'
import type {
  ApiResponse,
  FileMetadata,
  FileUploadResponse,
  ListFilesResponse,
  FileSearchRequest,
  StorageStats,
  DeleteFileResponse,
} from '@/types'

/**
 * Storage client for file operations
 */
export class StorageClient {
  private client: ApiClient
  private token: string

  constructor(token: string, client?: ApiClient) {
    this.token = token
    this.client = client || createApiClient()
  }

  /**
   * Upload a file
   */
  async uploadFile(
    fileBuffer: Buffer,
    filename: string,
    contentType?: string,
    metadata?: Record<string, any>
  ): Promise<ApiResponse<FileUploadResponse>> {
    const formData = new FormData()
    formData.append('file', fileBuffer, { filename, contentType })

    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata))
    }

    const url = `${this.client.getBaseUrl()}${API_ENDPOINTS.STORAGE_UPLOAD}`

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          ...formData.getHeaders(),
        },
        body: formData as any,
      })

      const data = await response.json()
      return data as ApiResponse<FileUploadResponse>
    } catch (error) {
      if (error instanceof Error) {
        return {
          success: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        }
      }
      throw error
    }
  }

  /**
   * Download a file
   */
  async downloadFile(fileId: string): Promise<ApiResponse<Buffer>> {
    const url = `${this.client.getBaseUrl()}${API_ENDPOINTS.STORAGE_FILE(fileId)}`

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ code: 'DOWNLOAD_ERROR', message: 'Download failed' }))
        return {
          success: false,
          error: {
            code: error.code || 'DOWNLOAD_ERROR',
            message: error.message || response.statusText,
            timestamp: new Date().toISOString(),
          },
        }
      }

      const buffer = Buffer.from(await response.arrayBuffer())

      return {
        success: true,
        data: buffer,
      }
    } catch (error) {
      if (error instanceof Error) {
        return {
          success: false,
          error: {
            code: 'DOWNLOAD_ERROR',
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        }
      }
      throw error
    }
  }

  /**
   * Download file with range support
   */
  async downloadFileRange(
    fileId: string,
    start: number,
    end?: number
  ): Promise<ApiResponse<Buffer>> {
    const url = `${this.client.getBaseUrl()}${API_ENDPOINTS.STORAGE_FILE(fileId)}`

    const rangeHeader = end !== undefined ? `bytes=${start}-${end}` : `bytes=${start}-`

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Range': rangeHeader,
        },
      })

      if (!response.ok && response.status !== 206) {
        const error = await response.json().catch(() => ({ code: 'DOWNLOAD_ERROR', message: 'Range download failed' }))
        return {
          success: false,
          error: {
            code: error.code || 'DOWNLOAD_ERROR',
            message: error.message || response.statusText,
            timestamp: new Date().toISOString(),
          },
        }
      }

      const buffer = Buffer.from(await response.arrayBuffer())

      return {
        success: true,
        data: buffer,
      }
    } catch (error) {
      if (error instanceof Error) {
        return {
          success: false,
          error: {
            code: 'DOWNLOAD_ERROR',
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        }
      }
      throw error
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId: string): Promise<ApiResponse<FileMetadata>> {
    return this.client.authenticatedRequest<FileMetadata>(
      API_ENDPOINTS.STORAGE_FILE_METADATA(fileId),
      this.token,
      { method: 'GET' }
    )
  }

  /**
   * List files
   */
  async listFiles(
    options?: {
      limit?: number
      offset?: number
      contentType?: string
      sort?: string
      order?: 'asc' | 'desc'
    }
  ): Promise<ApiResponse<FileMetadata[]>> {
    const query: Record<string, any> = {}
    if (options?.limit !== undefined) query.limit = options.limit
    if (options?.offset !== undefined) query.offset = options.offset
    if (options?.contentType) query.contentType = options.contentType
    if (options?.sort) query.sort = options.sort
    if (options?.order) query.order = options.order

    return this.client.authenticatedRequest<FileMetadata[]>(
      API_ENDPOINTS.STORAGE_FILES,
      this.token,
      { method: 'GET', query }
    )
  }

  /**
   * Update file metadata
   */
  async updateFileMetadata(
    fileId: string,
    updates: { filename?: string; contentType?: string }
  ): Promise<ApiResponse<FileMetadata>> {
    return this.client.authenticatedRequest<FileMetadata>(
      API_ENDPOINTS.STORAGE_FILE_METADATA(fileId),
      this.token,
      { method: 'PATCH', body: updates }
    )
  }

  /**
   * Search files
   */
  async searchFiles(
    searchQuery: string,
    limit?: number,
    offset?: number
  ): Promise<ApiResponse<ListFilesResponse>> {
    const query: Record<string, any> = { query: searchQuery }
    if (limit !== undefined) query.limit = limit
    if (offset !== undefined) query.offset = offset

    return this.client.authenticatedRequest<ListFilesResponse>(
      API_ENDPOINTS.STORAGE_SEARCH,
      this.token,
      { method: 'GET', query }
    )
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<ApiResponse<DeleteFileResponse>> {
    return this.client.authenticatedRequest<DeleteFileResponse>(
      API_ENDPOINTS.STORAGE_FILE(fileId),
      this.token,
      { method: 'DELETE' }
    )
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<ApiResponse<StorageStats>> {
    return this.client.authenticatedRequest<StorageStats>(
      API_ENDPOINTS.STORAGE_STATS,
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
 * Create a new storage client instance
 */
export function createStorageClient(token: string, client?: ApiClient): StorageClient {
  return new StorageClient(token, client)
}
