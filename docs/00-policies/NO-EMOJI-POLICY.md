# NO EMOJI POLICY

## Rule: ZERO EMOJI IN SOURCE CODE

### Why?

Chrome MV3 has a bug where emoji (even in comments) cause "not UTF-8 encoded"
errors when loading bundled content scripts.

### What Happened?

1. **Week 1**: Added emoji for "visual logging" (🔄, ✅, ⚠️, etc.)
2. **In Comments**: Used emoji in comments like `// ✅ Critical fix`
3. **In Strings**: Used emoji in logger calls like `logger.info('✅ Done')`
4. **Bundling**: Vite/Rollup included these emoji in final bundle
5. **Chrome Error**: "Could not load... not UTF-8 encoded"

### Root Cause Analysis:

**Files with Emoji (before fix):**

- `src/entrypoints/content.ts` - 40+ emoji in comments
- `src/content/modes/sprint-mode.ts` - 20+ emoji in comments
- `src/content/modes/walk-mode.ts` - emoji in comments
- `src/shared/services/storage-service.ts` - emoji in logger calls
- `src/services/vault-mode-service.ts` - emoji in logger calls
- `src/services/multi-selector-engine.ts` - emoji in logger calls
- `src/content/vault-mode-init.ts` - emoji in logger calls
- `src/content/utils/range-converter.ts` - emoji in comments

**Total**: 60+ emoji instances across codebase

### The Fix (3-Layer Defense):

#### Layer 1: Remove from Source ✓

```bash
# Remove ALL emoji from source files
find src/ -name "*.ts" -exec sed -i 's/✅/[OK]/g' {} \;
find src/ -name "*.ts" -exec sed -i 's/⚠️/[WARN]/g' {} \;
# etc...
```

#### Layer 2: Terser ASCII-only ✓

```typescript
// wxt.config.ts
vite: () => ({
  build: {
    minify: 'terser',
    terserOptions: {
      format: {
        ascii_only: true, // CRITICAL: Convert all UTF-8 to escape codes
        comments: false, // Remove all comments
      },
    },
  },
});
```

#### Layer 3: CI/CD Check (TODO)

```bash
# Add to package.json scripts
"lint:no-emoji": "! grep -r '✅\\|⚠️\\|❌\\|🔄\\|💡\\|📤\\|🗑️' src/ --include='*.ts'"

# Add to npm run quality
npm run lint:no-emoji
```

### Allowed Alternatives:

**Instead of Emoji, Use:**

- `[OK]`, `[DONE]`, `[SUCCESS]`
- `[WARN]`, `[WARNING]`
- `[ERROR]`, `[FAIL]`
- `[INFO]`, `[DEBUG]`
- `[SYNC]`, `[RESTORE]`, `[DELETE]`

**Prefix Conventions:**

- `[VAULT]` - Vault Mode operations
- `[SELECTOR]` - Multi-selector operations
- `[STORAGE]` - Storage operations
- `[MODE]` - Mode management

### Verification:

```bash
# Should return 0
grep -r "✅\|⚠️\|❌\|🔄\|💡\|📤\|🗑️\|🧹\|🔥\|🎯" src/ --include="*.ts" | wc -l

# Should return 0
LC_ALL=C grep -P '[^\x00-\x7F]' dist/chrome-mv3/content-scripts/content.js | wc -l
```

### enforcement:

1. **Pre-commit Hook**: Add git hook to reject emoji
2. **ESLint Rule**: Add custom rule to ban emoji
3. **CI Check**: Fail builds with emoji
4. **Code Review**: Check for emoji in PRs

### Why Terser ascii_only Works:

Even if emoji slip through, terser converts them:

```javascript
// Source
console.log('✅ Done');

// Output
console.log('\u2705 Done'); // Escape sequence, safe for Chrome
```

### Status:

- ✅ All emoji removed from source
- ✅ Terser configured with ascii_only
- ⏳ CI/CD check pending
- ⏳ Pre-commit hook pending

**NEVER USE EMOJI IN SOURCE CODE AGAIN!**
