import { z } from 'zod'
import { createSuccessResponseSchema } from './api.schema'

/**
 * User schema
 */
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean(),
  metadata: z.record(z.any()).optional(),
  lastLogin: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/**
 * Admin schema
 */
export const adminSchema = z.object({
  id: z.string(),
  username: z.string(),
  lastLogin: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/**
 * Auth response data schema
 */
export const authResponseDataSchema = z.object({
  user: userSchema.optional(),
  admin: adminSchema.optional(),
  accessToken: z.string(),
  refreshToken: z.string(),
})

/**
 * Token refresh response data schema
 */
export const tokenRefreshResponseDataSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
})

/**
 * Current user response data schema
 */
export const currentUserResponseDataSchema = z.object({
  user: userSchema.optional(),
  admin: adminSchema.optional(),
})

/**
 * User registration request schema
 */
export const userRegistrationRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  metadata: z.record(z.any()).optional(),
})

/**
 * User login request schema
 */
export const userLoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

/**
 * Admin login request schema
 */
export const adminLoginRequestSchema = z.object({
  username: z.string(),
  password: z.string(),
})

/**
 * Token refresh request schema
 */
export const tokenRefreshRequestSchema = z.object({
  refreshToken: z.string(),
})

/**
 * Full response schemas
 */
export const authResponseSchema = createSuccessResponseSchema(authResponseDataSchema)
export const tokenRefreshResponseSchema = createSuccessResponseSchema(tokenRefreshResponseDataSchema)
export const currentUserResponseSchema = createSuccessResponseSchema(currentUserResponseDataSchema)
