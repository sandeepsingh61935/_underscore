import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Vite config for web app (Cloudflare Pages)
export default defineConfig({
    plugins: [react()],
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
        open: true,
    },
});
