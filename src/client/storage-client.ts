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
  async downloadFile(fileId: string): Promise<{
    buffer: Buffer
    metadata: FileMetadata
    status: number
  }> {
    const url = `${this.client.getBaseUrl()}${API_ENDPOINTS.STORAGE_FILE(fileId)}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    })

    const buffer = Buffer.from(await response.arrayBuffer())
    const contentType = response.headers.get('content-type') || 'application/octet-stream'

    // Try to get metadata from response headers or make separate call
    const metadataResponse = await this.getFileMetadata(fileId)
    const metadata = metadataResponse.data!

    return {
      buffer,
      metadata,
      status: response.status,
    }
  }

  /**
   * Download file with range support
   */
  async downloadFileRange(
    fileId: string,
    start: number,
    end?: number
  ): Promise<{
    buffer: Buffer
    status: number
    range: { start: number; end: number; total: number }
  }> {
    const url = `${this.client.getBaseUrl()}${API_ENDPOINTS.STORAGE_FILE(fileId)}`

    const rangeHeader = end !== undefined ? `bytes=${start}-${end}` : `bytes=${start}-`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Range': rangeHeader,
      },
    })

    const buffer = Buffer.from(await response.arrayBuffer())

    // Parse Content-Range header (e.g., "bytes 0-1023/2048")
    const contentRange = response.headers.get('content-range') || ''
    const match = contentRange.match(/bytes (\d+)-(\d+)\/(\d+)/)

    const range = match
      ? { start: parseInt(match[1]), end: parseInt(match[2]), total: parseInt(match[3]) }
      : { start, end: end || 0, total: buffer.length }

    return {
      buffer,
      status: response.status,
      range,
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
    limit?: number,
    offset?: number
  ): Promise<ApiResponse<ListFilesResponse>> {
    const query: Record<string, any> = {}
    if (limit !== undefined) query.limit = limit
    if (offset !== undefined) query.offset = offset

    return this.client.authenticatedRequest<ListFilesResponse>(
      API_ENDPOINTS.STORAGE_FILES,
      this.token,
      { method: 'GET', query }
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
