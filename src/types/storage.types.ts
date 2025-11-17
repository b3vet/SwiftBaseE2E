/**
 * File metadata object
 */
export interface FileMetadata {
  id: string
  filename: string
  originalName: string
  contentType: string
  size: number
  path: string
  metadata?: Record<string, any>
  uploadedBy?: string | null
  createdAt: string
}

/**
 * File upload request
 */
export interface FileUploadRequest {
  file: Buffer | Blob | File
  filename: string
  contentType?: string
  metadata?: Record<string, any>
}

/**
 * File upload response
 */
export interface FileUploadResponse {
  file: FileMetadata
}

/**
 * File download options
 */
export interface FileDownloadOptions {
  range?: {
    start: number
    end?: number
  }
}

/**
 * File download response
 */
export interface FileDownloadResponse {
  data: Buffer
  metadata: FileMetadata
  contentType: string
  contentLength: number
  range?: {
    start: number
    end: number
    total: number
  }
}

/**
 * List files response
 */
export interface ListFilesResponse {
  files: FileMetadata[]
  total: number
}

/**
 * File search request
 */
export interface FileSearchRequest {
  query?: string
  limit?: number
  offset?: number
}

/**
 * Storage statistics
 */
export interface StorageStats {
  totalFiles: number
  totalSize: number
  userFiles?: number
  userSize?: number
  averageFileSize: number
}

/**
 * Delete file response
 */
export interface DeleteFileResponse {
  success: boolean
  fileId: string
}
