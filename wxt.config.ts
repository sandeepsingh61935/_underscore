import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';

export default defineConfig({
  srcDir: 'src',
  // Ponytail: WXT's CLI --mode flag is ignored for env loading; build
  // always resolves to production mode and skips .env.development.
  // Single Supabase project; keep dev vars in .env.development and
  // hardcode mode here so both `wxt` and `wxt build` load them.
  // Side effect: output dir is .output/chrome-mv3-development instead of
  // chrome-mv3. Update any deploy / load paths accordingly.
  mode: 'development',
    manifest: {
    name: 'Underscore Highlighter',
    description: 'Intelligent web highlighting with Basic, Pro, and 10x-Pro modes',
    permissions: ['activeTab', 'storage', 'alarms', 'identity'],
    externally_connectable: {
      // WP-3: pin to our app origin only (no project-wide Pages wildcard)
      matches: [
        'http://localhost/*',
        'http://127.0.0.1/*',
        'https://underscore-web.pages.dev/*',
      ],
    },
    host_permissions: [
      'https://generativelanguage.googleapis.com/*',
      'https://api.anthropic.com/*',
      'https://api.openai.com/*',
      'https://api.x.ai/*',
      'https://openrouter.ai/*',
      // WP-3: pin this Supabase project only (auth + billing edge)
      'https://cuzwaukxagefyvtxbqmi.supabase.co/*',
      // Polar checkout tabs (navigation; host also validated in openBillingUrl)
      'https://polar.sh/*',
      'https://sandbox.polar.sh/*',
      'https://buy.polar.sh/*',
      // Local Ollama + MCP bridge only — agent hosts (Cursor, etc.) use MCP, not in-app LLM.
      'http://localhost:11434/*',
      'http://127.0.0.1:11434/*',
      'http://127.0.0.1:17342/*',
      'ws://127.0.0.1:17342/*',
    ],
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAscBF885yu+HLeXanKa1oI4xU54hpAIWJcW5hq66TDiXinG2zELpD450LeV3sFI9aBwdhK1yALi/avAoaDhMqgH4z5LEMIZ22QYA2oJ4sQWcY69LHd06EzFY5mW3ToILHoFEs8U6xe/yvO6Jy2DevRmzIpo36x6Ij2orFBfnWzW2oBQaZSbTos3x8a1TO8MtniTulLk1D7mbp9Fa4ynTadydVopcw0HmzzGl7ZwxSUpkMgP0P3KxzHFQBD4VlEzvwXew13HtL2gQ8JR8I5SniLQ54M9z028+zqKRghbJXecbSRtkuJRxFejN1Zx8K0fzVrd2QCaQGYO9Qv6xz/scecwIDAQAB',
    oauth2: {
      client_id: '753957667832-vmlcua87mf5umcbkbj93e4uu8qdfa9rj.apps.googleusercontent.com',
      scopes: ['openid', 'email', 'profile'],
    },
  },
  vite: () => ({
    plugins: [react()],
    build: {
      target: 'esnext', // Use modern JS
      modulePreload: {
        polyfill: false,
        resolveDependencies: () => [],
      },
      // Content scripts use inlineDynamicImports — never set manualChunks here.
      // Vendor splits applied via hooks.vite:build:extendConfig for popup only.
      minify: 'terser',
      terserOptions: {
        format: {
          ascii_only: true,
          comments: false,
        },
      },
    },
  }),
  hooks: {
    /**
     * Split heavy popup vendors (react, supabase, xlsx, motion, …).
     * Must not run for content-script builds (IIFE + inlineDynamicImports).
     */
    'vite:build:extendConfig': (entrypoints, config) => {
      const isPopup = entrypoints.some(
        (e) => e.type === 'popup' || e.name === 'popup',
      );
      if (!isPopup) return;

      config.build ??= {};
      config.build.chunkSizeWarningLimit = 600;
      config.build.rollupOptions ??= {};
      const output = config.build.rollupOptions.output;
      const outputObj = Array.isArray(output) ? output[0] : output;
      const target = outputObj ?? {};
      if (Array.isArray(config.build.rollupOptions.output)) {
        config.build.rollupOptions.output[0] = target;
      } else {
        config.build.rollupOptions.output = target;
      }

      target.manualChunks = (id: string): string | undefined => {
        if (!id.includes('node_modules')) return;
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
        if (id.includes('lucide-react')) {
          return 'icons';
        }
        if (id.includes('node_modules/zod')) {
          return 'zod';
        }
        if (id.includes('dompurify')) {
          return 'dompurify';
        }
        return undefined;
      };
    },
  },
});
