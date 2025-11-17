import { z } from 'zod'
import { createSuccessResponseSchema } from './api.schema'

/**
 * Query action schema
 */
export const queryActionSchema = z.enum([
  'find',
  'findOne',
  'create',
  'update',
  'delete',
  'count',
  'aggregate',
  'custom',
])

/**
 * Where condition schema (recursive for nested queries)
 */
export const whereConditionSchema: z.ZodType<any> = z.lazy(() =>
  z.record(z.union([
    z.any(),
    z.record(z.any()),
  ]))
)

/**
 * Query select schema
 */
export const querySelectSchema = z.union([
  z.array(z.string()),
  z.record(z.union([z.literal(0), z.literal(1)])),
])

/**
 * Query order by schema
 */
export const queryOrderBySchema = z.record(z.enum(['asc', 'desc']))

/**
 * MongoDB query schema
 */
export const mongoQuerySchema = z.object({
  where: whereConditionSchema.optional(),
  select: querySelectSchema.optional(),
  include: z.array(z.string()).optional(),
  orderBy: queryOrderBySchema.optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
  distinct: z.string().optional(),
})

/**
 * Query options schema
 */
export const queryOptionsSchema = z.object({
  upsert: z.boolean().optional(),
  multi: z.boolean().optional(),
  validate: z.boolean().optional(),
  returnNew: z.boolean().optional(),
})

/**
 * Query request schema
 */
export const queryRequestSchema = z.object({
  action: queryActionSchema,
  collection: z.string(),
  query: mongoQuerySchema.optional(),
  data: z.union([z.record(z.any()), z.array(z.record(z.any()))]).optional(),
  options: queryOptionsSchema.optional(),
  custom: z.string().optional(),
  params: z.record(z.any()).optional(),
})

/**
 * Query result schema
 */
export const queryResultSchema = z.object({
  documents: z.array(z.any()).optional(),
  document: z.any().nullable().optional(),
  count: z.number().optional(),
  deleted: z.number().optional(),
  updated: z.number().optional(),
  created: z.union([z.any(), z.array(z.any())]).optional(),
})

/**
 * Bulk operation schema
 */
export const bulkOperationSchema = z.object({
  type: z.enum(['create', 'update', 'delete']),
  collection: z.string(),
  data: z.union([z.record(z.any()), z.array(z.record(z.any()))]).optional(),
  where: whereConditionSchema.optional(),
})

/**
 * Bulk operations request schema
 */
export const bulkOperationsRequestSchema = z.object({
  operations: z.array(bulkOperationSchema),
})

/**
 * Bulk operation result schema
 */
export const bulkOperationResultSchema = z.object({
  success: z.boolean(),
  operation: bulkOperationSchema,
  result: z.any().optional(),
  error: z.string().optional(),
})

/**
 * Bulk operations response data schema
 */
export const bulkOperationsResponseDataSchema = z.object({
  results: z.array(bulkOperationResultSchema),
  successCount: z.number(),
  failureCount: z.number(),
})

/**
 * Custom query schema
 */
export const customQuerySchema = z.object({
  id: z.string(),
  name: z.string(),
  sql: z.string(),
  params: z.record(z.any()).optional(),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/**
 * Register custom query request schema
 */
export const registerCustomQueryRequestSchema = z.object({
  name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,49}$/),
  sql: z.string(),
  params: z.record(z.any()).optional(),
  description: z.string().optional(),
})

/**
 * Full response schemas
 */
export const queryResponseSchema = createSuccessResponseSchema(queryResultSchema)
export const bulkOperationsResponseSchema = createSuccessResponseSchema(bulkOperationsResponseDataSchema)
export const customQueryResponseSchema = createSuccessResponseSchema(customQuerySchema)
