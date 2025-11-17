import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    isolate: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'src/tests/**',
        '**/*.test.ts',
        '**/*.config.ts',
      ],
    },
    setupFiles: ['./src/tests/setup/global-setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@config': path.resolve(__dirname, './src/config'),
      '@client': path.resolve(__dirname, './src/client'),
      '@types': path.resolve(__dirname, './src/types'),
      '@validators': path.resolve(__dirname, './src/validators'),
      '@helpers': path.resolve(__dirname, './src/helpers'),
      '@fixtures': path.resolve(__dirname, './src/fixtures'),
      '@tests': path.resolve(__dirname, './src/tests'),
    },
  },
})
