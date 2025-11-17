/**
 * Collection object
 */
export interface Collection {
  id: string
  name: string
  schema?: Record<string, any> | null
  indexes?: Record<string, any> | null
  options?: Record<string, any> | null
  createdAt: string
  updatedAt: string
}

/**
 * Create collection request
 */
export interface CreateCollectionRequest {
  name: string
  schema?: Record<string, any>
  indexes?: Record<string, any>
  options?: Record<string, any>
}

/**
 * Update collection request
 */
export interface UpdateCollectionRequest {
  schema?: Record<string, any>
  indexes?: Record<string, any>
  options?: Record<string, any>
}

/**
 * Collection statistics
 */
export interface CollectionStats {
  collection: string
  documentCount: number
  totalSize: number
  averageDocumentSize: number
  indexes: {
    name: string
    size: number
  }[]
  createdAt: string
  updatedAt: string
}

/**
 * Document object
 */
export interface Document {
  id: string
  collectionId: string
  data: Record<string, any>
  version: number
  createdAt: string
  updatedAt: string
  createdBy?: string | null
  updatedBy?: string | null
}

/**
 * List collections response
 */
export interface ListCollectionsResponse {
  collections: Collection[]
  total: number
}
