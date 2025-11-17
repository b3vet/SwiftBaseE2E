import { z } from 'zod'
import { createSuccessResponseSchema } from './api.schema'

/**
 * Collection schema
 */
export const collectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  schema: z.record(z.any()).nullable().optional(),
  indexes: z.record(z.any()).nullable().optional(),
  options: z.record(z.any()).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/**
 * Create collection request schema
 */
export const createCollectionRequestSchema = z.object({
  name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,49}$/),
  schema: z.record(z.any()).optional(),
  indexes: z.record(z.any()).optional(),
  options: z.record(z.any()).optional(),
})

/**
 * Update collection request schema
 */
export const updateCollectionRequestSchema = z.object({
  schema: z.record(z.any()).optional(),
  indexes: z.record(z.any()).optional(),
  options: z.record(z.any()).optional(),
})

/**
 * Collection stats schema
 */
export const collectionStatsSchema = z.object({
  collection: z.string(),
  documentCount: z.number(),
  totalSize: z.number(),
  averageDocumentSize: z.number(),
  indexes: z.array(z.object({
    name: z.string(),
    size: z.number(),
  })),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/**
 * List collections response data schema
 */
export const listCollectionsResponseDataSchema = z.object({
  collections: z.array(collectionSchema),
  total: z.number(),
})

/**
 * Document schema
 */
export const documentSchema = z.object({
  id: z.string(),
  collectionId: z.string(),
  data: z.record(z.any()),
  version: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string().nullable().optional(),
  updatedBy: z.string().nullable().optional(),
})

/**
 * Full response schemas
 */
export const collectionResponseSchema = createSuccessResponseSchema(collectionSchema)
export const listCollectionsResponseSchema = createSuccessResponseSchema(listCollectionsResponseDataSchema)
export const collectionStatsResponseSchema = createSuccessResponseSchema(collectionStatsSchema)
