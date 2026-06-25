import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import promisePlugin from 'eslint-plugin-promise';
import securityPlugin from 'eslint-plugin-security';
import unicornPlugin from 'eslint-plugin-unicorn';
import prettierConfig from 'eslint-config-prettier';

export default [// Global ignores
{
  ignores: [
    'node_modules/**',
    'dist/**',
    'build/**',
    '.tsbuildinfo',
    'coverage/**',
    'test-results/**',
    'playwright-report/**',
    '.wxt/**',
    '.output/**',
    '.eslintrc.legacy.cjs',
    '.prettierrc.cjs',
  ],
}, // Base JavaScript config
js.configs.recommended, // TypeScript files
{
  files: ['**/*.ts', '**/*.tsx'],
  languageOptions: {
    parser: tsparser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      project: './tsconfig.eslint.json',
    },
    globals: {
      console: 'readonly',
      process: 'readonly',
      chrome: 'readonly',
      browser: 'readonly',
      defineContentScript: 'readonly',
      defineBackground: 'readonly',
      defineUnlistedScript: 'readonly',
      // Standard DOM globals
      getComputedStyle: 'readonly',
      MutationObserver: 'readonly',
      HTMLElement: 'readonly',
      Element: 'readonly',
      Node: 'readonly',
      MouseEvent: 'readonly',
      Range: 'readonly',
      Selection: 'readonly',
      fetch: 'readonly',
      location: 'readonly',
      // Node/JSDOM globals
      global: 'readonly',
      crypto: 'readonly',
      Buffer: 'readonly',
      // DOM globals for tests
      document: 'readonly',
      window: 'readonly',
      navigator: 'readonly',
      setTimeout: 'readonly',
      clearTimeout: 'readonly',
      setInterval: 'readonly',
      clearInterval: 'readonly',
      performance: 'readonly',
      // Browser globals
      atob: 'readonly',
      btoa: 'readonly',
      TextEncoder: 'readonly',
      TextDecoder: 'readonly',
      // Vitest globals
      describe: 'readonly',
      it: 'readonly',
      expect: 'readonly',
      vi: 'readonly',
      beforeEach: 'readonly',
      afterEach: 'readonly',
      beforeAll: 'readonly',
      afterAll: 'readonly',
    },
  },
  plugins: {
    '@typescript-eslint': tseslint,
    import: importPlugin,
    promise: promisePlugin,
    security: securityPlugin,
    unicorn: unicornPlugin,
  },
  rules: {
    // TypeScript-specific
    'no-unused-vars': 'off',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': [
      'error',
      {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
      },
    ],
    '@typescript-eslint/consistent-type-assertions': [
      'error',
      {
        assertionStyle: 'as',
        objectLiteralTypeAssertions: 'never',
      },
    ],
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],

    // Code quality
    complexity: 'off',
    'max-depth': ['error', 4],
    'max-params': ['error', 4],
    'prefer-const': 'error',
    'no-var': 'error',
    eqeqeq: ['error', 'always'],
    'no-console': ['warn', { allow: ['warn', 'error'] }],

    // Import rules
    'import/no-unresolved': 'off', // TypeScript handles this
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],

    // Promise rules
    'promise/always-return': 'error',
    'promise/catch-or-return': 'error',

    // Security rules
    'security/detect-object-injection': 'off', // Too many false positives

    // ── Design System Enforcement ─────────────────────────────────────────────
    // Bans Style C Hybrid CSS variable aliases from TSX files.
    // These vars exist in global.css as a temporary alias layer but must NOT
    // appear in component code. Use MD3 Tailwind classes instead.
    // Reference: .agent/workflows/ui-code-contracts.md §2
    'no-restricted-syntax': [
      'error', // Migration mode (M1–M4): set back to 'error' once all violations are resolved (0 count).
      {
        selector: 'Literal[value=/var\\(--(?:bg|bg-card|bg-elevated|bg-glass|text-primary|text-secondary|text-tertiary|accent(?!-text|-soft)?|accent-soft|accent-text|border(?!-)|border-hover|radius(?!-)|radius-sm|radius-lg|radius-full|shadow-rest|shadow-hover)/]',
        message:
          'Style C Hybrid CSS var banned in component code. Use MD3 Tailwind classes instead. See .agent/workflows/ui-code-contracts.md §2 for the full replacement table.',
      },
      {
        selector: 'JSXAttribute[name.name="onMouseEnter"] > JSXExpressionContainer > ArrowFunctionExpression > BlockStatement > ExpressionStatement > AssignmentExpression[left.object.property.name="style"]',
        message:
          'JS DOM style mutation in onMouseEnter is banned. Use Tailwind hover: utilities instead (e.g. hover:shadow-elevation-3). See .agent/workflows/ui-code-contracts.md §6.',
      },
      {
        selector: 'JSXAttribute[name.name="onMouseLeave"] > JSXExpressionContainer > ArrowFunctionExpression > BlockStatement > ExpressionStatement > AssignmentExpression[left.object.property.name="style"]',
        message:
          'JS DOM style mutation in onMouseLeave is banned. Use Tailwind hover: utilities instead. See .agent/workflows/ui-code-contracts.md §6.',
      },
      {
        selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
        message: 'Hardcoded hex colors are banned. Use V2 tokens instead. See ui_kits/extension/v2/tokens.css.',
      },
      {
        selector: 'Literal[value=/duration-\\[[0-9]+ms\\]/]',
        message: 'Arbitrary duration Tailwind classes are banned. Use V2 tokens instead. See ui_kits/extension/v2/tokens.css.',
      },
      {
        selector: 'JSXOpeningElement[name.name="button"] JSXAttribute[name.name="className"] Literal[value=/(?:^|\\s)h-(?:7|8|9|10)(?:\\s|$)/]',
        message: 'Undersized touch target on button (h-7, h-8, h-9, h-10). Minimum 44px required. See ui_kits/extension/v2/tokens.css.',
      },
      {
        selector: 'JSXOpeningElement:has(JSXAttribute[name.name="role"][value.value="button"]) JSXAttribute[name.name="className"] Literal[value=/(?:^|\\s)h-(?:7|8|9|10)(?:\\s|$)/]',
        message: 'Undersized touch target on element with role="button". Minimum 44px required. See ui_kits/extension/v2/tokens.css.',
      },
      {
        selector: 'Literal[value=/[\\u{1F300}-\\u{1F9FF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}\\u{1F600}-\\u{1F64F}\\u{1F680}-\\u{1F6FF}\\u{1F700}-\\u{1F77F}\\u{1F780}-\\u{1F7FF}\\u{1F800}-\\u{1F8FF}\\u{1F900}-\\u{1F9FF}\\u{1FA00}-\\u{1FA6F}\\u{1FA70}-\\u{1FAFF}\\u{2B50}\\u{2B55}]/u]',
        message: 'Emojis are banned in source files to maintain editorial tone. See ui_kits/extension/v2/tokens.css.',
      },
      {
        selector: 'TemplateElement[value.raw=/[\\u{1F300}-\\u{1F9FF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}\\u{1F600}-\\u{1F64F}\\u{1F680}-\\u{1F6FF}\\u{1F700}-\\u{1F77F}\\u{1F780}-\\u{1F7FF}\\u{1F800}-\\u{1F8FF}\\u{1F900}-\\u{1F9FF}\\u{1FA00}-\\u{1FA6F}\\u{1FA70}-\\u{1FAFF}\\u{2B50}\\u{2B55}]/u]',
        message: 'Emojis are banned in source files to maintain editorial tone. See ui_kits/extension/v2/tokens.css.',
      },
      {
        selector: 'JSXText[value=/[\\u{1F300}-\\u{1F9FF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}\\u{1F600}-\\u{1F64F}\\u{1F680}-\\u{1F6FF}\\u{1F700}-\\u{1F77F}\\u{1F780}-\\u{1F7FF}\\u{1F800}-\\u{1F8FF}\\u{1F900}-\\u{1F9FF}\\u{1FA00}-\\u{1FA6F}\\u{1FA70}-\\u{1FAFF}\\u{2B50}\\u{2B55}]/u]',
        message: 'Emojis are banned in source files to maintain editorial tone. See ui_kits/extension/v2/tokens.css.',
      },
      {
        selector: 'Literal[value=/(?:^|\\s)(?:text-muted-foreground|bg-primary|text-on-surface|border-outline-variant|shadow-elevation-[0-9]+)(?:\\s|$)/]',
        message: 'Legacy Tailwind utility classes are banned. Use V2 tokens instead. See ui_kits/extension/v2/tokens.css.',
      },
      {
        selector: 'Literal[value=/(?:^|\\s)(?:rounded-\\[[0-9]+px\\]|text-\\[[0-9]+px\\])(?:\\s|$)/]',
        message: 'Arbitrary shapes or type sizes are banned. Use V2 single-radius and step-based type scales. See ui_kits/extension/v2/tokens.css.',
      }
    ],
  },
}, // Test files - relaxed rules
{
  files: ['**/*.test.ts', '**/*.spec.ts', 'tests/**/*.ts'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    'max-lines-per-function': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    'no-unused-vars': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/consistent-type-assertions': 'off',
  },
}, // Definition files
{
  files: ['**/*.d.ts'],
  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
  },
}, // Config files
{
  files: ['*.config.{js,ts}', '*.config.*.{js,ts}'],
  rules: {
    '@typescript-eslint/no-var-requires': 'off',
  },
}, // Legacy Shared Utils - Suppress technical debt
{
  files: [
    'src/shared/utils/*.ts',
    'src/shared/coordination/*.ts',
    'src/shared/types/*.ts',
    'src/shared/services/*.ts',
    'src/shared/repositories/*.ts',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/consistent-type-assertions': 'off',
  },
}, // no-storybook-files guard (Layer 8 purge)
// Any *.stories.{ts,tsx,js,jsx} file that reaches the linter is an error.
// This fires in CI via `npx eslint src/ --max-warnings 0`, permanently
// blocking reintroduction of Storybook story files.
{
  files: ['**/*.stories.{ts,tsx,js,jsx}'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: 'Program',
        message:
          'Storybook story files are banned (Layer 8 purge). Use V2 wireframes in `ui_kits/extension/v2/` as the implementation spec instead. See `.agent/workflows/v2-ui.md`.',
      },
    ],
  },
}, // Prettier must be last
prettierConfig];
