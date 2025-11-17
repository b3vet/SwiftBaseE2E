import { randomBytes } from 'crypto'
import { FILE_TYPES, TEST_DEFAULTS } from '@/config/constants'

/**
 * File generator for creating test files
 */
export class FileGenerator {
  /**
   * Generate a random buffer of specified size
   */
  static generateBuffer(sizeInBytes: number): Buffer {
    return randomBytes(sizeInBytes)
  }

  /**
   * Generate a text file
   */
  static generateTextFile(sizeInBytes: number): Buffer {
    const content = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '
      .repeat(Math.ceil(sizeInBytes / 57))
      .slice(0, sizeInBytes)

    return Buffer.from(content, 'utf-8')
  }

  /**
   * Generate a JSON file
   */
  static generateJsonFile(recordCount = 100): Buffer {
    const data = {
      metadata: {
        generated: new Date().toISOString(),
        recordCount,
      },
      records: Array.from({ length: recordCount }, (_, i) => ({
        id: i + 1,
        name: `Record ${i + 1}`,
        value: Math.random() * 1000,
        timestamp: new Date().toISOString(),
      })),
    }

    return Buffer.from(JSON.stringify(data, null, 2), 'utf-8')
  }

  /**
   * Generate a CSV file
   */
  static generateCsvFile(rows = 100): Buffer {
    const header = 'id,name,email,age,active\n'
    const content = Array.from({ length: rows }, (_, i) => {
      return `${i + 1},User ${i + 1},user${i + 1}@example.com,${20 + (i % 50)},${i % 2 === 0}`
    }).join('\n')

    return Buffer.from(header + content, 'utf-8')
  }

  /**
   * Generate a binary file with pattern
   */
  static generateBinaryFile(sizeInBytes: number, pattern?: number): Buffer {
    const buffer = Buffer.alloc(sizeInBytes)

    if (pattern !== undefined) {
      buffer.fill(pattern)
    } else {
      // Random binary data
      return this.generateBuffer(sizeInBytes)
    }

    return buffer
  }

  /**
   * Generate a file of specific size (in KB)
   */
  static generateFileKB(sizeInKB: number): Buffer {
    return this.generateBuffer(sizeInKB * 1024)
  }

  /**
   * Generate a file of specific size (in MB)
   */
  static generateFileMB(sizeInMB: number): Buffer {
    return this.generateBuffer(sizeInMB * 1024 * 1024)
  }

  /**
   * Generate a small file (< 1KB)
   */
  static generateSmallFile(): Buffer {
    return this.generateBuffer(512) // 512 bytes
  }

  /**
   * Generate a medium file (1-10 KB)
   */
  static generateMediumFile(): Buffer {
    return this.generateFileKB(5) // 5 KB
  }

  /**
   * Generate a large file (1-10 MB)
   */
  static generateLargeFile(): Buffer {
    return this.generateFileMB(5) // 5 MB
  }

  /**
   * Generate maximum size file (100MB)
   */
  static generateMaxSizeFile(): Buffer {
    return this.generateFileMB(100)
  }

  /**
   * Generate file just over max size (100MB + 1 byte)
   */
  static generateOverMaxSizeFile(): Buffer {
    return this.generateBuffer(TEST_DEFAULTS.MAX_FILE_SIZE + 1)
  }

  /**
   * Generate an empty file
   */
  static generateEmptyFile(): Buffer {
    return Buffer.alloc(0)
  }

  /**
   * Generate a file with specific content
   */
  static generateFileWithContent(content: string): Buffer {
    return Buffer.from(content, 'utf-8')
  }

  /**
   * Generate a fake image file (PNG-like header)
   */
  static generateFakeImage(sizeInBytes = 1024): Buffer {
    // PNG file signature
    const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
    const remaining = Buffer.alloc(sizeInBytes - pngHeader.length)

    return Buffer.concat([pngHeader, remaining])
  }

  /**
   * Generate a fake PDF file (PDF-like header)
   */
  static generateFakePDF(sizeInBytes = 2048): Buffer {
    const pdfHeader = Buffer.from('%PDF-1.4\n', 'utf-8')
    const pdfFooter = Buffer.from('\n%%EOF\n', 'utf-8')
    const remaining = Buffer.alloc(sizeInBytes - pdfHeader.length - pdfFooter.length)

    return Buffer.concat([pdfHeader, remaining, pdfFooter])
  }

  /**
   * Generate test files set (various sizes)
   */
  static generateTestFileSet(): Array<{ name: string; buffer: Buffer; size: number }> {
    return [
      {
        name: 'small.txt',
        buffer: this.generateSmallFile(),
        size: 512,
      },
      {
        name: 'medium.txt',
        buffer: this.generateMediumFile(),
        size: 5 * 1024,
      },
      {
        name: 'data.json',
        buffer: this.generateJsonFile(50),
        size: this.generateJsonFile(50).length,
      },
      {
        name: 'data.csv',
        buffer: this.generateCsvFile(100),
        size: this.generateCsvFile(100).length,
      },
      {
        name: 'image.png',
        buffer: this.generateFakeImage(2048),
        size: 2048,
      },
    ]
  }

  /**
   * Get file info
   */
  static getFileInfo(buffer: Buffer): {
    size: number
    sizeKB: number
    sizeMB: number
    isEmpty: boolean
    isOverMaxSize: boolean
  } {
    const size = buffer.length

    return {
      size,
      sizeKB: size / 1024,
      sizeMB: size / (1024 * 1024),
      isEmpty: size === 0,
      isOverMaxSize: size > TEST_DEFAULTS.MAX_FILE_SIZE,
    }
  }

  /**
   * Generate filename with timestamp
   */
  static generateFilename(prefix = 'test', extension = '.txt'): string {
    const timestamp = Date.now()
    return `${prefix}_${timestamp}${extension}`
  }

  /**
   * Generate unique filename
   */
  static generateUniqueFilename(extension = '.txt'): string {
    const randomStr = randomBytes(8).toString('hex')
    return `file_${randomStr}${extension}`
  }
}

/**
 * Convenience exports
 */
export const generateBuffer = FileGenerator.generateBuffer.bind(FileGenerator)
export const generateTextFile = FileGenerator.generateTextFile.bind(FileGenerator)
export const generateJsonFile = FileGenerator.generateJsonFile.bind(FileGenerator)
export const generateCsvFile = FileGenerator.generateCsvFile.bind(FileGenerator)
export const generateFileKB = FileGenerator.generateFileKB.bind(FileGenerator)
export const generateFileMB = FileGenerator.generateFileMB.bind(FileGenerator)
export const generateSmallFile = FileGenerator.generateSmallFile.bind(FileGenerator)
export const generateMediumFile = FileGenerator.generateMediumFile.bind(FileGenerator)
export const generateLargeFile = FileGenerator.generateLargeFile.bind(FileGenerator)
export const generateMaxSizeFile = FileGenerator.generateMaxSizeFile.bind(FileGenerator)
export const generateFilename = FileGenerator.generateFilename.bind(FileGenerator)
