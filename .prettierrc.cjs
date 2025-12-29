module.exports = {
  // ===================================
  // BASIC FORMATTING
  // ===================================

  // Line width
  printWidth: 90,

  // Tab width
  tabWidth: 2,

  // Use spaces instead of tabs
  useTabs: false,

  // Semicolons at the end of statements
  semi: true,

  // Use single quotes
  singleQuote: true,

  // Quote style for object properties
  quoteProps: 'as-needed',

  // ===================================
  // JSX & TRAILING COMMA
  // ===================================

  // Use single quotes in JSX
  jsxSingleQuote: false,

  // Trailing commas
  trailingComma: 'es5',

  // ===================================
  // SPACING
  // ===================================

  // Spaces between brackets in object literals
  bracketSpacing: true,

  // Bracket on same line in JSX
  bracketSameLine: false,

  // Arrow function parentheses
  arrowParens: 'always',

  // ===================================
  // LINE ENDINGS
  // ===================================

  // Line endings (auto-detect)
  endOfLine: 'lf',

  // ===================================
  // PLUGINS & OVERRIDES
  // ===================================

  // Plugins (optional)
  plugins: [],

  // File-specific overrides
  overrides: [
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always',
      },
    },
    {
      files: '*.json',
      options: {
        printWidth: 80,
        tabWidth: 2,
      },
    },
    {
      files: '*.{yml,yaml}',
      options: {
        tabWidth: 2,
        singleQuote: false,
      },
    },
  ],
};
