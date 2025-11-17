# SwiftBase E2E Test Suite Maintenance Guide

Comprehensive guide for maintaining, extending, and evolving the SwiftBase E2E test suite over time.

## Table of Contents

- [Regular Maintenance Tasks](#regular-maintenance-tasks)
- [Extending the Test Suite](#extending-the-test-suite)
- [Troubleshooting Common Issues](#troubleshooting-common-issues)
- [Performance Optimization](#performance-optimization)
- [Updating Dependencies](#updating-dependencies)
- [Adding New Test Categories](#adding-new-test-categories)
- [Refactoring and Cleanup](#refactoring-and-cleanup)
- [Monitoring and Reporting](#monitoring-and-reporting)

## Regular Maintenance Tasks

### Daily Tasks

**Review Failed Tests**
```bash
# Check CI/CD results
# Review GitHub Actions workflow runs

# Run failed tests locally
pnpm test --reporter=verbose --reporter=json --outputFile=results.json

# Analyze failures
cat results.json | jq '.testResults[] | select(.status == "failed")'
```

**Monitor Test Execution Time**
```bash
# Check for slow tests
pnpm test --reporter=verbose | grep -E "SLOW|took [0-9]{4,}"

# Identify tests taking > 10 seconds
pnpm test --reporter=json | jq '.testResults[] | select(.duration > 10000)'
```

### Weekly Tasks

**1. Update Test Data**

Clean up orphaned test resources:
```bash
# Check for leftover test collections
# Pattern: test_*, test-*

# Check for old test users
# Pattern: test-*@example.com

# Check for test files
# Pattern: test-*, test_*
```

**2. Review Test Coverage**

```bash
# Generate coverage report
pnpm test:coverage

# Review coverage metrics
open coverage/index.html

# Identify uncovered areas
pnpm test:coverage --reporter=json | jq '.coverage.summary'
```

**3. Check for Flaky Tests**

```bash
# Run tests multiple times to identify flakes
for i in {1..10}; do
  echo "Run $i"
  pnpm test --reporter=json --outputFile="run-$i.json"
done

# Analyze results for inconsistencies
```

### Monthly Tasks

**1. Dependency Updates**

```bash
# Check for outdated dependencies
pnpm outdated

# Update dependencies
pnpm update --latest

# Run full test suite
pnpm test

# Update lock file
pnpm install
```

**2. Documentation Review**

- Update README with any new features
- Review and update TESTING_GUIDE.md
- Update BEST_PRACTICES.md with new patterns
- Update API documentation if API changes

**3. Performance Audit**

```bash
# Run performance benchmarks
pnpm test --reporter=verbose | tee performance-report.txt

# Compare with baseline
# Look for tests that have become slower

# Optimize slow tests
```

### Quarterly Tasks

**1. Major Refactoring**

- Identify duplicate code patterns
- Extract common helpers
- Consolidate similar test cases
- Update test structure if needed

**2. Architecture Review**

- Review client implementations
- Update type definitions
- Refactor validators
- Improve error handling

**3. Security Audit**

- Review authentication tests
- Update security test cases
- Check for new vulnerability patterns
- Update injection prevention tests

## Extending the Test Suite

### Adding New Tests to Existing Suites

**Step 1: Identify the Category**

Determine which test category the new test belongs to:
- `src/tests/auth/` - Authentication and authorization
- `src/tests/collections/` - Collection management
- `src/tests/query/` - Query operations
- `src/tests/storage/` - File storage
- `src/tests/api/` - API gateway and integration
- `src/tests/integration/` - End-to-end workflows

**Step 2: Create the Test**

```typescript
// Example: Adding a new authentication test
// File: src/tests/auth/password-reset.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createAuthClient } from '@/client'
import { createAuthHelper, createCleanupHelper } from '@/helpers'
import { assertSuccessResponse, assertErrorResponse } from '@/validators/response.validator'

describe('Password Reset', () => {
  const authHelper = createAuthHelper()
  const cleanup = createCleanupHelper()
  const authClient = createAuthClient()

  let adminToken: string

  beforeAll(async () => {
    adminToken = await authHelper.getAdminToken()
    cleanup.setToken(adminToken)
  })

  afterAll(async () => {
    await cleanup.cleanAll()
  })

  describe('Request Password Reset', () => {
    it('should send reset email for valid user', async () => {
      const email = `reset-test-${Date.now()}@example.com`
      const password = 'SecurePassword123!'

      // Register user
      await authClient.registerUser({ email, password })
      cleanup.track('user', email)

      // Request password reset
      const response = await authClient.requestPasswordReset({ email })

      assertSuccessResponse(response)
      expect(response.data!.message).toMatch(/email sent|reset link/i)
    })

    it('should handle non-existent user gracefully', async () => {
      const response = await authClient.requestPasswordReset({
        email: `nonexistent-${Date.now()}@example.com`
      })

      // Should not reveal if user exists (security)
      assertSuccessResponse(response)
      expect(response.data!.message).toMatch(/email sent|reset link/i)
    })
  })

  describe('Reset Password', () => {
    it('should reset password with valid token', async () => {
      // Test implementation
    })

    it('should reject invalid reset token', async () => {
      // Test implementation
    })
  })
})
```

**Step 3: Update package.json Scripts (if needed)**

```json
{
  "scripts": {
    "test:auth": "vitest run src/tests/auth"
  }
}
```

**Step 4: Run Tests**

```bash
# Run new test file
pnpm test src/tests/auth/password-reset.test.ts

# Run entire category
pnpm test:auth

# Run with coverage
pnpm test:coverage src/tests/auth/password-reset.test.ts
```

### Adding New Helper Functions

**Step 1: Create Helper File or Extend Existing**

```typescript
// File: src/helpers/password.helper.ts

import { createAuthClient } from '@/client'
import type { ApiResponse } from '@/types'

export interface PasswordHelper {
  requestReset: (email: string) => Promise<ApiResponse<{ resetToken: string }>>
  resetPassword: (token: string, newPassword: string) => Promise<ApiResponse<void>>
  validatePasswordStrength: (password: string) => boolean
}

export function createPasswordHelper(): PasswordHelper {
  const authClient = createAuthClient()

  return {
    async requestReset(email: string) {
      return authClient.requestPasswordReset({ email })
    },

    async resetPassword(token: string, newPassword: string) {
      return authClient.resetPassword({ token, newPassword })
    },

    validatePasswordStrength(password: string): boolean {
      // Implementation
      return password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[!@#$%^&*]/.test(password)
    }
  }
}
```

**Step 2: Export from Helpers Index**

```typescript
// File: src/helpers/index.ts

export * from './auth.helper'
export * from './collection.helper'
export * from './cleanup.helper'
export * from './file-generator'
export * from './password.helper' // Add new helper
```

**Step 3: Use in Tests**

```typescript
import { createPasswordHelper } from '@/helpers'

const passwordHelper = createPasswordHelper()

it('should validate password strength', () => {
  expect(passwordHelper.validatePasswordStrength('Weak1!')).toBe(false)
  expect(passwordHelper.validatePasswordStrength('Strong1Pass!')).toBe(true)
})
```

### Adding New Client Methods

**Step 1: Add Method to Appropriate Client**

```typescript
// File: src/client/auth-client.ts

export interface AuthClient {
  // ... existing methods
  requestPasswordReset: (data: { email: string }) => Promise<ApiResponse<{ message: string }>>
  resetPassword: (data: { token: string; newPassword: string }) => Promise<ApiResponse<void>>
}

export function createAuthClient(): AuthClient {
  const client = createApiClient()

  return {
    // ... existing methods

    async requestPasswordReset(data: { email: string }) {
      return client.request<{ message: string }>(
        API_ENDPOINTS.AUTH_PASSWORD_RESET_REQUEST,
        {
          method: 'POST',
          body: data,
        }
      )
    },

    async resetPassword(data: { token: string; newPassword: string }) {
      return client.request<void>(
        API_ENDPOINTS.AUTH_PASSWORD_RESET,
        {
          method: 'POST',
          body: data,
        }
      )
    }
  }
}
```

**Step 2: Add API Endpoints**

```typescript
// File: src/config/constants.ts

export const API_ENDPOINTS = {
  // ... existing endpoints
  AUTH_PASSWORD_RESET_REQUEST: '/api/auth/password-reset/request',
  AUTH_PASSWORD_RESET: '/api/auth/password-reset',
} as const
```

**Step 3: Add Types**

```typescript
// File: src/types/auth.types.ts

export interface PasswordResetRequest {
  email: string
}

export interface PasswordResetData {
  token: string
  newPassword: string
}

export interface PasswordResetResponse {
  message: string
}
```

### Adding New Test Categories

**Step 1: Create Directory Structure**

```bash
mkdir -p src/tests/new-category
```

**Step 2: Create Test Files**

```bash
touch src/tests/new-category/feature-1.test.ts
touch src/tests/new-category/feature-2.test.ts
```

**Step 3: Add npm Script**

```json
{
  "scripts": {
    "test:new-category": "vitest run src/tests/new-category"
  }
}
```

**Step 4: Update CI/CD Workflow**

```yaml
# File: .github/workflows/test.yml

strategy:
  matrix:
    test-group:
      - auth
      - collections
      - query
      - storage
      - api
      - integration
      - new-category  # Add new category
```

**Step 5: Update Documentation**

- Update README.md with new category
- Update TESTING_GUIDE.md with examples
- Update this MAINTENANCE.md guide

## Troubleshooting Common Issues

### Test Failures

**Issue: Connection Refused**

```
Error: ECONNREFUSED localhost:8090
```

**Solution:**
```bash
# Check if SwiftBase is running
curl http://localhost:8090/api/health

# Start SwiftBase if not running
./swiftbase serve

# Check environment variables
cat .env
echo $SWIFTBASE_URL
```

**Issue: Authentication Failures**

```
Error: UNAUTHORIZED - Invalid credentials
```

**Solution:**
```bash
# Verify admin credentials
echo "Username: $TEST_ADMIN_USERNAME"
echo "Password: $TEST_ADMIN_PASSWORD"

# Try logging in manually
curl -X POST http://localhost:8090/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_ADMIN_USERNAME\",\"password\":\"$TEST_ADMIN_PASSWORD\"}"

# Reset admin password in SwiftBase if needed
```

**Issue: Resource Already Exists**

```
Error: CONFLICT - Collection already exists
```

**Solution:**
```typescript
// Ensure using unique identifiers
const collectionName = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Or check if resource exists and delete first
const existing = await adminClient.getCollection(collectionName)
if (existing.success) {
  await adminClient.deleteCollection(collectionName)
}
```

**Issue: Tests Timing Out**

```
Error: Test timeout of 30000ms exceeded
```

**Solution:**
```typescript
// Increase timeout for slow tests
it('should handle large operation', async () => {
  // test code
}, 60000) // 60 seconds

// Or optimize the test
// - Use smaller test data
// - Mock slow operations
// - Split into multiple smaller tests
```

### Flaky Tests

**Identifying Flaky Tests:**

```bash
# Run tests multiple times
./scripts/run-flaky-test-detection.sh

# Or manually
for i in {1..20}; do
  pnpm test src/tests/auth/user-login.test.ts || echo "Failed on run $i"
done
```

**Common Causes:**

1. **Race Conditions**
   ```typescript
   // Bad - race condition
   it('should handle concurrent requests', async () => {
     const promises = [request1(), request2()]
     const [result1, result2] = await Promise.all(promises)
     expect(result1.data.id).toBe(1) // May not be deterministic
   })

   // Good - don't assume order
   it('should handle concurrent requests', async () => {
     const promises = [request1(), request2()]
     const results = await Promise.all(promises)
     expect(results).toHaveLength(2)
     results.forEach(result => assertSuccessResponse(result))
   })
   ```

2. **Timing Issues**
   ```typescript
   // Bad - assumes operation completes instantly
   await asyncOperation()
   expect(state).toBe('completed') // May still be 'processing'

   // Good - wait for condition
   await asyncOperation()
   await waitForCondition(() => state === 'completed', 5000)
   expect(state).toBe('completed')
   ```

3. **Shared Resources**
   ```typescript
   // Bad - shared resource
   const sharedCollection = 'test_collection'

   it('test 1', async () => {
     await adminClient.createCollection({ name: sharedCollection })
   })

   it('test 2', async () => {
     await adminClient.deleteCollection(sharedCollection) // May fail if test 1 didn't run
   })

   // Good - unique resources
   it('test 1', async () => {
     const collection = `test_${Date.now()}_1`
     await adminClient.createCollection({ name: collection })
   })

   it('test 2', async () => {
     const collection = `test_${Date.now()}_2`
     await adminClient.deleteCollection(collection)
   })
   ```

### Performance Issues

**Slow Test Suite**

```bash
# Identify slow tests
pnpm test --reporter=verbose 2>&1 | grep -E "SLOW|[0-9]{4,}ms"

# Run tests in parallel (if not already)
pnpm test --reporter=default --threads=true

# Disable parallel execution for debugging
pnpm test --reporter=verbose --threads=false
```

**Optimizations:**

1. **Use Test Fixtures**
   ```typescript
   // Create shared fixture for read-only data
   let sharedCollectionName: string

   beforeAll(async () => {
     sharedCollectionName = `fixture_${Date.now()}`
     await adminClient.createCollection({ name: sharedCollectionName })
     // Seed with test data
     await queryClient.create(sharedCollectionName, testDocuments)
   })

   // Tests can read from shared collection
   it('test 1', async () => {
     const response = await queryClient.find(sharedCollectionName, {})
     assertSuccessResponse(response)
   })
   ```

2. **Reduce Test Data Size**
   ```typescript
   // Bad - unnecessary large data
   const documents = Array.from({ length: 10000 }, (_, i) => ({ index: i }))

   // Good - minimal data
   const documents = Array.from({ length: 10 }, (_, i) => ({ index: i }))
   ```

3. **Mock External Services**
   ```typescript
   // Mock slow external API calls in integration tests
   vi.mock('@/external/slow-api', () => ({
     slowApiCall: vi.fn().mockResolvedValue({ success: true })
   }))
   ```

## Performance Optimization

### Profiling Tests

```bash
# Run with Node.js profiler
node --prof node_modules/.bin/vitest run

# Analyze profile
node --prof-process isolate-*.log > profile.txt

# Look for hot functions
cat profile.txt | head -100
```

### Optimizing Cleanup

```typescript
// Batch cleanup operations
afterAll(async () => {
  // Bad - sequential cleanup
  for (const collection of collections) {
    await adminClient.deleteCollection(collection)
  }

  // Good - parallel cleanup
  await Promise.all(
    collections.map(collection => adminClient.deleteCollection(collection))
  )
})
```

### Caching Authentication Tokens

```typescript
// Cache admin token for test suite
let cachedAdminToken: string | null = null

export async function getAdminToken(): Promise<string> {
  if (cachedAdminToken) {
    // Check if still valid
    const valid = await verifyToken(cachedAdminToken)
    if (valid) return cachedAdminToken
  }

  // Get new token
  const response = await authClient.loginUser({
    email: process.env.TEST_ADMIN_USERNAME!,
    password: process.env.TEST_ADMIN_PASSWORD!,
  })

  cachedAdminToken = response.data!.accessToken
  return cachedAdminToken
}
```

## Updating Dependencies

### Safe Update Process

**Step 1: Check for Updates**
```bash
pnpm outdated
```

**Step 2: Update Non-Breaking**
```bash
# Update patch and minor versions
pnpm update

# Test everything
pnpm test
```

**Step 3: Update Major Versions**
```bash
# Update one at a time
pnpm add -D vitest@latest

# Test thoroughly
pnpm test

# Check for breaking changes in changelog
```

**Step 4: Update Lock File**
```bash
pnpm install
```

**Step 5: Commit Changes**
```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: update dependencies"
```

### Dependency Change Checklist

When updating major versions:

- [ ] Review CHANGELOG for breaking changes
- [ ] Update TypeScript types if needed
- [ ] Run full test suite
- [ ] Check for deprecated APIs
- [ ] Update documentation
- [ ] Test CI/CD pipeline

## Monitoring and Reporting

### Test Metrics to Track

1. **Total Test Count**
   ```bash
   pnpm test --reporter=json | jq '.numTotalTests'
   ```

2. **Test Duration**
   ```bash
   pnpm test --reporter=json | jq '.testResults[].duration' | awk '{sum+=$1} END {print sum/1000 "s"}'
   ```

3. **Pass Rate**
   ```bash
   pnpm test --reporter=json | jq '.success'
   ```

4. **Coverage**
   ```bash
   pnpm test:coverage --reporter=json | jq '.coverage.summary.lines.pct'
   ```

### Setting Up Alerts

**GitHub Actions Notifications:**

```yaml
# Add to .github/workflows/test.yml

- name: Notify on Failure
  if: failure()
  uses: actions/github-script@v6
  with:
    script: |
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: '❌ E2E tests failed. Please review the test results.'
      })
```

### Generating Reports

```bash
# HTML report
pnpm test --reporter=html

# JSON report
pnpm test --reporter=json --outputFile=test-results.json

# Custom report
pnpm test --reporter=json | jq '{
  total: .numTotalTests,
  passed: .numPassedTests,
  failed: .numFailedTests,
  duration: (.testResults[].duration | add)
}'
```

## Best Practices for Long-Term Maintenance

### 1. Keep Tests Up to Date

- Update tests when API changes
- Remove obsolete tests
- Add tests for new features immediately

### 2. Maintain Test Hygiene

- Remove commented-out code
- Fix linter warnings
- Keep formatting consistent
- Update outdated comments

### 3. Document Changes

- Update CHANGELOG.md for test suite changes
- Document breaking changes
- Keep README current

### 4. Regular Reviews

- Code review for new tests
- Quarterly test suite review
- Identify opportunities for improvement

### 5. Continuous Improvement

- Refactor duplicate code
- Extract new helpers as patterns emerge
- Optimize slow tests
- Improve error messages

## Quick Reference Commands

```bash
# Run all tests
pnpm test

# Run specific category
pnpm test:auth
pnpm test:collections
pnpm test:query
pnpm test:storage
pnpm test:api
pnpm test src/tests/integration

# Run with coverage
pnpm test:coverage

# Run with UI
pnpm test:ui

# Run in watch mode
pnpm test:watch

# Run specific file
pnpm test src/tests/auth/user-login.test.ts

# Run tests matching pattern
pnpm test -t "should register"

# Update dependencies
pnpm outdated
pnpm update
pnpm update --latest

# Type check
pnpm typecheck

# Lint
pnpm lint
```

---

**Related Documentation:**
- [Testing Guide](./TESTING_GUIDE.md)
- [Best Practices Guide](./BEST_PRACTICES.md)
- [API Documentation](../API.md)
- [Contributing Guide](../CONTRIBUTING.md)
