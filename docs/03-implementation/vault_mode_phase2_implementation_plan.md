# Vault Mode Phase 2: Cloud Sync Implementation Plan

**Document Type**: Professional Implementation Specification  
**Version**: 1.0  
**Date**: 2026-01-03  
**Status**: Ready for Development  
**Estimated Duration**: 4-6 weeks  
**Prerequisites**: Vault Mode Phase 1 (Local-Only) Complete ✅

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Phase 2 Objectives](#phase-2-objectives)
4. [Feature Requirements](#feature-requirements)
5. [Technical Architecture](#technical-architecture)
6. [Database Schema](#database-schema)
7. [API Specifications](#api-specifications)
8. [Authentication & Security](#authentication--security)
9. [Sync Strategy](#sync-strategy)
10. [Conflict Resolution](#conflict-resolution)
11. [Implementation Roadmap](#implementation-roadmap)
12. [Testing Strategy](#testing-strategy)
13. [Deployment Plan](#deployment-plan)
14. [Risk Management](#risk-management)
15. [Success Metrics](#success-metrics)

---

## 1. Executive Summary

### 1.1 Project Overview

Vault Mode Phase 2 transforms the current local-only permanent storage system into a **cloud-synced, cross-device highlighting platform** with real-time synchronization and conflict resolution.

### 1.2 Key Deliverables

```yaml
Backend Infrastructure:
  - Supabase PostgreSQL database
  - RESTful API with JWT authentication
  - WebSocket server for real-time updates
  - Event sourcing sync queue

Frontend Enhancements:
  - Authentication UI (login/signup)
  - Sync status indicators
  - Conflict resolution UI
  - Offline queue management

Developer Experience:
  - Comprehensive API documentation
  - Migration scripts (local → cloud)
  - Testing suite (unit + integration + E2E)
  - Deployment automation
```

### 1.3 Success Criteria

- ✅ 95%+ sync success rate
- ✅ <3s sync latency for highlight creation
- ✅ Zero data loss during conflicts
- ✅ Seamless offline → online transitions
- ✅ 100% backward compatibility with Phase 1

---

## 2. Current State Analysis

### 2.1 What Exists (Phase 1)

#### ✅ Complete Components

**Local Storage Layer**:
```typescript
// IndexedDBStorage (430 lines) - PRODUCTION READY
class IndexedDBStorage extends Dexie {
  highlights!: EntityTable<HighlightRecord, 'id'>;
  events!: EntityTable<EventRecord, 'eventId'>;
  collections!: EntityTable<CollectionRecord, 'id'>;
  tags!: EntityTable<TagRecord, 'id'>;
}
```

**Multi-Selector Engine**:
```typescript
// MultiSelectorEngine - PRODUCTION READY
class MultiSelectorEngine {
  createSelectors(range: Range): MultiSelector;
  restore(selectors: MultiSelector): Promise<Range | null>;
  // 3-tier: XPath → Position → Fuzzy
}
```

**Vault Mode Class**:
```typescript
// vault-mode.ts (307 lines) - PHASE 1 COMPLETE
class VaultMode extends BaseHighlightMode implements IPersistentMode {
  async createHighlight(selection, colorRole): Promise<string>;
  async restore(url?: string): Promise<void>;
  async saveToStorage(highlight): Promise<void>;
  async loadFromStorage(url): Promise<HighlightData[]>;
}
```

#### ⚠️ Stub Components (Need Implementation)

**Sync Method** (Currently No-Op):
```typescript
// vault-mode-service.ts:258
async syncToServer(): Promise<string[]> {
  // TODO: Implement actual API calls to sync server  ❌ STUB
  // For now, just mark as synced locally
  const eventIds = unsyncedEvents.map(e => e.eventId);
  await this.storage.markEventsSynced(eventIds);
  return eventIds;
}
```

**Capability Flags** (Incorrectly Set):
```typescript
// vault-mode.ts:44
readonly capabilities: ModeCapabilities = {
  sync: true,  // ❌ FALSE - Not implemented yet
  collections: true,  // ❌ FALSE - Schema exists, UI missing
  tags: true,  // ❌ FALSE - Schema exists, UI missing
  export: true,  // ❌ FALSE - Not implemented
  search: true,  // ❌ FALSE - Not implemented
};
```

### 2.2 What's Missing (Phase 2 Scope)

```yaml
Backend (0% Complete):
  - ❌ Supabase project setup
  - ❌ PostgreSQL database schema
  - ❌ Authentication service (JWT)
  - ❌ API endpoints (REST + WebSocket)
  - ❌ Sync queue processor
  - ❌ Conflict resolution engine

Frontend (0% Complete):
  - ❌ Auth UI (login/signup/logout)
  - ❌ Sync status indicators
  - ❌ Conflict resolution UI
  - ❌ Offline queue management
  - ❌ Cross-device testing

Infrastructure (0% Complete):
  - ❌ CI/CD pipeline
  - ❌ Monitoring & logging
  - ❌ Error tracking (Sentry)
  - ❌ Performance monitoring
```

---

## 3. Phase 2 Objectives

### 3.1 Primary Goals

1. **Cross-Device Sync**: Highlights available on all devices within 3 seconds
2. **Offline Support**: Full functionality offline, auto-sync when online
3. **Conflict Resolution**: Deterministic, user-friendly conflict handling
4. **Zero Data Loss**: 100% reliability during sync operations
5. **Backward Compatibility**: Existing local highlights migrate seamlessly

### 3.2 Non-Goals (Deferred to Phase 3)

- ❌ Export functionality (Markdown, PDF, HTML)
- ❌ Full-text search across highlights
- ❌ Public sharing / share links
- ❌ Advanced filters (date, domain, color)
- ❌ Collaborative features (shared collections)

---

## 4. Feature Requirements

### 4.1 User Stories

```
US-VP2-001: Cross-Device Sync
  As a multi-device user,
  I want my highlights synced automatically,
  So I can continue reading on any device.
  
  Acceptance Criteria:
    - Highlight created on Device A appears on Device B within 3s
    - Works across Chrome, Firefox, Safari
    - Syncs in background without user action
    - Shows sync status (syncing/synced/error)

US-VP2-002: Offline Support
  As a user with intermittent connectivity,
  I want to highlight offline,
  So I can work anywhere without interruption.
  
  Acceptance Criteria:
    - All highlighting features work offline
    - Changes queued for sync when online
    - Clear indication of offline status
    - Auto-sync when connection restored

US-VP2-003: Conflict Resolution
  As a user editing on multiple devices,
  I want conflicts resolved automatically,
  So I don't lose any highlights.
  
  Acceptance Criteria:
    - Conflicting edits merged intelligently
    - User notified of conflicts
    - Option to manually resolve if needed
    - No data loss during conflicts

US-VP2-004: Authentication
  As a new user,
  I want to create an account easily,
  So I can start syncing my highlights.
  
  Acceptance Criteria:
    - Email/password signup in <30 seconds
    - OAuth (Google, GitHub) optional
    - Password reset functionality
    - Secure token storage

US-VP2-005: Data Migration
  As an existing Phase 1 user,
  I want my local highlights migrated to cloud,
  So I don't lose my existing data.
  
  Acceptance Criteria:
    - One-click migration from local to cloud
    - Progress indicator during migration
    - Verification that all highlights migrated
    - Rollback option if migration fails
```

### 4.2 Functional Requirements

#### FR-1: Authentication System

```yaml
Registration:
  - Email + password (min 8 chars, 1 uppercase, 1 number)
  - Email verification (6-digit code)
  - OAuth providers: Google, GitHub (optional)
  - Terms of Service acceptance

Login:
  - Email + password
  - OAuth (if configured)
  - "Remember me" option (30-day session)
  - Rate limiting (5 attempts per 15 min)

Session Management:
  - JWT access token (15 min expiry)
  - Refresh token (30 days expiry)
  - Automatic token refresh
  - Logout (invalidate tokens)

Password Management:
  - Reset via email link
  - Change password (requires current password)
  - Password strength indicator
```

#### FR-2: Sync Engine

```yaml
Sync Triggers:
  - Highlight created/updated/deleted
  - Collection created/updated/deleted
  - Tag created/updated/deleted
  - Manual sync button
  - App startup (if online)
  - Network reconnection

Sync Strategy:
  - Batch uploads (every 30s or 10 events, whichever first)
  - Incremental sync (only changes since last sync)
  - Conflict detection (vector clocks)
  - Retry logic (exponential backoff: 1s, 2s, 4s, 8s, 16s)

Sync Status:
  - Idle: All synced
  - Syncing: Upload/download in progress
  - Error: Sync failed (with reason)
  - Offline: No network connection
  - Conflict: Manual resolution needed
```

#### FR-3: Conflict Resolution

```yaml
Conflict Types:
  1. Metadata Conflict:
     - Same highlight, different colors/tags
     - Resolution: Last-write-wins (timestamp)
  
  2. Overlapping Highlights:
     - Different highlights at same position
     - Resolution: Keep both, adjust positions
  
  3. Delete Conflict:
     - One device deleted, other modified
     - Resolution: Modified wins (deletion might be accidental)
  
  4. Collection Conflict:
     - Same collection, different highlights
     - Resolution: Merge (union of highlights)

Resolution UI:
  - Notification: "3 conflicts detected"
  - Side-by-side comparison
  - Options: Keep Local, Keep Remote, Keep Both
  - Auto-resolve option (use default strategy)
```

### 4.3 Non-Functional Requirements

```yaml
Performance:
  - Sync latency: <3s (p95)
  - API response time: <500ms (p95)
  - WebSocket latency: <100ms (p95)
  - Offline queue: Support 1000+ pending events

Reliability:
  - Sync success rate: >95%
  - Data loss: 0%
  - Uptime: >99.5% (Supabase SLA)

Security:
  - All API calls over HTTPS
  - JWT tokens encrypted in storage
  - Rate limiting on all endpoints
  - CORS properly configured

Scalability:
  - Support 10,000 users (Phase 2 target)
  - 100 highlights per user average
  - 1M total highlights in database
  - 10 req/s per user (burst)
```

---

## 5. Technical Architecture

### 5.1 System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    BROWSER EXTENSION                         │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         CONTENT SCRIPT (Per Tab)                   │    │
│  │                                                    │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────┐ │    │
│  │  │  Vault Mode  │  │ Multi-Selector│  │ IndexedDB│ │    │
│  │  │   (Phase 1)  │  │    Engine     │  │ Storage  │ │    │
│  │  └──────┬───────┘  └───────┬───────┘  └────┬────┘ │    │
│  │         │                  │               │      │    │
│  └─────────┼──────────────────┼───────────────┼──────┘    │
│            │                  │               │           │
│  ┌─────────┴──────────────────┴───────────────┴──────┐    │
│  │         BACKGROUND SERVICE WORKER                 │    │
│  │                                                   │    │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐ │    │
│  │  │   Auth     │  │   Sync     │  │  API       │ │    │
│  │  │  Manager   │  │   Queue    │  │  Client    │ │    │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘ │    │
│  └────────┼───────────────┼───────────────┼────────┘    │
│           │               │               │             │
└───────────┼───────────────┼───────────────┼─────────────┘
            │               │               │
            │ HTTPS         │ HTTPS         │ WSS
            │               │               │
┌───────────┴───────────────┴───────────────┴─────────────┐
│              SUPABASE BACKEND                            │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Auth API    │  │  REST API    │  │  WebSocket   │  │
│  │  (GoTrue)    │  │  (PostgREST) │  │  (Realtime)  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                  │          │
│  ┌──────┴─────────────────┴──────────────────┴──────┐   │
│  │          POSTGRESQL DATABASE                     │   │
│  │                                                   │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │   │
│  │  │  users   │ │highlights│ │  events          │ │   │
│  │  └──────────┘ └──────────┘ └──────────────────┘ │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │   │
│  │  │collections│ │  tags    │ │  sync_metadata   │ │   │
│  │  └──────────┘ └──────────┘ └──────────────────┘ │   │
│  └───────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### 5.2 Component Architecture

#### 5.2.1 Authentication Manager

```typescript
// src/background/auth-manager.ts - NEW FILE
export class AuthManager {
  private supabase: SupabaseClient;
  private currentUser: User | null = null;

  async signup(email: string, password: string): Promise<User>;
  async login(email: string, password: string): Promise<Session>;
  async logout(): Promise<void>;
  async refreshToken(): Promise<Session>;
  async getUser(): Promise<User | null>;
  async resetPassword(email: string): Promise<void>;
  
  // OAuth
  async loginWithGoogle(): Promise<Session>;
  async loginWithGitHub(): Promise<Session>;
}
```

#### 5.2.2 Sync Queue

```typescript
// src/background/sync-queue.ts - NEW FILE
export class SyncQueue {
  private queue: SyncEvent[] = [];
  private processing: boolean = false;
  private batchSize: number = 10;
  private batchInterval: number = 30000; // 30s

  async enqueue(event: SyncEvent): Promise<void>;
  async processBatch(): Promise<SyncResult>;
  async retry(failedEvents: SyncEvent[]): Promise<void>;
  async clear(): Promise<void>;
  
  // Status
  getPendingCount(): number;
  getStatus(): SyncStatus;
}
```

#### 5.2.3 API Client

```typescript
// src/background/api-client.ts - NEW FILE
export class APIClient {
  private supabase: SupabaseClient;
  private authManager: AuthManager;

  // Highlights
  async createHighlight(data: HighlightDataV2): Promise<void>;
  async updateHighlight(id: string, updates: Partial<HighlightDataV2>): Promise<void>;
  async deleteHighlight(id: string): Promise<void>;
  async getHighlights(url?: string): Promise<HighlightDataV2[]>;
  
  // Sync
  async pushEvents(events: SyncEvent[]): Promise<PushResult>;
  async pullEvents(since: number): Promise<SyncEvent[]>;
  
  // Collections
  async createCollection(name: string): Promise<Collection>;
  async updateCollection(id: string, updates: Partial<Collection>): Promise<void>;
  async deleteCollection(id: string): Promise<void>;
  async getCollections(): Promise<Collection[]>;
}
```

#### 5.2.4 Conflict Resolver

```typescript
// src/background/conflict-resolver.ts - NEW FILE
export class ConflictResolver {
  async detectConflicts(
    local: SyncEvent[],
    remote: SyncEvent[]
  ): Promise<Conflict[]>;
  
  async resolveConflict(
    conflict: Conflict,
    strategy: 'local' | 'remote' | 'merge'
  ): Promise<SyncEvent>;
  
  async autoResolve(conflicts: Conflict[]): Promise<Resolution[]>;
}
```

---

## 6. Database Schema

### 6.1 Supabase PostgreSQL Schema

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (managed by Supabase Auth)
-- No need to create, uses auth.users

-- Highlights table
CREATE TABLE highlights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  text TEXT NOT NULL,
  color_role TEXT NOT NULL DEFAULT 'yellow',
  
  -- Multi-selector data
  selectors JSONB NOT NULL,
  
  -- Metadata
  content_hash TEXT NOT NULL,
  page_title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Sync metadata
  synced BOOLEAN DEFAULT TRUE,
  version INTEGER DEFAULT 1,
  vector_clock JSONB DEFAULT '{}'::jsonb,
  
  -- Soft delete
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT highlights_user_url_idx UNIQUE (user_id, url, id)
);

-- Events table (event sourcing)
CREATE TABLE events (
  event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  data JSONB NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  synced BOOLEAN DEFAULT TRUE,
  
  -- For ordering
  sequence_number BIGSERIAL
);

-- Collections table
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Sync metadata
  synced BOOLEAN DEFAULT TRUE,
  version INTEGER DEFAULT 1,
  
  CONSTRAINT collections_user_name_unique UNIQUE (user_id, name)
);

-- Collection highlights (many-to-many)
CREATE TABLE collection_highlights (
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  highlight_id UUID REFERENCES highlights(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (collection_id, highlight_id)
);

-- Tags table
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT tags_user_name_unique UNIQUE (user_id, name)
);

-- Highlight tags (many-to-many)
CREATE TABLE highlight_tags (
  highlight_id UUID REFERENCES highlights(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (highlight_id, tag_id)
);

-- Sync metadata (for conflict resolution)
CREATE TABLE sync_metadata (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  last_sync_at TIMESTAMPTZ DEFAULT NOW(),
  vector_clock JSONB DEFAULT '{}'::jsonb,
  
  PRIMARY KEY (user_id, device_id)
);

-- Indexes for performance
CREATE INDEX idx_highlights_user_url ON highlights(user_id, url) WHERE deleted_at IS NULL;
CREATE INDEX idx_highlights_created_at ON highlights(created_at DESC);
CREATE INDEX idx_events_user_timestamp ON events(user_id, timestamp DESC);
CREATE INDEX idx_events_sequence ON events(sequence_number);
CREATE INDEX idx_collections_user ON collections(user_id);

-- Full-text search (for Phase 3)
CREATE INDEX idx_highlights_text_search ON highlights USING gin(to_tsvector('english', text));

-- Row Level Security (RLS)
ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can only access their own highlights"
  ON highlights FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own events"
  ON events FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own collections"
  ON collections FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own tags"
  ON tags FOR ALL
  USING (auth.uid() = user_id);

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_highlights_updated_at BEFORE UPDATE ON highlights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 6.2 Migration Scripts

```sql
-- Migration: local_to_cloud_v1.sql
-- Migrates existing IndexedDB data to Supabase

-- Step 1: Export from IndexedDB (client-side JavaScript)
-- Step 2: Upload to Supabase (handled by migration service)
-- Step 3: Verify data integrity
-- Step 4: Mark local data as synced

-- This migration is run client-side via the extension
```

---

## 7. API Specifications

### 7.1 Authentication Endpoints

#### POST /auth/signup
```typescript
Request:
{
  email: string;
  password: string;
}

Response:
{
  user: {
    id: string;
    email: string;
    created_at: string;
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

Errors:
  400: Invalid email/password
  409: Email already exists
  429: Too many requests
```

#### POST /auth/login
```typescript
Request:
{
  email: string;
  password: string;
}

Response:
{
  user: User;
  session: Session;
}

Errors:
  401: Invalid credentials
  429: Too many attempts
```

#### POST /auth/refresh
```typescript
Request:
{
  refresh_token: string;
}

Response:
{
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

Errors:
  401: Invalid refresh token
```

### 7.2 Highlights Endpoints

#### GET /highlights
```typescript
Query Parameters:
  url?: string  // Filter by URL
  limit?: number  // Default: 100
  offset?: number  // For pagination

Response:
{
  highlights: HighlightDataV2[];
  total: number;
  has_more: boolean;
}
```

#### POST /highlights
```typescript
Request:
{
  url: string;
  text: string;
  color_role: string;
  selectors: MultiSelector;
  content_hash: string;
}

Response:
{
  id: string;
  created_at: string;
}
```

#### PUT /highlights/:id
```typescript
Request:
{
  color_role?: string;
  selectors?: MultiSelector;
}

Response:
{
  updated_at: string;
}
```

#### DELETE /highlights/:id
```typescript
Response:
{
  deleted_at: string;
}
```

### 7.3 Sync Endpoints

#### POST /sync/push
```typescript
Request:
{
  events: SyncEvent[];
  device_id: string;
  vector_clock: VectorClock;
}

Response:
{
  synced_event_ids: string[];
  conflicts: Conflict[];
  server_vector_clock: VectorClock;
}
```

#### GET /sync/pull
```typescript
Query Parameters:
  since: number  // Timestamp or sequence number

Response:
{
  events: SyncEvent[];
  vector_clock: VectorClock;
  has_more: boolean;
}
```

### 7.4 WebSocket Events

```typescript
// Client → Server
{
  type: 'subscribe';
  channel: 'highlights';
  user_id: string;
}

// Server → Client
{
  type: 'highlight.created';
  data: HighlightDataV2;
  timestamp: number;
}

{
  type: 'highlight.updated';
  data: { id: string; updates: Partial<HighlightDataV2> };
  timestamp: number;
}

{
  type: 'highlight.deleted';
  data: { id: string };
  timestamp: number;
}
```

---

## 8. Authentication & Security

### 8.1 JWT Token Management

```typescript
// Token structure
interface JWTPayload {
  sub: string;  // user_id
  email: string;
  iat: number;  // issued at
  exp: number;  // expires at
}

// Token storage (encrypted in IndexedDB)
class TokenStore {
  async saveTokens(access: string, refresh: string): Promise<void>;
  async getAccessToken(): Promise<string | null>;
  async getRefreshToken(): Promise<string | null>;
  async clearTokens(): Promise<void>;
}
```

### 8.2 Secure Communication

```yaml
HTTPS Only:
  - All API calls use HTTPS
  - Certificate pinning (optional)
  - TLS 1.3 minimum

CORS Configuration:
  - Allowed origins: chrome-extension://*
  - Allowed methods: GET, POST, PUT, DELETE
  - Allowed headers: Authorization, Content-Type
  - Credentials: include

Rate Limiting:
  - Auth endpoints: 5 req/15min per IP
  - API endpoints: 100 req/min per user
  - WebSocket: 1 connection per user
```

### 8.3 Data Encryption

```typescript
// Encrypt sensitive data before storage
async function encryptData(data: string, key: CryptoKey): Promise<EncryptedData> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(data);
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );
  
  return { ciphertext, iv };
}

// Decrypt on retrieval
async function decryptData(encrypted: EncryptedData, key: CryptoKey): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: encrypted.iv },
    key,
    encrypted.ciphertext
  );
  
  return new TextDecoder().decode(decrypted);
}
```

---

## 9. Sync Strategy

### 9.1 Event Sourcing Architecture

```typescript
// Event types
type SyncEventType =
  | 'highlight.created'
  | 'highlight.updated'
  | 'highlight.deleted'
  | 'collection.created'
  | 'collection.updated'
  | 'collection.deleted'
  | 'highlights.cleared';

interface SyncEvent {
  event_id: string;
  type: SyncEventType;
  data: any;
  timestamp: number;
  device_id: string;
  vector_clock: VectorClock;
}
```

### 9.2 Batching Strategy

```typescript
class SyncBatcher {
  private batch: SyncEvent[] = [];
  private timer: NodeJS.Timeout | null = null;
  
  async add(event: SyncEvent): Promise<void> {
    this.batch.push(event);
    
    // Flush if batch size reached
    if (this.batch.length >= 10) {
      await this.flush();
    } else {
      // Schedule flush in 30s
      this.scheduleFlush();
    }
  }
  
  private scheduleFlush(): void {
    if (this.timer) return;
    
    this.timer = setTimeout(async () => {
      await this.flush();
    }, 30000);
  }
  
  private async flush(): Promise<void> {
    if (this.batch.length === 0) return;
    
    const events = [...this.batch];
    this.batch = [];
    
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    await this.apiClient.pushEvents(events);
  }
}
```

### 9.3 Offline Queue

```typescript
class OfflineQueue {
  private db: IndexedDBStorage;
  
  async enqueue(event: SyncEvent): Promise<void> {
    await this.db.events.add({
      ...event,
      synced: false,
    });
  }
  
  async getUnsynced(): Promise<SyncEvent[]> {
    return await this.db.events
      .where('synced')
      .equals(false)
      .toArray();
  }
  
  async markSynced(eventIds: string[]): Promise<void> {
    await this.db.events.bulkUpdate(
      eventIds.map(id => ({ key: id, changes: { synced: true } }))
    );
  }
  
  async processPending(): Promise<void> {
    const unsynced = await this.getUnsynced();
    
    if (unsynced.length === 0) return;
    
    try {
      const result = await this.apiClient.pushEvents(unsynced);
      await this.markSynced(result.synced_event_ids);
      
      if (result.conflicts.length > 0) {
        await this.handleConflicts(result.conflicts);
      }
    } catch (error) {
      // Retry later
      console.error('Sync failed:', error);
    }
  }
}
```

---

## 10. Conflict Resolution

### 10.1 Vector Clocks

```typescript
interface VectorClock {
  [deviceId: string]: number;
}

class VectorClockManager {
  increment(clock: VectorClock, deviceId: string): VectorClock {
    return {
      ...clock,
      [deviceId]: (clock[deviceId] || 0) + 1,
    };
  }
  
  compare(a: VectorClock, b: VectorClock): 'before' | 'after' | 'concurrent' {
    let aBefore = false;
    let aAfter = false;
    
    const allDevices = new Set([...Object.keys(a), ...Object.keys(b)]);
    
    for (const device of allDevices) {
      const aVal = a[device] || 0;
      const bVal = b[device] || 0;
      
      if (aVal < bVal) aBefore = true;
      if (aVal > bVal) aAfter = true;
    }
    
    if (aBefore && !aAfter) return 'before';
    if (aAfter && !aBefore) return 'after';
    return 'concurrent';
  }
  
  merge(a: VectorClock, b: VectorClock): VectorClock {
    const allDevices = new Set([...Object.keys(a), ...Object.keys(b)]);
    const merged: VectorClock = {};
    
    for (const device of allDevices) {
      merged[device] = Math.max(a[device] || 0, b[device] || 0);
    }
    
    return merged;
  }
}
```

### 10.2 Conflict Detection

```typescript
class ConflictDetector {
  async detectConflicts(
    local: SyncEvent[],
    remote: SyncEvent[]
  ): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];
    
    // Group events by highlight ID
    const localByHighlight = this.groupByHighlight(local);
    const remoteByHighlight = this.groupByHighlight(remote);
    
    // Find conflicts
    for (const [highlightId, localEvents] of localByHighlight) {
      const remoteEvents = remoteByHighlight.get(highlightId);
      
      if (!remoteEvents) continue;
      
      const conflict = this.checkConflict(localEvents, remoteEvents);
      
      if (conflict) {
        conflicts.push(conflict);
      }
    }
    
    return conflicts;
  }
  
  private checkConflict(
    local: SyncEvent[],
    remote: SyncEvent[]
  ): Conflict | null {
    // Check if events are concurrent (not causally related)
    const localClock = local[local.length - 1].vector_clock;
    const remoteClock = remote[remote.length - 1].vector_clock;
    
    const relation = this.vectorClockManager.compare(localClock, remoteClock);
    
    if (relation === 'concurrent') {
      return {
        type: this.determineConflictType(local, remote),
        local,
        remote,
      };
    }
    
    return null;
  }
}
```

### 10.3 Resolution Strategies

```typescript
class ConflictResolver {
  async resolve(conflict: Conflict, strategy: ResolutionStrategy): Promise<SyncEvent> {
    switch (strategy) {
      case 'last-write-wins':
        return this.lastWriteWins(conflict);
      
      case 'keep-both':
        return this.keepBoth(conflict);
      
      case 'merge':
        return this.merge(conflict);
      
      case 'manual':
        return await this.promptUser(conflict);
    }
  }
  
  private lastWriteWins(conflict: Conflict): SyncEvent {
    const localTime = conflict.local[conflict.local.length - 1].timestamp;
    const remoteTime = conflict.remote[conflict.remote.length - 1].timestamp;
    
    return localTime > remoteTime
      ? conflict.local[conflict.local.length - 1]
      : conflict.remote[conflict.remote.length - 1];
  }
  
  private keepBoth(conflict: Conflict): SyncEvent {
    // For overlapping highlights, adjust positions
    const local = conflict.local[conflict.local.length - 1];
    const remote = conflict.remote[conflict.remote.length - 1];
    
    // Create new event that keeps both
    return {
      event_id: crypto.randomUUID(),
      type: 'highlight.created',
      data: [local.data, this.adjustPosition(remote.data)],
      timestamp: Date.now(),
      device_id: this.deviceId,
      vector_clock: this.vectorClockManager.merge(
        local.vector_clock,
        remote.vector_clock
      ),
    };
  }
}
```

---

## 11. Implementation Roadmap

### 11.1 Week 1: Backend Setup

**Sprint Goal**: Supabase infrastructure ready for development

```yaml
Tasks:
  - [ ] Create Supabase project
  - [ ] Set up PostgreSQL database
  - [ ] Run schema migration scripts
  - [ ] Configure Row Level Security (RLS)
  - [ ] Set up authentication (email/password)
  - [ ] Test basic CRUD operations
  - [ ] Set up local development environment

Deliverables:
  - Supabase project URL
  - Database schema deployed
  - Auth working (signup/login)
  - Postman collection for API testing

Acceptance Criteria:
  - Can create user via Supabase Auth
  - Can insert/query highlights via SQL
  - RLS policies prevent unauthorized access
  - Local Supabase CLI working
```

### 11.2 Week 2: API Client Implementation

**Sprint Goal**: Extension can communicate with Supabase

```yaml
Tasks:
  - [ ] Install Supabase JS client
  - [ ] Implement AuthManager class
  - [ ] Implement APIClient class
  - [ ] Add token storage (encrypted)
  - [ ] Add error handling
  - [ ] Add retry logic
  - [ ] Write unit tests

Deliverables:
  - src/background/auth-manager.ts
  - src/background/api-client.ts
  - src/background/token-store.ts
  - Unit tests (80%+ coverage)

Acceptance Criteria:
  - Can signup/login from extension
  - Can create/read/update/delete highlights
  - Tokens stored securely
  - Automatic token refresh works
```

### 11.3 Week 3: Sync Queue Implementation

**Sprint Goal**: Offline-first sync working

```yaml
Tasks:
  - [ ] Implement SyncQueue class
  - [ ] Implement SyncBatcher (30s batching)
  - [ ] Implement OfflineQueue
  - [ ] Add network detection
  - [ ] Add sync status indicators
  - [ ] Write integration tests

Deliverables:
  - src/background/sync-queue.ts
  - src/background/sync-batcher.ts
  - src/background/offline-queue.ts
  - Integration tests

Acceptance Criteria:
  - Highlights sync within 30s when online
  - Offline changes queued and synced when online
  - Sync status visible in UI
  - No data loss during offline/online transitions
```

### 11.4 Week 4: Conflict Resolution

**Sprint Goal**: Conflicts detected and resolved

```yaml
Tasks:
  - [ ] Implement VectorClockManager
  - [ ] Implement ConflictDetector
  - [ ] Implement ConflictResolver
  - [ ] Add conflict UI
  - [ ] Add auto-resolution strategies
  - [ ] Write conflict tests

Deliverables:
  - src/background/vector-clock-manager.ts
  - src/background/conflict-detector.ts
  - src/background/conflict-resolver.ts
  - src/popup/components/conflict-ui.ts
  - Conflict resolution tests

Acceptance Criteria:
  - Concurrent edits detected
  - Auto-resolution works for simple conflicts
  - User can manually resolve complex conflicts
  - No data loss during conflict resolution
```

### 11.5 Week 5: WebSocket Integration

**Sprint Goal**: Real-time sync working

```yaml
Tasks:
  - [ ] Set up Supabase Realtime
  - [ ] Implement WebSocket client
  - [ ] Add real-time event handlers
  - [ ] Add connection management
  - [ ] Add reconnection logic
  - [ ] Write E2E tests

Deliverables:
  - src/background/websocket-client.ts
  - Real-time event handlers
  - E2E tests (multi-device)

Acceptance Criteria:
  - Highlights appear on other devices within 3s
  - WebSocket reconnects automatically
  - No duplicate events
  - Works across multiple tabs
```

### 11.6 Week 6: Migration & Polish

**Sprint Goal**: Production-ready release

```yaml
Tasks:
  - [ ] Implement data migration (local → cloud)
  - [ ] Add migration UI
  - [ ] Add error tracking (Sentry)
  - [ ] Add performance monitoring
  - [ ] Write migration guide
  - [ ] Conduct security audit
  - [ ] Load testing

Deliverables:
  - Migration service
  - Migration UI
  - Monitoring dashboards
  - Security audit report
  - Load test results

Acceptance Criteria:
  - Existing users can migrate seamlessly
  - System handles 10,000 users
  - <1% error rate
  - Security vulnerabilities addressed
```

---

## 12. Testing Strategy

### 12.1 Unit Tests

```yaml
Coverage Target: 80%+

Components to Test:
  - AuthManager (signup, login, refresh, logout)
  - APIClient (all CRUD operations)
  - SyncQueue (enqueue, batch, flush)
  - VectorClockManager (increment, compare, merge)
  - ConflictDetector (detect, classify)
  - ConflictResolver (all strategies)

Tools:
  - Vitest (test runner)
  - Mock Service Worker (API mocking)
  - @supabase/supabase-js (mocked)

Example:
  describe('AuthManager', () => {
    it('should signup new user', async () => {
      const auth = new AuthManager(mockSupabase);
      const user = await auth.signup('test@example.com', 'password123');
      expect(user.email).toBe('test@example.com');
    });
  });
```

### 12.2 Integration Tests

```yaml
Scenarios:
  - End-to-end sync flow (create → sync → verify)
  - Offline → online transition
  - Conflict detection and resolution
  - Multi-device sync
  - Token refresh flow

Tools:
  - Playwright (browser automation)
  - Supabase local instance
  - Docker (for test database)

Example:
  test('should sync highlight across devices', async () => {
    // Device A creates highlight
    await deviceA.createHighlight('test text');
    
    // Wait for sync
    await sleep(3000);
    
    // Device B should see highlight
    const highlights = await deviceB.getHighlights();
    expect(highlights).toHaveLength(1);
    expect(highlights[0].text).toBe('test text');
  });
```

### 12.3 E2E Tests

```yaml
User Flows:
  - New user signup → create highlight → verify sync
  - Existing user login → see highlights → create new
  - Offline user → create highlights → go online → verify sync
  - Multi-device user → edit on device A → see on device B

Tools:
  - Playwright
  - Chrome extension testing framework
  - Supabase staging environment

Example:
  test('new user flow', async ({ page, context }) => {
    // Install extension
    await context.addExtension('./dist');
    
    // Signup
    await page.goto('chrome-extension://popup.html');
    await page.fill('[name=email]', 'test@example.com');
    await page.fill('[name=password]', 'password123');
    await page.click('button[type=submit]');
    
    // Create highlight
    await page.goto('https://example.com');
    await page.selectText('test paragraph');
    await page.keyboard.press('Control+U');
    
    // Verify synced
    await page.goto('chrome-extension://popup.html');
    const count = await page.textContent('.highlight-count');
    expect(count).toBe('1 highlight');
  });
```

### 12.4 Performance Tests

```yaml
Metrics:
  - Sync latency (p50, p95, p99)
  - API response time
  - WebSocket latency
  - Database query time
  - Memory usage
  - Network bandwidth

Tools:
  - k6 (load testing)
  - Chrome DevTools Performance
  - Supabase Dashboard (query analytics)

Scenarios:
  - 100 concurrent users creating highlights
  - 1000 highlights per user
  - Sync 100 events in one batch
  - 10 req/s per user (burst)

Acceptance Criteria:
  - Sync latency <3s (p95)
  - API response <500ms (p95)
  - Memory usage <100MB
  - No memory leaks
```

---

## 13. Deployment Plan

### 13.1 Environment Setup

```yaml
Development:
  - Supabase: Local instance (Docker)
  - Database: PostgreSQL 15
  - Extension: Loaded unpacked
  - Monitoring: Console logs

Staging:
  - Supabase: Staging project
  - Database: Supabase hosted
  - Extension: Packed (unlisted)
  - Monitoring: Sentry + Plausible

Production:
  - Supabase: Production project
  - Database: Supabase hosted (with backups)
  - Extension: Chrome Web Store
  - Monitoring: Sentry + Plausible + Uptime
```

### 13.2 Deployment Steps

```yaml
Pre-Deployment:
  1. Run all tests (unit + integration + E2E)
  2. Security audit
  3. Performance testing
  4. Database migration dry-run
  5. Backup production database

Deployment:
  1. Deploy database migrations
  2. Deploy backend changes (Supabase functions)
  3. Build extension (production mode)
  4. Upload to Chrome Web Store
  5. Gradual rollout (10% → 50% → 100%)

Post-Deployment:
  1. Monitor error rates
  2. Monitor sync success rates
  3. Monitor API latency
  4. User feedback collection
  5. Rollback plan ready
```

### 13.3 Rollback Plan

```yaml
Triggers:
  - Error rate >5%
  - Sync success rate <90%
  - Critical security vulnerability
  - Data loss detected

Steps:
  1. Pause rollout immediately
  2. Revert to previous extension version
  3. Rollback database migrations (if needed)
  4. Investigate root cause
  5. Fix and redeploy
```

---

## 14. Risk Management

### 14.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Data loss during sync** | Medium | Critical | Comprehensive testing, event sourcing, backups |
| **Supabase downtime** | Low | High | Offline queue, graceful degradation |
| **Conflict resolution bugs** | High | Medium | Extensive conflict tests, manual resolution fallback |
| **Performance degradation** | Medium | Medium | Load testing, query optimization, caching |
| **Security vulnerabilities** | Low | Critical | Security audit, penetration testing, bug bounty |

### 14.2 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Low user adoption** | Medium | High | Beta testing, user feedback, gradual rollout |
| **Supabase costs exceed budget** | Medium | Medium | Monitor usage, optimize queries, plan migration |
| **Competitor launches similar feature** | Low | Medium | Focus on unique value props, speed to market |
| **GDPR compliance issues** | Low | Critical | Legal review, privacy policy, data controls |

### 14.3 Mitigation Strategies

```yaml
Data Loss Prevention:
  - Event sourcing (append-only log)
  - Automatic backups (daily)
  - Point-in-time recovery
  - Soft deletes (30-day retention)

Performance Optimization:
  - Database indexing
  - Query optimization
  - Caching (Redis for Phase 3)
  - CDN for static assets

Security Hardening:
  - Regular security audits
  - Dependency scanning
  - Rate limiting
  - Input validation
  - SQL injection prevention (parameterized queries)
```

---

## 15. Success Metrics

### 15.1 Technical Metrics

```yaml
Sync Performance:
  - Sync success rate: >95%
  - Sync latency (p95): <3s
  - Conflict rate: <1%
  - Data loss: 0%

API Performance:
  - Response time (p95): <500ms
  - Error rate: <1%
  - Uptime: >99.5%

User Experience:
  - Time to first sync: <5s
  - Offline functionality: 100%
  - Migration success rate: >99%
```

### 15.2 User Metrics

```yaml
Adoption:
  - Phase 1 → Phase 2 migration: >80%
  - New user activation: >60%
  - Multi-device usage: >40%

Engagement:
  - Daily active users: +50%
  - Highlights per user: +30%
  - Session duration: +20%

Satisfaction:
  - Chrome Web Store rating: >4.5 stars
  - Support tickets: <10/week
  - Churn rate: <5%
```

### 15.3 Monitoring Dashboard

```yaml
Real-Time Metrics:
  - Active users (last 5 min)
  - Sync queue length
  - Error rate (last hour)
  - API latency (p95, last hour)

Daily Metrics:
  - New signups
  - Total highlights synced
  - Conflicts detected/resolved
  - Average sync latency

Weekly Metrics:
  - User retention (D7, D30)
  - Feature adoption rates
  - Performance trends
  - Cost per user
```

---

## Appendix A: Technology Stack

```yaml
Frontend:
  - TypeScript 5.x
  - Vitest (testing)
  - Playwright (E2E)

Backend:
  - Supabase (BaaS)
  - PostgreSQL 15
  - PostgREST (auto API)
  - GoTrue (auth)
  - Realtime (WebSocket)

Libraries:
  - @supabase/supabase-js (client)
  - dexie (IndexedDB)
  - zod (validation)

DevOps:
  - GitHub Actions (CI/CD)
  - Sentry (error tracking)
  - Plausible (analytics)
```

## Appendix B: Glossary

```yaml
Event Sourcing: Architecture pattern storing all changes as events
Vector Clock: Distributed timestamp for conflict detection
RLS: Row Level Security (database access control)
JWT: JSON Web Token (authentication)
WebSocket: Bidirectional real-time communication protocol
Sync Queue: Buffer for pending sync operations
Conflict: Concurrent edits to same data
Resolution Strategy: Method for resolving conflicts
```

---

**Document Status**: Ready for Implementation  
**Next Steps**: Review with team, get approval, start Week 1 tasks  
**Questions**: Contact [your-email@example.com]
