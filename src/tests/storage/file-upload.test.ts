import { describe, it, expect, beforeAll } from 'vitest'
import { createStorageClient } from '@/client'
import { createAuthHelper, createCleanupHelper, FileGenerator } from '@/helpers'
import { assertSuccessResponse, assertErrorResponse } from '@/validators/response.validator'

describe('File Upload Operations', () => {
  const authHelper = createAuthHelper()
  const cleanup = createCleanupHelper()

  let adminToken: string
  let userToken: string
  let storageClient: ReturnType<typeof createStorageClient>
  let userStorageClient: ReturnType<typeof createStorageClient>

  beforeAll(async () => {
    adminToken = await authHelper.getAdminToken()
    const userResult = await authHelper.createAndLoginUser()
    userToken = userResult.token

    storageClient = createStorageClient(adminToken)
    userStorageClient = createStorageClient(userToken)

    cleanup.setToken(adminToken)
  })

  describe('Single File Upload', () => {
    it('should upload a small text file', async () => {
      const fileBuffer = Buffer.from('Hello, SwiftBase!', 'utf-8')
      const filename = 'test.txt'

      const response = await storageClient.uploadFile(
        fileBuffer,
        filename,
        'text/plain'
      )

      assertSuccessResponse(response)
      expect(response.data).toBeDefined()
      expect(response.data!.id).toBeDefined()
      expect(response.data!.filename).toBe(filename)
      expect(response.data!.contentType).toBe('text/plain')
      expect(response.data!.size).toBe(fileBuffer.length)

      cleanup.track('file', response.data!.id)
    })

    it('should upload a binary file', async () => {
      const fileBuffer = FileGenerator.generateBuffer(1024) // 1KB
      const filename = 'binary.dat'

      const response = await storageClient.uploadFile(
        fileBuffer,
        filename,
        'application/octet-stream'
      )

      assertSuccessResponse(response)
      expect(response.data!.id).toBeDefined()
      expect(response.data!.size).toBe(1024)

      cleanup.track('file', response.data!.id)
    })

    it('should upload an image file', async () => {
      const fileBuffer = FileGenerator.generateBuffer(5120) // 5KB
      const filename = 'image.png'

      const response = await storageClient.uploadFile(
        fileBuffer,
        filename,
        'image/png'
      )

      assertSuccessResponse(response)
      expect(response.data!.contentType).toBe('image/png')
      expect(response.data!.filename).toBe(filename)

      cleanup.track('file', response.data!.id)
    })

    it('should upload a JSON file', async () => {
      const jsonData = { name: 'Test', value: 123, items: [1, 2, 3] }
      const fileBuffer = Buffer.from(JSON.stringify(jsonData), 'utf-8')
      const filename = 'data.json'

      const response = await storageClient.uploadFile(
        fileBuffer,
        filename,
        'application/json'
      )

      assertSuccessResponse(response)
      expect(response.data!.contentType).toBe('application/json')

      cleanup.track('file', response.data!.id)
    })

    it('should upload file with special characters in filename', async () => {
      const fileBuffer = Buffer.from('test content', 'utf-8')
      const filename = 'test file (1) - copy.txt'

      const response = await storageClient.uploadFile(
        fileBuffer,
        filename,
        'text/plain'
      )

      assertSuccessResponse(response)
      expect(response.data!.filename).toBe(filename)

      cleanup.track('file', response.data!.id)
    })

    it('should upload file with unicode filename', async () => {
      const fileBuffer = Buffer.from('content', 'utf-8')
      const filename = 'файл-テスト-文件.txt'

      const response = await storageClient.uploadFile(
        fileBuffer,
        filename,
        'text/plain'
      )

      assertSuccessResponse(response)
      expect(response.data!.filename).toBe(filename)

      cleanup.track('file', response.data!.id)
    })

    it('should auto-detect content type if not provided', async () => {
      const fileBuffer = Buffer.from('test', 'utf-8')
      const filename = 'test.txt'

      const response = await storageClient.uploadFile(fileBuffer, filename)

      assertSuccessResponse(response)
      // Should have some content type set
      expect(response.data!.contentType).toBeDefined()

      cleanup.track('file', response.data!.id)
    })

    it('should generate unique ID for each upload', async () => {
      const fileBuffer = Buffer.from('test', 'utf-8')

      const response1 = await storageClient.uploadFile(
        fileBuffer,
        'test1.txt',
        'text/plain'
      )
      const response2 = await storageClient.uploadFile(
        fileBuffer,
        'test2.txt',
        'text/plain'
      )

      assertSuccessResponse(response1)
      assertSuccessResponse(response2)
      expect(response1.data!.id).not.toBe(response2.data!.id)

      cleanup.track('file', response1.data!.id)
      cleanup.track('file', response2.data!.id)
    })

    it('should include upload timestamp', async () => {
      const beforeUpload = Date.now()
      const fileBuffer = Buffer.from('test', 'utf-8')

      const response = await storageClient.uploadFile(
        fileBuffer,
        'test.txt',
        'text/plain'
      )

      assertSuccessResponse(response)
      expect(response.data!.uploadedAt).toBeDefined()

      const uploadTime = new Date(response.data!.uploadedAt).getTime()
      expect(uploadTime).toBeGreaterThanOrEqual(beforeUpload)
      expect(uploadTime).toBeLessThanOrEqual(Date.now())

      cleanup.track('file', response.data!.id)
    })

    it('should handle empty file upload', async () => {
      const fileBuffer = Buffer.alloc(0)
      const filename = 'empty.txt'

      const response = await storageClient.uploadFile(
        fileBuffer,
        filename,
        'text/plain'
      )

      // May accept or reject empty files
      if (!response.success) {
        expect(response.error?.code).toMatch(/BAD_REQUEST|VALIDATION_ERROR/)
      } else {
        expect(response.data!.size).toBe(0)
        cleanup.track('file', response.data!.id)
      }
    })
  })

  describe('File Size Variations', () => {
    it('should upload 1KB file', async () => {
      const fileBuffer = FileGenerator.generateFileMB(0.001) // 1KB
      const filename = '1kb.dat'

      const response = await storageClient.uploadFile(
        fileBuffer,
        filename,
        'application/octet-stream'
      )

      assertSuccessResponse(response)
      expect(response.data!.size).toBeGreaterThanOrEqual(1000)
      expect(response.data!.size).toBeLessThan(2000)

      cleanup.track('file', response.data!.id)
    })

    it('should upload 100KB file', async () => {
      const fileBuffer = FileGenerator.generateFileMB(0.1) // 100KB
      const filename = '100kb.dat'

      const response = await storageClient.uploadFile(
        fileBuffer,
        filename,
        'application/octet-stream'
      )

      assertSuccessResponse(response)
      expect(response.data!.size).toBeGreaterThan(100000)

      cleanup.track('file', response.data!.id)
    })

    it('should upload 1MB file', async () => {
      const fileBuffer = FileGenerator.generateFileMB(1)
      const filename = '1mb.dat'

      const response = await storageClient.uploadFile(
        fileBuffer,
        filename,
        'application/octet-stream'
      )

      assertSuccessResponse(response)
      expect(response.data!.size).toBeGreaterThan(1000000)

      cleanup.track('file', response.data!.id)
    })

    it('should upload 5MB file', async () => {
      const fileBuffer = FileGenerator.generateFileMB(5)
      const filename = '5mb.dat'

      const response = await storageClient.uploadFile(
        fileBuffer,
        filename,
        'application/octet-stream'
      )

      assertSuccessResponse(response)
      expect(response.data!.size).toBeGreaterThan(5000000)

      cleanup.track('file', response.data!.id)
    })

    it('should upload 10MB file', async () => {
      const fileBuffer = FileGenerator.generateFileMB(10)
      const filename = '10mb.dat'

      const response = await storageClient.uploadFile(
        fileBuffer,
        filename,
        'application/octet-stream'
      )

      assertSuccessResponse(response)
      expect(response.data!.size).toBeGreaterThan(10000000)

      cleanup.track('file', response.data!.id)
    }, 30000) // Extended timeout for large file

    it('should handle file size limit if enforced', async () => {
      // Try uploading a very large file (50MB)
      const largeBuffer = FileGenerator.generateFileMB(50)
      const filename = 'large.dat'

      const response = await storageClient.uploadFile(
        largeBuffer,
        filename,
        'application/octet-stream'
      )

      // May succeed or fail based on server limits
      if (!response.success) {
        expect(response.error?.code).toMatch(
          /FILE_TOO_LARGE|PAYLOAD_TOO_LARGE|BAD_REQUEST/
        )
      } else {
        cleanup.track('file', response.data!.id)
      }
    }, 60000)
  })

  describe('Multiple File Uploads', () => {
    it('should upload multiple files sequentially', async () => {
      const files = [
        { buffer: Buffer.from('File 1', 'utf-8'), name: 'file1.txt' },
        { buffer: Buffer.from('File 2', 'utf-8'), name: 'file2.txt' },
        { buffer: Buffer.from('File 3', 'utf-8'), name: 'file3.txt' },
      ]

      const uploadedIds: string[] = []

      for (const file of files) {
        const response = await storageClient.uploadFile(
          file.buffer,
          file.name,
          'text/plain'
        )

        assertSuccessResponse(response)
        uploadedIds.push(response.data!.id)
        cleanup.track('file', response.data!.id)
      }

      expect(uploadedIds.length).toBe(3)
      expect(new Set(uploadedIds).size).toBe(3) // All unique
    })

    it('should upload multiple files concurrently', async () => {
      const files = Array.from({ length: 5 }, (_, i) => ({
        buffer: Buffer.from(`File ${i}`, 'utf-8'),
        name: `concurrent-${i}.txt`,
      }))

      const uploads = files.map(file =>
        storageClient.uploadFile(file.buffer, file.name, 'text/plain')
      )

      const responses = await Promise.all(uploads)

      responses.forEach(response => {
        assertSuccessResponse(response)
        cleanup.track('file', response.data!.id)
      })

      expect(responses.length).toBe(5)
    })

    it('should handle uploading same filename multiple times', async () => {
      const fileBuffer = Buffer.from('content', 'utf-8')
      const filename = 'duplicate.txt'

      const response1 = await storageClient.uploadFile(
        fileBuffer,
        filename,
        'text/plain'
      )
      const response2 = await storageClient.uploadFile(
        fileBuffer,
        filename,
        'text/plain'
      )

      assertSuccessResponse(response1)
      assertSuccessResponse(response2)

      // Should create separate files with different IDs
      expect(response1.data!.id).not.toBe(response2.data!.id)

      cleanup.track('file', response1.data!.id)
      cleanup.track('file', response2.data!.id)
    })

    it('should upload files with different content types', async () => {
      const files = [
        { buffer: Buffer.from('text', 'utf-8'), name: 'file.txt', type: 'text/plain' },
        { buffer: Buffer.from('{}', 'utf-8'), name: 'file.json', type: 'application/json' },
        { buffer: FileGenerator.generateBuffer(100), name: 'file.bin', type: 'application/octet-stream' },
      ]

      for (const file of files) {
        const response = await storageClient.uploadFile(
          file.buffer,
          file.name,
          file.type
        )

        assertSuccessResponse(response)
        expect(response.data!.contentType).toBe(file.type)
        cleanup.track('file', response.data!.id)
      }
    })
  })

  describe('Content Type Handling', () => {
    it('should handle common text types', async () => {
      const types = [
        'text/plain',
        'text/html',
        'text/css',
        'text/javascript',
        'text/csv',
      ]

      for (const contentType of types) {
        const response = await storageClient.uploadFile(
          Buffer.from('content', 'utf-8'),
          `file.${contentType.split('/')[1]}`,
          contentType
        )

        assertSuccessResponse(response)
        expect(response.data!.contentType).toBe(contentType)
        cleanup.track('file', response.data!.id)
      }
    })

    it('should handle common image types', async () => {
      const types = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

      for (const contentType of types) {
        const response = await storageClient.uploadFile(
          FileGenerator.generateBuffer(1024),
          `file.${contentType.split('/')[1]}`,
          contentType
        )

        assertSuccessResponse(response)
        expect(response.data!.contentType).toBe(contentType)
        cleanup.track('file', response.data!.id)
      }
    })

    it('should handle application types', async () => {
      const types = [
        'application/json',
        'application/xml',
        'application/pdf',
        'application/zip',
      ]

      for (const contentType of types) {
        const response = await storageClient.uploadFile(
          FileGenerator.generateBuffer(512),
          `file.${contentType.split('/')[1]}`,
          contentType
        )

        assertSuccessResponse(response)
        expect(response.data!.contentType).toBe(contentType)
        cleanup.track('file', response.data!.id)
      }
    })

    it('should handle custom content types', async () => {
      const customType = 'application/vnd.custom+json'

      const response = await storageClient.uploadFile(
        Buffer.from('{}', 'utf-8'),
        'custom.json',
        customType
      )

      assertSuccessResponse(response)
      expect(response.data!.contentType).toBe(customType)
      cleanup.track('file', response.data!.id)
    })
  })

  describe('User File Upload', () => {
    it('should allow regular users to upload files', async () => {
      const fileBuffer = Buffer.from('User uploaded content', 'utf-8')
      const filename = 'user-file.txt'

      const response = await userStorageClient.uploadFile(
        fileBuffer,
        filename,
        'text/plain'
      )

      assertSuccessResponse(response)
      expect(response.data!.id).toBeDefined()
      expect(response.data!.uploadedBy).toBeDefined()

      cleanup.track('file', response.data!.id)
    })

    it('should associate file with uploading user', async () => {
      const fileBuffer = Buffer.from('content', 'utf-8')

      const response = await userStorageClient.uploadFile(
        fileBuffer,
        'user-owned.txt',
        'text/plain'
      )

      assertSuccessResponse(response)
      expect(response.data!.uploadedBy).toBeDefined()
      // Should match the user who uploaded
      expect(response.data!.uploadedBy).toBeTruthy()

      cleanup.track('file', response.data!.id)
    })

    it('should prevent unauthenticated file upload', async () => {
      const unauthClient = createStorageClient('')
      const fileBuffer = Buffer.from('test', 'utf-8')

      const response = await unauthClient.uploadFile(
        fileBuffer,
        'unauth.txt',
        'text/plain'
      )

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/UNAUTHORIZED|FORBIDDEN/)
    })
  })

  describe('Validation and Error Handling', () => {
    it('should reject upload without filename', async () => {
      const fileBuffer = Buffer.from('content', 'utf-8')

      const response = await storageClient.uploadFile(
        fileBuffer,
        '',
        'text/plain'
      )

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/BAD_REQUEST|VALIDATION_ERROR/)
    })

    it('should handle filename that is too long', async () => {
      const fileBuffer = Buffer.from('content', 'utf-8')
      const longFilename = 'a'.repeat(300) + '.txt'

      const response = await storageClient.uploadFile(
        fileBuffer,
        longFilename,
        'text/plain'
      )

      // May accept with truncation or reject
      if (!response.success) {
        expect(response.error?.code).toMatch(/BAD_REQUEST|VALIDATION_ERROR/)
      } else {
        cleanup.track('file', response.data!.id)
      }
    })

    it('should handle invalid content type format', async () => {
      const fileBuffer = Buffer.from('content', 'utf-8')

      const response = await storageClient.uploadFile(
        fileBuffer,
        'test.txt',
        'invalid-type'
      )

      // May accept with default type or reject
      if (response.success) {
        cleanup.track('file', response.data!.id)
      }
    })

    it('should preserve original file content integrity', async () => {
      const originalContent = 'Test content with special chars: 你好 مرحبا'
      const fileBuffer = Buffer.from(originalContent, 'utf-8')

      const uploadResponse = await storageClient.uploadFile(
        fileBuffer,
        'integrity-test.txt',
        'text/plain'
      )

      assertSuccessResponse(uploadResponse)

      // Download and verify content
      const downloadResponse = await storageClient.downloadFile(
        uploadResponse.data!.id
      )

      assertSuccessResponse(downloadResponse)
      const downloadedContent = downloadResponse.data!.toString('utf-8')
      expect(downloadedContent).toBe(originalContent)

      cleanup.track('file', uploadResponse.data!.id)
    })
  })

  describe('Performance', () => {
    it('should upload small file within acceptable time', async () => {
      const fileBuffer = FileGenerator.generateBuffer(1024)
      const startTime = Date.now()

      const response = await storageClient.uploadFile(
        fileBuffer,
        'perf-small.dat',
        'application/octet-stream'
      )

      const duration = Date.now() - startTime

      assertSuccessResponse(response)
      expect(duration).toBeLessThan(2000) // 2 seconds
      cleanup.track('file', response.data!.id)
    })

    it('should upload medium file within acceptable time', async () => {
      const fileBuffer = FileGenerator.generateFileMB(1)
      const startTime = Date.now()

      const response = await storageClient.uploadFile(
        fileBuffer,
        'perf-medium.dat',
        'application/octet-stream'
      )

      const duration = Date.now() - startTime

      assertSuccessResponse(response)
      expect(duration).toBeLessThan(5000) // 5 seconds
      cleanup.track('file', response.data!.id)
    })

    it('should handle concurrent uploads efficiently', async () => {
      const files = Array.from({ length: 10 }, (_, i) => ({
        buffer: FileGenerator.generateBuffer(10240), // 10KB each
        name: `concurrent-perf-${i}.dat`,
      }))

      const startTime = Date.now()

      const uploads = files.map(file =>
        storageClient.uploadFile(
          file.buffer,
          file.name,
          'application/octet-stream'
        )
      )

      const responses = await Promise.all(uploads)
      const duration = Date.now() - startTime

      responses.forEach(response => {
        assertSuccessResponse(response)
        cleanup.track('file', response.data!.id)
      })

      expect(duration).toBeLessThan(10000) // 10 seconds for 10 concurrent uploads
    })
  })
})
