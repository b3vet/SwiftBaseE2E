# SwiftBase E2E Testing Guide

Complete guide for running, writing, and maintaining E2E tests for the SwiftBase API.

## Table of Contents

- [Quick Start](#quick-start)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Patterns](#test-patterns)
- [Troubleshooting](#troubleshooting)
- [CI/CD Integration](#cicd-integration)

## Quick Start

### Prerequisites

- Node.js 20.x or higher
- pnpm 8.x or higher
- SwiftBase instance running (local or remote)

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Configure your environment
# Edit .env with your SwiftBase URL and credentials
```

### First Test Run

```bash
# Run all tests
pnpm test

# Run specific test group
pnpm test:auth

# Run with coverage
pnpm test:coverage
```

## Test Structure

### Directory Organization

```
src/
├── client/                 # API clients
│   ├── api-client.ts      # Base HTTP client
│   ├── auth-client.ts     # Authentication operations
│   ├── admin-client.ts    # Admin operations
│   ├── query-client.ts    # Query operations
│   └── storage-client.ts  # File storage operations
├── config/                 # Configuration
│   ├── environment.ts     # Environment variables
│   └── constants.ts       # API constants
├── helpers/                # Test helpers
│   ├── auth.helper.ts     # Authentication helpers
│   ├── collection.helper.ts # Collection helpers
│   ├── cleanup.helper.ts  # Resource cleanup
│   └── file-generator.ts  # File generation
├── tests/                  # Test suites
│   ├── auth/              # Authentication tests (123 tests)
│   ├── collections/       # Collection tests (125 tests)
│   ├── query/             # Query tests (228 tests)
│   ├── storage/           # Storage tests (105 tests)
│   ├── api/               # API tests (57 tests)
│   └── integration/       # Integration tests (37 tests)
├── types/                  # TypeScript types
├── validators/             # Response validators
└── fixtures/               # Test data fixtures
```

### Test Categories

1. **Authentication Tests** (Phase 2 - 123 tests)
   - User registration and login
   - Token management
   - Session handling
   - Authorization

2. **Collection Management Tests** (Phase 3 - 125 tests)
   - CRUD operations
   - Schema validation
   - Statistics
   - Permissions

3. **Query Engine Tests** (Phase 4 - 228 tests)
   - Basic queries (find, create, update, delete)
   - MongoDB operators
   - Query features (sort, pagination, projection)
   - Update operators
   - Bulk operations

4. **File Storage Tests** (Phase 5 - 105 tests)
   - File upload/download
   - Range requests
   - Metadata management
   - Permissions

5. **API Gateway Tests** (Phase 6 - 57 tests)
   - API versioning
   - Rate limiting
   - Error handling
   - Integration

6. **Integration Tests** (Phase 7 - 37 tests)
   - End-to-end workflows
   - Data consistency
   - Error recovery

## Running Tests

### All Tests

```bash
# Run entire test suite
pnpm test

# Run with watch mode
pnpm test:watch

# Run with UI
pnpm test:ui
```

### By Phase/Category

```bash
# Authentication tests
pnpm test:auth

# Collection tests
pnpm test:collections

# Query tests
pnpm test:query

# Storage tests
pnpm test:storage

# API tests
pnpm test:api

# Integration tests
pnpm test src/tests/integration
```

### Specific Tests

```bash
# Run specific file
pnpm test src/tests/auth/user-registration.test.ts

# Run tests matching pattern
pnpm test -t "should register a new user"

# Run failed tests only
pnpm test --reporter=verbose --reporter=json --outputFile=results.json
```

### Coverage

```bash
# Generate coverage report
pnpm test:coverage

# View coverage in browser
open coverage/index.html
```

### Performance

```bash
# Run with timeout
pnpm test --timeout=60000

# Run specific slow tests
pnpm test src/tests/integration --timeout=120000
```

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import { createAuthClient } from '@/client'
import { createAuthHelper, createCleanupHelper } from '@/helpers'
import { assertSuccessResponse, assertErrorResponse } from '@/validators/response.validator'

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

  describe('Sub-feature', () => {
    it('should do something', async () => {
      // Arrange
      const client = createAuthClient()

      // Act
      const response = await client.registerUser({
        email: `test-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
      })

      // Assert
      assertSuccessResponse(response)
      expect(response.data!.accessToken).toBeDefined()
    })
  })
})
```

### Test Best Practices

#### 1. Use Proper Naming

```typescript
// Good ✅
it('should register a new user with valid credentials', async () => {})
it('should return error for duplicate email', async () => {})
it('should enforce password requirements', async () => {})

// Bad ❌
it('test1', async () => {})
it('registration', async () => {})
it('should work', async () => {})
```

#### 2. Use Helpers

```typescript
// Good ✅
const adminToken = await authHelper.getAdminToken()
const { token, userId } = await authHelper.createAndLoginUser()
await collectionHelper.createTestCollection(name)

// Bad ❌
// Manually creating admin user every time
// Not using cleanup helper
```

#### 3. Clean Up Resources

```typescript
// Good ✅
const response = await adminClient.createCollection({ name })
cleanup.track('collection', name)

const fileResponse = await storageClient.uploadFile(buffer, filename)
cleanup.track('file', fileResponse.data!.id)

// Bad ❌
// Creating resources without cleanup
// May cause conflicts in subsequent tests
```

#### 4. Use Unique Identifiers

```typescript
// Good ✅
const email = `test-${Date.now()}@example.com`
const collectionName = `test_collection_${Date.now()}`

// Bad ❌
const email = 'test@example.com' // Will conflict on second run
const collectionName = 'test_collection' // Same issue
```

#### 5. Test Both Success and Failure

```typescript
// Test success case
it('should create collection with valid name', async () => {
  const response = await adminClient.createCollection({ name: 'valid_name' })
  assertSuccessResponse(response)
})

// Test failure case
it('should reject invalid collection name', async () => {
  const response = await adminClient.createCollection({ name: '123invalid' })
  assertErrorResponse(response)
  expect(response.error?.code).toMatch(/VALIDATION_ERROR/)
})
```

## Test Patterns

### Pattern 1: CRUD Operations

```typescript
describe('Collection CRUD', () => {
  it('should create a collection', async () => {
    const response = await adminClient.createCollection({ name })
    assertSuccessResponse(response)
    cleanup.track('collection', name)
  })

  it('should read collection details', async () => {
    const response = await adminClient.getCollection(name)
    assertSuccessResponse(response)
    expect(response.data!.name).toBe(name)
  })

  it('should update collection', async () => {
    const response = await adminClient.updateCollection(name, { description })
    assertSuccessResponse(response)
  })

  it('should delete collection', async () => {
    const response = await adminClient.deleteCollection(name)
    assertSuccessResponse(response)
  })
})
```

### Pattern 2: Authentication Flow

```typescript
describe('User Authentication Flow', () => {
  it('should complete registration and login', async () => {
    const authClient = createAuthClient()

    // Register
    const registerResponse = await authClient.registerUser({ email, password })
    assertSuccessResponse(registerResponse)

    // Login
    const loginResponse = await authClient.loginUser({ email, password })
    assertSuccessResponse(loginResponse)

    // Use token
    const userResponse = await apiClient.authenticatedRequest(
      '/api/auth/user',
      loginResponse.data!.accessToken,
      { method: 'GET' }
    )
    assertSuccessResponse(userResponse)
  })
})
```

### Pattern 3: Data Consistency

```typescript
describe('Data Consistency', () => {
  it('should maintain consistency across concurrent operations', async () => {
    const operations = Array.from({ length: 10 }, (_, i) =>
      queryClient.create(collectionName, { value: i })
    )

    const responses = await Promise.all(operations)

    responses.forEach(response => {
      assertSuccessResponse(response)
    })

    const findResponse = await queryClient.find(collectionName, {})
    expect(findResponse.data!.length).toBe(10)
  })
})
```

### Pattern 4: Error Handling

```typescript
describe('Error Handling', () => {
  it('should handle errors gracefully', async () => {
    // Cause error
    const errorResponse = await queryClient.find('nonexistent', {})
    assertErrorResponse(errorResponse)

    // Verify system still works
    const successResponse = await queryClient.find(validCollection, {})
    assertSuccessResponse(successResponse)
  })
})
```

## Troubleshooting

### Common Issues

#### 1. Connection Errors

```
Error: ECONNREFUSED
```

**Solution:** Ensure SwiftBase is running:
```bash
# Check SWIFTBASE_URL in .env
echo $SWIFTBASE_URL

# Test connection
curl http://localhost:8090/api/health
```

#### 2. Authentication Failures

```
Error: UNAUTHORIZED
```

**Solution:** Check credentials:
```bash
# Verify admin credentials in .env
TEST_ADMIN_USERNAME=admin
TEST_ADMIN_PASSWORD=your_password
```

#### 3. Timeout Errors

```
Error: Test timeout of 30000ms exceeded
```

**Solution:** Increase timeout for slow tests:
```typescript
it('should handle large file', async () => {
  // test code
}, 60000) // 60 second timeout
```

#### 4. Resource Conflicts

```
Error: Collection already exists
```

**Solution:** Use unique names:
```typescript
const collectionName = `test_${Date.now()}_${Math.random()}`
```

#### 5. Cleanup Issues

```
Error: Cleanup failed
```

**Solution:** Track all resources:
```typescript
cleanup.track('collection', name)
cleanup.track('file', fileId)
```

### Debug Mode

```bash
# Run with verbose output
DEBUG=* pnpm test

# Run single test with full output
pnpm test -t "specific test name" --reporter=verbose
```

## CI/CD Integration

### GitHub Actions

The test suite includes a complete GitHub Actions workflow:

```yaml
# .github/workflows/test.yml
- Lint and type check
- Run test groups in parallel
- Generate coverage reports
- Upload results
```

### Running in CI

```bash
# Set required secrets in GitHub
SWIFTBASE_URL=https://api.example.com
TEST_ADMIN_USERNAME=admin
TEST_ADMIN_PASSWORD=secure_password

# Tests run automatically on:
# - Push to main/develop
# - Pull requests
# - Manual workflow dispatch
```

### Coverage Reports

Coverage is automatically uploaded to Codecov:

```yaml
- name: Upload coverage
  uses: codecov/codecov-action@v3
```

### Test Matrix

Tests run in parallel across test groups:
- auth
- collections
- query
- storage
- api
- integration

## Performance Guidelines

### Timeouts

- **Unit tests:** 2-5 seconds
- **Integration tests:** 10-60 seconds
- **Heavy load tests:** Up to 2 minutes

### Concurrent Tests

Tests can run concurrently within groups but should be isolated:

```typescript
// Each test should be independent
describe('Independent Tests', () => {
  it('test 1', async () => {
    const collection = `unique_${Date.now()}_1`
    // Test code
  })

  it('test 2', async () => {
    const collection = `unique_${Date.now()}_2`
    // Test code
  })
})
```

### Resource Management

Always clean up resources:

```typescript
afterAll(async () => {
  await cleanup.cleanAll()
})
```

## Next Steps

- [Best Practices Guide](./BEST_PRACTICES.md)
- [Maintenance Guide](./MAINTENANCE.md)
- [API Documentation](../API.md)
- [Contributing Guide](../CONTRIBUTING.md)
