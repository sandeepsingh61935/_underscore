import path from 'path';
import { fileURLToPath } from 'url';

import { defineConfig } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    // Test environment
    environment: 'jsdom',

    // Global setup
    globals: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],

      // Coverage thresholds
      // Coverage thresholds
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },

      // Exclude from coverage
      exclude: [
        'node_modules/',
        'dist/',
        'build/',
        'tests/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.config.ts',
        '**/types/**',
        '**/*.d.ts',
      ],
    },

    // Test match patterns
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],

    // Setup files
    setupFiles: ['./tests/setup.ts'],

    // Test timeout
    testTimeout: 10000,
  },

  // Path resolution
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/content': path.resolve(__dirname, './src/content'),
      '@/background': path.resolve(__dirname, './src/background'),
      '@/popup': path.resolve(__dirname, './src/popup'),
      '@/shared': path.resolve(__dirname, './src/shared'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/types': path.resolve(__dirname, './src/types'),
    },
  },
});
