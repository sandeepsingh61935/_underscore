import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  // Extension metadata
  manifest: {
    name: 'Underscore Highlighter',
    description: 'Intelligent web highlighting with Sprint, Vault, and Gen modes',
    version: '0.1.0',
    permissions: ['activeTab', 'storage'],
  },

  // Development
  dev: {
    server: {
      port: 3000,
    },
  },

  // Build output
  outDir: 'dist',

  // Source directory
  srcDir: 'src',

  // Module resolution
  alias: {
    '@': './src',
    '@/content': './src/content',
    '@/background': './src/background',
    '@/popup': './src/popup',
    '@/shared': './src/shared',
    '@/utils': './src/utils',
    '@/components': './src/components',
    '@/types': './src/types',
  },
});
