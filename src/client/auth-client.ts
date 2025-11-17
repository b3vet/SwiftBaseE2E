import { ApiClient, createApiClient } from './api-client'
import { API_ENDPOINTS } from '@/config/constants'
import type {
  ApiResponse,
  UserRegistrationRequest,
  UserLoginRequest,
  AdminLoginRequest,
  TokenRefreshRequest,
  AuthResponse,
  TokenRefreshResponse,
  CurrentUserResponse,
} from '@/types'

/**
 * Authentication client for user and admin auth operations
 */
export class AuthClient {
  private client: ApiClient

  constructor(client?: ApiClient) {
    this.client = client || createApiClient()
  }

  /**
   * Register a new user
   */
  async registerUser(
    data: UserRegistrationRequest
  ): Promise<ApiResponse<AuthResponse>> {
    return this.client.post<AuthResponse>(API_ENDPOINTS.AUTH_REGISTER, data)
  }

  /**
   * Login user
   */
  async loginUser(
    data: UserLoginRequest
  ): Promise<ApiResponse<AuthResponse>> {
    return this.client.post<AuthResponse>(API_ENDPOINTS.AUTH_LOGIN, data)
  }

  /**
   * Refresh user access token
   */
  async refreshUserToken(
    data: TokenRefreshRequest
  ): Promise<ApiResponse<TokenRefreshResponse>> {
    return this.client.post<TokenRefreshResponse>(API_ENDPOINTS.AUTH_REFRESH, data)
  }

  /**
   * Logout user
   */
  async logoutUser(token: string): Promise<ApiResponse<void>> {
    return this.client.authenticatedRequest(
      API_ENDPOINTS.AUTH_LOGOUT,
      token,
      { method: 'POST' }
    )
  }

  /**
   * Get current user
   */
  async getCurrentUser(token: string): Promise<ApiResponse<CurrentUserResponse>> {
    return this.client.authenticatedRequest<CurrentUserResponse>(
      API_ENDPOINTS.AUTH_ME,
      token,
      { method: 'GET' }
    )
  }

  /**
   * Login admin
   */
  async loginAdmin(
    data: AdminLoginRequest
  ): Promise<ApiResponse<AuthResponse>> {
    return this.client.post<AuthResponse>(API_ENDPOINTS.ADMIN_LOGIN, data)
  }

  /**
   * Refresh admin access token
   */
  async refreshAdminToken(
    data: TokenRefreshRequest
  ): Promise<ApiResponse<TokenRefreshResponse>> {
    return this.client.post<TokenRefreshResponse>(API_ENDPOINTS.ADMIN_REFRESH, data)
  }

  /**
   * Logout admin
   */
  async logoutAdmin(token: string): Promise<ApiResponse<void>> {
    return this.client.authenticatedRequest(
      API_ENDPOINTS.ADMIN_LOGOUT,
      token,
      { method: 'POST' }
    )
  }

  /**
   * Get current admin
   */
  async getCurrentAdmin(token: string): Promise<ApiResponse<CurrentUserResponse>> {
    return this.client.authenticatedRequest<CurrentUserResponse>(
      API_ENDPOINTS.ADMIN_ME,
      token,
      { method: 'GET' }
    )
  }

  /**
   * Helper: Register and login user in one call
   */
  async registerAndLogin(
    data: UserRegistrationRequest
  ): Promise<{ response: ApiResponse<AuthResponse>; token: string }> {
    const response = await this.registerUser(data)
    const token = response.success ? response.data!.accessToken : ''
    return { response, token }
  }

  /**
   * Helper: Login and return token
   */
  async loginAndGetToken(
    data: UserLoginRequest
  ): Promise<{ response: ApiResponse<AuthResponse>; token: string }> {
    const response = await this.loginUser(data)
    const token = response.success ? response.data!.accessToken : ''
    return { response, token }
  }

  /**
   * Helper: Login admin and return token
   */
  async loginAdminAndGetToken(
    data: AdminLoginRequest
  ): Promise<{ response: ApiResponse<AuthResponse>; token: string }> {
    const response = await this.loginAdmin(data)
    const token = response.success ? response.data!.accessToken : ''
    return { response, token }
  }
}

/**
 * Create a new auth client instance
 */
export function createAuthClient(client?: ApiClient): AuthClient {
  return new AuthClient(client)
}

/**
 * Default auth client instance
 */
export const authClient = createAuthClient()
