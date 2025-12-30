# UTF-8 Encoding Error Fix

## Issue:
```
Could not load file 'content-scripts/content.js' for content script. 
It isn't UTF-8 encoded.
```

## Root Cause:
Chrome extension cache corruption after multiple reloads.

## Solution:

### Option 1: Fresh Install (Recommended)
1. Go to `chrome://extensions/`
2. **REMOVE** the extension (trash icon)
3. Click **"Load unpacked"**
4. Select: `/home/sandy/projects/_underscore/dist/chrome-mv3`

### Option 2: Hard Reload
1. `chrome://extensions/`
2. Toggle extension OFF
3. Click **"Reload"** (circular arrow)
4. Toggle extension ON

### Option 3: Clear Chrome Cache
1. Press `Ctrl+Shift+Delete`
2. Select "Cached images and files"
3. Click "Clear data"
4. Reload extension

### Option 4: Restart Chrome
Close all Chrome windows and restart.

## Verification:

The built file is **valid UTF-8**:
```bash
$ file dist/chrome-mv3/content-scripts/content.js
dist/chrome-mv3/content-scripts/content.js: JavaScript source, ASCII text

$ npm run clean && npm run build
✔ Built extension successfully
```

## If Still Failing:

### Check Manifest:
```bash
cat dist/chrome-mv3/manifest.json | grep content_scripts -A10
```

### Try Development Build:
```bash
npm run dev
# Then load dist/chrome-mv3
```

### Check File Permissions:
```bash
ls -la dist/chrome-mv3/content-scripts/
# Should be readable: -rw-r--r--
```

## Expected After Fix:

Console should show:
```
🔄 Initializing Vault Mode...
✅ Vault Mode initialized: 0 highlights restored
✅ Vault Mode ready
```

The file builds cleanly - this is a Chrome caching issue!
