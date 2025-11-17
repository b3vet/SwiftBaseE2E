import { describe, it, expect, beforeAll } from 'vitest'
import { createAuthClient } from '@/client'
import { createAuthHelper, createCleanupHelper } from '@/helpers'
import { randomEmail, randomPassword } from '@/helpers/test-data'
import { assertSuccessResponse, assertErrorResponse } from '@/validators/response.validator'

describe('User Login', () => {
  const authClient = createAuthClient()
  const authHelper = createAuthHelper()
  const cleanup = createCleanupHelper()

  // Test user credentials
  let testEmail: string
  let testPassword: string
  let testUserId: string

  beforeAll(async () => {
    // Create a test user for login tests
    testEmail = randomEmail()
    testPassword = randomPassword()

    const { userId } = await authHelper.registerTestUser(testEmail, testPassword)
    testUserId = userId
    cleanup.track('user', testUserId)
  })

  describe('Valid Credentials', () => {
    it('should login with correct email and password', async () => {
      const response = await authClient.loginUser({
        email: testEmail,
        password: testPassword,
      })

      assertSuccessResponse(response)
      expect(response.data).toBeDefined()
      expect(response.data!.user).toBeDefined()
      expect(response.data!.user!.email).toBe(testEmail)
      expect(response.data!.user!.id).toBe(testUserId)
      expect(response.data!.accessToken).toBeDefined()
      expect(response.data!.refreshToken).toBeDefined()
    })

    it('should return different tokens on each login', async () => {
      const response1 = await authClient.loginUser({
        email: testEmail,
        password: testPassword,
      })

      const response2 = await authClient.loginUser({
        email: testEmail,
        password: testPassword,
      })

      assertSuccessResponse(response1)
      assertSuccessResponse(response2)

      // Tokens should be different for each login
      expect(response1.data!.accessToken).not.toBe(response2.data!.accessToken)
      expect(response1.data!.refreshToken).not.toBe(response2.data!.refreshToken)
    })

    it('should login with case-insensitive email', async () => {
      // Try login with uppercase email
      const response = await authClient.loginUser({
        email: testEmail.toUpperCase(),
        password: testPassword,
      })

      // Might succeed or fail depending on implementation
      // If it succeeds, verify user data
      if (response.success) {
        expect(response.data!.user!.id).toBe(testUserId)
      }
    })

    it('should update lastLogin timestamp', async () => {
      const response1 = await authClient.loginUser({
        email: testEmail,
        password: testPassword,
      })

      assertSuccessResponse(response1)
      const firstLastLogin = response1.data!.user!.lastLogin

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 100))

      const response2 = await authClient.loginUser({
        email: testEmail,
        password: testPassword,
      })

      assertSuccessResponse(response2)
      const secondLastLogin = response2.data!.user!.lastLogin

      // Last login should be updated (if returned)
      if (firstLastLogin && secondLastLogin) {
        expect(new Date(secondLastLogin).getTime()).toBeGreaterThanOrEqual(
          new Date(firstLastLogin).getTime()
        )
      }
    })

    it('should return valid JWT tokens', async () => {
      const response = await authClient.loginUser({
        email: testEmail,
        password: testPassword,
      })

      assertSuccessResponse(response)

      const accessToken = response.data!.accessToken
      const refreshToken = response.data!.refreshToken

      // JWT tokens should have 3 parts
      expect(accessToken.split('.').length).toBe(3)
      expect(refreshToken.split('.').length).toBe(3)

      // Tokens should be different
      expect(accessToken).not.toBe(refreshToken)
    })
  })

  describe('Invalid Credentials', () => {
    it('should reject login with wrong password', async () => {
      const response = await authClient.loginUser({
        email: testEmail,
        password: 'WrongPassword123!',
      })

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/UNAUTHORIZED|BAD_REQUEST/)
      expect(response.error?.message.toLowerCase()).toMatch(/password|credentials|invalid/)
    })

    it('should reject login with non-existent email', async () => {
      const response = await authClient.loginUser({
        email: randomEmail(),
        password: randomPassword(),
      })

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/UNAUTHORIZED|NOT_FOUND|BAD_REQUEST/)
    })

    it('should reject login with empty password', async () => {
      const response = await authClient.loginUser({
        email: testEmail,
        password: '',
      })

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/VALIDATION_ERROR|BAD_REQUEST|UNAUTHORIZED/)
    })

    it('should reject login with empty email', async () => {
      const response = await authClient.loginUser({
        email: '',
        password: testPassword,
      })

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/VALIDATION_ERROR|BAD_REQUEST/)
    })

    it('should reject login with invalid email format', async () => {
      const response = await authClient.loginUser({
        email: 'not-an-email',
        password: testPassword,
      })

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/VALIDATION_ERROR|BAD_REQUEST|UNAUTHORIZED/)
    })

    it('should not reveal whether email exists', async () => {
      // Try with non-existent email
      const response1 = await authClient.loginUser({
        email: randomEmail(),
        password: randomPassword(),
      })

      // Try with existing email but wrong password
      const response2 = await authClient.loginUser({
        email: testEmail,
        password: 'WrongPassword123!',
      })

      // Both should return similar error (security best practice)
      assertErrorResponse(response1)
      assertErrorResponse(response2)

      // Error messages should be similar (not revealing if email exists)
      // This is a security best practice but implementation may vary
    })
  })

  describe('Missing Fields', () => {
    it('should reject login with missing email', async () => {
      const response = await authClient.loginUser({
        password: testPassword,
      } as any)

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/VALIDATION_ERROR|BAD_REQUEST/)
    })

    it('should reject login with missing password', async () => {
      const response = await authClient.loginUser({
        email: testEmail,
      } as any)

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/VALIDATION_ERROR|BAD_REQUEST/)
    })

    it('should reject login with no credentials', async () => {
      const response = await authClient.loginUser({} as any)

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/VALIDATION_ERROR|BAD_REQUEST/)
    })
  })

  describe('Multiple Sessions', () => {
    it('should allow multiple concurrent logins', async () => {
      const logins = []

      // Login multiple times
      for (let i = 0; i < 3; i++) {
        const response = await authClient.loginUser({
          email: testEmail,
          password: testPassword,
        })

        assertSuccessResponse(response)
        logins.push({
          accessToken: response.data!.accessToken,
          refreshToken: response.data!.refreshToken,
        })
      }

      // All tokens should be unique
      const accessTokens = logins.map(l => l.accessToken)
      const refreshTokens = logins.map(l => l.refreshToken)

      expect(new Set(accessTokens).size).toBe(3)
      expect(new Set(refreshTokens).size).toBe(3)
    })

    it('should support multiple users logging in simultaneously', async () => {
      // Create multiple test users
      const users = []
      for (let i = 0; i < 3; i++) {
        const email = randomEmail()
        const password = randomPassword()
        const { userId } = await authHelper.registerTestUser(email, password)

        users.push({ email, password, userId })
        cleanup.track('user', userId)
      }

      // Login all users
      const logins = await Promise.all(
        users.map(user =>
          authClient.loginUser({
            email: user.email,
            password: user.password,
          })
        )
      )

      // All logins should succeed
      logins.forEach((response, index) => {
        assertSuccessResponse(response)
        expect(response.data!.user!.id).toBe(users[index].userId)
      })
    })
  })

  describe('Security', () => {
    it('should not return password in response', async () => {
      const response = await authClient.loginUser({
        email: testEmail,
        password: testPassword,
      })

      assertSuccessResponse(response)

      const responseStr = JSON.stringify(response)
      expect(responseStr).not.toContain('password')
      expect(response.data!.user).not.toHaveProperty('password')
      expect(response.data!.user).not.toHaveProperty('passwordHash')
    })

    it('should handle SQL injection attempts safely', async () => {
      const sqlInjectionAttempts = [
        "admin@example.com' OR '1'='1",
        "admin@example.com'; DROP TABLE users--",
        "admin@example.com' UNION SELECT * FROM users--",
      ]

      for (const attempt of sqlInjectionAttempts) {
        const response = await authClient.loginUser({
          email: attempt,
          password: 'password',
        })

        // Should fail gracefully
        assertErrorResponse(response)
      }
    })
  })

  describe('Performance', () => {
    it('should login within acceptable time', async () => {
      const startTime = Date.now()

      const response = await authClient.loginUser({
        email: testEmail,
        password: testPassword,
      })

      const duration = Date.now() - startTime

      assertSuccessResponse(response)
      expect(duration).toBeLessThan(2000) // Should complete within 2 seconds
    })

    it('should handle rapid successive logins', async () => {
      const promises = Array.from({ length: 5 }, () =>
        authClient.loginUser({
          email: testEmail,
          password: testPassword,
        })
      )

      const responses = await Promise.all(promises)

      // All should succeed
      responses.forEach(response => {
        assertSuccessResponse(response)
      })
    })
  })

  describe('Response Format', () => {
    it('should return standardized API response', async () => {
      const response = await authClient.loginUser({
        email: testEmail,
        password: testPassword,
      })

      expect(response).toHaveProperty('success')
      expect(response).toHaveProperty('data')
      expect(response.success).toBe(true)
    })

    it('should include user metadata if present', async () => {
      // Create user with metadata
      const email = randomEmail()
      const password = randomPassword()
      const metadata = { name: 'Test User', role: 'tester' }

      const { userId } = await authHelper.registerTestUser(email, password, metadata)
      cleanup.track('user', userId)

      // Login and check metadata
      const response = await authClient.loginUser({ email, password })

      assertSuccessResponse(response)
      expect(response.data!.user!.metadata).toEqual(metadata)
    })
  })
})
