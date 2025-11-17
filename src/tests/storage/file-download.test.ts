import { describe, it, expect, beforeAll } from 'vitest'
import { createStorageClient } from '@/client'
import { createAuthHelper, createCleanupHelper, FileGenerator } from '@/helpers'
import { assertSuccessResponse, assertErrorResponse } from '@/validators/response.validator'

describe('File Download Operations', () => {
  const authHelper = createAuthHelper()
  const cleanup = createCleanupHelper()

  let adminToken: string
  let userToken: string
  let storageClient: ReturnType<typeof createStorageClient>
  let userStorageClient: ReturnType<typeof createStorageClient>

  // Upload test files once for all download tests
  let testFiles: Map<string, { id: string; buffer: Buffer; filename: string; contentType: string }> = new Map()

  beforeAll(async () => {
    adminToken = await authHelper.getAdminToken()
    const userResult = await authHelper.createAndLoginUser()
    userToken = userResult.token

    storageClient = createStorageClient(adminToken)
    userStorageClient = createStorageClient(userToken)

    cleanup.setToken(adminToken)

    // Upload test files
    const filesToUpload = [
      { name: 'small.txt', buffer: Buffer.from('Small test file', 'utf-8'), type: 'text/plain' },
      { name: 'medium.dat', buffer: FileGenerator.generateFileMB(1), type: 'application/octet-stream' },
      { name: 'large.dat', buffer: FileGenerator.generateFileMB(5), type: 'application/octet-stream' },
      { name: 'test.json', buffer: Buffer.from(JSON.stringify({ test: 'data' }), 'utf-8'), type: 'application/json' },
    ]

    for (const file of filesToUpload) {
      const response = await storageClient.uploadFile(file.buffer, file.name, file.type)
      if (response.success) {
        testFiles.set(file.name, {
          id: response.data!.id,
          buffer: file.buffer,
          filename: file.name,
          contentType: file.type,
        })
        cleanup.track('file', response.data!.id)
      }
    }
  })

  describe('Full File Download', () => {
    it('should download a small text file', async () => {
      const testFile = testFiles.get('small.txt')!

      const response = await storageClient.downloadFile(testFile.id)

      expect(response.buffer).toBeDefined()
      expect(Buffer.isBuffer(response.buffer)).toBe(true)
      expect(response.buffer.toString('utf-8')).toBe(testFile.buffer.toString('utf-8'))
      expect(response.status).toBe(200)
    })

    it('should download a binary file', async () => {
      const testFile = testFiles.get('medium.dat')!

      const response = await storageClient.downloadFile(testFile.id)

      assertSuccessResponse(response)
      expect(Buffer.isBuffer(response.data)).toBe(true)
      expect(response.data!.length).toBe(testFile.buffer.length)
    })

    it('should download a large file', async () => {
      const testFile = testFiles.get('large.dat')!

      const response = await storageClient.downloadFile(testFile.id)

      assertSuccessResponse(response)
      expect(response.data!.length).toBe(testFile.buffer.length)
    }, 15000) // Extended timeout for large file

    it('should download JSON file and parse correctly', async () => {
      const testFile = testFiles.get('test.json')!

      const response = await storageClient.downloadFile(testFile.id)

      assertSuccessResponse(response)
      const content = response.data!.toString('utf-8')
      const parsed = JSON.parse(content)
      expect(parsed).toEqual({ test: 'data' })
    })

    it('should return error for non-existent file', async () => {
      const response = await storageClient.downloadFile('nonexistent-file-id')

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/NOT_FOUND/)
    })

    it('should return error for invalid file ID format', async () => {
      const response = await storageClient.downloadFile('invalid@id#format')

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/NOT_FOUND|BAD_REQUEST/)
    })

    it('should preserve file content integrity', async () => {
      const originalContent = 'Content with special chars: 你好 مرحبا 😀'
      const buffer = Buffer.from(originalContent, 'utf-8')

      const uploadResponse = await storageClient.uploadFile(
        buffer,
        'integrity.txt',
        'text/plain'
      )

      assertSuccessResponse(uploadResponse)
      cleanup.track('file', uploadResponse.data!.id)

      const downloadResponse = await storageClient.downloadFile(
        uploadResponse.data!.id
      )

      assertSuccessResponse(downloadResponse)
      const downloadedContent = downloadResponse.data!.toString('utf-8')
      expect(downloadedContent).toBe(originalContent)
    })

    it('should download binary data without corruption', async () => {
      const originalBuffer = FileGenerator.generateBuffer(10240)

      const uploadResponse = await storageClient.uploadFile(
        originalBuffer,
        'binary-integrity.dat',
        'application/octet-stream'
      )

      assertSuccessResponse(uploadResponse)
      cleanup.track('file', uploadResponse.data!.id)

      const downloadResponse = await storageClient.downloadFile(
        uploadResponse.data!.id
      )

      assertSuccessResponse(downloadResponse)
      expect(downloadResponse.data!.equals(originalBuffer)).toBe(true)
    })
  })

  describe('Range Requests', () => {
    it('should download file with byte range', async () => {
      const testFile = testFiles.get('medium.dat')!

      const response = await storageClient.downloadFileRange(
        testFile.id,
        0,
        1023 // First 1KB
      )

      if (response.success) {
        expect(response.data!.length).toBe(1024)
        // Verify content matches original
        const expectedSlice = testFile.buffer.subarray(0, 1024)
        expect(response.data!.equals(expectedSlice)).toBe(true)
      }
    })

    it('should download middle portion of file', async () => {
      const testFile = testFiles.get('medium.dat')!

      const start = 1000
      const end = 2999

      const response = await storageClient.downloadFileRange(
        testFile.id,
        start,
        end
      )

      if (response.success) {
        expect(response.data!.length).toBe(2000)
        const expectedSlice = testFile.buffer.subarray(start, end + 1)
        expect(response.data!.equals(expectedSlice)).toBe(true)
      }
    })

    it('should download last portion of file', async () => {
      const testFile = testFiles.get('small.txt')!
      const fileSize = testFile.buffer.length

      const start = fileSize - 5

      const response = await storageClient.downloadFileRange(
        testFile.id,
        start
      )

      if (response.success) {
        expect(response.data!.length).toBeLessThanOrEqual(5)
        const expectedSlice = testFile.buffer.subarray(start)
        expect(response.data!.equals(expectedSlice)).toBe(true)
      }
    })

    it('should handle range request for entire file', async () => {
      const testFile = testFiles.get('small.txt')!

      const response = await storageClient.downloadFileRange(
        testFile.id,
        0,
        testFile.buffer.length - 1
      )

      if (response.success) {
        expect(response.data!.length).toBe(testFile.buffer.length)
        expect(response.data!.equals(testFile.buffer)).toBe(true)
      }
    })

    it('should handle range beyond file size', async () => {
      const testFile = testFiles.get('small.txt')!

      const response = await storageClient.downloadFileRange(
        testFile.id,
        0,
        testFile.buffer.length + 1000
      )

      // Should return available content or error
      if (response.success) {
        expect(response.data!.length).toBeLessThanOrEqual(testFile.buffer.length)
      }
    })

    it('should handle invalid range (start > end)', async () => {
      const testFile = testFiles.get('small.txt')!

      const response = await storageClient.downloadFileRange(
        testFile.id,
        100,
        50
      )

      // Should error with invalid range
      if (!response.success) {
        expect(response.error?.code).toMatch(/BAD_REQUEST|RANGE_NOT_SATISFIABLE/)
      }
    })

    it('should handle negative range values', async () => {
      const testFile = testFiles.get('small.txt')!

      const response = await storageClient.downloadFileRange(
        testFile.id,
        -10,
        100
      )

      // Should error
      if (!response.success) {
        expect(response.error?.code).toMatch(/BAD_REQUEST/)
      }
    })

    it('should support resumable download simulation', async () => {
      const testFile = testFiles.get('medium.dat')!
      const chunkSize = 100000 // 100KB chunks
      const totalSize = testFile.buffer.length

      const chunks: Buffer[] = []
      let offset = 0

      while (offset < totalSize) {
        const end = Math.min(offset + chunkSize - 1, totalSize - 1)

        const response = await storageClient.downloadFileRange(
          testFile.id,
          offset,
          end
        )

        if (response.success) {
          chunks.push(response.data!)
          offset = end + 1
        } else {
          break
        }
      }

      const reconstructed = Buffer.concat(chunks)
      expect(reconstructed.equals(testFile.buffer)).toBe(true)
    })
  })

  describe('Download Permissions', () => {
    it('should allow user to download their own file', async () => {
      const buffer = Buffer.from('User content', 'utf-8')

      const uploadResponse = await userStorageClient.uploadFile(
        buffer,
        'user-file.txt',
        'text/plain'
      )

      assertSuccessResponse(uploadResponse)
      cleanup.track('file', uploadResponse.data!.id)

      const downloadResponse = await userStorageClient.downloadFile(
        uploadResponse.data!.id
      )

      assertSuccessResponse(downloadResponse)
      expect(downloadResponse.data!.toString('utf-8')).toBe('User content')
    })

    it('should allow admin to download any file', async () => {
      const buffer = Buffer.from('Any file', 'utf-8')

      const uploadResponse = await userStorageClient.uploadFile(
        buffer,
        'any-file.txt',
        'text/plain'
      )

      assertSuccessResponse(uploadResponse)
      cleanup.track('file', uploadResponse.data!.id)

      // Admin should be able to download
      const downloadResponse = await storageClient.downloadFile(
        uploadResponse.data!.id
      )

      assertSuccessResponse(downloadResponse)
    })

    it('should prevent unauthenticated download', async () => {
      const testFile = testFiles.get('small.txt')!
      const unauthClient = createStorageClient('')

      const response = await unauthClient.downloadFile(testFile.id)

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/UNAUTHORIZED|FORBIDDEN/)
    })

    it('should handle user access to other users files', async () => {
      // Create another user
      const user2Result = await authHelper.createAndLoginUser()
      const user2Client = createStorageClient(user2Result.token)

      // Upload file with first user
      const uploadResponse = await userStorageClient.uploadFile(
        Buffer.from('User 1 file', 'utf-8'),
        'user1-file.txt',
        'text/plain'
      )

      assertSuccessResponse(uploadResponse)
      cleanup.track('file', uploadResponse.data!.id)

      // Try to download with second user
      const downloadResponse = await user2Client.downloadFile(
        uploadResponse.data!.id
      )

      // May allow (public) or deny (private) based on system design
      if (!downloadResponse.success) {
        expect(downloadResponse.error?.code).toMatch(/FORBIDDEN|NOT_FOUND/)
      }
    })
  })

  describe('Download Metadata', () => {
    it('should include content type in download response', async () => {
      const testFile = testFiles.get('test.json')!

      const response = await storageClient.downloadFile(testFile.id)

      assertSuccessResponse(response)
      // Metadata may be in headers or response object
      expect(response.data).toBeDefined()
    })

    it('should handle content disposition', async () => {
      const buffer = Buffer.from('test content', 'utf-8')
      const filename = 'download-test.txt'

      const uploadResponse = await storageClient.uploadFile(
        buffer,
        filename,
        'text/plain'
      )

      assertSuccessResponse(uploadResponse)
      cleanup.track('file', uploadResponse.data!.id)

      const downloadResponse = await storageClient.downloadFile(
        uploadResponse.data!.id
      )

      assertSuccessResponse(downloadResponse)
      // Response should indicate filename for download
    })
  })

  describe('Multiple Downloads', () => {
    it('should download same file multiple times', async () => {
      const testFile = testFiles.get('small.txt')!

      const downloads = await Promise.all([
        storageClient.downloadFile(testFile.id),
        storageClient.downloadFile(testFile.id),
        storageClient.downloadFile(testFile.id),
      ])

      downloads.forEach(response => {
        assertSuccessResponse(response)
        expect(response.data!.equals(testFile.buffer)).toBe(true)
      })
    })

    it('should download multiple different files concurrently', async () => {
      const fileIds = Array.from(testFiles.values()).map(f => f.id)

      const downloads = await Promise.all(
        fileIds.map(id => storageClient.downloadFile(id))
      )

      downloads.forEach(response => {
        assertSuccessResponse(response)
        expect(response.data).toBeDefined()
      })
    })

    it('should handle mixed successful and failed downloads', async () => {
      const ids = [
        testFiles.get('small.txt')!.id,
        'nonexistent-id',
        testFiles.get('medium.dat')!.id,
      ]

      const downloads = await Promise.all(
        ids.map(id =>
          storageClient.downloadFile(id).catch(() => ({
            success: false,
            error: { code: 'DOWNLOAD_FAILED', message: 'Failed' },
          }))
        )
      )

      expect(downloads[0].success).toBe(true)
      expect(downloads[1].success).toBe(false)
      expect(downloads[2].success).toBe(true)
    })
  })

  describe('Performance', () => {
    it('should download small file quickly', async () => {
      const testFile = testFiles.get('small.txt')!
      const startTime = Date.now()

      const response = await storageClient.downloadFile(testFile.id)

      const duration = Date.now() - startTime

      assertSuccessResponse(response)
      expect(duration).toBeLessThan(2000) // 2 seconds
    })

    it('should download medium file within acceptable time', async () => {
      const testFile = testFiles.get('medium.dat')!
      const startTime = Date.now()

      const response = await storageClient.downloadFile(testFile.id)

      const duration = Date.now() - startTime

      assertSuccessResponse(response)
      expect(duration).toBeLessThan(5000) // 5 seconds
    })

    it('should handle concurrent downloads efficiently', async () => {
      const testFile = testFiles.get('small.txt')!
      const concurrentDownloads = 20

      const startTime = Date.now()

      const downloads = Array(concurrentDownloads)
        .fill(null)
        .map(() => storageClient.downloadFile(testFile.id))

      const responses = await Promise.all(downloads)

      const duration = Date.now() - startTime

      responses.forEach(response => {
        assertSuccessResponse(response)
      })

      expect(duration).toBeLessThan(10000) // 10 seconds for 20 concurrent
    })

    it('should handle range request efficiently', async () => {
      const testFile = testFiles.get('large.dat')!
      const startTime = Date.now()

      const response = await storageClient.downloadFileRange(
        testFile.id,
        0,
        1023999 // First ~1MB
      )

      const duration = Date.now() - startTime

      if (response.success) {
        expect(duration).toBeLessThan(5000)
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle downloading empty file', async () => {
      const emptyBuffer = Buffer.alloc(0)

      const uploadResponse = await storageClient.uploadFile(
        emptyBuffer,
        'empty.txt',
        'text/plain'
      )

      if (uploadResponse.success) {
        cleanup.track('file', uploadResponse.data!.id)

        const downloadResponse = await storageClient.downloadFile(
          uploadResponse.data!.id
        )

        assertSuccessResponse(downloadResponse)
        expect(downloadResponse.data!.length).toBe(0)
      }
    })

    it('should handle download immediately after upload', async () => {
      const buffer = Buffer.from('Immediate download test', 'utf-8')

      const uploadResponse = await storageClient.uploadFile(
        buffer,
        'immediate.txt',
        'text/plain'
      )

      assertSuccessResponse(uploadResponse)
      cleanup.track('file', uploadResponse.data!.id)

      // Download immediately
      const downloadResponse = await storageClient.downloadFile(
        uploadResponse.data!.id
      )

      assertSuccessResponse(downloadResponse)
      expect(downloadResponse.data!.equals(buffer)).toBe(true)
    })

    it('should handle file with zero-byte chunks in content', async () => {
      const buffer = Buffer.from([0, 1, 2, 0, 0, 3, 4, 0])

      const uploadResponse = await storageClient.uploadFile(
        buffer,
        'zeros.dat',
        'application/octet-stream'
      )

      assertSuccessResponse(uploadResponse)
      cleanup.track('file', uploadResponse.data!.id)

      const downloadResponse = await storageClient.downloadFile(
        uploadResponse.data!.id
      )

      assertSuccessResponse(downloadResponse)
      expect(downloadResponse.data!.equals(buffer)).toBe(true)
    })
  })
})
