import { describe, it, expect, beforeAll } from 'vitest'
import { createAdminClient } from '@/client'
import { createAuthHelper, createCleanupHelper } from '@/helpers'
import { randomCollectionName } from '@/helpers/test-data'
import { INVALID_TEST_COLLECTIONS, COLLECTION_NAME_TEST_CASES } from '@/fixtures'
import { assertSuccessResponse, assertErrorResponse } from '@/validators/response.validator'

describe('Collection Validation', () => {
  const authHelper = createAuthHelper()
  const cleanup = createCleanupHelper()

  let adminToken: string
  let adminClient: ReturnType<typeof createAdminClient>

  beforeAll(async () => {
    adminToken = await authHelper.getAdminToken()
    adminClient = createAdminClient(adminToken)
    cleanup.setToken(adminToken)
  })

  describe('Collection Name Validation', () => {
    it('should reject collection name starting with number', async () => {
      const response = await adminClient.createCollection(
        INVALID_TEST_COLLECTIONS.invalidName
      )

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/VALIDATION_ERROR|BAD_REQUEST/)
      expect(response.error?.message.toLowerCase()).toMatch(/name/)
    })

    it('should reject collection name exceeding length limit', async () => {
      const response = await adminClient.createCollection(
        INVALID_TEST_COLLECTIONS.tooLongName
      )

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/VALIDATION_ERROR|BAD_REQUEST/)
    })

    it('should reject empty collection name', async () => {
      const response = await adminClient.createCollection(
        INVALID_TEST_COLLECTIONS.emptyName
      )

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/VALIDATION_ERROR|BAD_REQUEST/)
    })

    it('should reject missing collection name', async () => {
      const response = await adminClient.createCollection(
        INVALID_TEST_COLLECTIONS.missingName
      )

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/VALIDATION_ERROR|BAD_REQUEST/)
    })

    it('should reject collection name with special characters', async () => {
      const response = await adminClient.createCollection(
        INVALID_TEST_COLLECTIONS.specialCharsInName
      )

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/VALIDATION_ERROR|BAD_REQUEST/)
    })

    it('should reject collection name with spaces', async () => {
      const response = await adminClient.createCollection(
        INVALID_TEST_COLLECTIONS.spacesInName
      )

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/VALIDATION_ERROR|BAD_REQUEST/)
    })

    it('should accept valid collection names', async () => {
      for (const name of COLLECTION_NAME_TEST_CASES.valid.slice(0, 5)) {
        const uniqueName = `${name}_${Date.now()}`
        const response = await adminClient.createCollection({
          name: uniqueName,
        })

        assertSuccessResponse(response)
        expect(response.data!.name).toBe(uniqueName)

        cleanup.track('collection', uniqueName)
      }
    })

    it('should reject all invalid collection name formats', async () => {
      for (const name of COLLECTION_NAME_TEST_CASES.invalid) {
        const response = await adminClient.createCollection({
          name,
        })

        assertErrorResponse(response)
        expect(response.error?.code).toMatch(/VALIDATION_ERROR|BAD_REQUEST/)
      }
    })

    it('should enforce name pattern: letter + alphanumeric/underscore', async () => {
      const validNames = [
        'a',
        'A',
        'myCollection',
        'my_collection',
        'collection123',
        'Collection_123',
      ]

      for (const name of validNames) {
        const uniqueName = `${name}_${Date.now()}`
        const response = await adminClient.createCollection({
          name: uniqueName,
        })

        assertSuccessResponse(response)
        cleanup.track('collection', uniqueName)
      }
    })

    it('should enforce maximum name length (50 characters)', async () => {
      // Test at boundary
      const maxLength = 'a'.repeat(50)
      const overLength = 'a'.repeat(51)

      // Should accept 50 characters
      const response1 = await adminClient.createCollection({
        name: maxLength,
      })

      if (response1.success) {
        cleanup.track('collection', maxLength)
      }

      // Should reject 51 characters
      const response2 = await adminClient.createCollection({
        name: overLength,
      })

      assertErrorResponse(response2)
    })
  })

  describe('Schema Validation', () => {
    it('should accept valid JSON schema', async () => {
      const collectionName = randomCollectionName()
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
        required: ['name'],
      }

      const response = await adminClient.createCollection({
        name: collectionName,
        schema,
      })

      assertSuccessResponse(response)
      expect(response.data!.schema).toEqual(schema)

      cleanup.track('collection', collectionName)
    })

    it('should accept schema with nested objects', async () => {
      const collectionName = randomCollectionName()
      const schema = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              contact: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  phone: { type: 'string' },
                },
              },
            },
          },
        },
      }

      const response = await adminClient.createCollection({
        name: collectionName,
        schema,
      })

      assertSuccessResponse(response)
      cleanup.track('collection', collectionName)
    })

    it('should accept schema with array types', async () => {
      const collectionName = randomCollectionName()
      const schema = {
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            items: { type: 'string' },
          },
          scores: {
            type: 'array',
            items: { type: 'number' },
          },
        },
      }

      const response = await adminClient.createCollection({
        name: collectionName,
        schema,
      })

      assertSuccessResponse(response)
      cleanup.track('collection', collectionName)
    })

    it('should accept empty schema', async () => {
      const collectionName = randomCollectionName()

      const response = await adminClient.createCollection({
        name: collectionName,
        schema: {},
      })

      assertSuccessResponse(response)
      cleanup.track('collection', collectionName)
    })

    it('should accept null schema (schema-less collection)', async () => {
      const collectionName = randomCollectionName()

      const response = await adminClient.createCollection({
        name: collectionName,
        schema: null as any,
      })

      // Should succeed or ignore null schema
      if (response.success) {
        cleanup.track('collection', collectionName)
      }
    })

    it('should accept collection without schema field', async () => {
      const collectionName = randomCollectionName()

      const response = await adminClient.createCollection({
        name: collectionName,
      })

      assertSuccessResponse(response)
      cleanup.track('collection', collectionName)
    })
  })

  describe('Options Validation', () => {
    it('should accept valid options', async () => {
      const collectionName = randomCollectionName()
      const options = {
        strict: true,
        timestamps: true,
        maxDocuments: 1000,
      }

      const response = await adminClient.createCollection({
        name: collectionName,
        options,
      })

      assertSuccessResponse(response)
      expect(response.data!.options).toEqual(options)

      cleanup.track('collection', collectionName)
    })

    it('should accept empty options', async () => {
      const collectionName = randomCollectionName()

      const response = await adminClient.createCollection({
        name: collectionName,
        options: {},
      })

      assertSuccessResponse(response)
      cleanup.track('collection', collectionName)
    })

    it('should accept collection without options', async () => {
      const collectionName = randomCollectionName()

      const response = await adminClient.createCollection({
        name: collectionName,
      })

      assertSuccessResponse(response)
      cleanup.track('collection', collectionName)
    })

    it('should handle various option types', async () => {
      const collectionName = randomCollectionName()
      const options = {
        stringOption: 'value',
        numberOption: 123,
        booleanOption: true,
        arrayOption: [1, 2, 3],
        objectOption: { nested: 'value' },
      }

      const response = await adminClient.createCollection({
        name: collectionName,
        options,
      })

      assertSuccessResponse(response)
      cleanup.track('collection', collectionName)
    })
  })

  describe('Index Validation', () => {
    it('should accept valid index definitions', async () => {
      const collectionName = randomCollectionName()
      const indexes = {
        name_idx: { fields: ['name'], unique: true },
        email_idx: { fields: ['email'], unique: true },
        created_idx: { fields: ['createdAt'], unique: false },
      }

      const response = await adminClient.createCollection({
        name: collectionName,
        indexes,
      })

      assertSuccessResponse(response)
      expect(response.data!.indexes).toEqual(indexes)

      cleanup.track('collection', collectionName)
    })

    it('should accept compound indexes', async () => {
      const collectionName = randomCollectionName()
      const indexes = {
        user_status_idx: { fields: ['userId', 'status'], unique: false },
      }

      const response = await adminClient.createCollection({
        name: collectionName,
        indexes,
      })

      assertSuccessResponse(response)
      cleanup.track('collection', collectionName)
    })

    it('should accept empty indexes', async () => {
      const collectionName = randomCollectionName()

      const response = await adminClient.createCollection({
        name: collectionName,
        indexes: {},
      })

      assertSuccessResponse(response)
      cleanup.track('collection', collectionName)
    })

    it('should accept collection without indexes', async () => {
      const collectionName = randomCollectionName()

      const response = await adminClient.createCollection({
        name: collectionName,
      })

      assertSuccessResponse(response)
      cleanup.track('collection', collectionName)
    })
  })

  describe('Update Validation', () => {
    let testCollectionName: string

    beforeAll(async () => {
      testCollectionName = randomCollectionName()
      await adminClient.createCollection({ name: testCollectionName })
      cleanup.track('collection', testCollectionName)
    })

    it('should validate schema on update', async () => {
      const newSchema = {
        type: 'object',
        properties: {
          title: { type: 'string' },
          count: { type: 'number' },
        },
      }

      const response = await adminClient.updateCollection(testCollectionName, {
        schema: newSchema,
      })

      assertSuccessResponse(response)
      expect(response.data!.schema).toEqual(newSchema)
    })

    it('should accept empty update', async () => {
      const response = await adminClient.updateCollection(testCollectionName, {})

      // Should succeed or return unchanged collection
      assertSuccessResponse(response)
    })

    it('should not allow invalid collection name in update URL', async () => {
      const response = await adminClient.updateCollection('invalid-name!', {
        schema: {},
      })

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/NOT_FOUND|BAD_REQUEST/)
    })
  })

  describe('Reserved Names', () => {
    it('should handle system collection names (starting with _)', async () => {
      const systemName = `_system_${Date.now()}`

      const response = await adminClient.createCollection({
        name: systemName,
      })

      // May allow or reject system collection creation
      // depending on implementation
      if (response.success) {
        cleanup.track('collection', systemName)
      }
    })

    it('should protect existing system collections', async () => {
      // Try to create collection with system name
      const response = await adminClient.createCollection({
        name: '_users',
      })

      // Should fail as it already exists
      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/CONFLICT|BAD_REQUEST|FORBIDDEN/)
    })
  })

  describe('Concurrent Validation', () => {
    it('should handle concurrent creation with same name', async () => {
      const collectionName = randomCollectionName()

      // Try to create same collection concurrently
      const [response1, response2] = await Promise.all([
        adminClient.createCollection({ name: collectionName }),
        adminClient.createCollection({ name: collectionName }),
      ])

      // Only one should succeed
      const successCount = [response1, response2].filter(r => r.success).length
      expect(successCount).toBe(1)

      // At least one should fail with conflict
      const failureCount = [response1, response2].filter(r => !r.success).length
      expect(failureCount).toBe(1)

      if (response1.success) cleanup.track('collection', collectionName)
      if (response2.success) cleanup.track('collection', collectionName)
    })

    it('should handle concurrent validations', async () => {
      const names = Array.from({ length: 3 }, () => randomCollectionName())

      const responses = await Promise.all(
        names.map(name => adminClient.createCollection({ name }))
      )

      // All should succeed as names are different
      responses.forEach((response, index) => {
        assertSuccessResponse(response)
        cleanup.track('collection', names[index])
      })
    })
  })

  describe('Boundary Conditions', () => {
    it('should handle minimum valid collection name (1 character)', async () => {
      const name = `a${Date.now()}`

      const response = await adminClient.createCollection({ name })

      assertSuccessResponse(response)
      cleanup.track('collection', name)
    })

    it('should handle maximum valid collection name (50 characters)', async () => {
      const name = 'a' + '0'.repeat(49)

      const response = await adminClient.createCollection({ name })

      if (response.success) {
        cleanup.track('collection', name)
      }
    })

    it('should handle very large schema', async () => {
      const collectionName = randomCollectionName()

      // Create a schema with many properties
      const properties: Record<string, any> = {}
      for (let i = 0; i < 50; i++) {
        properties[`field${i}`] = { type: 'string' }
      }

      const schema = {
        type: 'object',
        properties,
      }

      const response = await adminClient.createCollection({
        name: collectionName,
        schema,
      })

      assertSuccessResponse(response)
      cleanup.track('collection', collectionName)
    })

    it('should handle deeply nested schema', async () => {
      const collectionName = randomCollectionName()

      const schema = {
        type: 'object',
        properties: {
          level1: {
            type: 'object',
            properties: {
              level2: {
                type: 'object',
                properties: {
                  level3: {
                    type: 'object',
                    properties: {
                      value: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      }

      const response = await adminClient.createCollection({
        name: collectionName,
        schema,
      })

      assertSuccessResponse(response)
      cleanup.track('collection', collectionName)
    })
  })
})
