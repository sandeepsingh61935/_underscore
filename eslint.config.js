import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import promisePlugin from 'eslint-plugin-promise';
import securityPlugin from 'eslint-plugin-security';
import unicornPlugin from 'eslint-plugin-unicorn';
import prettierConfig from 'eslint-config-prettier';

export default [
    // Global ignores
    {
        ignores: [
            'node_modules/**',
            'dist/**',
            'build/**',
            '.tsbuildinfo',
            'coverage/**',
            'test-results/**',
            'playwright-report/**',
            '.wxt',
            '.eslintrc.legacy.js',
            '.prettierrc.js'
        ],
    },

    // Base JavaScript config
    js.configs.recommended,

    // TypeScript files
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
                    caughtErrorsIgnorePattern: '^_'
                },
            ],
            '@typescript-eslint/consistent-type-imports': [
                'error',
                { prefer: 'type-imports' },
            ],

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
                    groups: [
                        'builtin',
                        'external',
                        'internal',
                        'parent',
                        'sibling',
                        'index',
                    ],
                    'newlines-between': 'always',
                    alphabetize: { order: 'asc', caseInsensitive: true },
                },
            ],

            // Promise rules
            'promise/always-return': 'error',
            'promise/catch-or-return': 'error',

            // Security rules
            'security/detect-object-injection': 'off', // Too many false positives
        },
    },

    // Test files - relaxed rules
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
    },

    // Definition files
    {
        files: ['**/*.d.ts'],
        rules: {
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },

    // Config files
    {
        files: ['*.config.{js,ts}', '*.config.*.{js,ts}'],
        rules: {
            '@typescript-eslint/no-var-requires': 'off',
        },
    },

    // Legacy Shared Utils - Suppress technical debt
    {
        files: [
            'src/shared/utils/*.ts',
            'src/shared/coordination/*.ts',
            'src/shared/types/*.ts',
            'src/shared/services/*.ts',
            'src/shared/repositories/*.ts'
        ],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/consistent-type-assertions': 'off',
        },
    },

    // Prettier must be last
    prettierConfig,
];
