---
name: Extension Architecture
description: MV3 lifecycle constraints, content/background/popup communication, storage, and permissions for the _underscore Chrome extension.
---

# Extension Architecture

---

## 1. MV3 Lifecycle Constraints

Chrome Manifest V3 replaces persistent background pages with **service workers**:

| Constraint | Impact |
|------------|--------|
| Service worker is ephemeral — can terminate at any time | No in-memory state between wakeups — persist to `chrome.storage` |
| No DOM access in background | All DOM work must be in content scripts |
| 5-minute idle timeout (can wake via alarms/messages) | Never assume background is alive — always handle cold start |
| No `XMLHttpRequest` in service workers | Use `fetch()` only |
| Limited WebSocket lifetime | Reconnect on background wake-up |

**Rule**: Any state the background worker needs to survive restarts must be written to `chrome.storage.local` before processing completes.

---

## 2. World Contexts

| Context | Can Access | Cannot Access |
|---------|-----------|---------------|
| Content (isolated world) | DOM, `window.*`, page CSS | `chrome.storage`, background services |
| Content (main world) | DOM + page's JS globals | `chrome.*` APIs |
| Background service worker | `chrome.*` APIs, fetch, IndexedDB | DOM, `window.*` |
| Popup | React SPA, `chrome.*` (limited) | Page DOM |

**Rule**: Content scripts run in isolated world by default. Main world injection is done only when page JS access is required (see `manifest.json` `world: "MAIN"` entries).

---

## 3. Message Passing Architecture

### One-Time Messages (request/response)

```typescript
// Popup → Background
const response = await chrome.runtime.sendMessage({
  type: MessageType.GET_HIGHLIGHTS,
  payload: { url: currentTab.url },
  timestamp: Date.now()
});

// Background handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === MessageType.GET_HIGHLIGHTS) {
    highlightRepository.findByUrl(message.payload.url)
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Critical: keeps channel open for async response
  }
});
```

### Content → Background Messaging

```typescript
// Content script sends to background
chrome.runtime.sendMessage({ type: 'HIGHLIGHT_CREATED', payload: highlightData });

// Background pushes back to content (tab-targeted)
chrome.tabs.sendMessage(tabId, { type: 'RESTORE_HIGHLIGHTS', payload: highlights });
```

### Long-Lived Connections

Use `chrome.runtime.connect()` for streaming data (not currently used but available):
```typescript
const port = chrome.runtime.connect({ name: 'highlight-stream' });
port.onMessage.addListener(message => { /* handle */ });
port.onDisconnect.addListener(() => { /* cleanup */ });
```

---

## 4. Storage Architecture

### Storage Type Selection

| Use Case | Storage Type | Notes |
|----------|-------------|-------|
| Auth tokens (encrypted) | `chrome.storage.local` | Survives browser restart |
| User preferences | `chrome.storage.local` | Synced on Vault mode (future) |
| Ephemeral session state | `chrome.storage.session` | Cleared on browser close |
| Highlight data (permanent) | IndexedDB | 250MB+ capacity |
| Walk mode highlights | Memory only | Not persisted |
| Sprint mode highlights | `chrome.storage.local` (encrypted) | 4hr TTL |

### Storage Quotas

| Type | Quota | Behavior on Exceed |
|------|-------|-------------------|
| `chrome.storage.local` | 10MB (unlimitedStorage permission: unlimited) | Throws QUOTA_BYTES_EXCEEDED |
| `chrome.storage.session` | 10MB | Throws on exceed |
| IndexedDB | Browser-managed (usually GB) | Eviction under storage pressure |

**Rule**: Highlight content goes to IndexedDB. Chrome storage is for metadata and config only.

---

## 5. Content Script Registration

```json
// manifest.json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle",
      "world": "ISOLATED"
    }
  ]
}
```

**Lifecycle events the content script handles:**
- `document_idle` — initial setup (MutationObserver, message listeners)
- Message: `RESTORE_HIGHLIGHTS` — re-apply highlights after navigation
- Message: `MODE_CHANGED` — update highlighting behavior
- `beforeunload` — save pending Walk mode state

---

## 6. CSS Highlights API

The extension uses the native CSS Custom Highlight API:

```typescript
// Create a highlight range
const range = new Range();
range.setStart(startNode, startOffset);
range.setEnd(endNode, endOffset);

// Register with CSS Highlights
if (!CSS.highlights.has('underscore-yellow')) {
  CSS.highlights.set('underscore-yellow', new Highlight());
}
CSS.highlights.get('underscore-yellow')!.add(range);

// Style in content script CSS (injected)
// ::highlight(underscore-yellow) { background-color: ... }
```

**Fallback**: For browsers without CSS Highlight API support, `<mark>` element injection is used.

---

## 7. Permission Model

```json
// manifest.json permissions
{
  "permissions": [
    "storage",        // chrome.storage access
    "tabs",           // tab URL detection
    "identity",       // Google OAuth
    "alarms",         // TTL cleanup (Sprint mode)
    "unlimitedStorage" // Large IndexedDB quota
  ],
  "host_permissions": ["<all_urls>"]  // Content script on all sites
}
```

**Principle of least privilege**: Request no permissions beyond what's listed. `"<all_urls>"` is required for content script injection on arbitrary pages — this is the core feature.
