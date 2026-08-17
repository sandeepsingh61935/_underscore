import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

import { viteWebLlmProxyPlugin } from './scripts/vite-web-llm-proxy-plugin';

// Vite config for web app (Cloudflare Pages)
// Dev: SPA + ADR-027 /api/llm/* via same proxy handlers as Pages Functions.
export default defineConfig(({ mode }) => {
  // Ensure process.env has VITE_* for the LLM proxy middleware (not only import.meta.env).
  const env = loadEnv(mode, process.cwd(), '');
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return {
    plugins: [react(), viteWebLlmProxyPlugin()],
    publicDir: path.resolve(__dirname, './public-web'),
    build: {
      outDir: 'dist-web',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          /**
           * Split heavy vendors so the entry chunk stays under the 500 kB warning
           * and browsers can cache stable deps independently of app code.
           */
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return;
            }
            if (
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react-router') ||
              id.includes('node_modules/react/') ||
              id.includes('node_modules/scheduler')
            ) {
              return 'react-vendor';
            }
            if (id.includes('@supabase') || id.includes('supabase-js')) {
              return 'supabase';
            }
            if (id.includes('node_modules/xlsx')) {
              return 'xlsx';
            }
            if (
              id.includes('framer-motion') ||
              id.includes('motion-dom') ||
              id.includes('motion-utils')
            ) {
              return 'motion';
            }
            if (
              id.includes('react-markdown') ||
              id.includes('node_modules/remark') ||
              id.includes('node_modules/unified') ||
              id.includes('node_modules/mdast') ||
              id.includes('node_modules/micromark') ||
              id.includes('node_modules/unist') ||
              id.includes('node_modules/hast') ||
              id.includes('node_modules/vfile')
            ) {
              return 'markdown';
            }
            if (id.includes('@radix-ui')) {
              return 'radix';
            }
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            if (id.includes('node_modules/zod')) {
              return 'zod';
            }
            if (id.includes('node_modules/dexie') || id.includes('node_modules/idb')) {
              return 'idb';
            }
            if (id.includes('dompurify')) {
              return 'dompurify';
            }
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      // Bind IPv4 so curl/tools on 127.0.0.1 hit the LLM proxy (default can be ::1 only).
      host: '127.0.0.1',
      open: true,
    },
  };
});
