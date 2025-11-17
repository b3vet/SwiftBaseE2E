/**
 * API endpoint constants
 */
export const API_ENDPOINTS = {
  // Health & Status
  HEALTH: '/health',
  HEALTH_DB: '/health/db',
  API_INFO: '/api',

  // User Authentication
  AUTH_REGISTER: '/api/auth/register',
  AUTH_LOGIN: '/api/auth/login',
  AUTH_REFRESH: '/api/auth/refresh',
  AUTH_LOGOUT: '/api/auth/logout',
  AUTH_ME: '/api/auth/me',

  // Admin Authentication
  ADMIN_LOGIN: '/api/admin/login',
  ADMIN_REFRESH: '/api/admin/refresh',
  ADMIN_LOGOUT: '/api/admin/logout',
  ADMIN_ME: '/api/admin/me',

  // Query Engine
  QUERY: '/api/query',

  // Collection Management
  ADMIN_COLLECTIONS: '/api/admin/collections',
  ADMIN_COLLECTION: (name: string) => `/api/admin/collections/${name}`,
  ADMIN_COLLECTION_STATS: (name: string) => `/api/admin/collections/${name}/stats`,

  // Bulk Operations
  BULK: '/api/bulk',

  // File Storage
  STORAGE_UPLOAD: '/api/storage/upload',
  STORAGE_FILES: '/api/storage/files',
  STORAGE_FILE: (fileId: string) => `/api/storage/files/${fileId}`,
  STORAGE_FILE_METADATA: (fileId: string) => `/api/storage/files/${fileId}/metadata`,
  STORAGE_SEARCH: '/api/storage/search',
  STORAGE_STATS: '/api/storage/stats',
} as const

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  PARTIAL_CONTENT: 206,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  CONTENT_TOO_LARGE: 413,
  INTERNAL_SERVER_ERROR: 500,
} as const

/**
 * Error codes
 */
export const ERROR_CODES = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONTENT_TOO_LARGE: 'CONTENT_TOO_LARGE',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const

/**
 * MongoDB query operators
 */
export const QUERY_OPERATORS = {
  // Comparison
  EQ: '$eq',
  NE: '$ne',
  GT: '$gt',
  GTE: '$gte',
  LT: '$lt',
  LTE: '$lte',
  IN: '$in',
  NIN: '$nin',

  // Logical
  AND: '$and',
  OR: '$or',
  NOT: '$not',

  // Element
  EXISTS: '$exists',
  TYPE: '$type',

  // Array
  ALL: '$all',
  ELEM_MATCH: '$elemMatch',
  SIZE: '$size',

  // Evaluation
  REGEX: '$regex',
  MOD: '$mod',

  // Update
  SET: '$set',
  UNSET: '$unset',
  INC: '$inc',
  PUSH: '$push',
  PULL: '$pull',
  ADD_TO_SET: '$addToSet',
} as const

/**
 * Query actions
 */
export const QUERY_ACTIONS = {
  FIND: 'find',
  FIND_ONE: 'findOne',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  COUNT: 'count',
  AGGREGATE: 'aggregate',
  CUSTOM: 'custom',
} as const

/**
 * Collection names (system collections)
 */
export const SYSTEM_COLLECTIONS = {
  USERS: '_users',
  ADMINS: '_admins',
  COLLECTIONS: '_collections',
  DOCUMENTS: '_documents',
  FILES: '_files',
  CUSTOM_QUERIES: '_custom_queries',
  AUDIT_LOG: '_audit_log',
} as const

/**
 * Test data defaults
 */
export const TEST_DEFAULTS = {
  COLLECTION_NAME_PREFIX: 'test_collection_',
  USER_EMAIL_DOMAIN: 'test.example.com',
  PASSWORD: 'TestPassword123!',
  MAX_FILE_SIZE: 104857600, // 100MB
  DEFAULT_PAGE_LIMIT: 20,
  DEFAULT_TIMEOUT: 30000,
} as const

/**
 * File types and MIME types
 */
export const FILE_TYPES = {
  JSON: { ext: '.json', mime: 'application/json' },
  TEXT: { ext: '.txt', mime: 'text/plain' },
  PDF: { ext: '.pdf', mime: 'application/pdf' },
  PNG: { ext: '.png', mime: 'image/png' },
  JPEG: { ext: '.jpg', mime: 'image/jpeg' },
  CSV: { ext: '.csv', mime: 'text/csv' },
} as const

/**
 * API version header name
 */
export const API_VERSION_HEADER = 'API-Version'

/**
 * Supported API versions
 */
export const SUPPORTED_API_VERSIONS = ['1.0'] as const
