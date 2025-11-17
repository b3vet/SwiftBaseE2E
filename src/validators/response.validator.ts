import { z } from 'zod'
import { apiResponseSchema, errorResponseSchema } from './schemas/api.schema'

/**
 * Validation error
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: z.ZodIssue[]
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Validate response against schema
 */
export function validateResponse<T extends z.ZodTypeAny>(
  data: unknown,
  schema: T
): z.infer<T> {
  const result = schema.safeParse(data)

  if (!result.success) {
    throw new ValidationError(
      'Response validation failed',
      result.error.errors
    )
  }

  return result.data
}

/**
 * Validate API response structure (generic)
 */
export function validateApiResponse(data: unknown): any {
  return validateResponse(data, apiResponseSchema)
}

/**
 * Validate error response structure
 */
export function validateErrorResponse(data: unknown): any {
  return validateResponse(data, errorResponseSchema)
}

/**
 * Assert response is successful
 */
export function assertSuccessResponse(response: any): void {
  if (!response.success) {
    throw new Error(
      `Expected success response, got error: ${response.error?.message || 'Unknown error'}`
    )
  }
}

/**
 * Assert response is error
 */
export function assertErrorResponse(response: any, expectedCode?: string): void {
  if (response.success) {
    throw new Error('Expected error response, got success')
  }

  if (expectedCode && response.error?.code !== expectedCode) {
    throw new Error(
      `Expected error code ${expectedCode}, got ${response.error?.code}`
    )
  }
}

/**
 * Extract data from successful response
 */
export function extractData<T>(response: any): T {
  assertSuccessResponse(response)
  return response.data as T
}

/**
 * Extract error from error response
 */
export function extractError(response: any): any {
  assertErrorResponse(response)
  return response.error
}

/**
 * Validate and extract data in one step
 */
export function validateAndExtract<T extends z.ZodTypeAny>(
  response: unknown,
  schema: T
): z.infer<T> {
  const validated = validateResponse(response, apiResponseSchema)
  assertSuccessResponse(validated)

  if (schema !== apiResponseSchema) {
    return validateResponse(validated.data, schema)
  }

  return validated.data
}
