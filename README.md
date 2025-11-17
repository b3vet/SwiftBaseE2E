# SwiftBase E2E Test Suite

Comprehensive end-to-end testing suite for SwiftBase API using Vitest, TypeScript, and pnpm.

## Overview

This test suite provides thorough coverage of all SwiftBase API functionality including:

- Authentication (user & admin)
- Collection management
- MongoDB-style query engine
- File storage operations
- Bulk operations
- API versioning and error handling

## Requirements

- Node.js 20.x or higher
- pnpm 8.x or higher
- Running SwiftBase instance (default: http://localhost:8090)

## Installation

```bash
# Install dependencies
pnpm install
```

## Configuration

1. Copy the example environment file:

```bash
cp .env.example .env.test
```

2. Edit `.env.test` with your configuration:

```env
# SwiftBase Configuration
SWIFTBASE_URL=http://localhost:8090
SWIFTBASE_API_VERSION=1.0

# Test Admin Credentials
TEST_ADMIN_USERNAME=admin
TEST_ADMIN_PASSWORD=admin123

# Test Configuration
TEST_TIMEOUT=30000
TEST_PARALLEL=true
DEBUG_MODE=false
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage

# Run specific test suites
pnpm test:auth          # Authentication tests
pnpm test:collections   # Collection management tests
pnpm test:query         # Query engine tests
pnpm test:storage       # File storage tests
pnpm test:integration   # Integration tests
pnpm test:api           # API gateway tests

# Run specific test file
pnpm test src/tests/auth/user-login.test.ts

# Type check
pnpm typecheck
```

## Project Structure

```
swiftbase-e2e-tests/
├── src/
│   ├── config/              # Environment configuration
│   │   ├── environment.ts   # Environment variables
│   │   └── constants.ts     # API endpoints & constants
│   ├── client/              # API clients
│   │   ├── api-client.ts    # Base HTTP client
│   │   ├── auth-client.ts   # Authentication client
│   │   ├── admin-client.ts  # Admin operations client
│   │   ├── query-client.ts  # Query operations client
│   │   └── storage-client.ts # File storage client
│   ├── types/               # TypeScript type definitions
│   │   ├── api.types.ts
│   │   ├── auth.types.ts
│   │   ├── collection.types.ts
│   │   ├── query.types.ts
│   │   └── storage.types.ts
│   ├── validators/          # Response validators
│   │   ├── schemas/         # Zod validation schemas
│   │   └── response.validator.ts
│   ├── helpers/             # Test helpers
│   │   ├── auth.helper.ts       # Auth utilities
│   │   ├── collection.helper.ts # Collection utilities
│   │   ├── cleanup.helper.ts    # Resource cleanup
│   │   ├── file-generator.ts    # Test file generation
│   │   └── test-data.ts         # Test data generation
│   ├── fixtures/            # Test data fixtures
│   │   ├── users.fixture.ts
│   │   ├── collections.fixture.ts
│   │   └── documents.fixture.ts
│   └── tests/               # Test suites
│       ├── setup/
│       │   └── global-setup.ts  # Global test setup
│       ├── unit/            # Unit tests
│       ├── auth/            # Authentication tests
│       ├── collections/     # Collection tests
│       ├── query/           # Query engine tests
│       ├── storage/         # Storage tests
│       ├── integration/     # Integration tests
│       └── api/             # API gateway tests
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

## Writing Tests

### Basic Test Example

```typescript
import { describe, it, expect } from 'vitest'
import { createApiClient } from '@/client'

describe('Feature Name', () => {
  const apiClient = createApiClient()

  it('should do something', async () => {
    const response = await apiClient.get('/endpoint')

    expect(response.success).toBe(true)
    expect(response.data).toBeDefined()
  })
})
```

### Using Helpers

```typescript
import { authHelper, collectionHelper } from '@/helpers'

// Get admin token
const adminToken = await authHelper.getAdminToken()

// Create test user
const { token, userId } = await authHelper.createAndLoginUser()

// Create test collection
const helper = createCollectionHelper(adminToken)
const { name, id } = await helper.createTestCollection('products')
```

### Cleanup Resources

```typescript
import { createCleanupHelper } from '@/helpers'

const cleanup = createCleanupHelper(adminToken)

// Track resources
cleanup.track('collection', 'my_collection')
cleanup.track('file', 'file_id_123')

// Clean up all tracked resources
await cleanup.cleanAll()
```

## Test Patterns

### Authentication Flow

```typescript
import { authHelper } from '@/helpers'

describe('Protected Endpoint', () => {
  it('should require authentication', async () => {
    const { token } = await authHelper.createAndLoginUser()

    // Use token for authenticated requests
    const response = await apiClient.authenticatedRequest(
      '/api/protected',
      token
    )

    expect(response.success).toBe(true)
  })
})
```

### Collection Testing

```typescript
import { collectionHelper } from '@/helpers'

describe('Collection Operations', () => {
  const adminToken = await authHelper.getAdminToken()
  const helper = createCollectionHelper(adminToken)

  it('should create collection with documents', async () => {
    const documents = [
      { name: 'Item 1', price: 100 },
      { name: 'Item 2', price: 200 },
    ]

    const result = await helper.createCollectionWithData(
      'products',
      documents
    )

    expect(result.documents).toHaveLength(2)
  })
})
```

### File Upload Testing

```typescript
import { FileGenerator } from '@/helpers'
import { createStorageClient } from '@/client'

describe('File Upload', () => {
  it('should upload file', async () => {
    const { token } = await authHelper.getUserToken()
    const storageClient = createStorageClient(token)

    const fileBuffer = FileGenerator.generateSmallFile()
    const response = await storageClient.uploadFile(
      fileBuffer,
      'test.txt',
      'text/plain'
    )

    expect(response.success).toBe(true)
  })
})
```

## Debug Mode

Enable debug mode to see detailed request/response logs:

```env
DEBUG_MODE=true
```

Or run tests with debug flag:

```bash
DEBUG_MODE=true pnpm test
```

## Troubleshooting

### SwiftBase Connection Error

**Problem:** Tests fail with "Failed to connect to SwiftBase"

**Solution:**
1. Ensure SwiftBase is running: `./swiftbase serve`
2. Check the URL in `.env.test` matches your SwiftBase instance
3. Verify SwiftBase is accessible: `curl http://localhost:8090/health`

### Authentication Failures

**Problem:** Tests fail with "Failed to login admin"

**Solution:**
1. Check admin credentials in `.env.test`
2. Verify default admin exists (run SwiftBase migrations/seeds)
3. Check if admin password was changed

### Port Already in Use

**Problem:** SwiftBase won't start - port 8090 in use

**Solution:**
1. Stop existing SwiftBase instance
2. Or change port in SwiftBase and update `.env.test`

### Test Timeouts

**Problem:** Tests timeout before completing

**Solution:**
1. Increase `TEST_TIMEOUT` in `.env.test`
2. Check network connectivity to SwiftBase
3. Verify SwiftBase is not under heavy load

## Best Practices

1. **Use helpers** - Don't create clients manually, use helper functions
2. **Clean up** - Always track and clean up test resources
3. **Unique names** - Use timestamps/random strings for test data
4. **Isolation** - Tests should not depend on other tests
5. **Assertions** - Always validate both success and error cases
6. **Type safety** - Use TypeScript types for all API interactions

## Contributing

When adding new tests:

1. Follow existing test patterns
2. Use appropriate helpers and fixtures
3. Add proper error handling
4. Include both positive and negative test cases
5. Document complex test scenarios
6. Update README if adding new features

## License

MIT

## Support

For issues or questions:
- Check SwiftBase documentation
- Review existing test examples
- Check troubleshooting section above
