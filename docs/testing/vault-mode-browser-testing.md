# Testing Vault Mode in Browser

## Quick Start (5 minutes)

### Step 1: Build the Extension
```bash
# Build for development (with source maps for debugging)
npm run build

# OR for production (optimized, smaller)
npm run build:prod
```

### Step 2: Load Extension in Chrome

1. **Open Chrome Extensions Page:**
   - Navigate to `chrome://extensions/`
   - OR: Menu → More Tools → Extensions

2. **Enable Developer Mode:**
   - Toggle "Developer mode" in top-right corner

3. **Load Unpacked Extension:**
   - Click "Load unpacked"
   - Select the `dist/` folder from your project
   - Extension should appear with your icon

### Step 3: Test Vault Mode Features

#### Test 1: Save a Highlight
1. Navigate to any webpage (e.g., Wikipedia article)
2. Select some text
3. Open browser DevTools (F12)
4. Go to Console tab
5. Check IndexedDB:
   ```javascript
   // Open IndexedDB viewer
   // Application tab → Storage → IndexedDB → VaultModeDB
   ```

#### Test 2: Verify Multi-Selector Storage
```javascript
// In console, check what was stored:
const db = await indexedDB.databases();
console.log(db); // Should see 'VaultModeDB'

// Open DB and check highlights
const request = indexedDB.open('VaultModeDB');
request.onsuccess = (event) => {
  const db = event.target.result;
  const tx = db.transaction(['highlights'], 'readonly');
  const store = tx.objectStore('highlights');
  const getAll = store.getAll();
  
  getAll.onsuccess = () => {
    console.log('Stored highlights:', getAll.result);
    // Each should have metadata.selectors with xpath, position, fuzzy
  };
};
```

#### Test 3: Restore After Page Reload
1. Create a highlight on a page
2. Reload the page (Ctrl+R or F5)
3. Highlights should re-appear automatically
4. Check console for restoration logs:
   - "🔄 Restoring X highlights for URL"
   - "✅ Restored X/Y highlights"

#### Test 4: Test 3-Tier Fallback
1. **XPath Test:** Create highlight, reload → should restore
2. **Position Test:** 
   - Create highlight
   - Modify DOM slightly (inspect element, wrap in `<span>`)
   - Reload → should still restore
3. **Fuzzy Test:**
   - Create highlight  
   - Edit page content (change words around target)
   - Reload → should still find it if similarity > 80%

### Step 4: Debug with Browser DevTools

#### Check Logs:
```javascript
// Vault Mode service logs
// Look for these emoji indicators:
// ✅ = Success
// ❌ = Error  
// 🔄 = Processing
// ⚠️ = Warning
```

#### Inspect IndexedDB Directly:
1. DevTools → Application tab
2. Storage → IndexedDB → VaultModeDB
3. Expand to see:
   - `highlights` - Your saved highlights
   - `events` - Event sourcing log
   - `collections` - Organization
   - `tags` - Categories

#### View Stored Data:
```javascript
// Check a highlight's selectors
const highlight = await storage.getHighlight('some-id');
console.log(highlight.metadata.selectors);
// Should show:
// - xpath: { xpath: "...", text: "...", ... }
// - position: { startOffset: N, endOffset: M, ... }
// - fuzzy: { text: "...", threshold: 0.8, ... }
```

---

## Advanced Testing

### Test Multi-Selector Fallback Chain

```javascript
// In browser console after installing extension:

// 1. Import the service (if exposed on window)
const service = window.vaultModeService;

// 2. Create test highlight
const range = window.getSelection().getRangeAt(0);
const highlight = {
  version: 2,
  id: crypto.randomUUID(),
  text: range.toString(),
  contentHash: 'a'.repeat(64),
  colorRole: 'yellow',
  type: 'underscore',
  ranges: [],
  createdAt: new Date()
};

// 3. Save
await service.saveHighlight(highlight, range);

// 4. Check stored selectors
const stored = await storage.getHighlight(highlight.id);
console.log('Selectors:', stored.metadata.selectors);

// 5. Reload page and watch restoration
location.reload();
```

### Test Cross-Mode Compatibility

```javascript
// Switch between modes to verify isolation
// Walk Mode → Vault Mode → Sprint Mode
// Each should maintain separate storage
```

---

## Common Issues & Solutions

### Issue: Extension not loading
**Solution:** Check for:
- `manifest.json` in dist/ folder
- Build completed successfully (`dist/` folder exists)
- No TypeScript errors

### Issue: Highlights not saving
**Solution:** Check:
1. DevTools Console for errors
2. IndexedDB permissions granted
3. Content script loaded: `chrome://extensions/` → your extension → "Inspect views"

### Issue: Highlights not restoring
**Solution:** Debug:
```javascript
// Check restoration tier used
const results = await service.restoreHighlightsForUrl();
results.forEach(r => {
  console.log(`ID: ${r.highlight.id}, Tier: ${r.restoredUsing}`);
});
// Should show: 'xpath', 'position', 'fuzzy', or 'failed'
```

### Issue: IndexedDB not visible
**Solution:**
- Refresh DevTools
- Check Application → Clear storage → IndexedDB is enabled
- Ensure page has focus (some browsers restrict background tabs)

---

## Testing Checklist

- [ ] Extension builds without errors
- [ ] Extension loads in Chrome
- [ ] Can create highlights on any webpage
- [ ] IndexedDB shows "VaultModeDB" database
- [ ] Highlights have all 3 selector types (xpath, position, fuzzy)
- [ ] Highlights restore after page reload
- [ ] XPath restoration works (no DOM changes)
- [ ] Position fallback works (minor DOM changes)
- [ ] Fuzzy fallback works (content changes)
- [ ] Multiple highlights on same page
- [ ] Cross-site persistence (different domains)
- [ ] Events created for each action
- [ ] Stats show correct counts

---

## Production Testing Sites

Test on these real-world sites:
1. **Wikipedia** - Static content, good for XPath
2. **Medium** - Dynamic content, tests fuzzy matching
3. **GitHub** - Code snippets, tests positioning
4. **News sites** - Frequently updated, tests resilience

---

## Performance Testing

```javascript
// Test with many highlights
async function stressTest() {
  const ranges = []; // Create 100 selection ranges
  for (let i = 0; i < 100; i++) {
    const highlight = createMockHighlight({ id: `stress-${i}` });
    await service.saveHighlight(highlight, ranges[i]);
  }
  
  // Measure restoration time
  const start = performance.now();
  await service.restoreHighlightsForUrl();
  const end = performance.now();
  console.log(`Restored 100 highlights in ${end - start}ms`);
}
```

---

## Next Steps After Manual Testing

1. ✅ Verify core functionality works
2. Test edge cases (special characters, long text, etc.)
3. Test on different browsers (Firefox, Edge)
4. Test mode switching (Walk ↔ Vault ↔ Sprint)
5. Load test with 1000+ highlights
6. Cross-device sync (if implementing server sync)
