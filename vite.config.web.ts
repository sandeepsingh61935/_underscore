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
