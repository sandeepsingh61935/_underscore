# Vault Mode Integration - Quick Fix Guide

## Issues Found:

1. ✅ IndexedDB database created but no object stores
2. ✅ Walk Mode is default (ephemeral, no persistence)

## What I Fixed:

### 1. Created Vault Mode Initializer (`src/content/vault-mode-init.ts`)

- Initializes VaultModeService on page load
- Opens IndexedDB connection (creates schema)
- Restores highlights automatically
- Exposes `window.vaultModeService` for debugging

### 2. Updated Content Script (`src/entrypoints/content.ts`)

- Imports Vault Mode initializer
- Calls initialization before UI setup
- Falls back to Walk Mode if Vault fails

## How to Test:

### Step 1: Rebuild Extension

```bash
npm run build
```

### Step 2: Reload Extension

- Go to `chrome://extensions/`
- Click reload button on \_underscore extension

### Step 3: Test on Any Page

1. Open DevTools Console
2. Refresh the page
3. You should see:
   ```
   🚀 Underscore Highlighter initializing...
   🔄 Initializing Vault Mode...
   ✅ Vault Mode initialized: 0 highlights restored
   💡 VaultModeService available as: window.vaultModeService
   ✅ Vault Mode ready
   ```

### Step 4: Verify IndexedDB Schema

```javascript
// In console - should now work!
const request = indexedDB.open('VaultModeDB');
request.onsuccess = (event) => {
  const db = event.target.result;
  console.log('Object stores:', Array.from(db.objectStoreNames));
  // Should show: ['highlights', 'events', 'collections', 'tags']
};
```

### Step 5: Create a Highlight

1. Select some text
2. Double-click or use context menu
3. Check console for save confirmation
4. Reload page → highlight should restore!

## Debug Commands:

```javascript
// Check service is loaded
window.vaultModeService;

// Get stats
await window.vaultModeService.getStats();
// Returns: { highlightCount, eventCount, ... }

// List all highlights
const highlights = await window.vaultModeService.restoreHighlightsForUrl();
console.log(highlights);

// Clear all data (reset)
await window.vaultModeService.clearAll();
```

## What's Happening Now:

**Before Fix:**

- Extension loads → Walk Mode (ephemeral)
- IndexedDB created but empty (no schema)
- Highlights vanish on reload

**After Fix:**

- Extension loads → Vault Mode initialized
- IndexedDB schema created automatically
- Highlights persist across reloads
- Service exposed for debugging

## Next Steps:

1. Test basic save/restore flow
2. Verify 3-tier restoration (XPath → Position → Fuzzy)
3. Test across different websites
4. Add UI toggle to switch modes (Walk ↔ Vault ↔ Sprint)

The database will now be properly initialized on first load! 🎉
