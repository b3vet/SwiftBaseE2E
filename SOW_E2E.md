# SwiftBase E2E Test Suite - Statement of Work & Implementation Plan

## Executive Summary

This document outlines the comprehensive End-to-End (E2E) testing strategy and implementation plan for SwiftBase. The test suite will be built as a standalone Node.js project using Vitest as the testing framework and pnpm as the package manager. The tests will validate all SwiftBase functionality through HTTP API requests, ensuring system reliability and correctness across all implemented features.

**Project Name:** swiftbase-e2e-tests
**Test Framework:** Vitest 2.x
**Package Manager:** pnpm
**Language:** TypeScript
**Target System:** SwiftBase v1.0
**Estimated Duration:** 10-12 days

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technical Requirements](#technical-requirements)
3. [Test Architecture](#test-architecture)
4. [Test Coverage Scope](#test-coverage-scope)
5. [Implementation Phases](#implementation-phases)
6. [Project Structure](#project-structure)
7. [Test Strategies](#test-strategies)
8. [Test Data Management](#test-data-management)
9. [Environment Configuration](#environment-configuration)
10. [Test Suites Breakdown](#test-suites-breakdown)
11. [Utilities & Helpers](#utilities--helpers)
12. [Success Metrics](#success-metrics)
13. [Future Plans](#future-plans)

---

## Project Overview

### Goals

1. **Comprehensive Coverage:** Test all SwiftBase API endpoints and functionality
2. **Regression Prevention:** Catch bugs before they reach production
3. **Documentation:** Serve as living documentation of API behavior
4. **Developer Confidence:** Enable safe refactoring and feature additions
5. **Quality Assurance:** Ensure API contracts are maintained

### Scope

**In Scope:**
- All REST API endpoints (authentication, collections, queries, storage, admin)
- MongoDB-style query DSL validation
- File upload/download operations
- Authentication and authorization flows
- Admin functionality and first-run setup
- Data validation and error responses
- API versioning behavior
- Edge cases and boundary conditions

**Out of Scope (Deferred to Future Plans):**
- WebSocket/Realtime functionality (Phase 8 not implemented)
- Admin UI testing
- Performance/load testing
- JWT token expiration scenarios
- Database failure simulations
- Network timeout testing
- Security penetration testing

---

## Technical Requirements

### Dependencies

```json
{
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@vitest/ui": "^2.0.0",
    "dotenv": "^16.3.1",
    "tsx": "^4.0.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vitest": "^2.0.0"
  },
  "dependencies": {
    "form-data": "^4.0.0",
    "node-fetch": "^3.3.2",
    "zod": "^3.22.0"
  }
}
```

### System Requirements

- Node.js 20.x or higher
- pnpm 8.x or higher
- Running SwiftBase instance (default: http://localhost:8090)
- 2GB RAM minimum for test execution
- Network access to SwiftBase instance

---

## Test Architecture

### Design Principles

1. **Isolation:** Each test suite is independent and can run in isolation
2. **Idempotency:** Tests can be run multiple times with same results
3. **Clarity:** Test names clearly describe what is being tested
4. **Maintainability:** DRY principles with shared utilities and helpers
5. **Speed:** Parallel test execution where possible
6. **Reliability:** No flaky tests, proper async handling

### Test Layers

```
┌─────────────────────────────────────┐
│         Test Suites Layer           │
├─────────────────────────────────────┤
│      Test Helpers & Utilities       │
├─────────────────────────────────────┤
│          API Client Layer           │
├─────────────────────────────────────┤
│     Request/Response Validators     │
├─────────────────────────────────────┤
│      Environment Configuration      │
└─────────────────────────────────────┘
```

---

## Test Coverage Scope

### Core Modules Coverage

| Module | Coverage Target | Priority | Test Count (Est.) |
|--------|----------------|----------|-------------------|
| Health & Status | 100% | High | 5-8 |
| User Authentication | 95% | Critical | 25-30 |
| Admin Authentication | 95% | Critical | 20-25 |
| Collections CRUD | 90% | High | 30-35 |
| Query Engine | 85% | High | 40-50 |
| File Storage | 90% | High | 25-30 |
| Bulk Operations | 85% | Medium | 15-20 |
| Custom Queries | 80% | Medium | 10-15 |
| API Versioning | 90% | High | 8-10 |
| Error Handling | 95% | Critical | 20-25 |

**Total Estimated Tests:** 200-250

### Test Categories

1. **Smoke Tests** - Basic functionality verification
2. **Happy Path Tests** - Standard user workflows
3. **Edge Case Tests** - Boundary conditions
4. **Negative Tests** - Error scenarios and validation
5. **Integration Tests** - Cross-module interactions
6. **Contract Tests** - API response structure validation

---

## Implementation Phases

### Phase 1: Project Setup & Infrastructure (Day 1-2)

- [ ] Initialize pnpm workspace
- [ ] Configure TypeScript and Vitest
- [ ] Set up project structure
- [ ] Create environment configuration system
- [ ] Implement base API client
- [ ] Set up test helpers and utilities
- [ ] Create request/response type definitions
- [ ] Implement response validators using Zod
- [ ] Configure test reporters
- [ ] Set up test data generators

### Phase 2: Authentication Testing (Day 3-4)

- [ ] User registration tests
  - [ ] Valid registration flow
  - [ ] Duplicate email handling
  - [ ] Password validation rules
  - [ ] Metadata handling
- [ ] User login tests
  - [ ] Valid credentials
  - [ ] Invalid credentials
  - [ ] Missing fields
- [ ] Token refresh tests
  - [ ] Valid refresh token
  - [ ] Invalid/expired refresh token
  - [ ] Token rotation
- [ ] Logout tests
- [ ] Get current user tests
- [ ] Admin authentication tests
  - [ ] Admin login
  - [ ] Admin token refresh
  - [ ] Admin logout
  - [ ] First-run setup wizard
- [ ] Authorization middleware tests
  - [ ] Protected routes access
  - [ ] Invalid token rejection
  - [ ] Missing token handling

### Phase 3: Collection Management Testing (Day 5-6)

- [ ] Collection CRUD operations
  - [ ] Create collection
  - [ ] List collections
  - [ ] Get collection details
  - [ ] Update collection metadata
  - [ ] Delete collection (cascade)
- [ ] Collection validation
  - [ ] Name format validation
  - [ ] Duplicate name handling
  - [ ] Schema validation (optional)
- [ ] Collection statistics
  - [ ] Document count
  - [ ] Size metrics
  - [ ] Index information
- [ ] Permissions testing
  - [ ] Admin-only operations
  - [ ] User access restrictions

### Phase 4: Query Engine Testing (Day 7-8)

- [ ] Basic CRUD via query endpoint
  - [ ] Create documents
  - [ ] Find documents
  - [ ] Update documents
  - [ ] Delete documents
- [ ] MongoDB operators testing
  - [ ] Comparison operators ($eq, $ne, $gt, $gte, $lt, $lte)
  - [ ] Logical operators ($and, $or, $not)
  - [ ] Array operators ($in, $nin, $all, $elemMatch)
  - [ ] Element operators ($exists, $type)
  - [ ] Regex operator ($regex)
- [ ] Query features
  - [ ] Sorting (single and multi-field)
  - [ ] Pagination (limit/offset)
  - [ ] Field selection
  - [ ] Relationship resolution (include)
- [ ] Update operators
  - [ ] $set, $unset
  - [ ] $inc
  - [ ] $push, $pull, $addToSet
- [ ] Bulk operations
  - [ ] Bulk create
  - [ ] Bulk update
  - [ ] Bulk delete
  - [ ] Mixed operations
- [ ] Custom queries
  - [ ] Register custom query (admin)
  - [ ] Execute custom query
  - [ ] Parameter binding
- [ ] Edge cases
  - [ ] Empty results
  - [ ] Large result sets
  - [ ] Complex nested queries
  - [ ] Invalid query syntax

### Phase 5: File Storage Testing (Day 9)

- [ ] File upload tests
  - [ ] Single file upload
  - [ ] File size validation (100MB limit)
  - [ ] MIME type detection
  - [ ] Metadata attachment
  - [ ] Generated test files (various sizes)
- [ ] File retrieval tests
  - [ ] Download file
  - [ ] Get file metadata
  - [ ] Range requests (partial download)
  - [ ] File not found handling
- [ ] File management tests
  - [ ] List user files
  - [ ] Search files by name
  - [ ] Delete file
  - [ ] Storage statistics
- [ ] Access control tests
  - [ ] User can only access own files
  - [ ] Admin can access all files
  - [ ] Unauthorized access rejection
- [ ] Edge cases
  - [ ] Maximum file size (100MB)
  - [ ] Unsupported file types
  - [ ] Concurrent uploads
  - [ ] Storage cleanup

### Phase 6: API Gateway & Versioning Testing (Day 10)

- [ ] API versioning tests
  - [ ] Header-based version specification
  - [ ] Default version behavior
  - [ ] Unsupported version rejection
  - [ ] Version response headers
- [ ] CORS functionality
  - [ ] Preflight requests
  - [ ] Allowed origins
  - [ ] Allowed methods
  - [ ] Credentials handling
- [ ] Request validation
  - [ ] Content-type validation
  - [ ] Request size limits
  - [ ] Accept header validation
- [ ] Response format validation
  - [ ] Success response structure
  - [ ] Error response structure
  - [ ] Pagination metadata
  - [ ] Request ID tracking
- [ ] Error handling
  - [ ] 400 Bad Request scenarios
  - [ ] 401 Unauthorized scenarios
  - [ ] 403 Forbidden scenarios
  - [ ] 404 Not Found scenarios
  - [ ] 422 Validation Error scenarios
  - [ ] 500 Internal Server Error handling

### Phase 7: Integration & Workflow Testing (Day 11)

- [ ] Complete user workflows
  - [ ] User registration → login → create data → query → logout
  - [ ] File upload → list → download → delete flow
  - [ ] Collection creation → document CRUD → collection deletion
- [ ] Cross-module interactions
  - [ ] Auth + Collections
  - [ ] Auth + Storage
  - [ ] Collections + Query Engine
  - [ ] Admin operations workflow
- [ ] Data relationships
  - [ ] Document references
  - [ ] Cascading deletes
  - [ ] Orphaned data handling
- [ ] Admin workflows
  - [ ] First-run setup
  - [ ] User management
  - [ ] System administration

### Phase 8: Test Optimization & Documentation (Day 12)

- [ ] Test suite optimization
  - [ ] Parallel execution configuration
  - [ ] Test grouping and organization
  - [ ] Shared setup/teardown optimization
- [ ] Documentation
  - [ ] Test coverage report
  - [ ] README with run instructions
  - [ ] Environment setup guide
  - [ ] Troubleshooting guide
- [ ] CI/CD preparation (future)
  - [ ] Docker test environment setup
  - [ ] GitHub Actions workflow (commented)
  - [ ] Test result artifacts

---

## Project Structure

```
swiftbase-e2e-tests/
├── .env.example
├── .env.test
├── .gitignore
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vitest.config.ts
├── README.md
├── src/
│   ├── config/
│   │   ├── environment.ts
│   │   └── constants.ts
│   ├── client/
│   │   ├── api-client.ts
│   │   ├── auth-client.ts
│   │   ├── storage-client.ts
│   │   └── admin-client.ts
│   ├── types/
│   │   ├── api.types.ts
│   │   ├── auth.types.ts
│   │   ├── collection.types.ts
│   │   ├── query.types.ts
│   │   └── storage.types.ts
│   ├── validators/
│   │   ├── response.validator.ts
│   │   ├── error.validator.ts
│   │   └── schemas/
│   │       ├── auth.schema.ts
│   │       ├── collection.schema.ts
│   │       └── query.schema.ts
│   ├── helpers/
│   │   ├── test-data.ts
│   │   ├── file-generator.ts
│   │   ├── auth.helper.ts
│   │   ├── collection.helper.ts
│   │   └── cleanup.helper.ts
│   ├── fixtures/
│   │   ├── users.fixture.ts
│   │   ├── collections.fixture.ts
│   │   └── documents.fixture.ts
│   └── tests/
│       ├── setup/
│       │   ├── global-setup.ts
│       │   └── global-teardown.ts
│       ├── unit/
│       │   ├── health.test.ts
│       │   └── version.test.ts
│       ├── auth/
│       │   ├── user-registration.test.ts
│       │   ├── user-login.test.ts
│       │   ├── token-refresh.test.ts
│       │   ├── admin-auth.test.ts
│       │   └── first-run.test.ts
│       ├── collections/
│       │   ├── collection-crud.test.ts
│       │   ├── collection-stats.test.ts
│       │   └── collection-permissions.test.ts
│       ├── query/
│       │   ├── basic-queries.test.ts
│       │   ├── operator-queries.test.ts
│       │   ├── pagination.test.ts
│       │   ├── sorting.test.ts
│       │   ├── bulk-operations.test.ts
│       │   └── custom-queries.test.ts
│       ├── storage/
│       │   ├── file-upload.test.ts
│       │   ├── file-download.test.ts
│       │   ├── file-management.test.ts
│       │   └── file-permissions.test.ts
│       ├── integration/
│       │   ├── user-workflow.test.ts
│       │   ├── admin-workflow.test.ts
│       │   └── data-relationships.test.ts
│       └── api/
│           ├── versioning.test.ts
│           ├── cors.test.ts
│           └── error-handling.test.ts
```

---

## Test Strategies

### 1. Behavior-Driven Testing (BDD)

Tests will be organized around user behaviors and business requirements:

```typescript
describe('User Authentication Flow', () => {
  describe('when a new user registers', () => {
    it('should create an account with valid credentials', async () => {})
    it('should return access and refresh tokens', async () => {})
    it('should reject duplicate email addresses', async () => {})
  })
})
```

### 2. Data-Driven Testing

Use test data tables for comprehensive coverage:

```typescript
const queryOperatorTests = [
  { operator: '$eq', value: 100, expected: 1 },
  { operator: '$gt', value: 50, expected: 3 },
  { operator: '$in', value: [1, 2, 3], expected: 3 },
]

queryOperatorTests.forEach(({ operator, value, expected }) => {
  it(`should filter documents using ${operator} operator`, async () => {})
})
```

### 3. Edge Case Testing

Systematic testing of boundary conditions:

```typescript
describe('File Upload Limits', () => {
  it('should accept file at exactly 100MB', async () => {})
  it('should reject file at 100MB + 1 byte', async () => {})
  it('should handle 0-byte files gracefully', async () => {})
})
```

### 4. Contract Testing

Validate API response structures:

```typescript
import { z } from 'zod'

const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().nullable(),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }).nullable(),
  metadata: z.object({
    timestamp: z.string(),
    requestId: z.string().nullable(),
  }).nullable(),
})
```

---

## Test Data Management

### Setup & Teardown Strategy

```typescript
// Global setup (once per test run)
export async function globalSetup() {
  // 1. Check SwiftBase is running
  // 2. Run database migrations
  // 3. Create test admin account
}

// Per-suite setup
beforeAll(async () => {
  // Run seed data for suite
  await runSwiftBaseCommand('seed')
})

// Per-suite teardown
afterAll(async () => {
  // Clean up test data
  await cleanupTestData()
})

// Global teardown (once per test run)
export async function globalTeardown() {
  // Final cleanup if needed
}
```

### Test Data Generators

```typescript
// User generator
export function generateTestUser() {
  return {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    metadata: { name: 'Test User' }
  }
}

// Collection generator
export function generateCollection(name?: string) {
  return {
    name: name || `test_collection_${Date.now()}`,
    schema: {},
    options: {}
  }
}

// File generator
export function generateTestFile(size: number, type: string) {
  // Generate binary data of specified size
  return Buffer.alloc(size)
}
```

### Cleanup Strategy

```typescript
export class TestDataCleaner {
  private createdResources: Map<string, string[]> = new Map()

  track(type: string, id: string) {
    if (!this.createdResources.has(type)) {
      this.createdResources.set(type, [])
    }
    this.createdResources.get(type)!.push(id)
  }

  async cleanAll() {
    // Delete in reverse order of creation
    // Handle dependencies (e.g., documents before collections)
  }
}
```

---

## Environment Configuration

### Environment Variables

```bash
# .env.example
SWIFTBASE_URL=http://localhost:8090
SWIFTBASE_API_VERSION=1.0
TEST_ADMIN_USERNAME=test_admin
TEST_ADMIN_PASSWORD=TestAdmin123!
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=TestUser123!
TEST_TIMEOUT=30000
TEST_RETRY_COUNT=3
TEST_PARALLEL=true
DEBUG_MODE=false
```

### Configuration Module

```typescript
// src/config/environment.ts
import { z } from 'zod'
import dotenv from 'dotenv'

const EnvSchema = z.object({
  SWIFTBASE_URL: z.string().url().default('http://localhost:8090'),
  SWIFTBASE_API_VERSION: z.string().default('1.0'),
  TEST_ADMIN_USERNAME: z.string().default('test_admin'),
  TEST_ADMIN_PASSWORD: z.string().default('TestAdmin123!'),
  TEST_TIMEOUT: z.coerce.number().default(30000),
  TEST_PARALLEL: z.coerce.boolean().default(true),
  DEBUG_MODE: z.coerce.boolean().default(false),
})

export const config = EnvSchema.parse(process.env)
```

---

## Test Suites Breakdown

### Critical Path Tests (P0)

These tests must pass for the system to be considered functional:

1. **Health Check** - System is responding
2. **User Registration** - New users can sign up
3. **User Login** - Users can authenticate
4. **Create Collection** - Collections can be created
5. **Create Document** - Documents can be added
6. **Query Documents** - Documents can be retrieved
7. **Upload File** - Files can be uploaded
8. **Download File** - Files can be downloaded

### Important Tests (P1)

These tests ensure core functionality works correctly:

1. Token refresh flow
2. Admin authentication
3. Collection management (update, delete)
4. Query operators ($eq, $gt, $in, etc.)
5. Bulk operations
6. File deletion
7. Pagination and sorting
8. Error handling

### Nice-to-Have Tests (P2)

These tests cover edge cases and advanced scenarios:

1. Complex nested queries
2. Large file uploads (near 100MB limit)
3. Custom query registration
4. Concurrent operations
5. API versioning edge cases
6. Collection statistics

---

## Utilities & Helpers

### API Client Wrapper

```typescript
export class SwiftBaseClient {
  constructor(private baseUrl: string, private apiVersion: string) {}

  async request<T>(options: RequestOptions): Promise<ApiResponse<T>> {
    // Add common headers
    // Handle authentication
    // Parse response
    // Validate against schema
    // Handle errors
  }

  withAuth(token: string): AuthenticatedClient {
    // Return client with auth headers
  }
}
```

### Test Assertion Helpers

```typescript
export const assertions = {
  expectSuccess<T>(response: ApiResponse<T>) {
    expect(response.success).toBe(true)
    expect(response.error).toBeNull()
    return response.data
  },

  expectError(response: ApiResponse<any>, code: string) {
    expect(response.success).toBe(false)
    expect(response.error?.code).toBe(code)
  },

  expectPagination(metadata: any, expected: PaginationExpectation) {
    expect(metadata.pagination).toMatchObject(expected)
  }
}
```

### Wait Utilities

```typescript
export async function waitForCondition(
  condition: () => Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const endTime = Date.now() + timeout
  while (Date.now() < endTime) {
    if (await condition()) return
    await sleep(interval)
  }
  throw new Error('Condition not met within timeout')
}
```

---

## Success Metrics

### Test Coverage Goals

| Metric | Target | Minimum Acceptable |
|--------|--------|-------------------|
| Overall Test Coverage | 90% | 80% |
| Critical Path Coverage | 100% | 100% |
| Error Scenario Coverage | 85% | 75% |
| Edge Case Coverage | 80% | 70% |

### Quality Indicators

1. **Zero Flaky Tests** - All tests consistently pass/fail
2. **Fast Execution** - Full suite runs in < 5 minutes
3. **Clear Failures** - Failed tests provide actionable error messages
4. **Maintainability** - New tests can be added easily
5. **Documentation** - Each test clearly describes its purpose

### Test Execution Metrics

- **Total Tests:** 200-250
- **Execution Time:** < 5 minutes (parallel)
- **Setup Time:** < 30 seconds
- **Teardown Time:** < 30 seconds
- **Memory Usage:** < 512MB

---

## Future Plans

### Phase 1: Enhanced Testing Capabilities

1. **JWT Token Testing**
   - Token expiration scenarios (15-minute access token)
   - Token manipulation and security testing
   - Invalid signature detection
   - Token refresh edge cases

2. **WebSocket/Realtime Testing**
   - Connection establishment
   - Subscription management
   - Event broadcasting
   - Heartbeat mechanism
   - Reconnection handling

3. **Error Simulation**
   - Database failure scenarios
   - Network timeout testing
   - Connection drop handling
   - Race condition testing

### Phase 2: Performance Testing Module

Create a separate workspace module for performance testing:

```
swiftbase-perf-tests/
├── load-testing/     # k6 or artillery scripts
├── stress-testing/   # Breaking point tests
├── endurance-tests/  # Long-running tests
└── benchmarks/       # Performance baselines
```

Features:
- Response time measurement
- Throughput testing
- Concurrent user simulation
- Resource utilization monitoring
- Performance regression detection

### Phase 3: Security Testing

1. **Input Validation**
   - SQL injection attempts
   - NoSQL injection tests
   - XSS payload testing
   - Path traversal attempts

2. **Authentication Security**
   - Brute force protection
   - Session hijacking tests
   - Token security validation

3. **Authorization Testing**
   - Privilege escalation attempts
   - Cross-user data access
   - Admin bypass attempts

### Phase 4: CI/CD Integration

1. **GitHub Actions Workflow**
   - Automated test execution on PR
   - Nightly test runs
   - Performance benchmarking
   - Test result reporting

2. **Docker Integration**
   - Containerized test environment
   - Multi-version testing
   - Isolated test execution

3. **Test Result Analytics**
   - Historical test performance
   - Flakiness detection
   - Coverage trends
   - Failure pattern analysis

### Phase 5: Advanced Test Features

1. **Multi-Version Testing**
   - Test suite versioning strategy
   - Backward compatibility testing
   - API migration testing
   - Version-specific test suites

2. **Contract Testing**
   - OpenAPI spec validation
   - Consumer-driven contracts
   - Schema evolution testing

3. **Chaos Engineering**
   - Random failure injection
   - Resource constraint testing
   - Network partition simulation

4. **Visual Testing**
   - API response diff visualization
   - Test result dashboards
   - Coverage heat maps

### Phase 6: Test Infrastructure

1. **Test Data Management**
   - Synthetic data generation
   - Data anonymization
   - Test data versioning
   - Snapshot/restore capabilities

2. **Test Environment Management**
   - Multiple environment support
   - Environment provisioning
   - Configuration management
   - Secret management

3. **Monitoring & Observability**
   - Test execution monitoring
   - Real-time test status
   - Alert on test failures
   - Performance metrics tracking

---

## Implementation Timeline

| Week | Phase | Deliverables |
|------|-------|------------|
| Week 1 | Setup & Core Tests | Project structure, auth tests, basic queries |
| Week 2 | Feature Testing | Collections, query engine, storage tests |
| Week 3 | Integration & Polish | Workflows, documentation, optimization |

### Daily Breakdown

**Day 1-2:** Project setup, infrastructure, base clients
**Day 3-4:** Authentication testing (user & admin)
**Day 5-6:** Collection management testing
**Day 7-8:** Query engine and operators
**Day 9:** File storage testing
**Day 10:** API gateway and versioning
**Day 11:** Integration and workflow tests
**Day 12:** Optimization and documentation

---

## Risk Mitigation

| Risk | Impact | Mitigation Strategy |
|------|--------|-------------------|
| SwiftBase API changes | High | Version-specific tests, API contracts |
| Test flakiness | Medium | Retry logic, proper async handling |
| Long test execution | Medium | Parallel execution, test optimization |
| Environment issues | Low | Docker containers, environment validation |
| Data conflicts | Low | Isolated test data, proper cleanup |

---

## Appendix

### A. Command Reference

```bash
# Install dependencies
pnpm install

# Run all tests
pnpm test

# Run specific suite
pnpm test:auth
pnpm test:collections
pnpm test:storage

# Run with coverage
pnpm test:coverage

# Run in watch mode
pnpm test:watch

# Run specific test file
pnpm test src/tests/auth/user-login.test.ts

# Debug mode
DEBUG_MODE=true pnpm test
```

### B. Environment Setup

```bash
# 1. Clone repository
git clone <repo-url>
cd swiftbase-e2e-tests

# 2. Install dependencies
pnpm install

# 3. Copy environment file
cp .env.example .env.test

# 4. Start SwiftBase
cd ../swiftbase
./swiftbase serve

# 5. Run tests
cd ../swiftbase-e2e-tests
pnpm test
```

### C. Troubleshooting Guide

**Issue:** Tests fail with connection refused
**Solution:** Ensure SwiftBase is running on configured port

**Issue:** Authentication tests fail
**Solution:** Check admin credentials in .env file

**Issue:** File upload tests fail
**Solution:** Verify storage directory permissions

**Issue:** Cleanup fails between tests
**Solution:** Manually reset database with migrate command

---

## Conclusion

This comprehensive E2E test suite will provide robust validation of SwiftBase functionality, ensuring system reliability and enabling confident development. The phased approach allows for incremental implementation while maintaining focus on critical functionality first. The architecture supports future expansion into performance, security, and advanced testing scenarios as the project evolves.

The test suite will serve as both quality assurance tool and living documentation, providing clear examples of API usage and expected behavior. With proper implementation, this testing framework will significantly reduce regression risks and improve overall system quality.

---

*Last Updated: November 2024*
*Version: 1.0.0*
*Status: Ready for Implementation*