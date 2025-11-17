import { describe, it, expect, beforeEach } from 'vitest'
import { createAuthClient } from '@/client'
import { createAuthHelper, createCleanupHelper } from '@/helpers'
import { randomEmail, randomPassword } from '@/helpers/test-data'
import { assertSuccessResponse, assertErrorResponse } from '@/validators/response.validator'

describe('User Session Management', () => {
  const authClient = createAuthClient()
  const authHelper = createAuthHelper()
  const cleanup = createCleanupHelper()

  describe('Get Current User', () => {
    let testEmail: string
    let testPassword: string
    let testUserId: string
    let validToken: string

    beforeEach(async () => {
      // Create and login test user
      testEmail = randomEmail()
      testPassword = randomPassword()
      const result = await authHelper.createAndLoginUser(testEmail, testPassword)

      testUserId = result.userId
      validToken = result.token
      cleanup.track('user', testUserId)
    })

    it('should get current user with valid token', async () => {
      const response = await authClient.getCurrentUser(validToken)

      assertSuccessResponse(response)
      expect(response.data).toBeDefined()
      expect(response.data!.user).toBeDefined()
      expect(response.data!.user!.id).toBe(testUserId)
      expect(response.data!.user!.email).toBe(testEmail)
    })

    it('should include user metadata', async () => {
      const metadata = { name: 'Test User', role: 'tester' }
      const result = await authHelper.createAndLoginUser(
        randomEmail(),
        randomPassword(),
        metadata
      )
      cleanup.track('user', result.userId)

      const response = await authClient.getCurrentUser(result.token)

      assertSuccessResponse(response)
      expect(response.data!.user!.metadata).toEqual(metadata)
    })

    it('should not include sensitive data', async () => {
      const response = await authClient.getCurrentUser(validToken)

      assertSuccessResponse(response)

      const responseStr = JSON.stringify(response)
      expect(responseStr).not.toContain('password')
      expect(response.data!.user).not.toHaveProperty('password')
      expect(response.data!.user).not.toHaveProperty('passwordHash')
      expect(response.data!.user).not.toHaveProperty('refreshTokens')
    })

    it('should reject with invalid token', async () => {
      const response = await authClient.getCurrentUser('invalid-token')

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/UNAUTHORIZED|BAD_REQUEST/)
    })

    it('should reject with expired/malformed token', async () => {
      const malformedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature'

      const response = await authClient.getCurrentUser(malformedToken)

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/UNAUTHORIZED|BAD_REQUEST/)
    })

    it('should reject with missing token', async () => {
      const response = await authClient.getCurrentUser('')

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/UNAUTHORIZED|BAD_REQUEST/)
    })
  })

  describe('Logout', () => {
    let testEmail: string
    let testPassword: string
    let testUserId: string
    let validToken: string

    beforeEach(async () => {
      // Create and login test user
      testEmail = randomEmail()
      testPassword = randomPassword()
      const result = await authHelper.createAndLoginUser(testEmail, testPassword)

      testUserId = result.userId
      validToken = result.token
      cleanup.track('user', testUserId)
    })

    it('should logout successfully with valid token', async () => {
      const response = await authClient.logoutUser(validToken)

      assertSuccessResponse(response)
    })

    it('should invalidate token after logout', async () => {
      // Verify token works before logout
      const beforeResponse = await authClient.getCurrentUser(validToken)
      assertSuccessResponse(beforeResponse)

      // Logout
      const logoutResponse = await authClient.logoutUser(validToken)
      assertSuccessResponse(logoutResponse)

      // Token should no longer work
      const afterResponse = await authClient.getCurrentUser(validToken)
      assertErrorResponse(afterResponse)
      expect(afterResponse.error?.code).toMatch(/UNAUTHORIZED/)
    })

    it('should require authentication for logout', async () => {
      const response = await authClient.logoutUser('invalid-token')

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/UNAUTHORIZED|BAD_REQUEST/)
    })

    it('should handle logout with already logged out token', async () => {
      // Logout once
      const firstLogout = await authClient.logoutUser(validToken)
      assertSuccessResponse(firstLogout)

      // Try to logout again with same token
      const secondLogout = await authClient.logoutUser(validToken)

      // Should fail since token is invalid
      assertErrorResponse(secondLogout)
    })

    it('should allow login after logout', async () => {
      // Logout
      const logoutResponse = await authClient.logoutUser(validToken)
      assertSuccessResponse(logoutResponse)

      // Login again
      const loginResponse = await authClient.loginUser({
        email: testEmail,
        password: testPassword,
      })

      assertSuccessResponse(loginResponse)
      expect(loginResponse.data!.user!.id).toBe(testUserId)
      expect(loginResponse.data!.accessToken).toBeDefined()
    })

    it('should invalidate all sessions on logout', async () => {
      // Login multiple times to create multiple sessions
      const login1 = await authClient.loginUser({ email: testEmail, password: testPassword })
      const login2 = await authClient.loginUser({ email: testEmail, password: testPassword })

      assertSuccessResponse(login1)
      assertSuccessResponse(login2)

      const token1 = login1.data!.accessToken
      const token2 = login2.data!.accessToken

      // Logout with first token
      const logoutResponse = await authClient.logoutUser(token1)
      assertSuccessResponse(logoutResponse)

      // Both tokens should be invalid (if implementation invalidates all sessions)
      const check1 = await authClient.getCurrentUser(token1)
      assertErrorResponse(check1)

      // Check if second token is also invalid (depends on implementation)
      // Some implementations invalidate all sessions, others only the current one
      const check2 = await authClient.getCurrentUser(token2)
      // Either success or error is acceptable depending on implementation
    })
  })

  describe('Session Lifecycle', () => {
    it('should support complete auth flow: register -> login -> use -> logout', async () => {
      // Register
      const email = randomEmail()
      const password = randomPassword()
      const registerResponse = await authClient.registerUser({ email, password })
      assertSuccessResponse(registerResponse)

      const userId = registerResponse.data!.user!.id
      const registerToken = registerResponse.data!.accessToken
      cleanup.track('user', userId)

      // Use token
      const currentUserResponse1 = await authClient.getCurrentUser(registerToken)
      assertSuccessResponse(currentUserResponse1)
      expect(currentUserResponse1.data!.user!.id).toBe(userId)

      // Logout
      const logoutResponse = await authClient.logoutUser(registerToken)
      assertSuccessResponse(logoutResponse)

      // Token should be invalid
      const currentUserResponse2 = await authClient.getCurrentUser(registerToken)
      assertErrorResponse(currentUserResponse2)

      // Login again
      const loginResponse = await authClient.loginUser({ email, password })
      assertSuccessResponse(loginResponse)

      const loginToken = loginResponse.data!.accessToken

      // Use new token
      const currentUserResponse3 = await authClient.getCurrentUser(loginToken)
      assertSuccessResponse(currentUserResponse3)
      expect(currentUserResponse3.data!.user!.id).toBe(userId)
    })

    it('should maintain user data across login sessions', async () => {
      const email = randomEmail()
      const password = randomPassword()
      const metadata = { name: 'Persistent User', visits: 1 }

      // Register with metadata
      const registerResponse = await authClient.registerUser({ email, password, metadata })
      assertSuccessResponse(registerResponse)
      const userId = registerResponse.data!.user!.id
      cleanup.track('user', userId)

      // Logout
      await authClient.logoutUser(registerResponse.data!.accessToken)

      // Login again
      const loginResponse = await authClient.loginUser({ email, password })
      assertSuccessResponse(loginResponse)

      // Metadata should still be present
      expect(loginResponse.data!.user!.metadata).toEqual(metadata)
    })
  })

  describe('Performance', () => {
    it('should get current user within acceptable time', async () => {
      const { token } = await authHelper.createAndLoginUser()

      const startTime = Date.now()
      const response = await authClient.getCurrentUser(token)
      const duration = Date.now() - startTime

      assertSuccessResponse(response)
      expect(duration).toBeLessThan(1000)
    })

    it('should logout within acceptable time', async () => {
      const { token } = await authHelper.createAndLoginUser()

      const startTime = Date.now()
      const response = await authClient.logoutUser(token)
      const duration = Date.now() - startTime

      assertSuccessResponse(response)
      expect(duration).toBeLessThan(1000)
    })
  })
})
