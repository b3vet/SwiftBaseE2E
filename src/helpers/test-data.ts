import { randomBytes } from 'crypto'
import { TEST_DEFAULTS } from '@/config/constants'

/**
 * Test data generator helper
 */
export class TestData {
  /**
   * Generate random email
   */
  static randomEmail(prefix = 'test'): string {
    const timestamp = Date.now()
    const random = randomBytes(4).toString('hex')
    return `${prefix}_${timestamp}_${random}@${TEST_DEFAULTS.USER_EMAIL_DOMAIN}`
  }

  /**
   * Generate random username
   */
  static randomUsername(prefix = 'user'): string {
    const timestamp = Date.now()
    const random = randomBytes(4).toString('hex')
    return `${prefix}_${timestamp}_${random}`
  }

  /**
   * Generate random collection name
   */
  static randomCollectionName(prefix?: string): string {
    const timestamp = Date.now()
    const random = randomBytes(4).toString('hex')
    return `${prefix || TEST_DEFAULTS.COLLECTION_NAME_PREFIX}${timestamp}_${random}`
  }

  /**
   * Generate random password
   */
  static randomPassword(length = 12): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''

    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    // Ensure at least one uppercase, lowercase, number, and special char
    return 'Aa1!' + password.slice(4)
  }

  /**
   * Generate random string
   */
  static randomString(length = 10): string {
    return randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length)
  }

  /**
   * Generate random number
   */
  static randomNumber(min = 0, max = 100): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  /**
   * Generate random boolean
   */
  static randomBoolean(): boolean {
    return Math.random() > 0.5
  }

  /**
   * Generate random date
   */
  static randomDate(start = new Date(2020, 0, 1), end = new Date()): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  }

  /**
   * Generate random array
   */
  static randomArray<T>(generator: () => T, length = 5): T[] {
    return Array.from({ length }, generator)
  }

  /**
   * Pick random item from array
   */
  static randomItem<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)]
  }

  /**
   * Generate sample user data
   */
  static sampleUser(overrides?: Partial<Record<string, any>>): Record<string, any> {
    return {
      name: `Test User ${this.randomString(8)}`,
      email: this.randomEmail(),
      age: this.randomNumber(18, 80),
      active: this.randomBoolean(),
      ...overrides,
    }
  }

  /**
   * Generate sample product data
   */
  static sampleProduct(overrides?: Partial<Record<string, any>>): Record<string, any> {
    return {
      name: `Product ${this.randomString(8)}`,
      price: this.randomNumber(10, 1000),
      description: `Description for ${this.randomString(16)}`,
      category: this.randomItem(['Electronics', 'Clothing', 'Food', 'Books']),
      inStock: this.randomBoolean(),
      tags: this.randomArray(() => this.randomString(6), 3),
      ...overrides,
    }
  }

  /**
   * Generate sample document data
   */
  static sampleDocument(overrides?: Partial<Record<string, any>>): Record<string, any> {
    return {
      title: `Document ${this.randomString(8)}`,
      content: `Content ${this.randomString(50)}`,
      status: this.randomItem(['draft', 'published', 'archived']),
      createdAt: this.randomDate().toISOString(),
      ...overrides,
    }
  }

  /**
   * Generate multiple sample documents
   */
  static sampleDocuments(count: number, generator?: () => Record<string, any>): Record<string, any>[] {
    return Array.from({ length: count }, generator || (() => this.sampleDocument()))
  }

  /**
   * Generate ID (similar to SwiftBase ID format)
   */
  static generateId(): string {
    return randomBytes(16).toString('hex')
  }

  /**
   * Wait for specified milliseconds
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Retry a function with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxAttempts = 3,
    delayMs = 1000
  ): Promise<T> {
    let lastError: Error | undefined

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (attempt < maxAttempts) {
          await this.wait(delayMs * Math.pow(2, attempt - 1))
        }
      }
    }

    throw lastError || new Error('Retry failed')
  }

  /**
   * Wait for condition to be true
   */
  static async waitForCondition(
    condition: () => boolean | Promise<boolean>,
    timeoutMs = 5000,
    intervalMs = 100
  ): Promise<void> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      if (await condition()) {
        return
      }

      await this.wait(intervalMs)
    }

    throw new Error(`Condition not met within ${timeoutMs}ms`)
  }
}

/**
 * Convenience exports
 */
export const randomEmail = TestData.randomEmail.bind(TestData)
export const randomUsername = TestData.randomUsername.bind(TestData)
export const randomCollectionName = TestData.randomCollectionName.bind(TestData)
export const randomPassword = TestData.randomPassword.bind(TestData)
export const randomString = TestData.randomString.bind(TestData)
export const randomNumber = TestData.randomNumber.bind(TestData)
export const sampleUser = TestData.sampleUser.bind(TestData)
export const sampleProduct = TestData.sampleProduct.bind(TestData)
export const sampleDocument = TestData.sampleDocument.bind(TestData)
export const sampleDocuments = TestData.sampleDocuments.bind(TestData)
export const wait = TestData.wait.bind(TestData)
export const retry = TestData.retry.bind(TestData)
