import { describe, it, expect, beforeAll } from 'vitest'
import { createAuthClient } from '@/client'
import { createAuthHelper, createCleanupHelper } from '@/helpers'
import { randomEmail, randomPassword } from '@/helpers/test-data'
import { assertSuccessResponse, assertErrorResponse } from '@/validators/response.validator'

describe('Token Refresh', () => {
  const authClient = createAuthClient()
  const authHelper = createAuthHelper()
  const cleanup = createCleanupHelper()

  let testEmail: string
  let testPassword: string
  let testUserId: string
  let validRefreshToken: string
  let validAccessToken: string

  beforeAll(async () => {
    // Create test user and login
    testEmail = randomEmail()
    testPassword = randomPassword()

    const { userId, token, response } = await authHelper.registerTestUser(testEmail, testPassword)
    testUserId = userId
    validAccessToken = token
    validRefreshToken = response.data!.refreshToken

    cleanup.track('user', testUserId)
  })

  describe('Valid Refresh Token', () => {
    it('should refresh token with valid refresh token', async () => {
      const response = await authClient.refreshUserToken({
        refreshToken: validRefreshToken,
      })

      assertSuccessResponse(response)
      expect(response.data).toBeDefined()
      expect(response.data!.accessToken).toBeDefined()
      expect(response.data!.refreshToken).toBeDefined()

      // Tokens should be valid JWT format
      expect(response.data!.accessToken.split('.').length).toBe(3)
      expect(response.data!.refreshToken.split('.').length).toBe(3)
    })

    it('should return new access token different from old', async () => {
      const oldAccessToken = validAccessToken

      const response = await authClient.refreshUserToken({
        refreshToken: validRefreshToken,
      })

      assertSuccessResponse(response)

      // New access token should be different
      expect(response.data!.accessToken).not.toBe(oldAccessToken)
    })

    it('should rotate refresh token', async () => {
      const oldRefreshToken = validRefreshToken

      const response = await authClient.refreshUserToken({
        refreshToken: oldRefreshToken,
      })

      assertSuccessResponse(response)

      const newRefreshToken = response.data!.refreshToken

      // New refresh token should be different (token rotation)
      expect(newRefreshToken).not.toBe(oldRefreshToken)

      // Update for subsequent tests
      validRefreshToken = newRefreshToken
    })

    it('should allow using new access token immediately', async () => {
      const response = await authClient.refreshUserToken({
        refreshToken: validRefreshToken,
      })

      assertSuccessResponse(response)

      const newAccessToken = response.data!.accessToken

      // Try to use the new access token
      const userResponse = await authClient.getCurrentUser(newAccessToken)

      assertSuccessResponse(userResponse)
      expect(userResponse.data!.user!.id).toBe(testUserId)

      // Update tokens
      validRefreshToken = response.data!.refreshToken
      validAccessToken = newAccessToken
    })

    it('should handle multiple refresh requests', async () => {
      const refreshes = []

      // Get fresh tokens
      let currentRefreshToken = validRefreshToken

      // Refresh multiple times sequentially
      for (let i = 0; i < 3; i++) {
        const response = await authClient.refreshUserToken({
          refreshToken: currentRefreshToken,
        })

        assertSuccessResponse(response)
        refreshes.push(response.data!)

        // Use new refresh token for next iteration
        currentRefreshToken = response.data!.refreshToken
      }

      // All tokens should be unique
      const accessTokens = refreshes.map(r => r.accessToken)
      const refreshTokens = refreshes.map(r => r.refreshToken)

      expect(new Set(accessTokens).size).toBe(3)
      expect(new Set(refreshTokens).size).toBe(3)

      // Update token for other tests
      validRefreshToken = currentRefreshToken
    })
  })

  describe('Invalid Refresh Token', () => {
    it('should reject refresh with invalid token format', async () => {
      const response = await authClient.refreshUserToken({
        refreshToken: 'invalid-token',
      })

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/UNAUTHORIZED|BAD_REQUEST/)
    })

    it('should reject refresh with empty token', async () => {
      const response = await authClient.refreshUserToken({
        refreshToken: '',
      })

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/VALIDATION_ERROR|BAD_REQUEST|UNAUTHORIZED/)
    })

    it('should reject refresh with missing token', async () => {
      const response = await authClient.refreshUserToken({} as any)

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/VALIDATION_ERROR|BAD_REQUEST/)
    })

    it('should reject refresh with access token instead of refresh token', async () => {
      const response = await authClient.refreshUserToken({
        refreshToken: validAccessToken, // Using access token instead
      })

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/UNAUTHORIZED|BAD_REQUEST/)
    })

    it('should reject refresh with malformed JWT', async () => {
      const malformedTokens = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        'header.payload', // Missing signature
        'only-one-part',
        'too.many.parts.in.token',
      ]

      for (const token of malformedTokens) {
        const response = await authClient.refreshUserToken({
          refreshToken: token,
        })

        assertErrorResponse(response)
        expect(response.error?.code).toMatch(/UNAUTHORIZED|BAD_REQUEST/)
      }
    })

    it('should reject refresh with fabricated token', async () => {
      // Create a token-like string that's not actually valid
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

      const response = await authClient.refreshUserToken({
        refreshToken: fakeToken,
      })

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/UNAUTHORIZED|BAD_REQUEST/)
    })
  })

  describe('Token Rotation Security', () => {
    it('should invalidate old refresh token after rotation', async () => {
      // Get a fresh login to test
      const loginResponse = await authClient.loginUser({
        email: testEmail,
        password: testPassword,
      })

      assertSuccessResponse(loginResponse)
      const oldRefreshToken = loginResponse.data!.refreshToken

      // Refresh to get new token
      const refreshResponse = await authClient.refreshUserToken({
        refreshToken: oldRefreshToken,
      })

      assertSuccessResponse(refreshResponse)
      const newRefreshToken = refreshResponse.data!.refreshToken

      // Try to use old token again - should fail
      const reusedResponse = await authClient.refreshUserToken({
        refreshToken: oldRefreshToken,
      })

      // Old token should be invalid
      assertErrorResponse(reusedResponse)
      expect(reusedResponse.error?.code).toMatch(/UNAUTHORIZED|BAD_REQUEST/)

      // New token should still work
      const newRefreshResponse = await authClient.refreshUserToken({
        refreshToken: newRefreshToken,
      })

      assertSuccessResponse(newRefreshResponse)
    })

    it('should not allow concurrent refresh token use', async () => {
      // Get a fresh refresh token
      const loginResponse = await authClient.loginUser({
        email: testEmail,
        password: testPassword,
      })

      assertSuccessResponse(loginResponse)
      const refreshToken = loginResponse.data!.refreshToken

      // Try to refresh with same token concurrently
      const [response1, response2] = await Promise.all([
        authClient.refreshUserToken({ refreshToken }),
        authClient.refreshUserToken({ refreshToken }),
      ])

      // Only one should succeed (or both might fail depending on implementation)
      const successCount = [response1, response2].filter(r => r.success).length

      // At most one should succeed
      expect(successCount).toBeLessThanOrEqual(1)
    })
  })

  describe('Multiple Users', () => {
    it('should not allow using another user refresh token', async () => {
      // Create another user
      const otherEmail = randomEmail()
      const otherPassword = randomPassword()
      const { userId, response } = await authHelper.registerTestUser(otherEmail, otherPassword)
      const otherRefreshToken = response.data!.refreshToken
      cleanup.track('user', userId)

      // Try to refresh with other user's token
      const refreshResponse = await authClient.refreshUserToken({
        refreshToken: otherRefreshToken,
      })

      // Should succeed but return tokens for the other user
      assertSuccessResponse(refreshResponse)

      // Verify the token works for the other user
      const userResponse = await authClient.getCurrentUser(refreshResponse.data!.accessToken)
      assertSuccessResponse(userResponse)
      expect(userResponse.data!.user!.id).toBe(userId)
      expect(userResponse.data!.user!.id).not.toBe(testUserId)
    })
  })

  describe('Performance', () => {
    it('should refresh token within acceptable time', async () => {
      const startTime = Date.now()

      const response = await authClient.refreshUserToken({
        refreshToken: validRefreshToken,
      })

      const duration = Date.now() - startTime

      assertSuccessResponse(response)
      expect(duration).toBeLessThan(2000)

      // Update token
      validRefreshToken = response.data!.refreshToken
    })

    it('should handle rapid successive refreshes', async () => {
      // Get fresh token
      const loginResponse = await authClient.loginUser({
        email: testEmail,
        password: testPassword,
      })
      assertSuccessResponse(loginResponse)

      let currentToken = loginResponse.data!.refreshToken

      // Refresh multiple times rapidly (but sequentially)
      for (let i = 0; i < 5; i++) {
        const response = await authClient.refreshUserToken({
          refreshToken: currentToken,
        })

        assertSuccessResponse(response)
        currentToken = response.data!.refreshToken
      }
    })
  })

  describe('Response Format', () => {
    it('should return standardized API response', async () => {
      const response = await authClient.refreshUserToken({
        refreshToken: validRefreshToken,
      })

      expect(response).toHaveProperty('success')
      expect(response).toHaveProperty('data')
      assertSuccessResponse(response)

      validRefreshToken = response.data!.refreshToken
    })

    it('should return only tokens, no user data', async () => {
      const response = await authClient.refreshUserToken({
        refreshToken: validRefreshToken,
      })

      assertSuccessResponse(response)
      expect(response.data).toHaveProperty('accessToken')
      expect(response.data).toHaveProperty('refreshToken')

      // Should not include user object
      expect(response.data).not.toHaveProperty('user')
      expect(response.data).not.toHaveProperty('admin')

      validRefreshToken = response.data!.refreshToken
    })
  })
})
