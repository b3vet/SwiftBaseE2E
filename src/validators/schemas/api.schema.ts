import { z } from 'zod'

/**
 * API error schema
 */
export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  metadata: z.record(z.any()).nullable().optional(),
  timestamp: z.string(),
})

/**
 * Pagination metadata schema
 */
export const paginationMetadataSchema = z.object({
  total: z.number().nullable().optional(),
  count: z.number(),
  limit: z.number().nullable().optional(),
  offset: z.number().nullable().optional(),
  hasMore: z.boolean().nullable().optional(),
})

/**
 * Response metadata schema
 */
export const responseMetadataSchema = z.object({
  timestamp: z.string(),
  requestId: z.string().nullable().optional(),
  duration: z.number().nullable().optional(),
  version: z.string().optional(),
  pagination: paginationMetadataSchema.nullable().optional(),
})

/**
 * API response schema (generic)
 */
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().nullable().optional(),
  error: apiErrorSchema.nullable().optional(),
  metadata: responseMetadataSchema.nullable().optional(),
})

/**
 * Health response schema
 */
export const healthResponseSchema = z.object({
  status: z.enum(['healthy', 'unhealthy']),
  timestamp: z.string(),
  version: z.string().optional(),
  database: z.object({
    connected: z.boolean(),
    tables: z.number().optional(),
    size: z.string().optional(),
  }).optional(),
})

/**
 * API info response schema
 */
export const apiInfoResponseSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
})

/**
 * Success response with data
 */
export function createSuccessResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
    error: z.null().optional(),
    metadata: responseMetadataSchema.nullable().optional(),
  })
}

/**
 * Error response
 */
export const errorResponseSchema = z.object({
  success: z.literal(false),
  data: z.null().optional(),
  error: apiErrorSchema,
  metadata: responseMetadataSchema.nullable().optional(),
})
