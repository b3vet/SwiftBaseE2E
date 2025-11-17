# SwiftBase API Documentation

## Table of Contents

1. [Overview](#overview)
2. [API Versioning](#api-versioning)
3. [Authentication](#authentication)
4. [Request/Response Format](#requestresponse-format)
5. [Error Handling](#error-handling)
6. [Endpoints](#endpoints)
7. [Query DSL](#query-dsl)
8. [Rate Limiting](#rate-limiting)
9. [CORS](#cors)

---

## Overview

SwiftBase provides a RESTful API with a single unified query endpoint (`/api/query`) that supports MongoDB-style queries for all CRUD operations. The API follows consistent patterns and returns standardized JSON responses.

**Base URL:** `http://localhost:8090`

**API Version:** `v1.0`

**Content-Type:** `application/json`

---

## API Versioning

SwiftBase uses **header-based versioning** for API version management. All API endpoints include version information in response headers.

### Versioning Strategy

**Primary Method: Header-Based Versioning**

All requests can include an `API-Version` header to specify the desired API version:

```http
GET /api/query
API-Version: 1.0
```

**Current Approach:**
- Routes are registered at standard paths (`/health`, `/api/query`, etc.)
- No version prefix in URLs (e.g., `/api/query`, NOT `/api/v1/query`)
- Version validation via `API-Version` header
- All responses include version information in headers

### Version in Header

```http
API-Version: 1.0
```

**Example:**
```bash
curl http://localhost:8090/health -H "API-Version: 1.0"
```

### Supported Versions

- **1.0** (current)

### Version Response Headers

All responses include version information:

```http
API-Version: 1.0
API-Supported-Versions: 1.0
```

### Unsupported Version Handling

Requests with unsupported API versions will receive a 400 Bad Request error:

```bash
curl http://localhost:8090/health -H "API-Version: 2.0"
```

Response:
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "API version '2.0' is not supported. Supported versions: 1.0"
  }
}
```

### Migration Path

When new API versions are released:
1. New version added to supported versions list
2. Clients can specify version via header
3. Backward compatibility maintained for existing versions
4. Deprecated versions announced with sunset timeline

---

## Authentication

SwiftBase uses JWT (JSON Web Token) based authentication with access and refresh tokens.

### Token Types

1. **Access Token**: Short-lived (15 minutes), used for API requests
2. **Refresh Token**: Long-lived (7 days), used to obtain new access tokens

### Authentication Header

```http
Authorization: Bearer <access_token>
```

### Endpoints

#### User Registration

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "metadata": {
    "name": "John Doe"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "a1b2c3d4e5f6",
      "email": "user@example.com",
      "emailVerified": false
    },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

#### User Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

#### Refresh Access Token

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJ..."
}
```

#### Logout

```http
POST /api/auth/logout
Authorization: Bearer <access_token>
```

#### Get Current User

```http
GET /api/auth/me
Authorization: Bearer <access_token>
```

### Admin Authentication

Admin authentication is separate from user authentication and uses the same token mechanism.

```http
POST /api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "AdminPassword123!"
}
```

---

## Request/Response Format

### Standardized Response Structure

All API responses follow this format:

```typescript
{
  "success": boolean,
  "data": any | null,
  "error": {
    "code": string,
    "message": string,
    "metadata": object | null,
    "timestamp": string
  } | null,
  "metadata": {
    "timestamp": string,
    "requestId": string | null,
    "duration": number | null,
    "version": string,
    "pagination": {
      "total": number | null,
      "count": number,
      "limit": number | null,
      "offset": number | null,
      "hasMore": boolean | null
    } | null
  } | null
}
```

### Success Response Example

```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4",
    "name": "Product A",
    "price": 99.99
  },
  "metadata": {
    "timestamp": "2024-11-17T10:00:00Z",
    "requestId": "req_12345",
    "duration": 45.2,
    "version": "1.0"
  }
}
```

### Error Response Example

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "metadata": {
      "field": "email",
      "reason": "Invalid email format"
    },
    "timestamp": "2024-11-17T10:00:00Z"
  }
}
```

---

## Error Handling

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `BAD_REQUEST` | 400 | Invalid request format or parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate) |
| `VALIDATION_ERROR` | 422 | Request validation failed |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |
| `DATABASE_ERROR` | 500 | Database operation failed |

### Common Error Scenarios

#### Missing Authentication

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing Authorization header",
    "timestamp": "2024-11-17T10:00:00Z"
  }
}
```

#### Invalid Token

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid token",
    "timestamp": "2024-11-17T10:00:00Z"
  }
}
```

#### Validation Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed: email is required",
    "timestamp": "2024-11-17T10:00:00Z"
  }
}
```

---

## Endpoints

### Health Check

Check system health and status.

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-11-17T10:00:00Z",
  "version": "0.1.0"
}
```

### Database Health

Check database connectivity and status.

```http
GET /health/db
```

**Response:**
```json
{
  "status": "healthy",
  "database": {
    "connected": true,
    "tables": 7,
    "size": "1.2 MB"
  }
}
```

### API Info

Get API information and capabilities.

```http
GET /api
```

**Response:**
```json
{
  "name": "SwiftBase API",
  "version": "0.1.0",
  "description": "Single-binary backend platform"
}
```

---

## Query DSL

The main query endpoint accepts MongoDB-style queries for all operations.

### Main Query Endpoint

```http
POST /api/query
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Query Request Format

```typescript
{
  "action": "find" | "findOne" | "create" | "update" | "delete" | "count" | "aggregate" | "custom",
  "collection": string,
  "query": {
    "where": object,
    "select": string[] | object,
    "orderBy": object,
    "limit": number,
    "offset": number,
    "include": string[]
  },
  "data": object,
  "options": {
    "upsert": boolean,
    "multi": boolean,
    "validate": boolean,
    "returnNew": boolean
  },
  "custom": string,
  "params": object
}
```

### Supported Operators

#### Comparison Operators

- `$eq` - Equals
- `$ne` - Not equals
- `$gt` - Greater than
- `$gte` - Greater than or equal
- `$lt` - Less than
- `$lte` - Less than or equal
- `$in` - In array
- `$nin` - Not in array

#### Logical Operators

- `$and` - Logical AND
- `$or` - Logical OR
- `$not` - Logical NOT

#### Element Operators

- `$exists` - Field exists
- `$type` - Field type check

#### Array Operators

- `$all` - All elements match
- `$elemMatch` - Element match
- `$size` - Array size

#### Update Operators

- `$set` - Set field value
- `$unset` - Remove field
- `$inc` - Increment value
- `$push` - Push to array
- `$pull` - Pull from array
- `$addToSet` - Add to set (unique)

### Query Examples

#### Find Documents

```json
{
  "action": "find",
  "collection": "products",
  "query": {
    "where": {
      "price": { "$gte": 50, "$lte": 200 },
      "category": "electronics",
      "active": true
    },
    "orderBy": { "created_at": "desc" },
    "limit": 20,
    "offset": 0
  }
}
```

#### Find One Document

```json
{
  "action": "findOne",
  "collection": "products",
  "query": {
    "where": { "_id": "product_123" }
  }
}
```

#### Create Document

```json
{
  "action": "create",
  "collection": "products",
  "data": {
    "name": "New Product",
    "price": 149.99,
    "category": "electronics",
    "active": true
  }
}
```

#### Update Documents

```json
{
  "action": "update",
  "collection": "products",
  "query": {
    "where": { "_id": "product_123" }
  },
  "data": {
    "$set": { "price": 199.99 },
    "$push": { "tags": "sale" }
  }
}
```

#### Delete Documents

```json
{
  "action": "delete",
  "collection": "products",
  "query": {
    "where": { "_id": "product_123" }
  }
}
```

#### Count Documents

```json
{
  "action": "count",
  "collection": "products",
  "query": {
    "where": { "active": true }
  }
}
```

---

## Collection Management

### List Collections

```http
GET /api/admin/collections
Authorization: Bearer <admin_access_token>
```

### Get Collection Info

```http
GET /api/admin/collections/:name
Authorization: Bearer <admin_access_token>
```

### Create Collection

```http
POST /api/admin/collections
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "name": "products",
  "schema": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "price": { "type": "number" }
    }
  }
}
```

### Update Collection

```http
PUT /api/admin/collections/:name
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "schema": {...}
}
```

### Delete Collection

```http
DELETE /api/admin/collections/:name
Authorization: Bearer <admin_access_token>
```

### Get Collection Statistics

```http
GET /api/admin/collections/:name/stats
Authorization: Bearer <admin_access_token>
```

---

## Bulk Operations

Execute multiple operations in a single request.

```http
POST /api/bulk
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "operations": [
    {
      "type": "create",
      "collection": "products",
      "data": {...}
    },
    {
      "type": "update",
      "collection": "products",
      "where": {...},
      "data": {...}
    },
    {
      "type": "delete",
      "collection": "products",
      "where": {...}
    }
  ]
}
```

---

## Rate Limiting

Rate limiting is applied per IP address and user.

**Current Limits:**
- Guest users: TBD
- Authenticated users: TBD
- Admin users: No limit

**Headers:**
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1621234567
```

---

## CORS

SwiftBase supports CORS (Cross-Origin Resource Sharing) for browser-based applications.

### CORS Headers

**Allowed Origins:** `*` (configurable)

**Allowed Methods:** `GET, POST, PUT, PATCH, DELETE, OPTIONS`

**Allowed Headers:** `Content-Type, Authorization, X-Requested-With`

**Exposed Headers:** `Content-Type, Authorization`

**Allow Credentials:** `true`

**Max Age:** `86400` (24 hours)

### Preflight Request Example

```http
OPTIONS /api/query
Origin: https://example.com
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Content-Type, Authorization
```

**Response:**
```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
Access-Control-Max-Age: 86400
Access-Control-Allow-Credentials: true
```

---

## Request Validation

All requests are validated for:

1. **Request Size:** Maximum 10MB
2. **Content-Type:** Must be `application/json` for POST/PUT/PATCH
3. **Accept Header:** Must accept `application/json`
4. **HTTP Method:** Only allowed methods are accepted

### Validation Errors

```json
{
  "success": false,
  "error": {
    "code": "CONTENT_TOO_LARGE",
    "message": "Request body too large. Maximum size is 10485760 bytes",
    "timestamp": "2024-11-17T10:00:00Z"
  }
}
```

---

## Best Practices

1. **Always use HTTPS in production**
2. **Store access tokens securely** (e.g., httpOnly cookies)
3. **Implement token refresh** before access token expires
4. **Use appropriate error handling** for all API calls
5. **Implement retry logic** with exponential backoff
6. **Cache responses** where appropriate
7. **Use pagination** for large result sets
8. **Validate input** on client side before sending
9. **Monitor rate limits** to avoid throttling
10. **Log all errors** for debugging

---

## Code Examples

### JavaScript/TypeScript

```typescript
// Login
const loginResponse = await fetch('http://localhost:8090/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const { data } = await loginResponse.json();
const accessToken = data.accessToken;

// Query
const queryResponse = await fetch('http://localhost:8090/api/query', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    action: 'find',
    collection: 'products',
    query: {
      where: { active: true },
      limit: 10
    }
  })
});

const products = await queryResponse.json();
```

### Python

```python
import requests

# Login
login_response = requests.post('http://localhost:8090/api/auth/login', json={
    'email': 'user@example.com',
    'password': 'password123'
})

access_token = login_response.json()['data']['accessToken']

# Query
query_response = requests.post('http://localhost:8090/api/query',
    headers={'Authorization': f'Bearer {access_token}'},
    json={
        'action': 'find',
        'collection': 'products',
        'query': {
            'where': {'active': True},
            'limit': 10
        }
    }
)

products = query_response.json()
```

### cURL

```bash
# Login
curl -X POST http://localhost:8090/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Query
curl -X POST http://localhost:8090/api/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "action": "find",
    "collection": "products",
    "query": {
      "where": {"active": true},
      "limit": 10
    }
  }'
```

---

## Support

For issues, questions, or feature requests, please visit:
- GitHub: https://github.com/yourusername/swiftbase
- Documentation: https://swiftbase.dev/docs

---

**Last Updated:** November 17, 2024
**API Version:** 1.0
**Document Version:** 1.0
