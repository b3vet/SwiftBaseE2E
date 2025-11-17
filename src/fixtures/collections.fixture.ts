import type { CreateCollectionRequest } from '@/types'

/**
 * Valid test collections
 */
export const VALID_TEST_COLLECTIONS: CreateCollectionRequest[] = [
  {
    name: 'products',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        price: { type: 'number' },
        category: { type: 'string' },
        active: { type: 'boolean' },
      },
      required: ['name', 'price'],
    },
  },
  {
    name: 'users_data',
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string' },
        email: { type: 'string' },
        age: { type: 'number' },
        active: { type: 'boolean' },
      },
    },
  },
  {
    name: 'posts',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
        author_id: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        published: { type: 'boolean' },
      },
    },
  },
  {
    name: 'simple_collection',
    // No schema - accepts any data
  },
]

/**
 * Invalid test collections
 */
export const INVALID_TEST_COLLECTIONS = {
  invalidName: {
    name: '123invalid', // Starts with number
    schema: {},
  },

  tooLongName: {
    name: 'a'.repeat(51), // Exceeds 50 char limit
    schema: {},
  },

  emptyName: {
    name: '',
    schema: {},
  },

  missingName: {
    schema: {},
  } as any,

  specialCharsInName: {
    name: 'invalid-name!', // Contains special chars
    schema: {},
  },

  spacesInName: {
    name: 'invalid name', // Contains spaces
    schema: {},
  },
}

/**
 * Collection name test cases
 */
export const COLLECTION_NAME_TEST_CASES = {
  valid: [
    'myCollection',
    'my_collection',
    'Collection123',
    'a',
    'A',
    'collection_with_123_numbers',
    'CamelCaseCollection',
    'snake_case_collection',
  ],

  invalid: [
    '123collection', // Starts with number
    '_collection', // Starts with underscore
    'collection-name', // Contains hyphen
    'collection name', // Contains space
    'collection!', // Contains special char
    'a'.repeat(51), // Too long
    '', // Empty
  ],
}

/**
 * Sample collection schemas
 */
export const SAMPLE_SCHEMAS = {
  ecommerce: {
    product: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        price: { type: 'number', minimum: 0 },
        description: { type: 'string' },
        category: { type: 'string' },
        inStock: { type: 'boolean' },
        tags: { type: 'array', items: { type: 'string' } },
        specifications: { type: 'object' },
      },
      required: ['name', 'price'],
    },

    order: {
      type: 'object',
      properties: {
        orderNumber: { type: 'string' },
        userId: { type: 'string' },
        items: { type: 'array' },
        total: { type: 'number', minimum: 0 },
        status: { type: 'string', enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] },
        createdAt: { type: 'string' },
      },
      required: ['orderNumber', 'userId', 'total'],
    },
  },

  blog: {
    post: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
        authorId: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        published: { type: 'boolean' },
        publishedAt: { type: 'string' },
        views: { type: 'number', minimum: 0 },
      },
      required: ['title', 'content', 'authorId'],
    },

    comment: {
      type: 'object',
      properties: {
        postId: { type: 'string' },
        userId: { type: 'string' },
        content: { type: 'string' },
        createdAt: { type: 'string' },
        likes: { type: 'number', minimum: 0 },
      },
      required: ['postId', 'userId', 'content'],
    },
  },
}
