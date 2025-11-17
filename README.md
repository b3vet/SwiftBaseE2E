# SwiftBase E2E Test Suite

**Status:** ✅ Production Ready | **Tests:** 675 | **Coverage:** Comprehensive

Comprehensive end-to-end testing suite for SwiftBase API using TypeScript, Vitest, and pnpm. Built with modern testing best practices, full CI/CD integration, and extensive documentation.

## Overview

This production-ready test suite provides **675 comprehensive tests** across all SwiftBase API functionality:

- **Authentication** (123 tests) - User & admin auth, tokens, sessions, authorization
- **Collection Management** (125 tests) - CRUD, validation, statistics, permissions
- **Query Engine** (228 tests) - MongoDB-style queries, operators, features, bulk operations
- **File Storage** (105 tests) - Upload, download, range requests, metadata management
- **API Gateway** (57 tests) - Versioning, rate limiting, integration, validation
- **Integration Workflows** (37 tests) - E2E scenarios, data consistency, error recovery

## Quick Links

- 📚 **[Complete Testing Guide](docs/TESTING_GUIDE.md)** - Comprehensive guide to running and writing tests
- 🎯 **[Best Practices Guide](docs/BEST_PRACTICES.md)** - Patterns, anti-patterns, and quality guidelines
- 🔧 **[Maintenance Guide](docs/MAINTENANCE.md)** - Extending, troubleshooting, and maintaining tests
- 📊 **[Project Completion Summary](PROJECT_COMPLETE.md)** - Full project statistics and overview
- 🚀 **[CI/CD Workflow](.github/workflows/test.yml)** - Automated testing pipeline

## Key Features

- ✅ **675 comprehensive E2E tests** across all major features
- ✅ **Type-safe TypeScript** with strict mode and comprehensive types
- ✅ **Automated CI/CD** with GitHub Actions and parallel execution
- ✅ **Resource cleanup** - automatic tracking and cleanup of test resources
- ✅ **Best practices** - following industry standards for test design
- ✅ **Extensive documentation** - guides for testing, best practices, and maintenance
- ✅ **Security testing** - authentication, authorization, injection prevention
- ✅ **Performance validated** - all operations tested for acceptable speed

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

For comprehensive troubleshooting, see the **[Maintenance Guide](docs/MAINTENANCE.md)**.

### Quick Fixes

**Connection Errors**
```bash
# Ensure SwiftBase is running
curl http://localhost:8090/api/health

# Check environment configuration
cat .env
```

**Authentication Failures**
```bash
# Verify admin credentials in .env
echo $TEST_ADMIN_USERNAME
echo $TEST_ADMIN_PASSWORD
```

**Test Timeouts**
```typescript
// Increase timeout for slow tests
it('should handle large operation', async () => {
  // test code
}, 60000) // 60 second timeout
```

**Resource Conflicts**
```typescript
// Always use unique identifiers
const collectionName = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
```

For more solutions, see:
- [Testing Guide - Troubleshooting Section](docs/TESTING_GUIDE.md#troubleshooting)
- [Maintenance Guide - Common Issues](docs/MAINTENANCE.md#troubleshooting-common-issues)

## Best Practices

For comprehensive best practices, see the **[Best Practices Guide](docs/BEST_PRACTICES.md)**.

### Quick Tips

1. ✅ **Use helpers** - Leverage auth, collection, and cleanup helpers
2. ✅ **Clean up resources** - Always track created resources with `cleanup.track()`
3. ✅ **Unique identifiers** - Use timestamps/random strings: `test_${Date.now()}`
4. ✅ **Test independence** - Each test should run in isolation
5. ✅ **Test both paths** - Include success and error cases
6. ✅ **Type safety** - Use TypeScript types for all API interactions
7. ✅ **AAA pattern** - Structure tests as Arrange-Act-Assert

### Example Test Structure

```typescript
describe('Feature Name', () => {
  const authHelper = createAuthHelper()
  const cleanup = createCleanupHelper()

  let adminToken: string

  beforeAll(async () => {
    adminToken = await authHelper.getAdminToken()
    cleanup.setToken(adminToken)
  })

  afterAll(async () => {
    await cleanup.cleanAll()
  })

  it('should do something successfully', async () => {
    // Arrange - setup test data
    const testData = { /* ... */ }

    // Act - perform operation
    const response = await client.operation(testData)

    // Assert - verify results
    assertSuccessResponse(response)
    expect(response.data).toBeDefined()
  })
})
```

## Contributing

For detailed contribution guidelines, see the **[Maintenance Guide - Extending the Test Suite](docs/MAINTENANCE.md#extending-the-test-suite)**.

### Quick Guide

**Adding New Tests:**
1. Identify the appropriate test category (auth, collections, query, storage, api, integration)
2. Follow existing test patterns and structure
3. Use the test template from Best Practices guide
4. Include both positive and negative test cases
5. Ensure proper resource cleanup
6. Update documentation if adding new features

**Checklist:**
- [ ] Test name clearly describes what is being tested
- [ ] Uses unique identifiers to avoid conflicts
- [ ] Tracks all created resources with cleanup helper
- [ ] Tests both success and failure cases
- [ ] Uses proper assertion helpers
- [ ] Independent from other tests
- [ ] Follows AAA pattern

## Project Statistics

| Metric | Value |
|--------|-------|
| **Total Tests** | 675 comprehensive E2E tests |
| **Test Files** | 23 test files across 6 categories |
| **Test Code** | ~15,000+ lines of test code |
| **Infrastructure** | 5 clients, 4 helpers, comprehensive types |
| **Documentation** | 3,500+ lines across multiple guides |
| **CI/CD** | Automated with parallel execution |
| **Coverage** | All major features comprehensively tested |
| **Status** | ✅ Production Ready |

## Documentation

- **[Testing Guide](docs/TESTING_GUIDE.md)** - Complete guide for running and writing tests
- **[Best Practices Guide](docs/BEST_PRACTICES.md)** - Patterns, anti-patterns, and quality guidelines
- **[Maintenance Guide](docs/MAINTENANCE.md)** - Extending, troubleshooting, and maintaining tests
- **[Project Completion Summary](PROJECT_COMPLETE.md)** - Full project overview and statistics
- **Phase Summaries:** PHASE1_COMPLETE.md through PHASE8_COMPLETE.md - Detailed completion docs

## License

MIT

## Support

For issues or questions:
- **Troubleshooting:** See [Testing Guide - Troubleshooting](docs/TESTING_GUIDE.md#troubleshooting)
- **Common Issues:** See [Maintenance Guide](docs/MAINTENANCE.md#troubleshooting-common-issues)
- **Best Practices:** See [Best Practices Guide](docs/BEST_PRACTICES.md)
- **Examples:** Review existing test files in `src/tests/`

---

**Built with ❤️ for comprehensive SwiftBase API testing**
