import { z } from 'zod'

const envSchema = z.object({
  // SwiftBase Configuration
  SWIFTBASE_URL: z.string().url().default('http://localhost:8090'),
  SWIFTBASE_API_VERSION: z.string().default('1.0'),

  // Test Admin Credentials
  TEST_ADMIN_USERNAME: z.string().default('admin'),
  TEST_ADMIN_PASSWORD: z.string().default('admin123'),

  // Test User Credentials
  TEST_USER_EMAIL: z.string().email().default('test@example.com'),
  TEST_USER_PASSWORD: z.string().default('TestPassword123!'),

  // Test Configuration
  TEST_TIMEOUT: z.coerce.number().default(30000),
  TEST_RETRY_COUNT: z.coerce.number().default(3),
  TEST_PARALLEL: z.coerce.boolean().default(true),

  // Debug Mode
  DEBUG_MODE: z.coerce.boolean().default(false),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Storage Configuration
  STORAGE_TEST_DIR: z.string().default('./test-data/storage'),
  MAX_FILE_SIZE: z.coerce.number().default(104857600), // 100MB

  // Database Configuration
  DB_PATH: z.string().default('./data/swiftbase.db'),
})

export type Environment = z.infer<typeof envSchema>

/**
 * Load and validate environment configuration
 */
export function loadEnvironment(): Environment {
  try {
    const env = envSchema.parse(process.env)

    if (env.DEBUG_MODE) {
      console.log('Environment configuration loaded:', {
        ...env,
        TEST_ADMIN_PASSWORD: '***',
        TEST_USER_PASSWORD: '***',
      })
    }

    return env
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Environment validation failed:', error.errors)
      throw new Error('Invalid environment configuration')
    }
    throw error
  }
}

/**
 * Get environment configuration (singleton pattern)
 */
let cachedEnv: Environment | null = null

export function getEnvironment(): Environment {
  if (!cachedEnv) {
    cachedEnv = loadEnvironment()
  }
  return cachedEnv
}

/**
 * Reset environment cache (useful for testing)
 */
export function resetEnvironment(): void {
  cachedEnv = null
}
