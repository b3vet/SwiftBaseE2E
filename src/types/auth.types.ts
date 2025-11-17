/**
 * User registration request
 */
export interface UserRegistrationRequest {
  email: string
  password: string
  metadata?: Record<string, any>
}

/**
 * User login request
 */
export interface UserLoginRequest {
  email: string
  password: string
}

/**
 * Admin login request
 */
export interface AdminLoginRequest {
  username: string
  password: string
}

/**
 * Token refresh request
 */
export interface TokenRefreshRequest {
  refreshToken: string
}

/**
 * User object
 */
export interface User {
  id: string
  email: string
  emailVerified: boolean
  metadata?: Record<string, any>
  lastLogin?: string
  createdAt: string
  updatedAt: string
}

/**
 * Admin object
 */
export interface Admin {
  id: string
  username: string
  lastLogin?: string
  createdAt: string
  updatedAt: string
}

/**
 * Authentication response (login/register)
 */
export interface AuthResponse {
  user?: User
  admin?: Admin
  accessToken: string
  refreshToken: string
}

/**
 * Token refresh response
 */
export interface TokenRefreshResponse {
  accessToken: string
  refreshToken: string
}

/**
 * Current user/admin response
 */
export interface CurrentUserResponse {
  user?: User
  admin?: Admin
}

/**
 * JWT token payload (decoded)
 */
export interface JWTPayload {
  sub: string // User/Admin ID
  type: 'user' | 'admin'
  iat: number
  exp: number
}
