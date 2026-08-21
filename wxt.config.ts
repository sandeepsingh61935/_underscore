import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';

/**
 * Stable Firefox / AMO extension ID.
 * MUST NOT change after the first AMO submission (updates bind to this id).
 */
const FIREFOX_EXTENSION_ID = 'underscore-highlighter@underscore';

/** Shared host permissions (Chrome host_permissions / Firefox MV2 permissions). */
const HOST_PERMISSIONS = [
  'https://generativelanguage.googleapis.com/*',
  'https://api.anthropic.com/*',
  'https://api.openai.com/*',
  'https://api.x.ai/*',
  'https://openrouter.ai/*',
  // Pin this Supabase project only (auth + billing edge)
  'https://cuzwaukxagefyvtxbqmi.supabase.co/*',
  // Polar checkout tabs (navigation; host also validated in openBillingUrl)
  'https://polar.sh/*',
  'https://sandbox.polar.sh/*',
  'https://buy.polar.sh/*',
  // Local Ollama + MCP bridge only — agent hosts use MCP, not in-app LLM.
  'http://localhost:11434/*',
  'http://127.0.0.1:11434/*',
  'http://127.0.0.1:17342/*',
  'ws://127.0.0.1:17342/*',
] as const;

export default defineConfig({
  srcDir: 'src',
  // Chrome MV3 + Firefox MV3 (WXT emits Firefox background as scripts[]).
  // Override per CLI with --mv2 if ever needed.
  manifestVersion: 3,
  manifest: ({ browser }) => {
    const base = {
      name: 'Underscore Highlighter',
      // Chrome/AMO short description — product job, no internal mode names.
      description:
        'Highlight the web. Save passages to a library you can search, export, and sync.',
      permissions: ['activeTab', 'storage', 'alarms', 'identity'] as string[],
      host_permissions: [...HOST_PERMISSIONS],
    };

    if (browser === 'firefox') {
      return {
        ...base,
        browser_specific_settings: {
          gecko: {
            id: FIREFOX_EXTENSION_ID,
            // data_collection_permissions requires Firefox 140+ (AMO linter).
            strict_min_version: '140.0',
            // Allowed enum: mozilla addons-linter CommonDataCollectionPermission.
            // websiteContent / websiteActivity: highlight text + page URLs.
            // personallyIdentifyingInfo: account email (not legacy "contactInfo").
            // authenticationInfo: sign-in / session.
            data_collection_permissions: {
              required: [
                'websiteContent',
                'websiteActivity',
                'personallyIdentifyingInfo',
                'authenticationInfo',
              ],
            },
          },
        },
      };
    }

    // Chrome / Chromium — keep chrome-only identity + web-app bridge fields.
    return {
      ...base,
      externally_connectable: {
        // WP-3: pin to our app origin only (no project-wide Pages wildcard)
        matches: [
          'http://localhost/*',
          'http://127.0.0.1/*',
          'https://underscore-web.pages.dev/*',
        ],
      },
      // Stable Chrome extension ID across installs (public key only).
      key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAscBF885yu+HLeXanKa1oI4xU54hpAIWJcW5hq66TDiXinG2zELpD450LeV3sFI9aBwdhK1yALi/avAoaDhMqgH4z5LEMIZ22QYA2oJ4sQWcY69LHd06EzFY5mW3ToILHoFEs8U6xe/yvO6Jy2DevRmzIpo36x6Ij2orFBfnWzW2oBQaZSbTos3x8a1TO8MtniTulLk1D7mbp9Fa4ynTadydVopcw0HmzzGl7ZwxSUpkMgP0P3KxzHFQBD4VlEzvwXew13HtL2gQ8JR8I5SniLQ54M9z028+zqKRghbJXecbSRtkuJRxFejN1Zx8K0fzVrd2QCaQGYO9Qv6xz/scecwIDAQAB',
      oauth2: {
        client_id:
          '753957667832-vmlcua87mf5umcbkbj93e4uu8qdfa9rj.apps.googleusercontent.com',
        scopes: ['openid', 'email', 'profile'],
      },
    };
  },
  zip: {
    name: 'underscore-highlighter',
    // AMO requires readable sources when the package is minified.
    zipSources: true,
    excludeSources: [
      '.output/**',
      'dist/**',
      'dist-web/**',
      'graphify-out/**',
      'src/graphify-out/**',
      '.worktrees/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      '.env',
      '.env.*',
      '!.env.production.example',
      '!.env.example',
    ],
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
