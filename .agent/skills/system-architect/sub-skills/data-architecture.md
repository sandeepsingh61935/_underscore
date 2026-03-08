---
name: Data Architecture
description: Event sourcing schema, highlight and collection data models, sync protocol, and conflict resolution for _underscore.
---

# Data Architecture

---

## 1. Event Sourcing Schema

### `events` table (Supabase PostgreSQL)

```sql
CREATE TABLE events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id     TEXT NOT NULL,
  type          TEXT NOT NULL,           -- Event type (HIGHLIGHT_CREATED, etc.)
  payload       JSONB NOT NULL,
  timestamp     BIGINT NOT NULL,         -- Date.now() — milliseconds
  version       INTEGER NOT NULL DEFAULT 1, -- Schema version
  checksum      TEXT NOT NULL,           -- SHA-256 of payload for integrity
  synced_at     TIMESTAMPTZ DEFAULT NOW(),
  cursor        BIGSERIAL               -- Monotonic cursor for pull-based sync
);

CREATE INDEX events_user_cursor ON events(user_id, cursor);
CREATE INDEX events_user_timestamp ON events(user_id, timestamp);
```

### Event Types

```typescript
type EventType =
  | 'HIGHLIGHT_CREATED'
  | 'HIGHLIGHT_UPDATED'    // color, note, tags changed
  | 'HIGHLIGHT_DELETED'
  | 'COLLECTION_CREATED'
  | 'COLLECTION_UPDATED'
  | 'COLLECTION_DELETED'
  | 'HIGHLIGHT_ADDED_TO_COLLECTION'
  | 'HIGHLIGHT_REMOVED_FROM_COLLECTION'
  | 'MODE_CHANGED'
  | 'USER_PREFERENCE_CHANGED';
```

---

## 2. Highlight Data Model

```typescript
interface HighlightDataV2 {
  id: string;               // UUID (client-generated)
  userId: string;           // Supabase auth.users.id
  deviceId: string;         // Stable device identifier
  url: string;              // Full URL of the page
  domain: string;           // Extracted domain (e.g. "example.com")
  title: string;            // Page title at time of creation
  text: string;             // Selected text (encrypted at rest)
  context: string;          // Surrounding text for relocalization
  color: HighlightColor;    // 'yellow' | 'green' | 'blue' | 'pink' | 'purple'
  note?: string;            // Optional user note (encrypted)
  tags: string[];           // User-defined tags
  collectionId?: string;    // Assigned collection UUID
  mode: ModeId;             // 'walk' | 'sprint' | 'vault' | 'neural'
  position: {
    startOffset: number;
    endOffset: number;
    startXPath: string;
    endXPath: string;
    textNodeIndex?: number;
  };
  createdAt: number;        // Date.now() milliseconds
  updatedAt: number;
  deletedAt?: number;       // Soft delete timestamp
  version: number;          // Optimistic concurrency version
  syncState: 'local' | 'synced' | 'conflict';
}
```

### `highlights` table (Supabase — materialized view of events)

```sql
CREATE TABLE highlights (
  id            UUID PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id     TEXT NOT NULL,
  url           TEXT NOT NULL,
  domain        TEXT NOT NULL,
  title         TEXT NOT NULL,
  text          TEXT NOT NULL,              -- Encrypted
  context       TEXT,
  color         TEXT NOT NULL DEFAULT 'yellow',
  note          TEXT,                       -- Encrypted
  tags          TEXT[] DEFAULT '{}',
  collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
  mode          TEXT NOT NULL,
  position      JSONB NOT NULL,
  created_at    BIGINT NOT NULL,
  updated_at    BIGINT NOT NULL,
  deleted_at    BIGINT,
  version       INTEGER NOT NULL DEFAULT 1
);

-- Row Level Security
ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their highlights"
  ON highlights FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX highlights_user_url ON highlights(user_id, url);
CREATE INDEX highlights_user_domain ON highlights(user_id, domain);
CREATE INDEX highlights_user_created ON highlights(user_id, created_at DESC);
CREATE INDEX highlights_collection ON highlights(collection_id) WHERE collection_id IS NOT NULL;
CREATE INDEX highlights_deleted ON highlights(deleted_at) WHERE deleted_at IS NULL;
```

---

## 3. Collection Data Model

```typescript
interface Collection {
  id: string;           // UUID
  userId: string;
  name: string;
  description?: string;
  emoji?: string;       // Display emoji for the collection
  color?: string;       // Accent color token
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
  highlightCount: number; // Denormalized for performance
}
```

```sql
CREATE TABLE collections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  emoji         TEXT,
  color         TEXT,
  created_at    BIGINT NOT NULL,
  updated_at    BIGINT NOT NULL,
  deleted_at    BIGINT,
  highlight_count INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their collections"
  ON collections FOR ALL
  USING (auth.uid() = user_id);
```

---

## 4. Sync Protocol

### Push (local → server)

```
POST /v1/sync/push
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "deviceId": "device-uuid",
  "events": [                    // Array of events (max 50 per batch)
    {
      "id": "event-uuid",
      "type": "HIGHLIGHT_CREATED",
      "payload": { ... },
      "timestamp": 1709000000000,
      "version": 1,
      "checksum": "sha256-hex"
    }
  ]
}

Response 200:
{
  "accepted": ["event-id-1", "event-id-2"],
  "rejected": [],
  "serverCursor": 1234567
}
```

### Pull (server → local)

```
GET /v1/sync/pull?since=<cursor>&deviceId=<device-id>
Authorization: Bearer <JWT>

Response 200:
{
  "events": [...],         // Events from other devices since cursor
  "cursor": 1234568        // New cursor for next pull
}
```

### Sync Sequence Diagram

```
Client                          Server
  |                               |
  |--- POST /sync/push (batch) -->|
  |<-- { accepted, cursor } ------|
  |                               |
  |--- GET /sync/pull?since=N --->|
  |<-- { events: [...], cursor } -|
  |                               |
  | Apply remote events locally   |
  | Detect conflicts              |
  | Resolve (LWW for now)         |
  | Update local cursor           |
```

---

## 5. Conflict Resolution

### Current: Last-Write-Wins (LWW)

When two devices modify the same highlight:
- Compare `updatedAt` timestamps
- Higher timestamp wins
- Lower timestamp event is discarded (but kept in events table for audit)

```typescript
function resolveConflict(local: HighlightDataV2, remote: HighlightDataV2): HighlightDataV2 {
  return local.updatedAt > remote.updatedAt ? local : remote;
}
```

### Planned: Vector Clocks

Vector clocks (`src/shared/utils/`) are already implemented for partial ordering:

```typescript
interface VectorClock {
  [deviceId: string]: number;
}

// Happens-before relationship
function happensBefore(a: VectorClock, b: VectorClock): boolean {
  return Object.keys(a).every(k => (a[k] ?? 0) <= (b[k] ?? 0)) &&
    Object.keys(b).some(k => (b[k] ?? 0) > (a[k] ?? 0));
}
```

When vector clocks detect a true conflict (concurrent modification), the event is flagged for manual resolution. The UI for this is planned but not yet built.

---

## 6. Schema Versioning

```typescript
// Each breaking schema change increments SCHEMA_VERSION
// Migration runs on extension startup
const CURRENT_SCHEMA_VERSION = 3;

// Migrations are additive only — never drop columns
// New optional fields are safe without migration
// New required fields need a migration with a sensible default
```

Migration runner: `src/background/migrations/migration-runner.ts`
Current version stored in: `chrome.storage.local.schemaVersion`
