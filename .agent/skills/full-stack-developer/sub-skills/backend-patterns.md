---
name: Backend Patterns
description: Concrete patterns for repository, service, event sourcing, sync, auth, Chrome IPC, and API development in the _underscore project.
---

# Backend Patterns

Concrete patterns from the actual codebase. Do not reinvent — copy and adapt.

---

## 1. Repository Pattern

Reference implementations:
- `src/shared/repositories/in-memory-highlight-repository.ts`
- `src/shared/repositories/i-highlight-repository.ts`
- `src/shared/repositories/repository-facade.ts`

### Interface

```typescript
// src/shared/repositories/i-highlight-repository.ts
export interface IHighlightRepository {
  save(highlight: HighlightDataV2): Promise<void>;
  findById(id: string): Promise<HighlightDataV2 | null>;
  findByUrl(url: string): Promise<HighlightDataV2[]>;
  findAll(): Promise<HighlightDataV2[]>;
  delete(id: string): Promise<void>;
  deleteByUrl(url: string): Promise<void>;
  count(): Promise<number>;
}
```

### Implementation Template

```typescript
export class IndexedDBHighlightRepository implements IHighlightRepository {
  private readonly STORE_NAME = 'highlights';

  constructor(
    private readonly db: IDBDatabase,
    private readonly logger: ILogger
  ) {}

  async save(highlight: HighlightDataV2): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      const req = store.put(highlight);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(new StorageError('Failed to save highlight', req.error));
    });
  }

  async findById(id: string): Promise<HighlightDataV2 | null> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.STORE_NAME, 'readonly');
      const store = tx.objectStore(this.STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(new StorageError('Failed to find highlight', req.error));
    });
  }
  // ... other methods
}
```

### DI Registration

```typescript
// src/shared/di/background-service-registration.ts
container.register<IHighlightRepository>(
  'IHighlightRepository',
  () => new IndexedDBHighlightRepository(db, logger),
  { lifecycle: 'singleton' }
);
```

---

## 2. Service Pattern

Services orchestrate repositories, emit events, and are injected via DI.

```typescript
export class HighlightService {
  constructor(
    private readonly repository: IHighlightRepository,
    private readonly eventBus: IEventBus,
    private readonly logger: ILogger,
    private readonly cryptoUtils: CryptoUtils,
  ) {}

  async createHighlight(input: CreateHighlightInput): Promise<Result<HighlightDataV2>> {
    try {
      this.logger.debug('HighlightService.createHighlight', { url: input.url });

      const highlight: HighlightDataV2 = {
        id: crypto.randomUUID(),
        ...input,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      };

      await this.repository.save(highlight);
      this.eventBus.emit('highlight:created', { highlight });

      return Result.ok(highlight);
    } catch (error) {
      this.logger.error('Failed to create highlight', error);
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
```

**Rules:**
- Constructor injection for all dependencies
- Return `Result<T>` (see `src/shared/utils/result.ts`) for operations that can fail
- Always log at debug level on entry, error level on failure
- Emit events via `IEventBus`, never call other services directly
- Never throw from service methods — return `Result.err()`

---

## 3. Event Sourcing

Reference: `src/background/sync/` (event store, publisher, replayer, validator)

### Event Structure

```typescript
interface SyncEvent {
  id: string;              // UUID
  type: EventType;         // 'HIGHLIGHT_CREATED' | 'HIGHLIGHT_DELETED' | etc.
  payload: unknown;        // Type-safe via EventType discriminated union
  timestamp: number;       // Date.now()
  version: number;         // Schema version
  checksum: string;        // SHA-256 of payload for integrity validation
  deviceId: string;        // Source device
  userId: string;
}
```

### Publishing Events

```typescript
// Never write to events table directly
// Always use EventPublisher
await eventPublisher.publish({
  type: 'HIGHLIGHT_CREATED',
  payload: { highlight },
});
```

### Replaying State

```typescript
// EventReplayer reconstructs current state from event stream
const currentHighlights = await eventReplayer.replay({
  fromCursor: lastSyncCursor,
  userId: user.id,
});
```

### Invariants

- Events are immutable after creation
- If a correction is needed, append a new corrective event
- Checksums are validated on replay — invalid events are flagged, not silently skipped
- Events are stored locally first, then pushed to Supabase in batches

---

## 4. Sync Pattern

Reference: `src/background/sync/`

```
Local change
  → EventPublisher (append to local events table)
    → SyncQueue (buffer pending events)
      → SyncBatcher (aggregate into batches of ≤50)
        → NetworkDetector (check connectivity)
          → RateLimiter (throttle outgoing requests)
            → API push to /v1/sync/push
              → Supabase events table
                → Realtime broadcast → other clients
```

**Key rules:**
- Sync is eventually consistent — UI optimistically updates
- Failed batches are retried with exponential backoff
- Cursor-based pull: always fetch events since `lastSyncCursor`
- Conflict detection uses vector clocks (`src/shared/utils/`)

---

## 5. Auth Pattern

Reference: `src/background/auth/`, `src/features/auth/hooks/useCurrentUser.ts`

```typescript
// Extension auth — via Chrome identity API → Supabase
// Always go through the auth manager, never call Supabase auth directly in UI

// In a view's parent hook (e.g., PopupAppWithProviders):
const { user, login, logout, loginWithEmail, registerWithEmail } = useCurrentUser();

// useCurrentUser calls chrome.runtime.sendMessage internally
// Background auth manager handles token refresh, session persistence

// Auth state in views — always use useApp():
const { isAuthenticated, user } = useApp();
```

**Extension auth flow:**
```
popup → chrome.runtime.sendMessage({ type: 'LOGIN_GOOGLE' })
  → background AuthManager
    → chrome.identity.launchWebAuthFlow
      → Supabase GoTrue (PKCE)
        → JWT issued
          → stored in chrome.storage.local (encrypted)
            → AUTH_STATE_CHANGED broadcast to popup
```

---

## 6. Chrome IPC Pattern

Reference: `src/shared/messaging/message-types.ts`, `src/shared/services/chrome-messaging.ts`

### Message Format

```typescript
// Always use constants from message-types.ts — never string literals
interface ChromeMessage {
  type: MessageType;    // From MessageType enum
  payload: unknown;
  timestamp: number;
}

interface ChromeResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### Sending (from popup hook)

```typescript
// src/features/auth/hooks/useCurrentUser.ts
const response = await chrome.runtime.sendMessage<ChromeMessage, ChromeResponse<User>>({
  type: MessageType.GET_AUTH_STATE,
  payload: {},
  timestamp: Date.now(),
});
```

### Handling (in background)

```typescript
// src/background/message-handlers/auth-handler.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === MessageType.GET_AUTH_STATE) {
    authManager.getAuthState()
      .then(state => sendResponse({ success: true, data: state }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Required for async response
  }
});
```

---

## 7. Error Handling

Reference: `src/shared/errors/`

### Error Hierarchy

```
AppError (base)
  ├── StorageError — IndexedDB / chrome.storage failures
  ├── NetworkError — HTTP / WebSocket failures
  ├── ValidationError — Schema validation failures
  ├── AuthError — Auth / token failures
  └── StateError — Invalid mode transitions, state corruption
```

### When to Throw vs Return

| Situation | Pattern |
|-----------|---------|
| Service method that can fail | Return `Result<T>` |
| Repository method | Throw typed error (caught by service) |
| Background message handler | Return `{ success: false, error }` |
| UI hook | Catch and set error state |
| Invariant violation | Throw (programmer error, not user error) |

---

## 8. Migration Pattern

Reference: `src/background/migrations/`

```typescript
interface Migration {
  version: number;
  description: string;
  up: (db: IDBDatabase) => Promise<void>;
  down?: (db: IDBDatabase) => Promise<void>;
}

// Migrations run automatically on extension startup
// version is stored in chrome.storage.local as 'schemaVersion'
// Never modify existing migrations — always add new ones
```
