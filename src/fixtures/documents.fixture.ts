/**
 * Sample product documents
 */
export const SAMPLE_PRODUCTS = [
  {
    name: 'Laptop Pro 15',
    price: 1299.99,
    description: 'High-performance laptop for professionals',
    category: 'Electronics',
    inStock: true,
    tags: ['laptop', 'professional', 'high-performance'],
    specifications: {
      cpu: 'Intel i7',
      ram: '16GB',
      storage: '512GB SSD',
      screen: '15.6 inch',
    },
  },
  {
    name: 'Wireless Mouse',
    price: 29.99,
    description: 'Ergonomic wireless mouse',
    category: 'Electronics',
    inStock: true,
    tags: ['mouse', 'wireless', 'ergonomic'],
    specifications: {
      dpi: 1600,
      battery: 'AA',
      connectivity: 'Bluetooth',
    },
  },
  {
    name: 'USB-C Cable',
    price: 12.99,
    description: 'Fast charging USB-C cable',
    category: 'Accessories',
    inStock: false,
    tags: ['cable', 'usb-c', 'charging'],
    specifications: {
      length: '1.5m',
      power: '60W',
    },
  },
  {
    name: 'Mechanical Keyboard',
    price: 89.99,
    description: 'RGB mechanical gaming keyboard',
    category: 'Electronics',
    inStock: true,
    tags: ['keyboard', 'mechanical', 'gaming', 'rgb'],
    specifications: {
      switches: 'Cherry MX',
      layout: 'Full-size',
      rgb: true,
    },
  },
  {
    name: 'Monitor 27"',
    price: 349.99,
    description: '27-inch 4K monitor',
    category: 'Electronics',
    inStock: true,
    tags: ['monitor', '4k', 'display'],
    specifications: {
      resolution: '3840x2160',
      refreshRate: '60Hz',
      panel: 'IPS',
    },
  },
]

/**
 * Sample user documents
 */
export const SAMPLE_USERS_DATA = [
  {
    username: 'john_doe',
    email: 'john@example.com',
    age: 28,
    active: true,
    preferences: {
      theme: 'dark',
      notifications: true,
    },
  },
  {
    username: 'jane_smith',
    email: 'jane@example.com',
    age: 32,
    active: true,
    preferences: {
      theme: 'light',
      notifications: false,
    },
  },
  {
    username: 'bob_wilson',
    email: 'bob@example.com',
    age: 45,
    active: false,
    preferences: {
      theme: 'auto',
      notifications: true,
    },
  },
]

/**
 * Sample blog post documents
 */
export const SAMPLE_POSTS = [
  {
    title: 'Getting Started with SwiftBase',
    content: 'SwiftBase is a powerful backend platform...',
    authorId: 'user_123',
    tags: ['tutorial', 'swiftbase', 'backend'],
    published: true,
    publishedAt: '2024-01-15T10:00:00Z',
    views: 150,
  },
  {
    title: 'MongoDB Query DSL Guide',
    content: 'Learn how to use MongoDB-style queries...',
    authorId: 'user_456',
    tags: ['guide', 'mongodb', 'queries'],
    published: true,
    publishedAt: '2024-01-20T14:30:00Z',
    views: 89,
  },
  {
    title: 'Draft: Upcoming Features',
    content: 'Here are some features we are working on...',
    authorId: 'user_123',
    tags: ['announcement', 'features'],
    published: false,
    publishedAt: null,
    views: 0,
  },
]

/**
 * Sample order documents
 */
export const SAMPLE_ORDERS = [
  {
    orderNumber: 'ORD-001',
    userId: 'user_123',
    items: [
      { productId: 'prod_1', quantity: 1, price: 1299.99 },
      { productId: 'prod_2', quantity: 2, price: 29.99 },
    ],
    total: 1359.97,
    status: 'delivered',
    createdAt: '2024-01-10T09:00:00Z',
  },
  {
    orderNumber: 'ORD-002',
    userId: 'user_456',
    items: [
      { productId: 'prod_3', quantity: 3, price: 12.99 },
    ],
    total: 38.97,
    status: 'processing',
    createdAt: '2024-01-18T15:45:00Z',
  },
]

/**
 * Documents for query testing
 */
export const QUERY_TEST_DOCUMENTS = {
  // For comparison operators
  numbers: [
    { value: 10, category: 'low' },
    { value: 50, category: 'medium' },
    { value: 100, category: 'high' },
    { value: 75, category: 'medium' },
    { value: 150, category: 'high' },
  ],

  // For logical operators
  mixed: [
    { name: 'Item A', active: true, price: 50 },
    { name: 'Item B', active: false, price: 30 },
    { name: 'Item C', active: true, price: 80 },
    { name: 'Item D', active: false, price: 120 },
  ],

  // For array operators
  withArrays: [
    { tags: ['tag1', 'tag2', 'tag3'] },
    { tags: ['tag2', 'tag4'] },
    { tags: ['tag1'] },
    { tags: [] },
  ],

  // For nested objects
  nested: [
    { user: { name: 'Alice', age: 25 }, status: 'active' },
    { user: { name: 'Bob', age: 30 }, status: 'inactive' },
    { user: { name: 'Charlie', age: 35 }, status: 'active' },
  ],
}

/**
 * Bulk operation test documents
 */
export const BULK_TEST_DOCUMENTS = {
  create: Array.from({ length: 10 }, (_, i) => ({
    name: `Item ${i + 1}`,
    value: (i + 1) * 10,
    active: i % 2 === 0,
  })),

  update: Array.from({ length: 5 }, (_, i) => ({
    _id: `id_${i + 1}`,
    value: 100 + i,
  })),
}

/**
 * Large dataset for pagination testing
 */
export const LARGE_DATASET = Array.from({ length: 100 }, (_, i) => ({
  id: i + 1,
  name: `Record ${i + 1}`,
  value: Math.floor(Math.random() * 1000),
  category: ['A', 'B', 'C', 'D'][i % 4],
  active: i % 2 === 0,
  createdAt: new Date(2024, 0, 1 + i).toISOString(),
}))
