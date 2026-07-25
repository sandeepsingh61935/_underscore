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
      matches: [
        'http://localhost/*',
        'http://127.0.0.1/*',
        'https://*.pages.dev/*',
      ],
    },
    host_permissions: [
      'https://generativelanguage.googleapis.com/*',
      'https://api.anthropic.com/*',
      'https://api.openai.com/*',
      'https://openrouter.ai/*',
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
