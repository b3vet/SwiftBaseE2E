import { describe, it, expect } from 'vitest'
import { createApiClient } from '@/client'
import { API_ENDPOINTS } from '@/config/constants'
import { validateApiResponse } from '@/validators/response.validator'
import { healthResponseSchema, apiInfoResponseSchema } from '@/validators/schemas'

describe('Health & Status Endpoints', () => {
  const apiClient = createApiClient()

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await apiClient.get(API_ENDPOINTS.HEALTH)

      // Validate response structure
      expect(response).toBeDefined()
      expect(response).toHaveProperty('status')
      expect(response).toHaveProperty('timestamp')

      // Validate specific values
      expect(response.status).toBe('healthy')
      expect(response.timestamp).toBeDefined()

      // Validate against schema
      const validated = validateApiResponse(response)
      expect(validated).toBeDefined()
    })

    it('should include version information', async () => {
      const response = await apiClient.get(API_ENDPOINTS.HEALTH)

      expect(response).toHaveProperty('version')
      expect(typeof response.version).toBe('string')
    })

    it('should return response within acceptable time', async () => {
      const startTime = Date.now()
      await apiClient.get(API_ENDPOINTS.HEALTH)
      const duration = Date.now() - startTime

      // Should respond within 1 second
      expect(duration).toBeLessThan(1000)
    })
  })

  describe('GET /health/db', () => {
    it('should return database health status', async () => {
      const response = await apiClient.get(API_ENDPOINTS.HEALTH_DB)

      expect(response).toBeDefined()
      expect(response).toHaveProperty('status')
      expect(response.status).toBe('healthy')
    })

    it('should include database connection info', async () => {
      const response = await apiClient.get(API_ENDPOINTS.HEALTH_DB)

      expect(response).toHaveProperty('database')
      expect(response.database).toHaveProperty('connected')
      expect(response.database.connected).toBe(true)
    })

    it('should include database statistics', async () => {
      const response = await apiClient.get(API_ENDPOINTS.HEALTH_DB)

      if (response.database) {
        expect(response.database).toHaveProperty('tables')
        expect(response.database).toHaveProperty('size')
        expect(typeof response.database.tables).toBe('number')
      }
    })
  })

  describe('GET /api', () => {
    it('should return API information', async () => {
      const response = await apiClient.get(API_ENDPOINTS.API_INFO)

      expect(response).toBeDefined()
      expect(response).toHaveProperty('name')
      expect(response).toHaveProperty('version')
      expect(response).toHaveProperty('description')
    })

    it('should match expected API metadata', async () => {
      const response = await apiClient.get(API_ENDPOINTS.API_INFO)

      expect(response.name).toBe('SwiftBase API')
      expect(response.version).toBeDefined()
      expect(response.description).toBeDefined()
    })
  })

  describe('API Version Headers', () => {
    it('should accept API version header', async () => {
      const response = await apiClient.get(API_ENDPOINTS.HEALTH)

      // Response should be successful when version header is sent
      expect(response).toBeDefined()
      expect(response.status).toBe('healthy')
    })

    it('should work without version header', async () => {
      const response = await apiClient.request(API_ENDPOINTS.HEALTH, {
        method: 'GET',
        headers: {
          'API-Version': undefined as any,
        },
      })

      // Should still work with default version
      expect(response).toBeDefined()
    })
  })
})
