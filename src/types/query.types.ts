/**
 * MongoDB-style query operators
 */
export type QueryOperator =
  | '$eq' | '$ne' | '$gt' | '$gte' | '$lt' | '$lte' | '$in' | '$nin'
  | '$and' | '$or' | '$not'
  | '$exists' | '$type'
  | '$all' | '$elemMatch' | '$size'
  | '$regex' | '$mod'

/**
 * Update operators
 */
export type UpdateOperator =
  | '$set' | '$unset' | '$inc' | '$push' | '$pull' | '$addToSet'

/**
 * Query where condition
 */
export type WhereCondition = {
  [key: string]: any | {
    [op in QueryOperator]?: any
  }
}

/**
 * Query select (field selection)
 */
export type QuerySelect = string[] | Record<string, 0 | 1>

/**
 * Query order by
 */
export type QueryOrderBy = Record<string, 'asc' | 'desc'>

/**
 * Query structure
 */
export interface MongoQuery {
  where?: WhereCondition
  select?: QuerySelect
  include?: string[]
  orderBy?: QueryOrderBy
  limit?: number
  offset?: number
  distinct?: string
}

/**
 * Query options
 */
export interface QueryOptions {
  upsert?: boolean
  multi?: boolean
  validate?: boolean
  returnNew?: boolean
}

/**
 * Query actions
 */
export type QueryAction =
  | 'find'
  | 'findOne'
  | 'create'
  | 'update'
  | 'delete'
  | 'count'
  | 'aggregate'
  | 'custom'

/**
 * Query request
 */
export interface QueryRequest {
  action: QueryAction
  collection: string
  query?: MongoQuery
  data?: Record<string, any> | Record<string, any>[]
  options?: QueryOptions
  custom?: string
  params?: Record<string, any>
}

/**
 * Query result for find/findOne
 */
export interface QueryResult<T = any> {
  documents?: T[]
  document?: T | null
  count?: number
  deleted?: number
  updated?: number
  created?: T | T[]
}

/**
 * Bulk operation
 */
export interface BulkOperation {
  type: 'create' | 'update' | 'delete'
  collection: string
  data?: Record<string, any> | Record<string, any>[]
  where?: WhereCondition
}

/**
 * Bulk operations request
 */
export interface BulkOperationsRequest {
  operations: BulkOperation[]
}

/**
 * Bulk operations result
 */
export interface BulkOperationResult {
  success: boolean
  operation: BulkOperation
  result?: any
  error?: string
}

/**
 * Bulk operations response
 */
export interface BulkOperationsResponse {
  results: BulkOperationResult[]
  successCount: number
  failureCount: number
}

/**
 * Custom query definition
 */
export interface CustomQuery {
  id: string
  name: string
  sql: string
  params?: Record<string, any>
  description?: string
  createdAt: string
  updatedAt: string
}

/**
 * Register custom query request
 */
export interface RegisterCustomQueryRequest {
  name: string
  sql: string
  params?: Record<string, any>
  description?: string
}
