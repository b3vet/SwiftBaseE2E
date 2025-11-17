import { createAuthClient, type AuthClient } from '@/client'
import { getEnvironment } from '@/config/environment'
import type { AuthResponse, UserRegistrationRequest, AdminLoginRequest } from '@/types'

/**
 * Authentication helper for tests
 */
export class AuthHelper {
  private authClient: AuthClient

  constructor(authClient?: AuthClient) {
    this.authClient = authClient || createAuthClient()
  }

  /**
   * Register a new test user
   */
  async registerTestUser(
    email?: string,
    password?: string,
    metadata?: Record<string, any>
  ): Promise<{ response: any; token: string; userId: string }> {
    const env = getEnvironment()
    const timestamp = Date.now()

    const request: UserRegistrationRequest = {
      email: email || `test-${timestamp}@test.example.com`,
      password: password || env.TEST_USER_PASSWORD,
      metadata: metadata || { name: `Test User ${timestamp}` },
    }

    const response = await this.authClient.registerUser(request)

    if (!response.success) {
      throw new Error(`Failed to register test user: ${response.error?.message}`)
    }

    const data = response.data as AuthResponse
    return {
      response,
      token: data.accessToken,
      userId: data.user!.id,
    }
  }

  /**
   * Login test user
   */
  async loginTestUser(
    email?: string,
    password?: string
  ): Promise<{ response: any; token: string; userId: string }> {
    const env = getEnvironment()

    const response = await this.authClient.loginUser({
      email: email || env.TEST_USER_EMAIL,
      password: password || env.TEST_USER_PASSWORD,
    })

    if (!response.success) {
      throw new Error(`Failed to login test user: ${response.error?.message}`)
    }

    const data = response.data as AuthResponse
    return {
      response,
      token: data.accessToken,
      userId: data.user!.id,
    }
  }

  /**
   * Login admin
   */
  async loginAdmin(
    username?: string,
    password?: string
  ): Promise<{ response: any; token: string; adminId: string }> {
    const env = getEnvironment()

    const request: AdminLoginRequest = {
      username: username || env.TEST_ADMIN_USERNAME,
      password: password || env.TEST_ADMIN_PASSWORD,
    }

    const response = await this.authClient.loginAdmin(request)

    if (!response.success) {
      throw new Error(`Failed to login admin: ${response.error?.message}`)
    }

    const data = response.data as AuthResponse
    return {
      response,
      token: data.accessToken,
      adminId: data.admin!.id,
    }
  }

  /**
   * Create and login test user (convenience method)
   */
  async createAndLoginUser(
    email?: string,
    password?: string,
    metadata?: Record<string, any>
  ): Promise<{ token: string; userId: string; email: string }> {
    const env = getEnvironment()
    const timestamp = Date.now()

    const userEmail = email || `test-${timestamp}@test.example.com`
    const userPassword = password || env.TEST_USER_PASSWORD

    const { token, userId } = await this.registerTestUser(
      userEmail,
      userPassword,
      metadata
    )

    return { token, userId, email: userEmail }
  }

  /**
   * Get admin token (convenience method)
   */
  async getAdminToken(): Promise<string> {
    const { token } = await this.loginAdmin()
    return token
  }

  /**
   * Get user token (convenience method)
   */
  async getUserToken(email?: string, password?: string): Promise<string> {
    const { token } = await this.createAndLoginUser(email, password)
    return token
  }

  /**
   * Refresh user token
   */
  async refreshUserToken(refreshToken: string): Promise<string> {
    const response = await this.authClient.refreshUserToken({ refreshToken })

    if (!response.success) {
      throw new Error(`Failed to refresh token: ${response.error?.message}`)
    }

    return response.data!.accessToken
  }

  /**
   * Refresh admin token
   */
  async refreshAdminToken(refreshToken: string): Promise<string> {
    const response = await this.authClient.refreshAdminToken({ refreshToken })

    if (!response.success) {
      throw new Error(`Failed to refresh admin token: ${response.error?.message}`)
    }

    return response.data!.accessToken
  }
}

/**
 * Create a new auth helper instance
 */
export function createAuthHelper(authClient?: AuthClient): AuthHelper {
  return new AuthHelper(authClient)
}

/**
 * Default auth helper instance
 */
export const authHelper = createAuthHelper()
