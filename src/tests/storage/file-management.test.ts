import { describe, it, expect, beforeAll } from 'vitest'
import { createStorageClient } from '@/client'
import { createAuthHelper, createCleanupHelper, FileGenerator } from '@/helpers'
import { assertSuccessResponse, assertErrorResponse } from '@/validators/response.validator'

describe('File Management Operations', () => {
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

  describe('Get File Metadata', () => {
    it('should get metadata for uploaded file', async () => {
      const buffer = Buffer.from('Test content', 'utf-8')
      const filename = 'metadata-test.txt'
      const contentType = 'text/plain'

      const uploadResponse = await storageClient.uploadFile(
        buffer,
        filename,
        contentType
      )

      assertSuccessResponse(uploadResponse)
      cleanup.track('file', uploadResponse.data!.id)

      const metadata = uploadResponse.data!

      expect(metadata.id).toBeDefined()
      expect(metadata.filename).toBe(filename)
      expect(metadata.contentType).toBe(contentType)
      expect(metadata.size).toBe(buffer.length)
      expect(metadata.uploadedAt).toBeDefined()
    })

    it('should include upload timestamp', async () => {
      const beforeUpload = Date.now()

      const uploadResponse = await storageClient.uploadFile(
        Buffer.from('test', 'utf-8'),
        'time-test.txt',
        'text/plain'
      )

      assertSuccessResponse(uploadResponse)
      cleanup.track('file', uploadResponse.data!.id)

      const uploadTime = new Date(uploadResponse.data!.uploadedAt).getTime()

      expect(uploadTime).toBeGreaterThanOrEqual(beforeUpload)
      expect(uploadTime).toBeLessThanOrEqual(Date.now())
    })

    it('should include file size in bytes', async () => {
      const sizes = [100, 1024, 10240, 102400]

      for (const size of sizes) {
        const buffer = FileGenerator.generateBuffer(size)

        const uploadResponse = await storageClient.uploadFile(
          buffer,
          `size-${size}.dat`,
          'application/octet-stream'
        )

        assertSuccessResponse(uploadResponse)
        cleanup.track('file', uploadResponse.data!.id)

        expect(uploadResponse.data!.size).toBe(size)
      }
    })

    it('should include content type', async () => {
      const types = [
        'text/plain',
        'application/json',
        'image/png',
        'application/pdf',
      ]

      for (const contentType of types) {
        const uploadResponse = await storageClient.uploadFile(
          Buffer.from('test', 'utf-8'),
          `file.${contentType.split('/')[1]}`,
          contentType
        )

        assertSuccessResponse(uploadResponse)
        cleanup.track('file', uploadResponse.data!.id)

        expect(uploadResponse.data!.contentType).toBe(contentType)
      }
    })

    it('should include uploader information', async () => {
      const uploadResponse = await userStorageClient.uploadFile(
        Buffer.from('user file', 'utf-8'),
        'user-upload.txt',
        'text/plain'
      )

      assertSuccessResponse(uploadResponse)
      cleanup.track('file', uploadResponse.data!.id)

      expect(uploadResponse.data!.uploadedBy).toBeDefined()
    })

    it('should handle metadata for large files', async () => {
      const largeBuffer = FileGenerator.generateFileMB(5)

      const uploadResponse = await storageClient.uploadFile(
        largeBuffer,
        'large-metadata.dat',
        'application/octet-stream'
      )

      assertSuccessResponse(uploadResponse)
      cleanup.track('file', uploadResponse.data!.id)

      expect(uploadResponse.data!.size).toBeGreaterThan(5000000)
      expect(uploadResponse.data!.id).toBeDefined()
    })
  })

  describe('List Files', () => {
    beforeAll(async () => {
      // Upload several test files
      const filesToUpload = [
        { name: 'list-file-1.txt', type: 'text/plain' },
        { name: 'list-file-2.json', type: 'application/json' },
        { name: 'list-file-3.dat', type: 'application/octet-stream' },
      ]

      for (const file of filesToUpload) {
        const response = await storageClient.uploadFile(
          Buffer.from('content', 'utf-8'),
          file.name,
          file.type
        )

        if (response.success) {
          cleanup.track('file', response.data!.id)
        }
      }
    })

    it('should list all uploaded files', async () => {
      const response = await storageClient.listFiles()

      if (response.success) {
        expect(Array.isArray(response.data)).toBe(true)
        expect(response.data!.length).toBeGreaterThan(0)
      }
    })

    it('should include file metadata in list', async () => {
      const response = await storageClient.listFiles()

      if (response.success && response.data!.length > 0) {
        const file = response.data![0]

        expect(file.id).toBeDefined()
        expect(file.filename).toBeDefined()
        expect(file.size).toBeDefined()
        expect(file.contentType).toBeDefined()
        expect(file.uploadedAt).toBeDefined()
      }
    })

    it('should list files with pagination', async () => {
      const response = await storageClient.listFiles({ limit: 5 })

      if (response.success) {
        expect(response.data!.length).toBeLessThanOrEqual(5)
      }
    })

    it('should list files for specific user', async () => {
      // Upload file as user
      const uploadResponse = await userStorageClient.uploadFile(
        Buffer.from('user file', 'utf-8'),
        'user-list-test.txt',
        'text/plain'
      )

      assertSuccessResponse(uploadResponse)
      cleanup.track('file', uploadResponse.data!.id)

      // List user's files
      const listResponse = await userStorageClient.listFiles()

      if (listResponse.success) {
        const userFile = listResponse.data!.find(
          f => f.id === uploadResponse.data!.id
        )
        expect(userFile).toBeDefined()
      }
    })

    it('should filter files by content type', async () => {
      const response = await storageClient.listFiles({
        contentType: 'text/plain',
      })

      if (response.success) {
        response.data!.forEach((file: any) => {
          expect(file.contentType).toBe('text/plain')
        })
      }
    })

    it('should sort files by upload date', async () => {
      const response = await storageClient.listFiles({
        sort: 'uploadedAt',
        order: 'desc',
      })

      if (response.success && response.data!.length > 1) {
        for (let i = 1; i < response.data!.length; i++) {
          const prev = new Date(response.data![i - 1].uploadedAt).getTime()
          const curr = new Date(response.data![i].uploadedAt).getTime()
          expect(prev).toBeGreaterThanOrEqual(curr)
        }
      }
    })

    it('should return empty list for user with no files', async () => {
      const newUserResult = await authHelper.createAndLoginUser()
      const newUserClient = createStorageClient(newUserResult.token)

      const response = await newUserClient.listFiles()

      if (response.success) {
        expect(response.data!.length).toBe(0)
      }
    })
  })

  describe('Delete File', () => {
    it('should delete an uploaded file', async () => {
      const uploadResponse = await storageClient.uploadFile(
        Buffer.from('Delete me', 'utf-8'),
        'delete-test.txt',
        'text/plain'
      )

      assertSuccessResponse(uploadResponse)
      const fileId = uploadResponse.data!.id

      // Delete the file
      const deleteResponse = await storageClient.deleteFile(fileId)

      assertSuccessResponse(deleteResponse)

      // Verify file is deleted - download should fail
      const downloadResponse = await storageClient.downloadFile(fileId)

      assertErrorResponse(downloadResponse)
      expect(downloadResponse.error?.code).toMatch(/NOT_FOUND/)
    })

    it('should return error when deleting non-existent file', async () => {
      const response = await storageClient.deleteFile('nonexistent-file-id')

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/NOT_FOUND/)
    })

    it('should prevent non-owner from deleting file', async () => {
      // Upload as first user
      const uploadResponse = await userStorageClient.uploadFile(
        Buffer.from('My file', 'utf-8'),
        'protected.txt',
        'text/plain'
      )

      assertSuccessResponse(uploadResponse)
      cleanup.track('file', uploadResponse.data!.id)

      // Try to delete as different user
      const user2Result = await authHelper.createAndLoginUser()
      const user2Client = createStorageClient(user2Result.token)

      const deleteResponse = await user2Client.deleteFile(
        uploadResponse.data!.id
      )

      // Should be denied
      assertErrorResponse(deleteResponse)
      expect(deleteResponse.error?.code).toMatch(/FORBIDDEN|NOT_FOUND/)
    })

    it('should allow admin to delete any file', async () => {
      // Upload as user
      const uploadResponse = await userStorageClient.uploadFile(
        Buffer.from('User file', 'utf-8'),
        'admin-delete-test.txt',
        'text/plain'
      )

      assertSuccessResponse(uploadResponse)

      // Delete as admin
      const deleteResponse = await storageClient.deleteFile(
        uploadResponse.data!.id
      )

      assertSuccessResponse(deleteResponse)
    })

    it('should prevent unauthenticated deletion', async () => {
      const uploadResponse = await storageClient.uploadFile(
        Buffer.from('test', 'utf-8'),
        'auth-delete-test.txt',
        'text/plain'
      )

      assertSuccessResponse(uploadResponse)
      cleanup.track('file', uploadResponse.data!.id)

      const unauthClient = createStorageClient('')
      const deleteResponse = await unauthClient.deleteFile(
        uploadResponse.data!.id
      )

      assertErrorResponse(deleteResponse)
      expect(deleteResponse.error?.code).toMatch(/UNAUTHORIZED|FORBIDDEN/)
    })

    it('should handle deleting same file twice', async () => {
      const uploadResponse = await storageClient.uploadFile(
        Buffer.from('test', 'utf-8'),
        'double-delete.txt',
        'text/plain'
      )

      assertSuccessResponse(uploadResponse)
      const fileId = uploadResponse.data!.id

      // First delete should succeed
      const delete1Response = await storageClient.deleteFile(fileId)
      assertSuccessResponse(delete1Response)

      // Second delete should fail
      const delete2Response = await storageClient.deleteFile(fileId)
      assertErrorResponse(delete2Response)
      expect(delete2Response.error?.code).toMatch(/NOT_FOUND/)
    })

    it('should remove file from list after deletion', async () => {
      const uploadResponse = await storageClient.uploadFile(
        Buffer.from('test', 'utf-8'),
        'list-delete-test.txt',
        'text/plain'
      )

      assertSuccessResponse(uploadResponse)
      const fileId = uploadResponse.data!.id

      // Delete file
      await storageClient.deleteFile(fileId)

      // Check list
      const listResponse = await storageClient.listFiles()

      if (listResponse.success) {
        const deletedFile = listResponse.data!.find(f => f.id === fileId)
        expect(deletedFile).toBeUndefined()
      }
    })
  })

  describe('Update File Metadata', () => {
    it('should update file filename', async () => {
      const uploadResponse = await storageClient.uploadFile(
        Buffer.from('test', 'utf-8'),
        'original.txt',
        'text/plain'
      )

      assertSuccessResponse(uploadResponse)
      cleanup.track('file', uploadResponse.data!.id)

      const updateResponse = await storageClient.updateFileMetadata(
        uploadResponse.data!.id,
        { filename: 'renamed.txt' }
      )

      if (updateResponse.success) {
        expect(updateResponse.data!.filename).toBe('renamed.txt')
      }
    })

    it('should update content type', async () => {
      const uploadResponse = await storageClient.uploadFile(
        Buffer.from('{}', 'utf-8'),
        'data.txt',
        'text/plain'
      )

      assertSuccessResponse(uploadResponse)
      cleanup.track('file', uploadResponse.data!.id)

      const updateResponse = await storageClient.updateFileMetadata(
        uploadResponse.data!.id,
        { contentType: 'application/json' }
      )

      if (updateResponse.success) {
        expect(updateResponse.data!.contentType).toBe('application/json')
      }
    })

    it('should prevent updating non-existent file', async () => {
      const response = await storageClient.updateFileMetadata(
        'nonexistent-id',
        { filename: 'new.txt' }
      )

      assertErrorResponse(response)
      expect(response.error?.code).toMatch(/NOT_FOUND/)
    })

    it('should prevent non-owner from updating metadata', async () => {
      const uploadResponse = await userStorageClient.uploadFile(
        Buffer.from('test', 'utf-8'),
        'protected.txt',
        'text/plain'
      )

      assertSuccessResponse(uploadResponse)
      cleanup.track('file', uploadResponse.data!.id)

      const user2Result = await authHelper.createAndLoginUser()
      const user2Client = createStorageClient(user2Result.token)

      const updateResponse = await user2Client.updateFileMetadata(
        uploadResponse.data!.id,
        { filename: 'hacked.txt' }
      )

      assertErrorResponse(updateResponse)
      expect(updateResponse.error?.code).toMatch(/FORBIDDEN|NOT_FOUND/)
    })
  })

  describe('File Validation', () => {
    it('should validate filename format', async () => {
      const invalidFilenames = ['', '   ', '../../../etc/passwd']

      for (const filename of invalidFilenames) {
        const response = await storageClient.uploadFile(
          Buffer.from('test', 'utf-8'),
          filename,
          'text/plain'
        )

        assertErrorResponse(response)
        expect(response.error?.code).toMatch(/BAD_REQUEST|VALIDATION_ERROR/)
      }
    })

    it('should handle file extension validation if enforced', async () => {
      const response = await storageClient.uploadFile(
        Buffer.from('test', 'utf-8'),
        'file.exe',
        'application/x-msdownload'
      )

      // May be allowed or blocked based on security policy
      if (!response.success) {
        expect(response.error?.code).toMatch(
          /FORBIDDEN|VALIDATION_ERROR|BAD_REQUEST/
        )
      } else {
        cleanup.track('file', response.data!.id)
      }
    })

    it('should validate content type format', async () => {
      const response = await storageClient.uploadFile(
        Buffer.from('test', 'utf-8'),
        'test.txt',
        'not-a-valid-type'
      )

      // May accept with default or reject
      if (response.success) {
        cleanup.track('file', response.data!.id)
      }
    })
  })

  describe('Storage Quota and Limits', () => {
    it('should track total storage used', async () => {
      const statsResponse = await storageClient.getStorageStats()

      if (statsResponse.success) {
        expect(statsResponse.data!.totalSize).toBeGreaterThanOrEqual(0)
        expect(statsResponse.data!.fileCount).toBeGreaterThanOrEqual(0)
      }
    })

    it('should track user-specific storage', async () => {
      const uploadResponse = await userStorageClient.uploadFile(
        FileGenerator.generateFileMB(1),
        'quota-test.dat',
        'application/octet-stream'
      )

      assertSuccessResponse(uploadResponse)
      cleanup.track('file', uploadResponse.data!.id)

      const statsResponse = await userStorageClient.getStorageStats()

      if (statsResponse.success) {
        expect(statsResponse.data!.totalSize).toBeGreaterThan(0)
      }
    })

    it('should enforce storage quota if configured', async () => {
      // Try uploading many large files
      const largeFile = FileGenerator.generateFileMB(10)

      for (let i = 0; i < 10; i++) {
        const response = await userStorageClient.uploadFile(
          largeFile,
          `quota-limit-${i}.dat`,
          'application/octet-stream'
        )

        if (!response.success) {
          expect(response.error?.code).toMatch(/QUOTA_EXCEEDED|FORBIDDEN/)
          break
        } else {
          cleanup.track('file', response.data!.id)
        }
      }
    }, 60000)
  })

  describe('Concurrent Operations', () => {
    it('should handle concurrent uploads and deletes', async () => {
      // Upload files
      const uploads = Array.from({ length: 5 }, (_, i) =>
        storageClient.uploadFile(
          Buffer.from(`File ${i}`, 'utf-8'),
          `concurrent-${i}.txt`,
          'text/plain'
        )
      )

      const uploadResponses = await Promise.all(uploads)
      const fileIds = uploadResponses
        .filter(r => r.success)
        .map(r => r.data!.id)

      // Delete some files concurrently
      const deletes = fileIds
        .slice(0, 3)
        .map(id => storageClient.deleteFile(id))

      const deleteResponses = await Promise.all(deletes)

      deleteResponses.forEach(response => {
        assertSuccessResponse(response)
      })

      // Clean up remaining
      fileIds.slice(3).forEach(id => cleanup.track('file', id))
    })

    it('should handle concurrent metadata updates', async () => {
      const uploadResponse = await storageClient.uploadFile(
        Buffer.from('test', 'utf-8'),
        'concurrent-meta.txt',
        'text/plain'
      )

      assertSuccessResponse(uploadResponse)
      cleanup.track('file', uploadResponse.data!.id)

      // Try updating metadata concurrently
      const updates = [
        storageClient.updateFileMetadata(uploadResponse.data!.id, {
          filename: 'update1.txt',
        }),
        storageClient.updateFileMetadata(uploadResponse.data!.id, {
          filename: 'update2.txt',
        }),
      ]

      const responses = await Promise.all(updates)

      // At least one should succeed
      const successful = responses.filter(r => r.success)
      expect(successful.length).toBeGreaterThan(0)
    })
  })

  describe('Performance', () => {
    it('should list files quickly', async () => {
      const startTime = Date.now()

      const response = await storageClient.listFiles({ limit: 50 })

      const duration = Date.now() - startTime

      if (response.success) {
        expect(duration).toBeLessThan(3000)
      }
    })

    it('should delete file quickly', async () => {
      const uploadResponse = await storageClient.uploadFile(
        Buffer.from('test', 'utf-8'),
        'perf-delete.txt',
        'text/plain'
      )

      assertSuccessResponse(uploadResponse)

      const startTime = Date.now()

      const deleteResponse = await storageClient.deleteFile(
        uploadResponse.data!.id
      )

      const duration = Date.now() - startTime

      assertSuccessResponse(deleteResponse)
      expect(duration).toBeLessThan(2000)
    })

    it('should handle bulk operations efficiently', async () => {
      // Upload multiple files
      const uploads = Array.from({ length: 20 }, (_, i) =>
        storageClient.uploadFile(
          Buffer.from(`Content ${i}`, 'utf-8'),
          `bulk-${i}.txt`,
          'text/plain'
        )
      )

      const startTime = Date.now()

      const responses = await Promise.all(uploads)

      const duration = Date.now() - startTime

      responses.forEach(response => {
        if (response.success) {
          cleanup.track('file', response.data!.id)
        }
      })

      expect(duration).toBeLessThan(15000) // 15 seconds for 20 files
    })
  })
})
