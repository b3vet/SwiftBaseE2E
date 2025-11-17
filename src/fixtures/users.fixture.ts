import type { UserRegistrationRequest, AdminLoginRequest } from '@/types'

/**
 * Valid test user data
 */
export const VALID_TEST_USERS: UserRegistrationRequest[] = [
  {
    email: 'alice@test.example.com',
    password: 'AlicePassword123!',
    metadata: {
      name: 'Alice Johnson',
      role: 'user',
      preferences: { theme: 'dark' },
    },
  },
  {
    email: 'bob@test.example.com',
    password: 'BobPassword123!',
    metadata: {
      name: 'Bob Smith',
      role: 'user',
      preferences: { theme: 'light' },
    },
  },
  {
    email: 'charlie@test.example.com',
    password: 'CharliePassword123!',
    metadata: {
      name: 'Charlie Brown',
      role: 'moderator',
    },
  },
]

/**
 * Invalid test user data (for negative tests)
 */
export const INVALID_TEST_USERS = {
  missingEmail: {
    password: 'ValidPassword123!',
  } as any,

  missingPassword: {
    email: 'test@example.com',
  } as any,

  invalidEmail: {
    email: 'not-an-email',
    password: 'ValidPassword123!',
  },

  weakPassword: {
    email: 'test@example.com',
    password: '123', // Too short
  },

  emptyEmail: {
    email: '',
    password: 'ValidPassword123!',
  },

  emptyPassword: {
    email: 'test@example.com',
    password: '',
  },
}

/**
 * Admin credentials
 */
export const TEST_ADMIN: AdminLoginRequest = {
  username: 'admin',
  password: 'admin123',
}

/**
 * Invalid admin credentials
 */
export const INVALID_ADMIN = {
  wrongPassword: {
    username: 'admin',
    password: 'wrongpassword',
  },

  wrongUsername: {
    username: 'notadmin',
    password: 'admin123',
  },

  missingUsername: {
    password: 'admin123',
  } as any,

  missingPassword: {
    username: 'admin',
  } as any,
}

/**
 * Password test cases
 */
export const PASSWORD_TEST_CASES = {
  valid: [
    'ValidPass123!',
    'AnotherGoodP@ss1',
    'StrongPassword2024!',
    'Secure#Pass99',
  ],

  invalid: [
    'short1!', // Too short
    'nouppercase123!', // No uppercase
    'NOLOWERCASE123!', // No lowercase
    'NoNumbers!', // No numbers
    'NoSpecial123', // No special char
    '', // Empty
    '12345678', // Only numbers
  ],
}
