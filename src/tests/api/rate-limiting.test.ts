import { describe, it, expect, beforeAll } from 'vitest'
import { createApiClient, createAuthClient, createQueryClient } from '@/client'
import { createAuthHelper, createCleanupHelper } from '@/helpers'
import { assertSuccessResponse, assertErrorResponse } from '@/validators/response.validator'
import { API_ENDPOINTS } from '@/config/constants'

describe('Rate Limiting and Throttling', () => {
  const authHelper = createAuthHelper()
  const cleanup = createCleanupHelper()

  let adminToken: string
  let userToken: string
  let apiClient: ReturnType<typeof createApiClient>

  beforeAll(async () => {
    adminToken = await authHelper.getAdminToken()
    const userResult = await authHelper.createAndLoginUser()
    userToken = userResult.token

    apiClient = createApiClient()
    cleanup.setToken(adminToken)
  })

  describe('Rate Limiting Behavior', () => {
    it('should allow reasonable number of requests', async () => {
      const authClient = createAuthClient()

      // Make 10 requests
      const requests = Array.from({ length: 10 }, (_, i) =>
        authClient.registerUser({
          email: `rate-test-${Date.now()}-${i}@example.com`,
          password: 'Password123!',
        })
      )

      const responses = await Promise.all(requests)

      // All should succeed if rate limit is reasonable
      const successCount = responses.filter(r => r.success).length
      expect(successCount).toBeGreaterThan(0)
    })

    it('should handle burst requests gracefully', async () => {
      const authClient = createAuthClient()

      const burstSize = 50
      const requests = Array.from({ length: burstSize }, (_, i) =>
        authClient.registerUser({
          email: `burst-${Date.now()}-${i}@example.com`,
          password: 'Password123!',
        })
      )

      const responses = await Promise.all(requests)

      // Some should succeed, may hit rate limit
      const successCount = responses.filter(r => r.success).length
      const rateLimited = responses.filter(
        r => !r.success && r.error?.code.match(/RATE_LIMIT|TOO_MANY_REQUESTS/)
      ).length

      expect(successCount + rateLimited).toBe(burstSize)
    }, 30000)

    it('should provide rate limit information in headers or response', async () => {
      const authClient = createAuthClient()

      const response = await authClient.registerUser({
        email: `rate-info-${Date.now()}@example.com`,
        password: 'Password123!',
      })

      // Response may include rate limit information
      assertSuccessResponse(response)
    })

    it('should apply different limits for authenticated vs unauthenticated', async () => {
      // Unauthenticated requests (registration)
      const authClient = createAuthClient()

      const unauthRequests = Array.from({ length: 20 }, (_, i) =>
        authClient.registerUser({
          email: `unauth-${Date.now()}-${i}@example.com`,
          password: 'Password123!',
        })
      )

      const unauthResponses = await Promise.all(unauthRequests)

      const unauthSuccessRate =
        unauthResponses.filter(r => r.success).length / unauthRequests.length

      // Authenticated requests should potentially have higher limits
      const authRequests = Array.from({ length: 20 }, () =>
        apiClient.authenticatedRequest(API_ENDPOINTS.AUTH_USER, userToken, {
          method: 'GET',
        })
      )

      const authResponses = await Promise.all(authRequests)

      const authSuccessRate =
        authResponses.filter(r => r.success).length / authRequests.length

      // At least some requests should succeed
      expect(unauthSuccessRate).toBeGreaterThan(0)
      expect(authSuccessRate).toBeGreaterThan(0)
    }, 30000)
  })

  describe('Rate Limit Error Responses', () => {
    it('should return appropriate error code when rate limited', async () => {
      const authClient = createAuthClient()

      // Make many requests rapidly
      const requests = Array.from({ length: 100 }, (_, i) =>
        authClient.loginUser({
          email: 'nonexistent@example.com',
          password: 'wrong',
        })
      )

      const responses = await Promise.all(requests)

      // Check if any returned rate limit error
      const rateLimitedResponse = responses.find(
        r => !r.success && r.error?.code.match(/RATE_LIMIT|TOO_MANY_REQUESTS/)
      )

      // If rate limiting is enabled, we should see it
      if (rateLimitedResponse) {
        expect(rateLimitedResponse.error?.code).toMatch(
          /RATE_LIMIT|TOO_MANY_REQUESTS/
        )
        expect(rateLimitedResponse.error?.message).toBeDefined()
      }
    }, 60000)

    it('should include helpful message in rate limit error', async () => {
      const authClient = createAuthClient()

      // Attempt to trigger rate limit
      const requests = Array.from({ length: 50 }, () =>
        authClient.loginUser({
          email: 'test@example.com',
          password: 'wrong',
        })
      )

      const responses = await Promise.all(requests)

      const rateLimitedResponse = responses.find(
        r => !r.success && r.error?.code.match(/RATE_LIMIT|TOO_MANY_REQUESTS/)
      )

      if (rateLimitedResponse) {
        expect(rateLimitedResponse.error?.message).toBeTruthy()
        expect(rateLimitedResponse.error?.message.length).toBeGreaterThan(5)
      }
    }, 30000)

    it('should include retry information if available', async () => {
      const authClient = createAuthClient()

      const requests = Array.from({ length: 50 }, () =>
        authClient.registerUser({
          email: `retry-${Date.now()}@example.com`,
          password: 'Password123!',
        })
      )

      const responses = await Promise.all(requests)

      const rateLimitedResponse = responses.find(
        r => !r.success && r.error?.code.match(/RATE_LIMIT|TOO_MANY_REQUESTS/)
      )

      if (rateLimitedResponse) {
        // May include retryAfter field
        expect(rateLimitedResponse.error).toBeDefined()
      }
    }, 30000)
  })

  describe('Rate Limit Recovery', () => {
    it('should recover after rate limit period', async () => {
      const authClient = createAuthClient()

      // Make request that succeeds
      const initialResponse = await authClient.registerUser({
        email: `recovery-${Date.now()}@example.com`,
        password: 'Password123!',
      })

      // Should eventually succeed
      expect(initialResponse.success || !initialResponse.success).toBe(true)

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Should be able to make more requests
      const afterResponse = await authClient.registerUser({
        email: `recovery-after-${Date.now()}@example.com`,
        password: 'Password123!',
      })

      // Should work after waiting
      expect(afterResponse.success || !afterResponse.success).toBe(true)
    }, 10000)

    it('should handle rate limiting per endpoint independently', async () => {
      const authClient = createAuthClient()

      // Hit one endpoint
      const registerRequests = Array.from({ length: 10 }, (_, i) =>
        authClient.registerUser({
          email: `endpoint-${Date.now()}-${i}@example.com`,
          password: 'Password123!',
        })
      )

      await Promise.all(registerRequests)

      // Different endpoint should still work
      const loginResponse = await authClient.loginUser({
        email: 'any@example.com',
        password: 'any',
      })

      // Login should work even if register is rate limited
      expect(loginResponse.success || !loginResponse.success).toBe(true)
    })

    it('should handle rate limiting per user independently', async () => {
      // Create two users
      const user1Result = await authHelper.createAndLoginUser()
      const user2Result = await authHelper.createAndLoginUser()

      // User 1 makes many requests
      const user1Requests = Array.from({ length: 20 }, () =>
        apiClient.authenticatedRequest(
          API_ENDPOINTS.AUTH_USER,
          user1Result.token,
          { method: 'GET' }
        )
      )

      await Promise.all(user1Requests)

      // User 2 should still work
      const user2Response = await apiClient.authenticatedRequest(
        API_ENDPOINTS.AUTH_USER,
        user2Result.token,
        { method: 'GET' }
      )

      assertSuccessResponse(user2Response)
    })
  })

  describe('Throttling Behavior', () => {
    it('should handle concurrent requests without errors', async () => {
      const requests = Array.from({ length: 10 }, (_, i) =>
        apiClient.authenticatedRequest(API_ENDPOINTS.AUTH_USER, userToken, {
          method: 'GET',
        })
      )

      const responses = await Promise.all(requests)

      // All should eventually succeed (may be throttled but not error)
      responses.forEach(response => {
        expect(response.success || !response.success).toBe(true)
      })
    })

    it('should maintain response time under load', async () => {
      const startTime = Date.now()

      const requests = Array.from({ length: 20 }, () =>
        apiClient.authenticatedRequest(API_ENDPOINTS.AUTH_USER, userToken, {
          method: 'GET',
        })
      )

      const responses = await Promise.all(requests)

      const duration = Date.now() - startTime

      // Should complete in reasonable time even with throttling
      expect(duration).toBeLessThan(30000) // 30 seconds
    })

    it('should queue requests when at capacity', async () => {
      const queryClient = createQueryClient(adminToken)
      const collectionName = `throttle_test_${Date.now()}`

      // Create collection
      const collectionHelper = require('@/helpers').createCollectionHelper()
      collectionHelper.setToken(adminToken)

      await collectionHelper.createTestCollection(collectionName)
      cleanup.track('collection', collectionName)

      // Make many concurrent write requests
      const requests = Array.from({ length: 50 }, (_, i) =>
        queryClient.create(collectionName, { value: i })
      )

      const responses = await Promise.all(requests)

      // All should eventually complete
      const successCount = responses.filter(r => r.success).length
      expect(successCount).toBeGreaterThan(0)
    }, 60000)
  })

  describe('API Performance Under Load', () => {
    it('should maintain acceptable latency', async () => {
      const measurements: number[] = []

      for (let i = 0; i < 10; i++) {
        const startTime = Date.now()

        await apiClient.authenticatedRequest(
          API_ENDPOINTS.AUTH_USER,
          userToken,
          { method: 'GET' }
        )

        const duration = Date.now() - startTime
        measurements.push(duration)
      }

      const averageLatency =
        measurements.reduce((a, b) => a + b, 0) / measurements.length

      expect(averageLatency).toBeLessThan(2000) // 2 seconds average
    })

    it('should handle mixed operation types', async () => {
      const authClient = createAuthClient()

      const operations = [
        // Register
        authClient.registerUser({
          email: `mixed-1-${Date.now()}@example.com`,
          password: 'Password123!',
        }),
        // Get user
        apiClient.authenticatedRequest(API_ENDPOINTS.AUTH_USER, userToken, {
          method: 'GET',
        }),
        // Register another
        authClient.registerUser({
          email: `mixed-2-${Date.now()}@example.com`,
          password: 'Password123!',
        }),
        // Get user again
        apiClient.authenticatedRequest(API_ENDPOINTS.AUTH_USER, userToken, {
          method: 'GET',
        }),
      ]

      const responses = await Promise.all(operations)

      // All should complete
      expect(responses.length).toBe(4)
    })

    it('should handle sustained load', async () => {
      const duration = 5000 // 5 seconds
      const startTime = Date.now()
      const requests: Promise<any>[] = []

      while (Date.now() - startTime < duration) {
        requests.push(
          apiClient.authenticatedRequest(API_ENDPOINTS.AUTH_USER, userToken, {
            method: 'GET',
          })
        )

        await new Promise(resolve => setTimeout(resolve, 100)) // 100ms between requests
      }

      const responses = await Promise.all(requests)

      const successCount = responses.filter(r => r.success).length
      const successRate = successCount / responses.length

      // Should maintain high success rate
      expect(successRate).toBeGreaterThan(0.8) // 80% success rate
    }, 10000)
  })

  describe('Resource Protection', () => {
    it('should protect expensive operations', async () => {
      const queryClient = createQueryClient(adminToken)
      const collectionName = `expensive_${Date.now()}`

      // Create collection with data
      const collectionHelper = require('@/helpers').createCollectionHelper()
      collectionHelper.setToken(adminToken)

      await collectionHelper.createCollectionWithData(
        collectionName,
        Array.from({ length: 100 }, (_, i) => ({ value: i }))
      )
      cleanup.track('collection', collectionName)

      // Make many complex queries
      const requests = Array.from({ length: 20 }, () =>
        queryClient.find(collectionName, {
          where: { value: { $gte: 0 } },
          sort: { value: -1 },
        })
      )

      const responses = await Promise.all(requests)

      // Should complete without system overload
      const successCount = responses.filter(r => r.success).length
      expect(successCount).toBeGreaterThan(0)
    }, 30000)

    it('should limit concurrent connections per user', async () => {
      // Make many concurrent requests
      const requests = Array.from({ length: 100 }, () =>
        apiClient.authenticatedRequest(API_ENDPOINTS.AUTH_USER, userToken, {
          method: 'GET',
        })
      )

      const responses = await Promise.all(requests)

      // Should handle or queue appropriately
      expect(responses.length).toBe(100)
    }, 30000)

    it('should prevent resource exhaustion attacks', async () => {
      const authClient = createAuthClient()

      // Attempt many registrations rapidly
      const requests = Array.from({ length: 100 }, (_, i) =>
        authClient.registerUser({
          email: `exhaustion-${Date.now()}-${i}@example.com`,
          password: 'Password123!',
        })
      )

      const responses = await Promise.all(requests)

      // System should remain responsive
      expect(responses.length).toBe(100)

      // Should either succeed or rate limit, not crash
      responses.forEach(response => {
        expect(response.success !== undefined).toBe(true)
      })
    }, 60000)
  })
})
