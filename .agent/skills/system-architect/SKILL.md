---
name: System Architect
description: Architecture decisions, patterns, and cross-cutting concerns for the _underscore project. Covers extension architecture, web app architecture, data model, security, performance, and the ADR process.
---

# System Architect Skill — _underscore

**Before any architecture work, read this file and the relevant sub-skills.**

- [extension-architecture.md](./sub-skills/extension-architecture.md) — MV3 constraints, content/background/popup lifecycle
- [web-app-architecture.md](./sub-skills/web-app-architecture.md) — Cloudflare Pages + Workers, SPA, edge API
- [data-architecture.md](./sub-skills/data-architecture.md) — Event sourcing schema, sync protocol, data model

---

## 1. Architecture Overview

### Extension (MV3)

```
┌─────────────────────────────────────────────────┐
│  Browser Tab                                    │
│  ┌─────────────────────────────────────────┐   │
│  │  Content Script (isolated world)        │   │
│  │  - DOM manipulation                     │   │
│  │  - CSS Highlights API                   │   │
│  │  - MutationObserver                     │   │
│  │  - Sends messages → Background          │   │
│  └──────────────────┬──────────────────────┘   │
└─────────────────────┼───────────────────────────┘
                      │ chrome.runtime.sendMessage
           ┌──────────▼──────────────┐
           │  Background Worker      │
           │  - Service lifecycle    │
           │  - Auth (GoTrue)        │
           │  - Repositories (IDB)   │
           │  - Event Sourcing       │
           │  - Sync Queue           │
           │  - API Clients          │
           └──────────┬──────────────┘
                      │ chrome.runtime.sendMessage
           ┌──────────▼──────────────┐
           │  Popup (React SPA)      │
           │  - 400×600px fixed      │
           │  - View enum routing    │
           │  - useApp() context     │
           └─────────────────────────┘
```

### Web App

```
┌──────────────────────────────────────────────────┐
│  Cloudflare Pages (SPA)                          │
│  - React 19 + React Router v7                    │
│  - Public pages (marketing, landing)             │
│  - Authenticated app (dashboard, highlights)     │
└──────────────────────┬───────────────────────────┘
                       │ HTTPS API calls
           ┌───────────▼───────────────┐
           │  Cloudflare Workers       │
           │  - Hono routing           │
           │  - JWT validation         │
           │  - Rate limiting          │
           │  - CORS enforcement       │
           └───────────┬───────────────┘
                       │ Supabase SDK
           ┌───────────▼───────────────┐
           │  Supabase (shared)        │
           │  - PostgreSQL             │
           │  - Auth (GoTrue)          │
           │  - Realtime channels      │
           │  - Row-Level Security     │
           └───────────────────────────┘
```

### Shared Backend

Both extension and web app use the **same Supabase project**:
- Same `users` table, same auth tokens
- Same `highlights`, `collections`, `events` tables
- Same Row-Level Security policies
- Extension writes via background service worker
- Web app writes via Cloudflare Workers (server-side Supabase client)

---

## 2. Mode System Architecture

### Interface Segregation (ISP)

Modes implement only the interfaces they need:

```typescript
// src/shared/interfaces/ — fine-grained capability interfaces
interface IBasicMode {
  activate(): Promise<void>;
  deactivate(): Promise<void>;
  isActive(): boolean;
}

interface IPersistentMode extends IBasicMode {
  saveHighlight(data: HighlightData): Promise<void>;
  getHighlights(url: string): Promise<HighlightData[]>;
  deleteHighlight(id: string): Promise<void>;
}

interface ICollaborativeMode extends IPersistentMode {
  shareHighlight(id: string, userIds: string[]): Promise<void>;
  getSharedHighlights(): Promise<SharedHighlight[]>;
}

interface IAIMode extends IPersistentMode {
  generateSummary(highlights: HighlightData[]): Promise<string>;
  suggestConnections(highlight: HighlightData): Promise<HighlightData[]>;
}
```

### Mode Capability Discovery

```typescript
// Check capabilities at runtime — never assume
function isHighlightPersistent(mode: IBasicMode): mode is IPersistentMode {
  return 'saveHighlight' in mode;
}

// Usage in content script
if (isHighlightPersistent(currentMode)) {
  await currentMode.saveHighlight(data);
}
```

### Mode Storage Strategies

| Mode | Storage | TTL |
|------|---------|-----|
| Walk | None (session only) | Page reload |
| Sprint | `chrome.storage.local` (encrypted) | 4 hours |
| Vault | IndexedDB → Supabase (synced) | Permanent |
| Gen | IndexedDB → Supabase + AI metadata | Permanent |

### Mode Lifecycle

```
activate() → [guard checks] → set active state → emit 'mode:activated'
deactivate() → [cleanup] → clear active state → emit 'mode:deactivated'

Transition guard: Check if highlights need saving before deactivation
```

---

## 3. Data Architecture

### Event Sourcing

All state changes go through the event store — the events table is the source of truth:

```
User action
  → EventPublisher.publish(event)
    → local events table (IndexedDB)
      → materialized state (computed view)
        → sync queue (push to Supabase)
```

Replay:
```
events table → EventReplayer → current state
```

See `data-architecture.md` for full schema.

### Sync Strategy

```
Offline: events stored locally, marked pending
Online:  SyncBatcher groups pending events (≤50 per batch)
         → compress (gzip if >1KB)
         → POST /v1/sync/push
         → receive new events since lastCursor
         → EventReplayer applies remote events
         → conflict detection if same highlight modified
```

### Conflict Resolution

Current: Last-Write-Wins (LWW) based on event timestamp
Planned: Vector clocks for partial ordering, manual resolution UI

---

## 4. Security Architecture

### Auth Flow

**Extension:**
```
chrome.identity.launchWebAuthFlow (PKCE)
  → Supabase GoTrue
    → JWT (5min) + refresh token (30 days)
      → stored encrypted in chrome.storage.local
```

**Web App:**
```
Supabase Auth UI (PKCE)
  → JWT in httpOnly cookie (set by Supabase)
    → Workers validate JWT on every request
```

### Encryption at Rest

```typescript
// Highlight content encrypted with AES-256-GCM
// Key derived from user's Supabase JWT sub + device secret
// See: src/shared/utils/crypto-utils.ts
```

### Content Security Policy

```
Extension manifest.json:
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'self'"
  }

Web App (Cloudflare Pages _headers):
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
```

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| Auth endpoints | 5 requests | 15 minutes |
| API endpoints | 100 requests | 1 minute |
| Sync push | 10 requests | 1 minute |
| Export generation | 5 requests | 1 hour |

---

## 5. Performance Architecture

### Bundle Splitting

Extension:
- `popup.js` — popup entry (React, UI)
- `content.js` — content script (minimal, no React)
- `background.js` — service worker (services, no UI)

Web App:
- `landing.js` — public pages (minimal JS)
- `app.js` — authenticated app (React, full UI)
- Lazy load: each /app/* route as its own chunk

### Caching Strategy

| Layer | Strategy | TTL |
|-------|----------|-----|
| Extension highlights | IndexedDB LRU (100 items per URL) | Session |
| Web app API responses | SWR cache | 5 seconds |
| Static assets | Cloudflare CDN cache | 1 year (hash-named) |
| Service worker (web) | Cache-first for shell, network-first for data | — |

### Content Script Performance

```typescript
// MutationObserver must be debounced
const observer = new MutationObserver(
  debounce(handleDOMChange, 100)  // 100ms debounce
);

// Observe only subtree changes, not attributes
observer.observe(document.body, { childList: true, subtree: true });
```

---

## 6. Shared Code Strategy

### What Is Shared (extension + web app)

| Path | Contents |
|------|----------|
| `src/shared/types/` | TypeScript interfaces, type definitions |
| `src/shared/interfaces/` | Service interfaces (IHighlightRepository, etc.) |
| `src/shared/schemas/` | Zod validation schemas |
| `src/shared/utils/` | Pure utility functions (crypto, rate-limiter, result) |
| `src/shared/errors/` | Error class hierarchy |
| `src/shared/services/` | Platform-agnostic services |
| `src/ui-system/` | All UI components, tokens, hooks |

### What Is NOT Shared

| Path | Why |
|------|-----|
| `src/background/` | Uses `chrome.runtime`, `chrome.storage`, `chrome.alarms` |
| `src/content/` | Uses DOM APIs, CSS.highlights, `document.*` |
| `src/entrypoints/` | Extension entry points |
| `src/web/` | Web app specific (React Router, Supabase PKCE client) |

### Platform Adapter Pattern

When shared code needs platform-specific behavior, inject an adapter:

```typescript
// Interface in src/shared/interfaces/
interface IStorageAdapter {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

// Extension implementation
class ChromeStorageAdapter implements IStorageAdapter {
  async get(key: string) { return chrome.storage.local.get(key); }
  async set(key: string, value: unknown) { await chrome.storage.local.set({ [key]: value }); }
}

// Web app implementation
class LocalStorageAdapter implements IStorageAdapter {
  async get(key: string) { return JSON.parse(localStorage.getItem(key) ?? 'null'); }
  async set(key: string, value: unknown) { localStorage.setItem(key, JSON.stringify(value)); }
}
```

---

## 7. ADR Process

### When to Write an ADR

Write an ADR whenever you:
- Choose between two reasonable architectural approaches
- Adopt a new pattern that will be used project-wide
- Make a decision that significantly affects multiple layers
- Override or extend an existing pattern

### ADR Template

See `docs/04-adrs/adr-template.md`

### Existing ADRs

| ADR | Decision | Status |
|-----|----------|--------|
| ADR-001 | Event Sourcing for Sync | Accepted |
| ADR-002 | Event-Driven Architecture | Accepted |
| ADR-003 | Interface Segregation for Multi-Mode | Accepted |
| ADR-004 | Separate Event Sourcing from Vault | Accepted |

All ADRs in `docs/04-adrs/` and `docs/architecture-decisions/`.

---

## 8. Integration Patterns

### Supabase

```typescript
// Extension: server-side via background worker
// - Use service role key ONLY in Workers, never in client code
// - Use anon key for client-side (RLS enforced)
// - Auth: GoTrue PKCE (extension) / GoTrue web (web app)
// - Realtime: subscribe to changes for live sync
```

### Cloudflare

```typescript
// Pages: static SPA hosting
// Workers: edge API (< 50ms cold start target)
// D1: edge SQLite (planned — not yet implemented)
// KV: edge key-value for session cache (planned)
// R2: asset storage for exports (planned)
```

### Chrome APIs Used

| API | Where | Purpose |
|-----|-------|---------|
| `chrome.identity` | Background | Google OAuth |
| `chrome.storage.local` | Background | Encrypted JWT + preferences |
| `chrome.storage.session` | Background | Ephemeral session data |
| `chrome.runtime.sendMessage` | All layers | IPC between layers |
| `chrome.runtime.onMessage` | Background + Popup | Message handling |
| `chrome.alarms` | Background | Scheduled tasks (TTL cleanup) |
| `chrome.tabs` | Background | Tab URL detection |
| `CSS.highlights` | Content | Native text highlighting API |
