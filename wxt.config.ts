import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';

export default defineConfig({
  srcDir: 'src',
  manifest: {
    name: 'Underscore Highlighter',
    description: 'Intelligent web highlighting with Sprint, Vault, and Gen modes',
    permissions: ['activeTab', 'storage', 'alarms', 'identity'],
  },
  vite: () => ({
    plugins: [react()],
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
