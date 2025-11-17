import { describe, it, expect, beforeEach } from 'vitest'
import { createAuthClient } from '@/client'
import { createCleanupHelper } from '@/helpers'
import { randomEmail, randomPassword } from '@/helpers/test-data'
import { INVALID_TEST_USERS, PASSWORD_TEST_CASES } from '@/fixtures'
import { validateResponse, assertSuccessResponse, assertErrorResponse } from '@/validators/response.validator'
import { authResponseSchema } from '@/validators/schemas'
import { ERROR_CODES, HTTP_STATUS } from '@/config/constants'

describe('User Registration', () => {
  const authClient = createAuthClient()
  const cleanup = createCleanupHelper()

  describe('Valid Registration Flow', () => {
    it('should register a new user with valid credentials', async () => {
      const email = randomEmail()
      const password = randomPassword()

      const response = await authClient.registerUser({
        email,
        password,
        metadata: { name: 'Test User' },
      })

      // Validate response structure
      assertSuccessResponse(response)
      expect(response.data).toBeDefined()

      // Validate data fields
      const data = response.data!
      expect(data.user).toBeDefined()
      expect(data.user!.email).toBe(email)
      expect(data.user!.emailVerified).toBe(false)
      expect(data.accessToken).toBeDefined()
      expect(data.refreshToken).toBeDefined()

      // Validate tokens are strings
      expect(typeof data.accessToken).toBe('string')
      expect(typeof data.refreshToken).toBe('string')
      expect(data.accessToken.length).toBeGreaterThan(0)
      expect(data.refreshToken.length).toBeGreaterThan(0)

      // Validate user metadata
      expect(data.user!.metadata).toBeDefined()
      expect(data.user!.metadata!.name).toBe('Test User')

      // Validate timestamps
      expect(data.user!.createdAt).toBeDefined()
      expect(data.user!.updatedAt).toBeDefined()

      // Track user for cleanup
      cleanup.track('user', data.user!.id)
    })

    it('should register user with minimal data (no metadata)', async () => {
      const email = randomEmail()
      const password = randomPassword()

      const response = await authClient.registerUser({
        email,
        password,
      })

      assertSuccessResponse(response)
      expect(response.data!.user).toBeDefined()
      expect(response.data!.user!.email).toBe(email)
      expect(response.data!.accessToken).toBeDefined()
      expect(response.data!.refreshToken).toBeDefined()

      cleanup.track('user', response.data!.user!.id)
    })

    it('should register user with complex metadata', async () => {
      const email = randomEmail()
      const password = randomPassword()
      const metadata = {
        name: 'Complex User',
        age: 30,
        preferences: {
          theme: 'dark',
          notifications: true,
          settings: {
            nested: 'value',
          },
        },
        tags: ['tag1', 'tag2'],
      }

      const response = await authClient.registerUser({
        email,
        password,
        metadata,
      })

      assertSuccessResponse(response)
      expect(response.data!.user!.metadata).toEqual(metadata)

      cleanup.track('user', response.data!.user!.id)
    })

    it('should return valid JWT tokens', async () => {
      const email = randomEmail()
      const password = randomPassword()

      const response = await authClient.registerUser({
        email,
        password,
      })

      assertSuccessResponse(response)

      // JWT tokens should have 3 parts separated by dots
      const accessToken = response.data!.accessToken
      const refreshToken = response.data!.refreshToken

      expect(accessToken.split('.').length).toBe(3)
      expect(refreshToken.split('.').length).toBe(3)

      cleanup.track('user', response.data!.user!.id)
    })

    it('should generate unique user IDs', async () => {
      const users = []

      for (let i = 0; i < 3; i++) {
        const response = await authClient.registerUser({
          email: randomEmail(),
          password: randomPassword(),
        })

        assertSuccessResponse(response)
        users.push(response.data!.user!.id)
        cleanup.track('user', response.data!.user!.id)
      }

      // All IDs should be unique
      const uniqueIds = new Set(users)
      expect(uniqueIds.size).toBe(3)
    })
  })

  describe('Duplicate Email Handling', () => {
    it('should reject registration with duplicate email', async () => {
      const email = randomEmail()
      const password = randomPassword()

      // Register first user
      const firstResponse = await authClient.registerUser({
        email,
        password,
      })

      assertSuccessResponse(firstResponse)
      cleanup.track('user', firstResponse.data!.user!.id)

      // Try to register with same email
      const secondResponse = await authClient.registerUser({
        email,
        password: randomPassword(),
      })

      // Should fail with conflict error
      assertErrorResponse(secondResponse)
      expect(secondResponse.error?.code).toMatch(/CONFLICT|BAD_REQUEST/)
      expect(secondResponse.error?.message.toLowerCase()).toContain('email')
    })

    it('should be case-insensitive for email duplicates', async () => {
      const email = randomEmail()
      const password = randomPassword()

      // Register with lowercase email
      const firstResponse = await authClient.registerUser({
        email: email.toLowerCase(),
        password,
      })

      assertSuccessResponse(firstResponse)
      cleanup.track('user', firstResponse.data!.user!.id)

      // Try to register with uppercase email
      const secondResponse = await authClient.registerUser({
        email: email.toUpperCase(),
        password: randomPassword(),
      })

      // Should fail
      assertErrorResponse(secondResponse)
      expect(secondResponse.error?.code).toMatch(/CONFLICT|BAD_REQUEST/)
    })
  })

  describe('Email Validation', () => {
    it('should reject invalid email format', async () => {
      const response = await authClient.registerUser({
        email: INVALID_TEST_USERS.invalidEmail.email,
        password: randomPassword(),
      })

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/VALIDATION_ERROR|BAD_REQUEST/)
    })

    it('should reject empty email', async () => {
      const response = await authClient.registerUser({
        email: INVALID_TEST_USERS.emptyEmail.email,
        password: randomPassword(),
      })

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/VALIDATION_ERROR|BAD_REQUEST/)
    })

    it('should reject missing email', async () => {
      const response = await authClient.registerUser(
        INVALID_TEST_USERS.missingEmail as any
      )

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/VALIDATION_ERROR|BAD_REQUEST/)
    })

    it('should accept various valid email formats', async () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
        'user_name@sub.example.com',
      ]

      for (const email of validEmails) {
        const response = await authClient.registerUser({
          email: `test_${Date.now()}_${email}`,
          password: randomPassword(),
        })

        assertSuccessResponse(response)
        cleanup.track('user', response.data!.user!.id)
      }
    })
  })

  describe('Password Validation', () => {
    it('should reject weak password (too short)', async () => {
      const response = await authClient.registerUser({
        email: randomEmail(),
        password: INVALID_TEST_USERS.weakPassword.password,
      })

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/VALIDATION_ERROR|BAD_REQUEST/)
    })

    it('should reject empty password', async () => {
      const response = await authClient.registerUser({
        email: randomEmail(),
        password: INVALID_TEST_USERS.emptyPassword.password,
      })

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/VALIDATION_ERROR|BAD_REQUEST/)
    })

    it('should reject missing password', async () => {
      const response = await authClient.registerUser(
        INVALID_TEST_USERS.missingPassword as any
      )

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/VALIDATION_ERROR|BAD_REQUEST/)
    })

    it('should accept valid passwords', async () => {
      for (const password of PASSWORD_TEST_CASES.valid) {
        const response = await authClient.registerUser({
          email: randomEmail(),
          password,
        })

        assertSuccessResponse(response)
        cleanup.track('user', response.data!.user!.id)
      }
    })

    it('should not return password in response', async () => {
      const response = await authClient.registerUser({
        email: randomEmail(),
        password: randomPassword(),
      })

      assertSuccessResponse(response)

      // Password should not be in response
      const responseStr = JSON.stringify(response)
      expect(responseStr).not.toContain('password')
      expect(response.data!.user).not.toHaveProperty('password')
      expect(response.data!.user).not.toHaveProperty('passwordHash')

      cleanup.track('user', response.data!.user!.id)
    })
  })

  describe('Response Validation', () => {
    it('should return standardized API response format', async () => {
      const response = await authClient.registerUser({
        email: randomEmail(),
        password: randomPassword(),
      })

      // Validate response structure
      expect(response).toHaveProperty('success')
      expect(response).toHaveProperty('data')
      expect(response.success).toBe(true)

      cleanup.track('user', response.data!.user!.id)
    })

    it('should match Zod schema validation', async () => {
      const response = await authClient.registerUser({
        email: randomEmail(),
        password: randomPassword(),
      })

      // Validate against Zod schema
      const validated = validateResponse(response, authResponseSchema)
      expect(validated).toBeDefined()
      expect(validated.success).toBe(true)

      cleanup.track('user', validated.data.user!.id)
    })
  })

  describe('Performance', () => {
    it('should register user within acceptable time', async () => {
      const startTime = Date.now()

      const response = await authClient.registerUser({
        email: randomEmail(),
        password: randomPassword(),
      })

      const duration = Date.now() - startTime

      assertSuccessResponse(response)
      expect(duration).toBeLessThan(2000) // Should complete within 2 seconds

      cleanup.track('user', response.data!.user!.id)
    })
  })
})
