module.exports = {
  root: true,

  // ===================================
  // ENVIRONMENT
  // ===================================
  env: {
    browser: true,
    es2022: true,
    webextensions: true,
    node: true,
  },

  // ===================================
  // PARSER & PARSER OPTIONS
  // ===================================
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    createDefaultProgram: false,
  },

  // ===================================
  // PLUGINS
  // ===================================
  plugins: ['@typescript-eslint', 'import', 'promise', 'security', 'unicorn'],

  // ===================================
  // EXTENDS
  // ===================================
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:promise/recommended',
    'plugin:security/recommended',
    'plugin:unicorn/recommended',
    'prettier', // Must be last to override other configs
  ],

  // ===================================
  // SETTINGS
  // ===================================
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
      node: {
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      },
    },
  },

  // ===================================
  // RULES
  // ===================================
  rules: {
    // ─────────────────────────────────
    // TypeScript-Specific Rules
    // ─────────────────────────────────

    // Enforce strict null checks
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': [
      'error',
      {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
      },
    ],

    // Naming conventions
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'default',
        format: ['camelCase'],
        leadingUnderscore: 'forbid',
        trailingUnderscore: 'forbid',
      },
      {
        selector: 'variable',
        format: ['camelCase', 'UPPER_CASE'],
        leadingUnderscore: 'forbid',
      },
      {
        selector: 'parameter',
        format: ['camelCase'],
        leadingUnderscore: 'allow',
      },
      {
        selector: 'memberLike',
        modifiers: ['private'],
        format: ['camelCase'],
        leadingUnderscore: 'allow',
      },
      {
        selector: 'typeLike',
        format: ['PascalCase'],
      },
      {
        selector: 'interface',
        format: ['PascalCase'],
        prefix: ['I'],
      },
      {
        selector: 'enum',
        format: ['PascalCase'],
      },
      {
        selector: 'enumMember',
        format: ['UPPER_CASE'],
      },
    ],

    // Prefer interfaces over type aliases
    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],

    // Require explicit return types on functions
    '@typescript-eslint/explicit-module-boundary-types': 'error',

    // Disallow unused variables
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],

    // Prefer nullish coalescing
    '@typescript-eslint/prefer-nullish-coalescing': 'error',

    // Prefer optional chaining
    '@typescript-eslint/prefer-optional-chain': 'error',

    // Require consistent use of type imports
    '@typescript-eslint/consistent-type-imports': [
      'error',
      {
        prefer: 'type-imports',
      },
    ],

    // Disallow non-null assertions after optional chain
    '@typescript-eslint/no-non-null-asserted-optional-chain': 'error',

    // Prefer readonly for parameters
    '@typescript-eslint/prefer-readonly-parameter-types': 'off', // Too strict for most cases

    // Require Promise-like values to be handled
    '@typescript-eslint/no-floating-promises': 'error',

    // Require await in async functions
    '@typescript-eslint/require-await': 'error',

    // Disallow async functions with no await
    '@typescript-eslint/no-misused-promises': 'error',

    // ─────────────────────────────────
    // Code Quality Rules
    // ─────────────────────────────────

    // Enforce max complexity
    complexity: ['error', 10],

    // Enforce max lines per function
    'max-lines-per-function': [
      'warn',
      {
        max: 50,
        skipBlankLines: true,
        skipComments: true,
      },
    ],

    // Enforce max lines per file
    'max-lines': [
      'warn',
      {
        max: 300,
        skipBlankLines: true,
        skipComments: true,
      },
    ],

    // Enforce max depth
    'max-depth': ['error', 4],

    // Enforce max number of parameters
    'max-params': ['error', 4],

    // Prefer const
    'prefer-const': 'error',

    // Disallow var
    'no-var': 'error',

    // Require ===
    eqeqeq: ['error', 'always'],

    // Disallow console (except warn/error)
    'no-console': [
      'warn',
      {
        allow: ['warn', 'error'],
      },
    ],

    // Disallow debugger
    'no-debugger': 'error',

    // Disallow alert
    'no-alert': 'error',

    // ─────────────────────────────────
    // Import Rules
    // ─────────────────────────────────

    // Ensure imports point to files that exist
    'import/no-unresolved': 'error',

    // Ensure named imports correspond to named exports
    'import/named': 'error',

    // Ensure default import corresponds to default export
    'import/default': 'error',

    // Enforce consistent import order
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],

    // Disallow duplicate imports
    'import/no-duplicates': 'error',

    // Prefer named exports
    'import/prefer-default-export': 'off',
    'import/no-default-export': 'off',

    // ─────────────────────────────────
    // Promise Rules
    // ─────────────────────────────────

    // Enforce proper Promise handling
    'promise/always-return': 'error',
    'promise/catch-or-return': 'error',
    'promise/no-return-wrap': 'error',
    'promise/param-names': 'error',

    // ─────────────────────────────────
    // Security Rules
    // ─────────────────────────────────

    // Disallow eval()
    'security/detect-eval-with-expression': 'error',

    // Disallow non-literal require
    'security/detect-non-literal-require': 'warn',

    // Disallow non-literal fs filename
    'security/detect-non-literal-fs-filename': 'warn',

    // ─────────────────────────────────
    // Unicorn Rules (Best Practices)
    // ─────────────────────────────────

    // Prefer modern API alternatives
    'unicorn/prefer-node-protocol': 'error',
    'unicorn/prefer-module': 'off', // Keep CommonJS for config files

    // Prevent abbreviations
    'unicorn/prevent-abbreviations': [
      'error',
      {
        replacements: {
          props: false,
          ref: false,
          params: false,
          args: false,
          env: false,
        },
      },
    ],

    // Prefer Array.from over spread
    'unicorn/prefer-spread': 'error',

    // Prefer ternary expressions
    'unicorn/prefer-ternary': 'error',

    // Disable filename convention (we use kebab-case)
    'unicorn/filename-case': [
      'error',
      {
        case: 'kebabCase',
      },
    ],

    // Allow null (not just undefined)
    'unicorn/no-null': 'off',

    // Allow array reduce
    'unicorn/no-array-reduce': 'off',
  },

  // ===================================
  // OVERRIDES FOR SPECIFIC FILE TYPES
  // ===================================
  overrides: [
    {
      // Test files
      files: ['**/*.test.ts', '**/*.spec.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'max-lines-per-function': 'off',
        'max-lines': 'off',
      },
    },
    {
      // Configuration files
      files: ['*.config.ts', '*.config.js'],
      rules: {
        'import/no-default-export': 'off',
        '@typescript-eslint/naming-convention': 'off',
      },
    },
    {
      // JavaScript files
      files: ['*.js'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
};
