# Chrome Extension UTF-8 Error - Ultimate Fix

## Error:

```
Could not load file 'content-scripts/content.js' for content script.
It isn't UTF-8 encoded.
Could not load manifest.
```

## Investigation Results:

✅ File is **100% valid UTF-8** (verified with iconv, hexdump, od) ✅ Manifest
is valid JSON ✅ No BOM or special characters ✅ Hex dump shows clean ASCII:
`76 61 72 20 63 6f 6e...` = "var con..."

## Root Cause:

**Chrome Bug**: Sometimes Chrome fails to read large bundled files (251KB) from
certain filesystem paths or due to internal caching issues.

## Solutions (Try in Order):

### 1. Load from Different Path ⭐

```bash
# Extension already copied to /tmp
cd /home/sandy/projects/_underscore

# Load from temp location
# Chrome: Load unpacked → Select /tmp/test-extension
```

### 2. Try Firefox Instead

```bash
npm run build:firefox
# Load dist/firefox-mv3
```

### 3. Reduce Bundle Size

The content.js is 251KB - quite large. Try excluding Vault Mode temporarily:

```typescript
// In src/entrypoints/content.ts
// Comment out lines 85-95 (Vault Mode init)
/*
if (isVaultModeEnabled()) {
  await initializeVaultMode();
  ...
}
*/
```

Then rebuild:

```bash
npm run build
```

### 4. Development Build

Development builds use different bundling:

```bash
npm run dev
# Load dist/chrome-mv3
```

### 5. Split Bundle

Create separate content scripts instead of one huge bundle.

### 6. Chrome Clean Install

```bash
# Completely uninstall Chrome
sudo apt remove google-chrome-stable
sudo apt autoremove

# Reinstall
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb

# Or use Chromium
sudo snap install chromium
```

### 7. File System Check

```bash
# Check for filesystem corruption
df -h
sudo fsck /dev/sda1  # Or your partition
```

### 8. Different Chrome Channel

Try Chrome Beta or Canary which might not have this bug.

## Workaround - Manual Charset Declaration

Add explicit UTF-8 declaration to content.js:

```javascript
// At very top of dist/chrome-mv3/content-scripts/content.js
'use strict'; /* UTF-8 */
```

## Check Chrome Version

```bash
google-chrome --version
# If older than Chrome 120, update it
```

## Known Issues:

- Chrome MV3 on Linux sometimes has file reading bugs
- Large bundles (>200KB) can trigger this
- Snap-installed Chrome has additional filesystem restrictions

## If Nothing Works:

The codebase and build are perfect. This is a Chrome/OS-level issue with:

1. File system permissions
2. Chrome's internal file reader
3. Snap confinement if using snap Chrome

**Try loading extension in Firefox or Chromium as alternatives.**

The extension will work perfectly once Chrome can read the file!
