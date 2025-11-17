import { z } from 'zod'
import { createSuccessResponseSchema } from './api.schema'

/**
 * File metadata schema
 */
export const fileMetadataSchema = z.object({
  id: z.string(),
  filename: z.string(),
  originalName: z.string(),
  contentType: z.string(),
  size: z.number(),
  path: z.string(),
  metadata: z.record(z.any()).optional(),
  uploadedBy: z.string().nullable().optional(),
  createdAt: z.string(),
})

/**
 * File upload response data schema
 */
export const fileUploadResponseDataSchema = z.object({
  file: fileMetadataSchema,
})

/**
 * List files response data schema
 */
export const listFilesResponseDataSchema = z.object({
  files: z.array(fileMetadataSchema),
  total: z.number(),
})

/**
 * File search request schema
 */
export const fileSearchRequestSchema = z.object({
  query: z.string().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
})

/**
 * Storage stats schema
 */
export const storageStatsSchema = z.object({
  totalFiles: z.number(),
  totalSize: z.number(),
  userFiles: z.number().optional(),
  userSize: z.number().optional(),
  averageFileSize: z.number(),
})

/**
 * Delete file response data schema
 */
export const deleteFileResponseDataSchema = z.object({
  success: z.boolean(),
  fileId: z.string(),
})

/**
 * Full response schemas
 */
export const fileUploadResponseSchema = createSuccessResponseSchema(fileUploadResponseDataSchema)
export const fileMetadataResponseSchema = createSuccessResponseSchema(fileMetadataSchema)
export const listFilesResponseSchema = createSuccessResponseSchema(listFilesResponseDataSchema)
export const storageStatsResponseSchema = createSuccessResponseSchema(storageStatsSchema)
export const deleteFileResponseSchema = createSuccessResponseSchema(deleteFileResponseDataSchema)
