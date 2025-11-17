import { describe, it, expect } from 'vitest'
import { createAuthClient } from '@/client'
import { getEnvironment } from '@/config/environment'
import { TEST_ADMIN, INVALID_ADMIN } from '@/fixtures'
import { assertSuccessResponse, assertErrorResponse } from '@/validators/response.validator'

describe('Admin Authentication', () => {
  const authClient = createAuthClient()
  const env = getEnvironment()

  describe('Admin Login', () => {
    it('should login admin with correct credentials', async () => {
      const response = await authClient.loginAdmin({
        username: env.TEST_ADMIN_USERNAME,
        password: env.TEST_ADMIN_PASSWORD,
      })

      assertSuccessResponse(response)
      expect(response.data).toBeDefined()
      expect(response.data!.admin).toBeDefined()
      expect(response.data!.admin!.username).toBe(env.TEST_ADMIN_USERNAME)
      expect(response.data!.accessToken).toBeDefined()
      expect(response.data!.refreshToken).toBeDefined()

      // Should not include user object
      expect(response.data).not.toHaveProperty('user')
    })

    it('should return valid JWT tokens', async () => {
      const response = await authClient.loginAdmin({
        username: env.TEST_ADMIN_USERNAME,
        password: env.TEST_ADMIN_PASSWORD,
      })

      assertSuccessResponse(response)

      const accessToken = response.data!.accessToken
      const refreshToken = response.data!.refreshToken

      // JWT tokens should have 3 parts
      expect(accessToken.split('.').length).toBe(3)
      expect(refreshToken.split('.').length).toBe(3)
    })

    it('should reject with wrong password', async () => {
      const response = await authClient.loginAdmin(INVALID_ADMIN.wrongPassword)

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/UNAUTHORIZED|BAD_REQUEST/)
    })

    it('should reject with wrong username', async () => {
      const response = await authClient.loginAdmin(INVALID_ADMIN.wrongUsername)

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/UNAUTHORIZED|BAD_REQUEST|NOT_FOUND/)
    })

    it('should reject with missing username', async () => {
      const response = await authClient.loginAdmin(INVALID_ADMIN.missingUsername)

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/VALIDATION_ERROR|BAD_REQUEST/)
    })

    it('should reject with missing password', async () => {
      const response = await authClient.loginAdmin(INVALID_ADMIN.missingPassword)

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/VALIDATION_ERROR|BAD_REQUEST/)
    })

    it('should not return password in response', async () => {
      const response = await authClient.loginAdmin({
        username: env.TEST_ADMIN_USERNAME,
        password: env.TEST_ADMIN_PASSWORD,
      })

      assertSuccessResponse(response)

      const responseStr = JSON.stringify(response)
      expect(responseStr).not.toContain('password')
      expect(response.data!.admin).not.toHaveProperty('password')
      expect(response.data!.admin).not.toHaveProperty('passwordHash')
    })

    it('should allow multiple concurrent admin sessions', async () => {
      const logins = await Promise.all([
        authClient.loginAdmin({
          username: env.TEST_ADMIN_USERNAME,
          password: env.TEST_ADMIN_PASSWORD,
        }),
        authClient.loginAdmin({
          username: env.TEST_ADMIN_USERNAME,
          password: env.TEST_ADMIN_PASSWORD,
        }),
      ])

      logins.forEach(response => {
        assertSuccessResponse(response)
      })

      // All tokens should be unique
      const tokens = logins.map(l => l.data!.accessToken)
      expect(new Set(tokens).size).toBe(2)
    })
  })

  describe('Admin Token Refresh', () => {
    let validRefreshToken: string

    it('should refresh admin token with valid refresh token', async () => {
      // Login first
      const loginResponse = await authClient.loginAdmin({
        username: env.TEST_ADMIN_USERNAME,
        password: env.TEST_ADMIN_PASSWORD,
      })

      assertSuccessResponse(loginResponse)
      validRefreshToken = loginResponse.data!.refreshToken

      // Refresh token
      const refreshResponse = await authClient.refreshAdminToken({
        refreshToken: validRefreshToken,
      })

      assertSuccessResponse(refreshResponse)
      expect(refreshResponse.data!.accessToken).toBeDefined()
      expect(refreshResponse.data!.refreshToken).toBeDefined()

      // Update for next tests
      validRefreshToken = refreshResponse.data!.refreshToken
    })

    it('should rotate refresh token', async () => {
      const oldRefreshToken = validRefreshToken

      const response = await authClient.refreshAdminToken({
        refreshToken: oldRefreshToken,
      })

      assertSuccessResponse(response)
      const newRefreshToken = response.data!.refreshToken

      // Token should be different
      expect(newRefreshToken).not.toBe(oldRefreshToken)

      validRefreshToken = newRefreshToken
    })

    it('should reject with invalid refresh token', async () => {
      const response = await authClient.refreshAdminToken({
        refreshToken: 'invalid-token',
      })

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/UNAUTHORIZED|BAD_REQUEST/)
    })

    it('should allow using new access token immediately', async () => {
      const response = await authClient.refreshAdminToken({
        refreshToken: validRefreshToken,
      })

      assertSuccessResponse(response)
      const newAccessToken = response.data!.accessToken

      // Verify token works
      const adminResponse = await authClient.getCurrentAdmin(newAccessToken)
      assertSuccessResponse(adminResponse)

      validRefreshToken = response.data!.refreshToken
    })
  })

  describe('Get Current Admin', () => {
    let validToken: string

    it('should get current admin with valid token', async () => {
      // Login first
      const loginResponse = await authClient.loginAdmin({
        username: env.TEST_ADMIN_USERNAME,
        password: env.TEST_ADMIN_PASSWORD,
      })

      assertSuccessResponse(loginResponse)
      validToken = loginResponse.data!.accessToken

      // Get current admin
      const response = await authClient.getCurrentAdmin(validToken)

      assertSuccessResponse(response)
      expect(response.data).toBeDefined()
      expect(response.data!.admin).toBeDefined()
      expect(response.data!.admin!.username).toBe(env.TEST_ADMIN_USERNAME)

      // Should not include user object
      expect(response.data).not.toHaveProperty('user')
    })

    it('should not include sensitive data', async () => {
      const response = await authClient.getCurrentAdmin(validToken)

      assertSuccessResponse(response)

      const responseStr = JSON.stringify(response)
      expect(responseStr).not.toContain('password')
      expect(response.data!.admin).not.toHaveProperty('password')
      expect(response.data!.admin).not.toHaveProperty('passwordHash')
      expect(response.data!.admin).not.toHaveProperty('refreshTokens')
    })

    it('should reject with invalid token', async () => {
      const response = await authClient.getCurrentAdmin('invalid-token')

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/UNAUTHORIZED|BAD_REQUEST/)
    })

    it('should reject with user token (not admin token)', async () => {
      // Create a regular user and get their token
      const userClient = createAuthClient()
      const userResponse = await userClient.registerUser({
        email: `test-${Date.now()}@example.com`,
        password: 'TestPassword123!',
      })

      assertSuccessResponse(userResponse)
      const userToken = userResponse.data!.accessToken

      // Try to use user token for admin endpoint
      const adminResponse = await authClient.getCurrentAdmin(userToken)

      // Should fail or return empty admin
      if (adminResponse.success) {
        expect(adminResponse.data!.admin).toBeUndefined()
        expect(adminResponse.data!.user).toBeDefined()
      } else {
        assertErrorResponse(adminResponse)
      }
    })
  })

  describe('Admin Logout', () => {
    it('should logout admin successfully', async () => {
      // Login first
      const loginResponse = await authClient.loginAdmin({
        username: env.TEST_ADMIN_USERNAME,
        password: env.TEST_ADMIN_PASSWORD,
      })

      assertSuccessResponse(loginResponse)
      const token = loginResponse.data!.accessToken

      // Logout
      const logoutResponse = await authClient.logoutAdmin(token)
      assertSuccessResponse(logoutResponse)

      // Token should be invalid after logout
      const adminResponse = await authClient.getCurrentAdmin(token)
      assertErrorResponse(adminResponse)
    })

    it('should require authentication for logout', async () => {
      const response = await authClient.logoutAdmin('invalid-token')

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/UNAUTHORIZED|BAD_REQUEST/)
    })

    it('should allow admin to login again after logout', async () => {
      // Login
      const loginResponse1 = await authClient.loginAdmin({
        username: env.TEST_ADMIN_USERNAME,
        password: env.TEST_ADMIN_PASSWORD,
      })
      assertSuccessResponse(loginResponse1)

      // Logout
      await authClient.logoutAdmin(loginResponse1.data!.accessToken)

      // Login again
      const loginResponse2 = await authClient.loginAdmin({
        username: env.TEST_ADMIN_USERNAME,
        password: env.TEST_ADMIN_PASSWORD,
      })

      assertSuccessResponse(loginResponse2)
      expect(loginResponse2.data!.accessToken).toBeDefined()
    })
  })

  describe('Admin vs User Separation', () => {
    it('should maintain separate admin and user sessions', async () => {
      // Login as admin
      const adminResponse = await authClient.loginAdmin({
        username: env.TEST_ADMIN_USERNAME,
        password: env.TEST_ADMIN_PASSWORD,
      })
      assertSuccessResponse(adminResponse)
      const adminToken = adminResponse.data!.accessToken

      // Register and login as user
      const userResponse = await authClient.registerUser({
        email: `test-${Date.now()}@example.com`,
        password: 'TestPassword123!',
      })
      assertSuccessResponse(userResponse)
      const userToken = userResponse.data!.accessToken

      // Verify tokens are different
      expect(adminToken).not.toBe(userToken)

      // Admin token should work for admin endpoints
      const currentAdmin = await authClient.getCurrentAdmin(adminToken)
      assertSuccessResponse(currentAdmin)
      expect(currentAdmin.data!.admin).toBeDefined()

      // User token should work for user endpoints
      const currentUser = await authClient.getCurrentUser(userToken)
      assertSuccessResponse(currentUser)
      expect(currentUser.data!.user).toBeDefined()
    })
  })

  describe('Performance', () => {
    it('should login admin within acceptable time', async () => {
      const startTime = Date.now()

      const response = await authClient.loginAdmin({
        username: env.TEST_ADMIN_USERNAME,
        password: env.TEST_ADMIN_PASSWORD,
      })

      const duration = Date.now() - startTime

      assertSuccessResponse(response)
      expect(duration).toBeLessThan(2000)
    })
  })
})
