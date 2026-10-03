import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';

/**
 * Stable Firefox / AMO extension ID.
 * MUST NOT change after the first AMO submission (updates bind to this id).
 */
const FIREFOX_EXTENSION_ID = 'underscore-highlighter@underscore';

/**
 * Host access is optional and requested at use-time — except the account
 * host (Supabase), which is required at install. Sign-in must never prompt
 * for a runtime host permission: the Google OAuth window alone authorizes
 * the app, and a persisted session must survive popup close/reopen with no
 * extra grants.
 * Firefox/AMO always display the literal host string — we cannot rename it.
 * Prefer a first-party API host later (Supabase custom domain or proxy) so the
 * UI does not show the raw project ref.
 */
const OPTIONAL_HOST_PERMISSIONS = [
  // BYOK providers — prompted when connecting that provider
  'https://generativelanguage.googleapis.com/*',
  'https://api.anthropic.com/*',
  'https://api.openai.com/*',
  'https://api.x.ai/*',
  'https://openrouter.ai/*',
  'https://polar.sh/*',
  'https://buy.polar.sh/*',
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
      // Account host is required: auth, sync, and session hydration must work
      // with no runtime permission prompt (Google OAuth window is the only
      // user authorization). Everything else stays optional (BYOK/AI).
      host_permissions: ['https://cuzwaukxagefyvtxbqmi.supabase.co/*'],
      optional_permissions: ['tabs', 'tabGroups'] as string[],
      optional_host_permissions: [...OPTIONAL_HOST_PERMISSIONS],
    };

    if (browser === 'firefox') {
      return {
        ...base,
        browser_specific_settings: {
          gecko: {
            id: FIREFOX_EXTENSION_ID,
            // data_collection_permissions: desktop 140+, Android 142+ (AMO linter).
            strict_min_version: '140.0',
            // Guest-first: only page highlight data required at install.
            // Account/auth types are optional until the user signs in.
            data_collection_permissions: {
              required: ['websiteContent', 'websiteActivity'],
              optional: [
                'personallyIdentifyingInfo',
                'authenticationInfo',
                'browsingActivity',
              ],
            },
          },
          // Silence AMO warning when Android min lags desktop data-consent support.
          gecko_android: {
            strict_min_version: '142.0',
          },
        },
      };
    }

    // Chrome / Chromium — keep chrome-only identity + web-app bridge fields.
    return {
      ...base,
      externally_connectable: {
        // Web install gate + session bridge — pin to app origins only.
        matches: [
          'http://localhost/*',
          'http://127.0.0.1/*',
          'https://underscore-web.pages.dev/*',
          'https://underscore-web-3i0.pages.dev/*',
          'https://underscore-web.vercel.app/*',
          'https://*.vercel.app/*',
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
    server: {
      watch: {
        ignored: [
          '**/graphify-out/**',
          '**/.cache/**',
          '**/dist/**',
          '**/dist-web/**',
          '**/.output/**',
          '**/.git/**',
        ],
      },
    },
    build: {
      target: 'esnext', // Use modern JS
      chunkSizeWarningLimit: 1200,
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
      const isPopup = entrypoints.some((e) => e.type === 'popup' || e.name === 'popup');
      if (!isPopup) return;

      config.build ??= {};
      config.build.chunkSizeWarningLimit = 1200;
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
        return undefined;
      };
    },
  },
});
