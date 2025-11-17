import { config } from 'dotenv'
import { getEnvironment } from '@/config/environment'
import { createApiClient } from '@/client'

/**
 * Global setup for all tests
 * Runs once before all test suites
 */
export async function setup() {
  // Load environment variables
  config({ path: '.env.test' })

  const env = getEnvironment()

  console.log('\n🚀 Setting up E2E test environment...\n')

  // Check if SwiftBase is running
  try {
    const apiClient = createApiClient()
    const response = await apiClient.get('/health')

    if (!response.success) {
      throw new Error('SwiftBase health check failed')
    }

    console.log('✅ SwiftBase is running')
    console.log(`   URL: ${env.SWIFTBASE_URL}`)
    console.log(`   API Version: ${env.SWIFTBASE_API_VERSION}`)
  } catch (error) {
    console.error('❌ Failed to connect to SwiftBase')
    console.error(`   URL: ${env.SWIFTBASE_URL}`)
    console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`)
    console.error('\n💡 Make sure SwiftBase is running before running tests')
    console.error('   Example: ./swiftbase serve\n')
    throw new Error('SwiftBase is not running')
  }

  // Check database connection
  try {
    const apiClient = createApiClient()
    const response = await apiClient.get('/health/db')

    if (!response.success) {
      console.warn('⚠️  Database health check failed')
    } else {
      console.log('✅ Database is connected')
    }
  } catch (error) {
    console.warn('⚠️  Database health check failed:', error)
  }

  console.log('\n📋 Test Configuration:')
  console.log(`   Admin Username: ${env.TEST_ADMIN_USERNAME}`)
  console.log(`   Timeout: ${env.TEST_TIMEOUT}ms`)
  console.log(`   Parallel: ${env.TEST_PARALLEL}`)
  console.log(`   Debug Mode: ${env.DEBUG_MODE}`)

  console.log('\n✨ Setup complete!\n')
}

/**
 * Global teardown for all tests
 * Runs once after all test suites
 */
export async function teardown() {
  console.log('\n🧹 Cleaning up test environment...')
  console.log('✅ Teardown complete!\n')
}

// Export for Vitest
export default setup
