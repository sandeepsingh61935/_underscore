import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  manifest: {
    name: 'Underscore Highlighter',
    description: 'Intelligent web highlighting with Sprint, Vault, and Gen modes',
    permissions: ['activeTab', 'storage', 'alarms', 'identity'],
  },
  vite: () => ({
    build: {
      target: 'esnext', // Use modern JS
      modulePreload: {
        polyfill: false,
        resolveDependencies: () => [],
      },
      rollupOptions: {
        output: {
          // manualChunks removed
        },
      },
      minify: 'terser',
      terserOptions: {
        format: {
          ascii_only: true,
          comments: false,
        },
      },
    },
  }),
});
