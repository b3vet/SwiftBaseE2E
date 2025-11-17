# SwiftBase E2E Testing Best Practices

Comprehensive guide for writing high-quality, maintainable E2E tests for the SwiftBase API.

## Table of Contents

- [Core Principles](#core-principles)
- [Test Design](#test-design)
- [Code Organization](#code-organization)
- [Resource Management](#resource-management)
- [Error Handling](#error-handling)
- [Performance Optimization](#performance-optimization)
- [Security Testing](#security-testing)
- [Common Anti-Patterns](#common-anti-patterns)
- [Maintenance Guidelines](#maintenance-guidelines)

## Core Principles

### 1. Test Independence

Each test should be completely independent and not rely on other tests' execution order or state.

**✅ Good:**
```typescript
describe('User Registration', () => {
  it('should register a new user', async () => {
    const email = `test-${Date.now()}-${Math.random()}@example.com`
    const response = await authClient.registerUser({ email, password: 'Pass123!' })
    assertSuccessResponse(response)
    cleanup.track('user', email)
  })

  it('should validate email format', async () => {
    const email = `validate-${Date.now()}@example.com`
    const response = await authClient.registerUser({ email, password: 'Pass123!' })
    assertSuccessResponse(response)
    cleanup.track('user', email)
  })
})
```

**❌ Bad:**
```typescript
describe('User Registration', () => {
  let sharedEmail: string

  it('should register a new user', async () => {
    sharedEmail = 'shared@example.com' // Don't share state between tests
    const response = await authClient.registerUser({ email: sharedEmail, password: 'Pass123!' })
    assertSuccessResponse(response)
  })

  it('should prevent duplicate registration', async () => {
    // Relies on previous test running first
    const response = await authClient.registerUser({ email: sharedEmail, password: 'Pass123!' })
    assertErrorResponse(response)
  })
})
```

### 2. Clear Test Intent

Test names should clearly describe what is being tested and the expected outcome.

**✅ Good:**
```typescript
it('should create collection with valid name and schema', async () => {})
it('should reject collection creation with invalid name format', async () => {})
it('should enforce minimum password length of 8 characters', async () => {})
it('should allow concurrent file uploads from same user', async () => {})
```

**❌ Bad:**
```typescript
it('test1', async () => {})
it('collection test', async () => {})
it('should work', async () => {})
it('password', async () => {})
```

### 3. Arrange-Act-Assert Pattern

Structure tests with clear separation of setup, execution, and verification.

**✅ Good:**
```typescript
it('should update document with $set operator', async () => {
  // Arrange
  const collectionName = `test_${Date.now()}`
  await adminClient.createCollection({ name: collectionName })
  cleanup.track('collection', collectionName)

  const createResponse = await queryClient.create(collectionName, {
    name: 'Original',
    value: 100
  })
  const docId = createResponse.data!.id

  // Act
  const updateResponse = await queryClient.update(
    collectionName,
    { id: docId },
    { $set: { name: 'Updated', value: 200 } }
  )

  // Assert
  assertSuccessResponse(updateResponse)
  expect(updateResponse.data!.name).toBe('Updated')
  expect(updateResponse.data!.value).toBe(200)
})
```

## Test Design

### 1. Test Positive and Negative Cases

Always test both success scenarios and failure scenarios.

**✅ Complete Testing:**
```typescript
describe('Collection Creation', () => {
  // Positive cases
  it('should create collection with valid name', async () => {
    const response = await adminClient.createCollection({ name: 'valid_name' })
    assertSuccessResponse(response)
  })

  it('should create collection with schema', async () => {
    const response = await adminClient.createCollection({
      name: 'with_schema',
      schema: { fields: [...] }
    })
    assertSuccessResponse(response)
  })

  // Negative cases
  it('should reject collection with invalid name format', async () => {
    const response = await adminClient.createCollection({ name: '123invalid' })
    assertErrorResponse(response)
    expect(response.error?.code).toMatch(/VALIDATION_ERROR/)
  })

  it('should reject collection with duplicate name', async () => {
    const name = `duplicate_${Date.now()}`
    await adminClient.createCollection({ name })
    cleanup.track('collection', name)

    const response = await adminClient.createCollection({ name })
    assertErrorResponse(response)
    expect(response.error?.code).toMatch(/CONFLICT|DUPLICATE/)
  })
})
```

### 2. Test Edge Cases

Consider boundary conditions, empty values, null values, and extreme inputs.

**✅ Comprehensive Edge Case Testing:**
```typescript
describe('Query Pagination Edge Cases', () => {
  it('should handle limit=0 (return no results)', async () => {
    const response = await queryClient.find(collectionName, {}, { limit: 0 })
    assertSuccessResponse(response)
    expect(response.data).toHaveLength(0)
  })

  it('should handle offset beyond total results', async () => {
    const response = await queryClient.find(collectionName, {}, { offset: 10000 })
    assertSuccessResponse(response)
    expect(response.data).toHaveLength(0)
  })

  it('should handle very large limit (cap at reasonable max)', async () => {
    const response = await queryClient.find(collectionName, {}, { limit: 999999 })
    assertSuccessResponse(response)
  })

  it('should handle empty query on empty collection', async () => {
    const response = await queryClient.find(emptyCollection, {})
    assertSuccessResponse(response)
    expect(response.data).toEqual([])
  })
})
```

### 3. Test Data-Driven Testing

Use parameterized tests for testing multiple similar scenarios.

**✅ Data-Driven Approach:**
```typescript
describe('MongoDB Comparison Operators', () => {
  const testCases = [
    { operator: '$eq', value: 50, expectedCount: 1 },
    { operator: '$ne', value: 50, expectedCount: 4 },
    { operator: '$gt', value: 50, expectedCount: 2 },
    { operator: '$gte', value: 50, expectedCount: 3 },
    { operator: '$lt', value: 50, expectedCount: 2 },
    { operator: '$lte', value: 50, expectedCount: 3 },
  ]

  testCases.forEach(({ operator, value, expectedCount }) => {
    it(`should filter documents using ${operator}`, async () => {
      const response = await queryClient.find(collectionName, {
        value: { [operator]: value }
      })

      assertSuccessResponse(response)
      expect(response.data).toHaveLength(expectedCount)
    })
  })
})
```

## Code Organization

### 1. Use Helpers for Common Operations

Extract repeated logic into helper functions.

**✅ Good:**
```typescript
import { createAuthHelper, createCleanupHelper } from '@/helpers'

describe('Collection Tests', () => {
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
})
```

**❌ Bad:**
```typescript
describe('Collection Tests', () => {
  let adminToken: string

  beforeAll(async () => {
    // Manually authenticating in every test file
    const response = await authClient.loginUser({
      email: process.env.TEST_ADMIN_USERNAME!,
      password: process.env.TEST_ADMIN_PASSWORD!,
    })
    adminToken = response.data!.accessToken
  })

  afterAll(async () => {
    // Manually cleaning up in every test file
    // ... repetitive cleanup code
  })
})
```

### 2. Group Related Tests

Use nested describe blocks to organize related test cases.

**✅ Good:**
```typescript
describe('Query Engine', () => {
  describe('Basic Operations', () => {
    it('should find documents', async () => {})
    it('should find one document', async () => {})
    it('should create document', async () => {})
  })

  describe('Comparison Operators', () => {
    it('should use $eq operator', async () => {})
    it('should use $gt operator', async () => {})
    it('should use $lt operator', async () => {})
  })

  describe('Logical Operators', () => {
    it('should use $and operator', async () => {})
    it('should use $or operator', async () => {})
  })
})
```

### 3. Consistent Naming Conventions

Follow consistent naming patterns throughout the test suite.

**✅ Conventions:**
```typescript
// Collections
const collectionName = `test_collection_${Date.now()}`

// Users
const userEmail = `user-${Date.now()}@example.com`

// Files
const filename = `test-file-${Date.now()}.txt`

// Documents
const testDocument = { name: 'Test', value: 100 }

// Clients
const authClient = createAuthClient()
const adminClient = createAdminClient(adminToken)
const queryClient = createQueryClient(userToken)
```

## Resource Management

### 1. Always Track Created Resources

Use the cleanup helper to track all resources created during tests.

**✅ Good:**
```typescript
it('should create and manage resources', async () => {
  // Create collection
  const response = await adminClient.createCollection({ name: collectionName })
  assertSuccessResponse(response)
  cleanup.track('collection', collectionName) // Track immediately

  // Upload file
  const fileResponse = await storageClient.uploadFile(buffer, filename, 'text/plain')
  assertSuccessResponse(fileResponse)
  cleanup.track('file', fileResponse.data!.id) // Track immediately

  // Create user
  const userResponse = await authClient.registerUser({ email, password })
  assertSuccessResponse(userResponse)
  cleanup.track('user', email) // Track immediately
})
```

**❌ Bad:**
```typescript
it('should create resources without tracking', async () => {
  await adminClient.createCollection({ name: 'untracked_collection' })
  await storageClient.uploadFile(buffer, 'untracked.txt', 'text/plain')
  await authClient.registerUser({ email: 'untracked@example.com', password: 'Pass123!' })
  // Resources not tracked - will pollute test database
})
```

### 2. Use Unique Identifiers

Generate unique identifiers to avoid conflicts between test runs.

**✅ Good:**
```typescript
// Timestamp-based uniqueness
const email = `test-${Date.now()}@example.com`

// Timestamp + random for parallel tests
const collectionName = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// UUID (if available)
import { randomUUID } from 'crypto'
const uniqueId = `test-${randomUUID()}`
```

### 3. Clean Up in afterAll Hooks

Always ensure cleanup runs after tests complete.

**✅ Good:**
```typescript
describe('Test Suite', () => {
  const cleanup = createCleanupHelper()

  afterAll(async () => {
    await cleanup.cleanAll()
  })

  // Tests...
})
```

## Error Handling

### 1. Use Proper Assertions

Use appropriate assertion helpers for success and error cases.

**✅ Good:**
```typescript
// For success cases
const response = await authClient.registerUser({ email, password })
assertSuccessResponse(response)
expect(response.data!.accessToken).toBeDefined()

// For error cases
const errorResponse = await authClient.loginUser({ email: 'invalid', password: 'wrong' })
assertErrorResponse(errorResponse)
expect(errorResponse.error?.code).toMatch(/AUTHENTICATION_ERROR/)
expect(errorResponse.error?.message).toContain('Invalid credentials')
```

**❌ Bad:**
```typescript
// Generic assertions without proper validation
const response = await authClient.registerUser({ email, password })
expect(response).toBeTruthy()
expect(response.data).toBeTruthy()

// Not validating error structure
const errorResponse = await authClient.loginUser({ email: 'invalid', password: 'wrong' })
expect(errorResponse.success).toBe(false)
```

### 2. Test Error Messages

Verify that error messages are helpful and descriptive.

**✅ Good:**
```typescript
it('should provide helpful error for invalid email format', async () => {
  const response = await authClient.registerUser({
    email: 'invalid-email',
    password: 'Pass123!'
  })

  assertErrorResponse(response)
  expect(response.error?.code).toMatch(/VALIDATION_ERROR/)
  expect(response.error?.message).toMatch(/email.*format|invalid.*email/i)
})
```

### 3. Test Error Recovery

Ensure the system can recover from errors and continue functioning.

**✅ Good:**
```typescript
it('should recover from errors gracefully', async () => {
  // Cause an error
  const errorResponse = await queryClient.find('nonexistent_collection', {})
  assertErrorResponse(errorResponse)

  // Verify system still works
  const validResponse = await queryClient.find(existingCollection, {})
  assertSuccessResponse(validResponse)

  // Can perform other operations
  const createResponse = await queryClient.create(existingCollection, { data: 'test' })
  assertSuccessResponse(createResponse)
})
```

## Performance Optimization

### 1. Manage Test Timeouts

Set appropriate timeouts based on operation complexity.

**✅ Good:**
```typescript
// Quick operations - use default timeout (30s)
it('should create collection', async () => {
  const response = await adminClient.createCollection({ name: collectionName })
  assertSuccessResponse(response)
})

// Slow operations - extend timeout
it('should upload large file', async () => {
  const largeBuffer = Buffer.alloc(10 * 1024 * 1024) // 10MB
  const response = await storageClient.uploadFile(largeBuffer, 'large.bin', 'application/octet-stream')
  assertSuccessResponse(response)
}, 60000) // 60 second timeout

// Very slow operations
it('should handle bulk operation with 1000 documents', async () => {
  const documents = Array.from({ length: 1000 }, (_, i) => ({ index: i }))
  const response = await queryClient.bulkCreate(collectionName, documents)
  assertSuccessResponse(response)
}, 120000) // 2 minute timeout
```

### 2. Optimize Test Data

Use minimal data necessary for testing.

**✅ Good:**
```typescript
it('should upload and verify file', async () => {
  const buffer = Buffer.from('Small test content')
  const response = await storageClient.uploadFile(buffer, 'test.txt', 'text/plain')
  assertSuccessResponse(response)
})
```

**❌ Bad:**
```typescript
it('should upload and verify file', async () => {
  // Using unnecessarily large data for simple test
  const buffer = Buffer.alloc(100 * 1024 * 1024) // 100MB
  const response = await storageClient.uploadFile(buffer, 'test.txt', 'text/plain')
  assertSuccessResponse(response)
})
```

### 3. Parallel Test Execution

Design tests to run in parallel safely.

**✅ Good:**
```typescript
describe('Parallel-Safe Tests', () => {
  it('test 1 with unique resources', async () => {
    const collection1 = `test_${Date.now()}_1`
    await adminClient.createCollection({ name: collection1 })
    cleanup.track('collection', collection1)
  })

  it('test 2 with unique resources', async () => {
    const collection2 = `test_${Date.now()}_2`
    await adminClient.createCollection({ name: collection2 })
    cleanup.track('collection', collection2)
  })
})
```

## Security Testing

### 1. Test Authentication and Authorization

Verify proper access control enforcement.

**✅ Good:**
```typescript
describe('Authorization', () => {
  it('should reject unauthenticated requests', async () => {
    const response = await apiClient.request('/api/collections', { method: 'GET' })
    expect(response.status).toBe(401)
  })

  it('should reject requests with invalid token', async () => {
    const response = await apiClient.authenticatedRequest(
      '/api/collections',
      'invalid-token',
      { method: 'GET' }
    )
    assertErrorResponse(response)
    expect(response.error?.code).toMatch(/UNAUTHORIZED|INVALID_TOKEN/)
  })

  it('should allow admin operations only for admin users', async () => {
    const { token } = await authHelper.createAndLoginUser()

    const response = await adminClient.createCollection({ name: 'test' })
    assertErrorResponse(response)
    expect(response.error?.code).toMatch(/FORBIDDEN|UNAUTHORIZED/)
  })
})
```

### 2. Test Input Validation

Verify that all inputs are properly validated.

**✅ Good:**
```typescript
describe('Input Validation', () => {
  it('should validate email format', async () => {
    const invalidEmails = ['invalid', 'no@domain', '@example.com', 'spaces @example.com']

    for (const email of invalidEmails) {
      const response = await authClient.registerUser({ email, password: 'Pass123!' })
      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/VALIDATION/)
    }
  })

  it('should enforce password requirements', async () => {
    const weakPasswords = ['short', '12345678', 'nospecial123', 'NoNumbers!']

    for (const password of weakPasswords) {
      const response = await authClient.registerUser({
        email: `test-${Date.now()}@example.com`,
        password
      })
      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/VALIDATION|PASSWORD/)
    }
  })
})
```

### 3. Test Injection Prevention

Verify protection against injection attacks.

**✅ Good:**
```typescript
describe('Security - Injection Prevention', () => {
  it('should prevent SQL injection in email field', async () => {
    const sqlInjection = "admin'--"
    const response = await authClient.loginUser({
      email: sqlInjection,
      password: 'anything'
    })

    // Should safely handle without allowing injection
    assertErrorResponse(response)
  })

  it('should prevent NoSQL injection in queries', async () => {
    const maliciousQuery = {
      $where: 'this.password.length > 0' // NoSQL injection attempt
    }

    const response = await queryClient.find(collectionName, maliciousQuery)
    // Should reject or safely sanitize
    assertErrorResponse(response)
  })

  it('should sanitize XSS in responses', async () => {
    const xssPayload = '<script>alert("xss")</script>'
    const createResponse = await queryClient.create(collectionName, {
      name: xssPayload
    })

    assertSuccessResponse(createResponse)

    // Verify stored as string, not executed
    const findResponse = await queryClient.findOne(collectionName, {
      id: createResponse.data!.id
    })

    assertSuccessResponse(findResponse)
    expect(findResponse.data!.name).toBe(xssPayload)

    // Verify response doesn't execute scripts
    const responseStr = JSON.stringify(findResponse)
    expect(responseStr).toContain('script') // Present as text
  })
})
```

## Common Anti-Patterns

### ❌ 1. Hardcoded Values

Don't use hardcoded values that might conflict.

```typescript
// Bad
const email = 'test@example.com'
const collectionName = 'test_collection'

// Good
const email = `test-${Date.now()}@example.com`
const collectionName = `test_collection_${Date.now()}`
```

### ❌ 2. Shared State Between Tests

Don't share mutable state between tests.

```typescript
// Bad
let sharedToken: string

it('test 1', async () => {
  sharedToken = 'token-from-test-1'
})

it('test 2', async () => {
  // Depends on test 1 running first
  await apiClient.authenticatedRequest('/endpoint', sharedToken, {})
})

// Good
it('test 1', async () => {
  const token = await authHelper.getAdminToken()
  await apiClient.authenticatedRequest('/endpoint', token, {})
})

it('test 2', async () => {
  const token = await authHelper.getAdminToken()
  await apiClient.authenticatedRequest('/endpoint', token, {})
})
```

### ❌ 3. Testing Implementation Details

Test behavior, not implementation.

```typescript
// Bad - Testing internal structure
it('should have specific field names', async () => {
  const response = await queryClient.findOne(collectionName, { id: '123' })
  expect(response.data).toHaveProperty('_internalField')
  expect(response.data).toHaveProperty('__metadata')
})

// Good - Testing behavior
it('should return document with id and data', async () => {
  const response = await queryClient.findOne(collectionName, { id: '123' })
  assertSuccessResponse(response)
  expect(response.data!.id).toBeDefined()
  expect(response.data!.name).toBe('Expected Name')
})
```

### ❌ 4. Ignoring Cleanup

Always clean up created resources.

```typescript
// Bad
it('should create collection', async () => {
  await adminClient.createCollection({ name: 'no_cleanup' })
  // No cleanup - will pollute database
})

// Good
it('should create collection', async () => {
  const name = `test_${Date.now()}`
  await adminClient.createCollection({ name })
  cleanup.track('collection', name)
})
```

### ❌ 5. Overly Complex Tests

Keep tests simple and focused.

```typescript
// Bad - Testing too many things
it('should do everything', async () => {
  // Register user
  // Create collection
  // Upload file
  // Create documents
  // Query documents
  // Update documents
  // Delete documents
  // Delete collection
  // ... 200 lines of test code
})

// Good - Focused tests
it('should register user and obtain token', async () => {
  // Only tests registration
})

it('should create collection with schema', async () => {
  // Only tests collection creation
})

it('should upload file and retrieve metadata', async () => {
  // Only tests file operations
})
```

## Maintenance Guidelines

### 1. Regular Updates

- Update dependencies regularly: `pnpm update`
- Review and update test data to match API changes
- Refactor tests when patterns emerge
- Remove obsolete tests

### 2. Documentation

- Document complex test scenarios
- Add comments for non-obvious test logic
- Keep README and guides up to date
- Document known limitations

### 3. Code Review

- Review test PRs for quality and coverage
- Ensure new features include tests
- Check for proper cleanup
- Verify error handling

### 4. Performance Monitoring

- Monitor test execution time
- Identify and optimize slow tests
- Use parallel execution where possible
- Set appropriate timeouts

### 5. Continuous Improvement

- Learn from test failures
- Add tests for discovered bugs
- Refactor duplicate code into helpers
- Share testing knowledge with team

## Quick Reference

### Test Structure Template

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createAuthClient, createAdminClient } from '@/client'
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
    it('should do something successfully', async () => {
      // Arrange
      const client = createAuthClient()
      const testData = { /* ... */ }

      // Act
      const response = await client.someOperation(testData)

      // Assert
      assertSuccessResponse(response)
      expect(response.data).toBeDefined()
    })

    it('should handle error case appropriately', async () => {
      // Arrange
      const client = createAuthClient()
      const invalidData = { /* ... */ }

      // Act
      const response = await client.someOperation(invalidData)

      // Assert
      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/ERROR_CODE/)
    })
  })
})
```

### Checklist for New Tests

- [ ] Test name clearly describes what is being tested
- [ ] Uses unique identifiers to avoid conflicts
- [ ] Tracks all created resources with cleanup helper
- [ ] Tests both success and failure cases
- [ ] Uses proper assertion helpers (assertSuccessResponse/assertErrorResponse)
- [ ] Includes appropriate timeouts for slow operations
- [ ] Follows Arrange-Act-Assert pattern
- [ ] Independent from other tests
- [ ] Properly handles errors
- [ ] Verifies response structure and data
- [ ] Cleans up resources in afterAll hook

---

**Related Documentation:**
- [Testing Guide](./TESTING_GUIDE.md)
- [Maintenance Guide](./MAINTENANCE.md)
- [API Documentation](../API.md)
- [Contributing Guide](../CONTRIBUTING.md)
