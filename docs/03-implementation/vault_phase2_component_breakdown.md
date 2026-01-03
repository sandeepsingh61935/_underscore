# Vault Mode Phase 2: Component-Based Implementation Plan

**Version**: 2.0 - Component Breakdown  
**Date**: 2026-01-03  
**Prerequisites**: Vault Mode Phase 1 (Local IndexedDB) Complete ✅  
**Duration**: 6 weeks  
**Architecture Compliance**: SOLID, Event Sourcing (ADR-001), Event-Driven (ADR-002)

---

## Document Overview

This document breaks down Vault Mode Phase 2 into **components** with comprehensive tasks that strictly follow:

1. **Event Sourcing** (ADR-001): All sync via immutable event log
2. **Event-Driven Architecture** (ADR-002): EventBus for component communication
3. **SOLID Principles**: SRP, OCP, LSP, ISP, DIP
4. **System Design Patterns**: Strategy, Factory, Repository, DI
5. **Testing Strategy v2**: Risk-based, realistic edge cases, minimal mocking

---

## Component Architecture

```
┌────────────────────────────────────────────────────────────┐
│                VAULT MODE PHASE 2 COMPONENTS                │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  C1: Authentication Layer (Supabase GoTrue)          │  │
│  │   - AuthManager                                      │  │
│  │   - TokenStore                                       │  │
│  │   - AuthStateObserver                                │  │
│  └──────┬───────────────────────────────────────────────┘  │
│         │                                                   │
│  ┌──────▼───────────────────────────────────────────────┐  │
│  │  C2: API Client Layer                                │  │
│  │   - SupabaseClient                                   │  │
│  │   - APIErrorHandler                                  │  │
│  │   - RetryDecorator (reuse from IPC)                  │  │
│  └──────┬───────────────────────────────────────────────┘  │
│         │                                                   │
│  ┌──────▼───────────────────────────────────────────────┐  │
│  │  C3: Event Sourcing Layer (ADR-001)                  │  │
│  │   - EventStore (IndexedDB)                           │  │
│  │   - EventPublisher                                   │  │
│  │   - EventReplayer                                    │  │
│  └──────┬───────────────────────────────────────────────┘  │
│         │                                                   │
│  ┌──────▼───────────────────────────────────────────────┐  │
│  │  C4: Sync Engine                                     │  │
│  │   - SyncQueue                                        │  │
│  │   - SyncBatcher                                      │  │
│  │   - OfflineQueue                                     │  │
│  │   - NetworkDetector                                  │  │
│  └──────┬───────────────────────────────────────────────┘  │
│         │                                                   │
│  ┌──────▼───────────────────────────────────────────────┐  │
│  │  C5: Conflict Resolution                             │  │
│  │   - VectorClockManager                               │  │
│  │   - ConflictDetector                                 │  │
│  │   - ConflictResolver                                 │  │
│  └──────┬───────────────────────────────────────────────┘  │
│         │                                                   │
│  ┌──────▼───────────────────────────────────────────────┐  │
│  │  C6: Real-Time Sync (WebSocket)                      │  │
│  │   - WebSocketClient                                  │  │
│  │   - RealtimeSubscription                             │  │
│  │   - ConnectionManager                                │  │
│  └──────┬───────────────────────────────────────────────┘  │
│         │                                                   │
│  ┌──────▼───────────────────────────────────────────────┐  │
│  │  C7: Migration Service                               │  │
│  │   - LocalToCloudMigrator                             │  │
│  │   - MigrationValidator                               │  │
│  │   - RollbackService                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

---

## Component 1: Authentication Layer

### Overview
Handles user authentication using Supabase GoTrue with OAuth providers (Google, Apple, Facebook, Twitter).

### Architecture Principles
- **SRP**: Each class has single responsibility (auth vs token storage vs state observation)
- **DIP**: Depend on `IAuthManager` interface, not concrete implementation
- **Event-Driven**: Emit auth state changes via EventBus

### Files to Create

```
src/background/auth/
├── interfaces/
│   └── i-auth-manager.ts          # Interface for auth operations
├── auth-manager.ts                 # Main auth service
├── token-store.ts                  # Encrypted token storage
├── auth-state-observer.ts          # Observable auth state
└── auth-errors.ts                  # Custom error types
```

### Tasks

#### Task 1.1: Define Auth Interfaces (ISP Compliance)
**Complexity**: Low  
**Duration**: 2 hours  
**Test Count**: 0 (just types)

- [ ] Create `IAuthManager` interface
  ```typescript
  export interface IAuthManager {
    signup(email: string, password: string): Promise<User>;
    login(email: string, password: string): Promise<Session>;
    loginWithOAuth(provider: OAuthProvider): Promise<Session>;
    logout(): Promise<void>;
    refreshToken(): Promise<Session>;
    getUser(): Promise<User | null>;
    resetPassword(email: string): Promise<void>;
  }
  ```
- [ ] Create `ITokenStore` interface
  ```typescript
  export interface ITokenStore {
    saveTokens(access: string, refresh: string): Promise<void>;
    getAccessToken(): Promise<string | null>;
    getRefreshToken(): Promise<string | null>;
    clearTokens(): Promise<void>;
  }
  ```
- [ ] Create `IAuthStateObserver` interface
  ```typescript
  export interface IAuthStateObserver {
    subscribe(callback: (state: AuthState) => void): () => void;
    getState(): AuthState;
  }
  ```
- [ ] Create `OAuthProvider` enum
  ```typescript
  export enum OAuthProvider {
    GOOGLE = 'google',
    APPLE = 'apple',
    FACEBOOK = 'facebook',
    TWITTER = 'twitter',
  }
  ```

**Architecture Pattern**: Interface Segregation Principle (ISP)  
**Reference**: `docs/05-quality-framework/03-architecture-principles.md:484-601`

---

#### Task 1.2: Implement TokenStore with Encryption
**Complexity**: Medium  
**Duration**: 4 hours  
**Test Count**: 8 integration tests

- [ ] Implement `TokenStore` class
  ```typescript
  export class TokenStore implements ITokenStore {
    constructor(
      private readonly storage: IStorage,
      private readonly logger: ILogger
    ) {}
    
    async saveTokens(access: string, refresh: string): Promise<void> {
      const encrypted = await this.encrypt({ access, refresh });
      await this.storage.set('auth_tokens', encrypted);
    }
    
    private async encrypt(data: unknown): Promise<EncryptedData> {
      // Use Web Crypto API (AES-GCM)
      const key = await this.deriveKey();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encoded = new TextEncoder().encode(JSON.stringify(data));
      const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoded
      );
      return { ciphertext, iv };
    }
  }
  ```
- [ ] Add encryption using Web Crypto API (AES-GCM)
- [ ] Add IV generation for encryption
- [ ] Add error handling for storage failures
- [ ] Add circuit breaker protection (reuse from IPC layer)

**Tests** (Integration):
1. Can save and retrieve tokens
2. Tokens are encrypted in storage
3. Invalid ciphertext throws error
4. Storage failure falls back gracefully
5. Clear tokens removes all data
6. Encryption uses unique IV per save
7. Token refresh updates storage
8. Concurrent saves don't corrupt data

**Architecture Pattern**: Adapter Pattern (wraps chrome.storage), Decorator Pattern (encryption)  
**Reference**: `docs/05-quality-framework/01-system-design-patterns.md:680-732`

---

#### Task 1.3: Implement AuthManager with OAuth
**Complexity**: High  
**Duration**: 8 hours  
**Test Count**: 15 unit tests

- [ ] Implement `AuthManager` class
  ```typescript
  export class AuthManager implements IAuthManager {
    private supabase: SupabaseClient;
    
    constructor(
      private readonly tokenStore: ITokenStore,
      private readonly eventBus: IEventBus,
      private readonly logger: ILogger,
      config: AuthConfig
    ) {
      this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    }
    
    async loginWithOAuth(provider: OAuthProvider): Promise<Session> {
      // Use chrome.identity.getRedirectURL() for extension
      const redirectURL = chrome.identity.getRedirectURL();
      
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectURL },
      });
      
      if (error) throw new AuthError(error.message);
      
      await this.tokenStore.saveTokens(
        data.session.access_token,
        data.session.refresh_token
      );
      
      this.eventBus.emit(EventName.AUTH_STATE_CHANGED, {
        user: data.user,
        isAuthenticated: true,
      });
      
      return data.session;
    }
  }
  ```
- [ ] Implement all IAuthManager methods
- [ ] Add OAuth flow for all 4 providers (Google, Apple, Facebook, Twitter)
- [ ] Add automatic token refresh (15min expiry)
- [ ] Emit events for auth state changes (ADR-002)
- [ ] Add error handling with custom AuthError types
- [ ] Add rate limiting protection (5 attempts per 15 min)

**Tests** (Unit):
1. `signup()` creates user and saves tokens
2. `login()` authenticates and saves tokens
3. `loginWithOAuth()` works for each provider (4 tests)
4. `logout()` clears tokens and emits event
5. `refreshToken()` updates access token
6. `getUser()` returns null when not authenticated
7. `resetPassword()` sends reset email
8. Failed login emits error event
9. Rate limiting prevents brute force
10. Token refresh happens automatically before expiry

**Architecture Pattern**: Facade Pattern (simplifies Supabase API), Observer Pattern (auth state via EventBus)  
**Event-Driven**: ADR-002 (emit `AUTH_STATE_CHANGED` event)  
**Reference**: `docs/04-adrs/002-event-driven-architecture.md:75-91`

---

#### Task 1.4: Implement AuthStateObserver
**Complexity**: Low  
**Duration**: 2 hours  
**Test Count**: 5 unit tests

- [ ] Implement `AuthStateObserver` class
  ```typescript
  export class AuthStateObserver implements IAuthStateObserver {
    private state: AuthState = { isAuthenticated: false, user: null };
    private callbacks = new Set<(state: AuthState) => void>();
    
    constructor(private readonly eventBus: IEventBus) {
      this.eventBus.on(EventName.AUTH_STATE_CHANGED, (data) => {
        this.state = data;
        this.notifySubscribers();
      });
    }
    
    subscribe(callback: (state: AuthState) => void): () => void {
      this.callbacks.add(callback);
      callback(this.state); // Immediate notification
      return () => this.callbacks.delete(callback);
    }
  }
  ```
- [ ] Listen to `AUTH_STATE_CHANGED` events
- [ ] Notify all subscribers on state change
- [ ] Return unsubscribe function
- [ ] Handle subscriber errors (don't break other subscribers)

**Tests** (Unit):
1. Subscribers notified on state change
2. Unsubscribe removes callback
3. Multiple subscribers all notified
4. Subscriber error doesn't break others
5. Initial state delivered immediately

**Architecture Pattern**: Observer Pattern  
**Reference**: `docs/05-quality-framework/01-system-design-patterns.md:643-676`

---

#### Task 1.5: DI Registration
**Complexity**: Low  
**Duration**: 1 hour  
**Test Count**: 3 integration tests

- [ ] Register `AuthManager` as singleton in DI container
  ```typescript
  container.registerSingleton('authManager', () => 
    new AuthManager(
      container.resolve('tokenStore'),
      container.resolve('eventBus'),
      container.resolve('logger'),
      authConfig
    )
  );
  ```
- [ ] Register `TokenStore` as singleton
- [ ] Register `AuthStateObserver` as singleton
- [ ] Add to bootstrap function

**Tests** (Integration):
1. Can resolve AuthManager from container
2. Multiple resolves return same instance (singleton)
3. Dependencies correctly injected

**Architecture Pattern**: Dependency Injection, Singleton  
**Reference**: `docs/05-quality-framework/01-system-design-patterns.md:483-595`

---

## Component 2: API Client Layer

### Overview
HTTP client for Supabase REST API with retry logic, circuit breaker, and error handling.

### Architecture Principles
- **DIP**: Depend on `IAPIClient` interface
- **Decorator Pattern**: Reuse RetryDecorator from IPC layer
- **Circuit Breaker**: Reuse CircuitBreakerDecorator from IPC layer

### Files to Create

```
src/background/api/
├── interfaces/
│   └── i-api-client.ts
├── supabase-client.ts
├── api-error-handler.ts
└── api-errors.ts
```

### Tasks

#### Task 2.1: Define API Client Interface
**Complexity**: Low  
**Duration**: 2 hours  
**Test Count**: 0 (just types)

- [ ] Create `IAPIClient` interface
  ```typescript
  export interface IAPIClient {
    // Highlights
    createHighlight(data: HighlightDataV2): Promise<void>;
    updateHighlight(id: string, updates: Partial<HighlightDataV2>): Promise<void>;
    deleteHighlight(id: string): Promise<void>;
    getHighlights(url?: string): Promise<HighlightDataV2[]>;
    
    // Sync
    pushEvents(events: SyncEvent[]): Promise<PushResult>;
    pullEvents(since: number): Promise<SyncEvent[]>;
    
    // Collections
    createCollection(name: string): Promise<Collection>;
    getCollections(): Promise<Collection[]>;
  }
  ```

---

#### Task 2.2: Implement SupabaseClient
**Complexity**: Medium  
**Duration**: 6 hours  
**Test Count**: 12 unit tests

- [ ] Implement `SupabaseClient` class
  ```typescript
  export class SupabaseClient implements IAPIClient {
    private client: SupabaseClient;
    
    constructor(
      private readonly authManager: IAuthManager,
      private readonly logger: ILogger,
      config: SupabaseConfig
    ) {
      this.client = createClient(config.url, config.anonKey);
    }
    
    async createHighlight(data: HighlightDataV2): Promise<void> {
      const user = await this.authManager.getUser();
      if (!user) throw new AuthError('Not authenticated');
      
      const { error } = await this.client
        .from('highlights')
        .insert({
          user_id: user.id,
          url: data.ranges[0].url,
          text: data.text,
          color_role: data.colorRole,
          selectors: data.ranges[0].selector,
          content_hash: data.contentHash,
          created_at: data.createdAt,
        });
        
      if (error) throw new APIError(error.message);
      
      this.logger.debug('Highlight created in Supabase', { id: data.id });
    }
  }
  ```
- [ ] Implement all interface methods
- [ ] Add automatic token injection via authManager
- [ ] Add request/response logging
- [ ] Add timeout handling (5s default)

**Tests** (Unit with mocked Supabase):
1. `createHighlight()` inserts correct data
2. `updateHighlight()` patches correct fields
3. `deleteHighlight()` soft-deletes record
4. `getHighlights()` filters by URL
5. `pushEvents()` batch inserts events
6. `pullEvents()` queries by timestamp
7. Unauthenticated requests throw AuthError
8. Network errors throw APIError
9. Timeout throws TimeoutError
10. 401 response triggers token refresh
11. 429 response throws RateLimitError
12. Large payloads (>1MB) handled

**Architecture Pattern**: Facade Pattern (wraps Supabase SDK)  
**Testing Strategy**: Use mocked Supabase client (not real network calls)  
**Reference**: `docs/testing/testing-strategy-v2.md:70-123`

---

#### Task 2.3: Add Retry and Circuit Breaker Decorators
**Complexity**: Low (reuse existing)  
**Duration**: 2 hours  
**Test Count**: 0 (already tested in IPC layer)

- [ ] Wrap SupabaseClient with RetryDecorator
  ```typescript
  const retryClient = new RetryDecorator(
    new SupabaseClient(authManager, logger, config),
    logger,
    { maxRetries: 3, backoffMs: 100 }
  );
  ```
- [ ] Wrap with CircuitBreakerDecorator
  ```typescript
  const resilientClient = new CircuitBreakerDecorator(
    retryClient,
    logger,
    { failureThreshold: 5, resetTimeout: 30000 }
  );
  ```
- [ ] Register in DI container

**Architecture Pattern**: Decorator Pattern (composition chain)  
**Reference**: `docs/05-quality-framework/01-system-design-patterns.md:768-800`

---

## Component 3: Event Sourcing Layer

### Overview
Implements event sourcing (ADR-001) with IndexedDB event store, event publishing, and event replay.

### Architecture Principles
- **Event Sourcing**: All state changes are events
- **Immutability**: Events are append-only, never modified
- **Replay**: Current state reconstructed from events

### Files to Create

```
src/background/events/
├── interfaces/
│   ├── i-event-store.ts
│   └── i-event-publisher.ts
├── event-store.ts               # IndexedDB persistence
├── event-publisher.ts           # Publish to Supabase
├── event-replayer.ts            # Reconstruct state
└── event-types.ts              # Event schemas
```

### Tasks

#### Task 3.1: Define Event Schemas (Zod)
**Complexity**: Medium  
**Duration**: 4 hours  
**Test Count**: 10 validation tests

- [ ] Create event type enum
  ```typescript
  export enum SyncEventType {
    HIGHLIGHT_CREATED = 'highlight.created',
    HIGHLIGHT_UPDATED = 'highlight.updated',
    HIGHLIGHT_DELETED = 'highlight.deleted',
    COLLECTION_CREATED = 'collection.created',
    COLLECTION_UPDATED = 'collection.updated',
    COLLECTION_DELETED = 'collection.deleted',
  }
  ```
- [ ] Create `SyncEvent` schema
  ```typescript
  const SyncEventSchema = z.object({
    event_id: z.string().uuid(),
    user_id: z.string().uuid(),
    type: z.nativeEnum(SyncEventType),
    data: z.union([
      HighlightDataV2Schema,
      CollectionSchema,
      z.object({ id: z.string() }), // For deletes
    ]),
    timestamp: z.number(),
    device_id: z.string(),
    vector_clock: z.record(z.string(), z.number()),
    checksum: z.string(),
  });
  ```
- [ ] Create `VectorClock` type
  ```typescript
  export type VectorClock = Record<string, number>;
  ```
- [ ] Add checksum generation (SHA-256)

**Tests** (Validation):
1-6. Each event type validates correctly
7. Invalid event type rejected
8. Missing required fields rejected
9. Checksum validation works
10. Vector clock structure validated

**Event Sourcing**: ADR-001 compliance  
**Reference**: `docs/04-adrs/001-event-sourcing-for-sync.md:44-58`

---

#### Task 3.2: Implement EventStore (IndexedDB)
**Complexity**: High  
**Duration**: 8 hours  
**Test Count**: 15 integration tests

- [ ] Implement `EventStore` class
  ```typescript
  export class EventStore implements IEventStore {
    private db!: IDBDatabase;
    
    constructor(private readonly logger: ILogger) {}
    
    async initialize(): Promise<void> {
      this.db = await openDB('EventStoreDB', 1, {
        upgrade(db) {
          const store = db.createObjectStore('events', {
            keyPath: 'event_id',
          });
          store.createIndex('user_timestamp', ['user_id', 'timestamp']);
          store.createIndex('synced', 'synced');
        },
      });
    }
    
    async append(event: SyncEvent): Promise<void> {
      const tx = this.db.transaction('events', 'readwrite');
      await tx.objectStore('events').add({
        ...event,
        synced: false,
      });
      await tx.done;
      
      this.logger.debug('Event appended', { event_id: event.event_id });
    }
    
    async getUnsynced(): Promise<SyncEvent[]> {
      const tx = this.db.transaction('events', 'readonly');
      const index = tx.objectStore('events').index('synced');
      return await index.getAll(IDBKeyRange.only(false));
    }
  }
  ```
- [ ] Add `append()` method (insert only, no updates)
- [ ] Add `getUnsynced()` method
- [ ] Add `markSynced()` method
- [ ] Add `getEventsSince()` method
- [ ] Add `getAllEvents()` for replay
- [ ] Add database migration support

**Tests** (Integration with fake-indexeddb):
1. Can append events
2. Events retrieved in chronological order (**CRITICAL** per testing strategy)
3. Unsynced events filtered correctly
4. Mark synced updates flag
5. Get events since timestamp works
6. Concurrent appends don't corrupt data
7. Large event batches (1000+) handled
8. Database migration v1→v2 works
9. Corrupted database detected and reset
10. Quota exceeded handled gracefully
11. Transaction rollback on error
12. Index queries performant
13. Duplicate event_id rejected
14. Event checksum validated on read
15. Memory leak test (append 10k events)

**Testing Strategy**: "Real" IndexedDB (fake-indexeddb), not mocks  
**Reference**: `docs/testing/testing-strategy-v2.md:125-182`

**Event Sourcing**: Append-only, immutable log  
**Reference**: `docs/04-adrs/001-event-sourcing-for-sync.md:32-42`

---

#### Task 3.3: Implement EventPublisher
**Complexity**: Medium  
**Duration**: 4 hours  
**Test Count**: 8 unit tests

- [ ] Implement `EventPublisher` class
  ```typescript
  export class EventPublisher implements IEventPublisher {
    constructor(
      private readonly apiClient: IAPIClient,
      private readonly eventStore: IEventStore,
      private readonly logger: ILogger
    ) {}
    
    async publish(): Promise<PublishResult> {
      const unsynced = await this.eventStore.getUnsynced();
      
      if (unsynced.length === 0) {
        return { synced: 0, failed: 0 };
      }
      
      try {
        const result = await this.apiClient.pushEvents(unsynced);
        await this.eventStore.markSynced(result.synced_event_ids);
        
        return {
          synced: result.synced_event_ids.length,
          failed: unsynced.length - result.synced_event_ids.length,
        };
      } catch (error) {
        this.logger.error('Event publish failed', error);
        throw error;
      }
    }
  }
  ```
- [ ] Batch publish unsynced events
- [ ] Mark events as synced after successful push
- [ ] Handle partial failures
- [ ] Emit publish status events

**Tests** (Unit):
1. Publishes all unsynced events
2. Marks events as synced after success
3. Partial failure handled (some synced, some failed)
4. Network error doesn't mark as synced
5. Empty queue returns early
6. Large batches (100+ events) published
7. Emits publish success event
8. Emits publish failure event

---

#### Task 3.4: Implement EventReplayer
**Complexity**: High  
**Duration**: 6 hours  
**Test Count**: 12 integration tests

- [ ] Implement `EventReplayer` class
  ```typescript
  export class EventReplayer {
    constructor(
      private readonly eventStore: IEventStore,
      private readonly repository: IRepository<HighlightDataV2>,
      private readonly logger: ILogger
    ) {}
    
    async replay(since?: number): Promise<ReplayResult> {
      const events = since
        ? await this.eventStore.getEventsSince(since)
        : await this.eventStore.getAllEvents();
        
      let applied = 0;
      let skipped = 0;
      
      for (const event of events) {
        try {
          await this.applyEvent(event);
          applied++;
        } catch (error) {
          this.logger.warn('Event replay failed', { event, error });
          skipped++;
        }
      }
      
      return { applied, skipped };
    }
    
    private async applyEvent(event: SyncEvent): Promise<void> {
      switch (event.type) {
        case SyncEventType.HIGHLIGHT_CREATED:
          await this.repository.add(event.data as HighlightDataV2);
          break;
        case SyncEventType.HIGHLIGHT_DELETED:
          await this.repository.remove((event.data as { id: string }).id);
          break;
        // ... other event types
      }
    }
  }
  ```
- [ ] Replay events in chronological order
- [ ] Apply events to repository
- [ ] Handle event application errors
- [ ] Return replay statistics

**Tests** (Integration):
1. Replays all events in order
2. Reconstructs correct final state
3. Handles event gaps gracefully
4. Replays from specific timestamp
5. Invalid event skipped, replay continues
6. Large event history (1000+ events) replayed
7. Duplicate events idempotent
8. Out-of-order events handled
9. Event with missing data skipped
10. Replay metrics accurate
11. Memory efficient (streaming events)
12. Snapshot optimization (future: skip old events)

**Event Sourcing**: State reconstruction from events  
**Reference**: `docs/04-adrs/001-event-sourcing-for-sync.md:68-72`

---

## Component 4: Sync Engine

### Overview
Manages synchronization queue, batching,offline queue, and network detection.

### Architecture Principles
- **SRP**: Separate classes for queue, batcher, network detection
- **Event-Driven**: Emit sync status events

### Files to Create

```
src/background/sync/
├── interfaces/
│   ├── i-sync-queue.ts
│   └── i-network-detector.ts
├── sync-queue.ts
├── sync-batcher.ts
├── offline-queue.ts
├── network-detector.ts
└── sync-status.ts
```

### Tasks

#### Task 4.1: Implement NetworkDetector
**Complexity**: Low  
**Duration**: 2 hours  
**Test Count**: 5 unit tests

- [ ] Implement `NetworkDetector` class
  ```typescript
  export class NetworkDetector implements INetworkDetector {
    private isOnline = navigator.onLine;
    
    constructor(private readonly eventBus: IEventBus) {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
    
    private handleOnline(): void {
      this.isOnline = true;
      this.eventBus.emit(EventName.NETWORK_STATUS_CHANGED, {
        isOnline: true,
      });
    }
  }
  ```
- [ ] Listen to `online`/`offline` events
- [ ] Emit network status change events
- [ ] Provide `isOnline()` method

**Tests** (Unit):
1. Detects online → offline transition
2. Detects offline → online transition
3. Emits correct events
4. Initial state correct
5. Multiple transitions handled

---

#### Task 4.2: Implement SyncBatcher
**Complexity**: Medium  
**Duration**: 4 hours  
**Test Count**: 10 unit tests

- [ ] Implement `SyncBatcher` class
  ```typescript
  export class SyncBatcher {
    private batch: SyncEvent[] = [];
    private timer: NodeJS.Timeout | null = null;
    private readonly BATCH_SIZE = 10;
    private readonly BATCH_INTERVAL = 30000; // 30s
    
    constructor(
      private readonly eventPublisher: IEventPublisher,
      private readonly logger: ILogger
    ) {}
    
    async add(event: SyncEvent): Promise<void> {
      this.batch.push(event);
      
      if (this.batch.length >= this.BATCH_SIZE) {
        await this.flush();
      } else {
        this.scheduleFlush();
      }
    }
    
    private async flush(): Promise<void> {
      if (this.batch.length === 0) return;
      
      const events = [...this.batch];
      this.batch = [];
      this.clearTimer();
      
      await this.eventPublisher.publish();
    }
  }
  ```
- [ ] Batch events (max 10 or 30s timeout)
- [ ] Flush on batch size reached
- [ ] Flush on timer expiry
- [ ] Clear timer on manual flush

**Tests** (Unit):
1. Flushes after 10 events
2. Flushes after 30s timeout
3. Multiple adds before flush work
4. Flush clears batch
5. Timer canceled on flush
6. Empty batch doesn't publish
7. Concurrent adds don't corrupt batch
8. Flush errors don't lose events
9. Timer resets on each add
10. Memory efficient (no batch leaks)

**Testing Strategy**: Use `vi.useFakeTimers()` for time control  
**Reference**: `docs/testing/testing-strategy-v2.md:423-442`

---

#### Task 4.3: Implement SyncQueue
**Complexity**: Medium  
**Duration**: 4 hours  
**Test Count**: 8 unit tests

- [ ] Implement `SyncQueue` class
  ```typescript
  export class SyncQueue implements ISyncQueue {
    constructor(
      private readonly eventStore: IEventStore,
      private readonly batcher: SyncBatcher,
      private readonly networkDetector: INetworkDetector,
      private readonly eventBus: IEventBus
    ) {
      this.listenToNetworkChanges();
    }
    
    async enqueue(event: SyncEvent): Promise<void> {
      await this.eventStore.append(event);
      
      if (this.networkDetector.isOnline()) {
        await this.batcher.add(event);
      }
    }
    
    private listenToNetworkChanges(): void {
      this.eventBus.on(EventName.NETWORK_STATUS_CHANGED, async (data) => {
        if (data.isOnline) {
          await this.processPending();
        }
      });
    }
  }
  ```
- [ ] Enqueue events to EventStore
- [ ] If online, add to batcher
- [ ] If offline, queue until online
- [ ] Listen for network changes
- [ ] Process pending when online

**Tests** (Unit):
1. Enqueue stores in EventStore
2. Online events added to batcher
3. Offline events queued
4. Network change triggers pending process
5. Errors don't block queue
6. Concurrent enqueues handled
7. Queue status accurate
8. Pending count correct

---

#### Task 4.4: Implement OfflineQueue
**Complexity**: Low  
**Duration**: 2 hours  
**Test Count**: 5 unit tests

- [ ] Implement `OfflineQueue` class (wrapper around EventStore)
  ```typescript
  export class OfflineQueue {
    constructor(private readonly eventStore: IEventStore) {}
    
    async getPendingCount(): Promise<number> {
      const unsynced = await this.eventStore.getUnsynced();
      return unsynced.length;
    }
    
    async processPending(): Promise<void> {
      // Handled by SyncQueue
    }
  }
  ```

**Tests** (Unit):
1. Gets correct pending count
2. Empty queue returns 0
3. Large queue (1000+) handled
4. Concurrent queries don't block
5. Processing clears queue

---

## Component 5: Conflict Resolution

### Overview
Detects and resolves sync conflicts using vector clocks.

### Architecture Principles
- **SRP**: Separate detection from resolution
- **Strategy Pattern**: Multiple resolution strategies

### Files to Create

```
src/background/conflicts/
├── interfaces/
│   ├── i-conflict-detector.ts
│   └── i-conflict-resolver.ts
├── vector-clock-manager.ts
├── conflict-detector.ts
├── conflict-resolver.ts
└── conflicts-types.ts
```

### Tasks

#### Task 5.1: Implement VectorClockManager
**Complexity**: Medium  
**Duration**: 4 hours  
**Test Count**: 12 unit tests

- [ ] Implement `VectorClockManager` class
  ```typescript
  export class VectorClockManager {
    increment(clock: VectorClock, deviceId: string): VectorClock {
      return {
        ...clock,
        [deviceId]: (clock[deviceId] || 0) + 1,
      };
    }
    
    compare(
      a: VectorClock,
      b: VectorClock
    ): 'before' | 'after' | 'concurrent' {
      let aBefore = false;
      let aAfter = false;
      
      const allDevices = new Set([
        ...Object.keys(a),
        ...Object.keys(b),
      ]);
      
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
      const allDevices = new Set([
        ...Object.keys(a),
        ...Object.keys(b),
      ]);
      const merged: VectorClock = {};
      
      for (const device of allDevices) {
        merged[device] = Math.max(a[device] || 0, b[device] || 0);
      }
      
      return merged;
    }
  }
  ```

**Tests** (Unit):
1-3. `compare()` detects before/after/concurrent
4. `increment()` increments device counter
5. `merge()` takes max of each device
6. Empty clocks handled
7. New device in clock B handled
8. Large device counts (100+) handled
9. Negative values rejected
10. Non-integer values rejected
11. Concurrent detection accurate
12. Merge associative and commutative

**Event Sourcing**: Vector clock conflict detection  
**Reference**: `docs/04-adrs/001-event-sourcing-for-sync.md:40-42`

---

#### Task 5.2: Implement ConflictDetector
**Complexity**: High  
**Duration**: 6 hours  
**Test Count**: 15 integration tests

- [ ] Implement `ConflictDetector` class
  ```typescript
  export class ConflictDetector implements IConflictDetector {
    constructor(
      private readonly vectorClockManager: VectorClockManager,
      private readonly logger: ILogger
    ) {}
    
    async detectConflicts(
      local: SyncEvent[],
      remote: SyncEvent[]
    ): Promise<Conflict[]> {
      const conflicts: Conflict[] = [];
      
      // Group by entity ID
      const localByEntity = this.groupByEntity(local);
      const remoteByEntity = this.groupByEntity(remote);
      
      for (const [entityId, localEvents] of localByEntity) {
        const remoteEvents = remoteByEntity.get(entityId);
        if (!remoteEvents) continue;
        
        const conflict = this.checkConflict(localEvents, remoteEvents);
        if (conflict) conflicts.push(conflict);
      }
      
      return conflicts;
    }
    
    private checkConflict(
      local: SyncEvent[],
      remote: SyncEvent[]
    ): Conflict | null {
      const localClock = local[local.length - 1].vector_clock;
      const remoteClock = remote[remote.length - 1].vector_clock;
      
      const relation = this.vectorClockManager.compare(
        localClock,
        remoteClock
      );
      
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

**Tests** (Integration):
1. No conflict when events causally ordered
2. Conflict when events concurrent
3. Metadata conflict detected
4. Delete conflict detected
5. Overlapping highlight conflict detected
6. Multiple conflicts detected
7. Empty event lists handled
8. Large event lists (100+ events) handled
9. Conflict type correctly determined
10. Same entity, different properties
11. Different entities, no conflict
12. Three-way conflicts detected
13. Transitive causality handled
14. Clock merge after conflict
15. Conflict deduplication

---

#### Task 5.3: Implement ConflictResolver
**Complexity**: High  
**Duration**: 6 hours  
**Test Count**: 12 unit tests

- [ ] Implement `ConflictResolver` class with strategies
  ```typescript
  export class ConflictResolver implements IConflictResolver {
    async resolve(
      conflict: Conflict,
      strategy: ResolutionStrategy
    ): Promise<SyncEvent> {
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
  }
  ```
- [ ] Implement 4 resolution strategies
- [ ] Add user prompt for manual resolution
- [ ] Merge vector clocks after resolution

**Tests** (Unit):
1-4. Each resolution strategy works correctly
5. Last-write-wins uses most recent timestamp
6. Keep-both adjusts positions
7. Merge combines non-conflicting fields
8. Manual resolution prompts user
9. Vector clocks merged correctly
10. Resolution emits event
11. Invalid strategy throws error
12. Null conflict handled

**Strategy Pattern**: Multiple resolution algorithms  
**Reference**: `docs/05-quality-framework/01-system-design-patterns.md:126-330`

---

## Component 6: Real-Time Sync (WebSocket)

### Overview
WebSocket client for real-time updates using Supabase Realtime.

### Files to Create

```
src/background/realtime/
├── interfaces/
│   └── i-websocket-client.ts
├── websocket-client.ts
├── realtime-subscription.ts
└── connection-manager.ts
```

### Tasks

#### Task 6.1: Implement WebSocketClient
**Complexity**: High  
**Duration**: 8 hours  
**Test Count**: 15 integration tests

- [ ] Implement `WebSocketClient` using Supabase Realtime
  ```typescript
  export class WebSocketClient implements IWebSocketClient {
    private channel?: RealtimeChannel;
    
    constructor(
      private readonly supabase: SupabaseClient,
      private readonly eventBus: IEventBus,
      private readonly logger: ILogger
    ) {}
    
    async subscribe(userId: string): Promise<void> {
      this.channel = this.supabase
        .channel('highlights')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'highlights',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => this.handleChange(payload)
        )
        .subscribe((status) => {
          this.logger.info('WebSocket status', { status });
        });
    }
    
    private handleChange(payload: RealtimePayload): void {
      switch (payload.eventType) {
        case 'INSERT':
          this.eventBus.emit(EventName.REMOTE_HIGHLIGHT_CREATED, payload.new);
          break;
        case 'UPDATE':
          this.eventBus.emit(EventName.REMOTE_HIGHLIGHT_UPDATED, payload.new);
          break;
        case 'DELETE':
          this.eventBus.emit(EventName.REMOTE_HIGHLIGHT_DELETED, payload.old);
          break;
      }
    }
  }
  ```
- [ ] Subscribe to user-specific channel
- [ ] Handle INSERT/UPDATE/DELETE events
- [ ] Emit events via EventBus
- [ ] Add reconnection logic
- [ ] Handle connection errors

**Tests** (Integration):
1. Successful connection
2. Subscription to user channel works
3. INSERT events emitted
4. UPDATE events emitted
5. DELETE events emitted
6. Reconnection after disconnect
7. Multiple subscriptions handled
8. Unsubscribe cleans up
9. Connection error handled
10. Large payload handled
11. Concurrent events handled
12. Duplicate events deduplicated
13. Out-of-order events handled
14. Connection timeout handled
15. Memory leak test (1000 events)

**Event-Driven**: Emit remote change events  
**Reference**: `docs/04-adrs/002-event-driven-architecture.md:56-72`

---

#### Task 6.2: Implement ConnectionManager
**Complexity**: Medium  
**Duration**: 4 hours  
**Test Count**: 8 unit tests

- [ ] Implement `ConnectionManager` with exponential backoff
  ```typescript
  export class ConnectionManager {
    private reconnectAttempts = 0;
    private readonly MAX_ATTEMPTS = 5;
    
    async connect(): Promise<void> {
      try {
        await this.wsClient.subscribe(this.userId);
        this.reconnectAttempts = 0;
      } catch (error) {
        await this.handleReconnect();
      }
    }
    
    private async handleReconnect(): Promise<void> {
      if (this.reconnectAttempts >= this.MAX_ATTEMPTS) {
        this.logger.error('Max reconnect attempts reached');
        return;
      }
      
      const delay = Math.min(
        1000 * Math.pow(2, this.reconnectAttempts),
        30000
      );
      this.reconnectAttempts++;
      
      await new Promise((resolve) => setTimeout(resolve, delay));
      await this.connect();
    }
  }
  ```
- [ ] Exponential backoff (1s, 2s, 4s, 8s, 16s, 30s max)
- [ ] Max 5 reconnection attempts
- [ ] Reset counter on successful connection

**Tests** (Unit):
1. Successful connection resets counter
2. Failed connection triggers reconnect
3. Exponential backoff delays correct
4. Max attempts stops reconnection
5. Manual disconnect doesn't reconnect
6. Network change triggers reconnect
7. Multiple failures handled
8. Concurrent connections prevented

---

## Component 7: Migration Service

### Overview
Migrates existing local (Phase 1) data to cloud (Phase 2).

### Files to Create

```
src/background/migration/
├── interfaces/
│   └── i-migrator.ts
├── local-to-cloud-migrator.ts
├── migration-validator.ts
└── rollback-service.ts
```

### Tasks

#### Task 7.1: Implement LocalToCloudMigrator
**Complexity**: High  
**Duration**: 8 hours  
**Test Count**: 18 integration tests

- [ ] Implement `LocalToCloudMigrator` class
  ```typescript
  export class LocalToCloudMigrator implements IMigrator {
    async migrate(): Promise<MigrationResult> {
      const localHighlights = await this.localRepo.findAll();
      
      if (localHighlights.length === 0) {
        return { migrated: 0, failed: 0, skipped: 0 };
      }
      
      let migrated = 0;
      let failed = 0;
      
      for (const highlight of localHighlights) {
        try {
          await this.apiClient.createHighlight(highlight);
          migrated++;
        } catch (error) {
          this.logger.error('Migration failed', { highlight, error });
          failed++;
        }
      }
      
      await this.markMigrationComplete();
      
      return { migrated, failed, skipped: 0 };
    }
  }
  ```
- [ ] Read all local highlights from IndexedDB
- [ ] Upload to Supabase in batches (10 per batch)
- [ ] Validate each highlight before upload
- [ ] Track progress (emit events)
- [ ] Handle partial failures
- [ ] Mark migration complete in chrome.storage

**Tests** (Integration):
1. Empty local DB migrates successfully
2. Single highlight migrated
3. Multiple highlights (100) migrated
4. Partial failure doesn't block others
5. Validation error skips highlight
6. Network error retries
7. Duplicate detection works
8. Progress events emitted
9. Migration complete flag set
10. Large highlights (\u003e1MB) handled
11. Concurrent migrations prevented
12. Migration resumable after crash
13. Rollback on critical error
14. Memory efficient (streaming)
15. Invalid highlights skipped
16. Collections migrated
17. Tags migrated
18. Migration metrics accurate

**Testing Strategy**: Realistic edge cases, large datasets  
**Reference**: `docs/testing/testing-strategy-v2.md:18-21`

---

#### Task 7.2: Implement MigrationValidator
**Complexity**: Medium  
**Duration**: 4 hours  
**Test Count**: 10 unit tests

- [ ] Implement `MigrationValidator` class
  ```typescript
  export class MigrationValidator {
    async validate(migrationResult: MigrationResult): Promise<boolean> {
      const localCount = await this.localRepo.count();
      const remoteCount = await this.apiClient.getHighlights().then(h => h.length);
      
      if (localCount !== remoteCount) {
        this.logger.error('Migration count mismatch', {
          local: localCount,
          remote: remoteCount,
        });
        return false;
      }
      
      // Spot check 10 random highlights
      const samples = await this.getSamples(10);
      for (const sample of samples) {
        const remote = await this.apiClient.getHighlights(sample.url);
        if (!this.highlightsMatch(sample, remote[0])) {
          return false;
        }
      }
      
      return true;
    }
  }
  ```
- [ ] Verify counts match (local vs remote)
- [ ] Spot-check random highlights
- [ ] Validate data integrity (checksums)

**Tests** (Unit):
1. Matching counts validates
2. Count mismatch detected
3. Spot checks validate correctly
4. Invalid highlight detected
5. Checksum mismatch detected
6. Empty migration validates
7. Large migration sampled efficiently
8. Duplicate detection works
9. Partial validation supported
10. Validation metrics accurate

---

#### Task 7.3: Implement RollbackService
**Complexity**: Low  
**Duration**: 2 hours  
**Test Count**: 5 unit tests

- [ ] Implement `RollbackService` class
  ```typescript
  export class RollbackService {
    async rollback(): Promise<void> {
      await this.apiClient.deleteAll();
      await this.markMigrationIncomplete();
      this.logger.info('Migration rolled back');
    }
  }
  ```
- [ ] Delete all remote data
- [ ] Reset migration flag
- [ ] Log rollback event

**Tests** (Unit):
1. Rollback deletes remote data
2. Rollback resets flag
3. Rollback emits event
4. Rollback idempotent
5. Rollback error handled

---

## Testing Summary

### Total Test Count by Component

| Component | Unit | Integration | E2E | Total |
|-----------|------|-------------|-----|-------|
| C1: Authentication | 23 | 11 | 2 | 36 |
| C2: API Client | 12 | 0 | 0 | 12 |
| C3: Event Sourcing | 10 | 42 | 0 | 52 |
| C4: Sync Engine | 28 | 0 | 3 | 31 |
| C5: Conflict Resolution | 39 | 15 | 0 | 54 |
| C6: Real-Time Sync | 8 | 15 | 2 | 25 |
| C7: Migration | 15 | 18 | 1 | 34 |
| **TOTAL** | **135** | **101** | **8** | **244** |

### Test Distribution

- **Unit Tests**: 55% (135/244)
- **Integration Tests**: 41% (101/244)
- **E2E Tests**: 3% (8/244)

**Rationale**: Follows risk-based testing strategy with heavy integration testing for critical components (Event Sourcing, Conflict Resolution, Migration).

**Reference**: `docs/testing/testing-strategy-v2.md:24-61`

---

## Implementation Order (Week-by-Week)

### Week 1: Foundation
**Goal**: Authentication + API Client working

- [ ] C1.1-1.5: Authentication Layer (complete)
- [ ] C2.1-2.3: API Client Layer (complete)
- [ ] DI registration
- [ ] **Deliverable**: Can signup/login and make API calls

### Week 2: Event Sourcing
**Goal**: Event store + publishing working

- [ ] C3.1-3.4: Event Sourcing Layer (complete)
- [ ] **Deliverable**: Events persisted and can be published

### Week 3: Sync Engine
**Goal**: Offline-first sync working

- [ ] C4.1-4.4: Sync Engine (complete)
- [ ] **Deliverable**: Highlights sync when online, queue when offline

### Week 4: Conflict Resolution
**Goal**: Conflicts detected and resolved

- [ ] C5.1-5.3: Conflict Resolution (complete)
- [ ] **Deliverable**: Multi-device conflicts handled gracefully

### Week 5: Real-Time Sync
**Goal**: Real-time updates working

- [ ] C6.1-6.2: WebSocket Integration (complete)
- [ ] **Deliverable**: Highlights appear on other devices within 3s

### Week 6: Migration + Polish
**Goal**: Production-ready

- [ ] C7.1-7.3: Migration Service (complete)
- [ ] Integration testing (all components)
- [ ] E2E testing (critical paths)
- [ ] Performance optimization
- [ ] **Deliverable**: Phase 2 complete, ready for production

---

## Quality Gates

### Per-Week Gates

**Every Week Must Pass**:
- [ ] 0 TypeScript errors (`npm run type-check`)
- [ ] 0 ESLint errors (`npm run lint`)
- [ ] 100% Prettier compliance (`npm run format`)
- [ ] All tests passing (`npm test`)
- [ ] Code coverage \u003e85%

**Final Gate (Week 6)**:
- [ ] All 244 tests passing
- [ ] E2E tests passing
- [ ] Performance benchmarks met:
  - Sync latency \u003c3s (p95)
  - API response \u003c500ms (p95)
  - WebSocket latency \u003c100ms (p95)
- [ ] Security audit passed
- [ ] Load testing passed (10,000 users simulated)

---

## Git Strategy

### Commit Guidelines

**Conventional Commits Format**:
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `test`: Add/update tests
- `refactor`: Code refactoring
- `docs`: Documentation
- `chore`: Build/tool changes

**Scopes** (Component-based):
- `auth`: Authentication layer
- `api`: API client
- `events`: Event sourcing
- `sync`: Sync engine
- `conflicts`: Conflict resolution
- `realtime`: WebSocket
- `migration`: Migration service

**Examples**:
```
feat(auth): implement OAuth login for Google provider

- Add Google OAuth flow
- Update AuthManager with OAuth method
- Add 3 tests for OAuth flow

Closes #123
```

```
test(events): add integration tests for EventStore

- Add 15 integration tests
- Test chronological order (critical)
- Test large event batches (1000+)
```

### Granular Commits

**Policy**: "One logic = one commit"

**Good** ✅:
- `feat(auth): add AuthManager interface`
- `feat(auth): implement AuthManager signup method`
- `test(auth): add AuthManager signup tests`
- `feat(auth): implement AuthManager OAuth login`

**Bad** ❌:
- `feat(auth): implement complete authentication system` (too broad)

**Reference**: `docs/DEVELOPMENT_WALKTHROUGH.md:642-650`

---

## Appendix: Key Architecture Patterns

### 1. Dependency Injection (All Components)

```typescript
// DI Container Registration
container.registerSingleton('authManager', () =>
  new AuthManager(
    container.resolve('tokenStore'),
    container.resolve('eventBus'),
    container.resolve('logger'),
    authConfig
  )
);
```

**Benefits**:
- Testability (inject mocks)
- Flexibility (swap implementations)
- Explicit dependencies

**Reference**: `docs/05-quality-framework/01-system-design-patterns.md:483-595`

---

### 2. Event-Driven Communication (All Components)

```typescript
// Emit events
this.eventBus.emit(EventName.AUTH_STATE_CHANGED, {
  user,
  isAuthenticated: true,
});

// Listen to events
this.eventBus.on(EventName.NETWORK_STATUS_CHANGED, async (data) => {
  if (data.isOnline) {
    await this.syncQueue.processPending();
  }
});
```

**Benefits**:
- Loose coupling
- Easy to add features
- Event history for debugging

**Reference**: `docs/04-adrs/002-event-driven-architecture.md:40-91`

---

### 3. Strategy Pattern (Conflict Resolution)

```typescript
interface IConflictResolver {
  resolve(conflict: Conflict, strategy: ResolutionStrategy): Promise<SyncEvent>;
}

// Multiple strategies
class LastWriteWinsStrategy implements IConflictResolver { }
class KeepBothStrategy implements IConflictResolver { }
class MergeStrategy implements IConflictResolver { }
```

**Benefits**:
- Open/Closed Principle
- Easy to add new strategies
- User can choose strategy

**Reference**: `docs/05-quality-framework/01-system-design-patterns.md:126-330`

---

### 4. Repository Pattern (Data Access)

```typescript
interface IRepository<T> {
  add(item: T): Promise<void>;
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  remove(id: string): Promise<void>;
}
```

**Benefits**:
- Abstraction over storage
- Easy to swap implementations
- Testable with mocks

**Reference**: `docs/05-quality-framework/01-system-design-patterns.md:104-114`

---

##Appendix: Vault Mode Phase 2 vs Phase 1 Comparison

| Feature | Phase 1 (Local) | Phase 2 (Cloud) |
|---------|----------------|-----------------|
| **Storage** | IndexedDB only | IndexedDB + Supabase |
| **Sync** | No | Yes (batched every 30s) |
| **Multi-Selector** | Yes | Yes |
| **Auth** | No | Yes (OAuth) |
| **Conflict Resolution** | No | Yes (vector clocks) |
| **Real-Time** | No | Yes (WebSocket) |
| **Collections** | Schema only | Full implementation |
| **Tags** | Schema only | Full implementation |
| **Export** | No | Phase 3 |
| **Search** | No | Phase 3 |

---

**Document Status**: Ready for Implementation  
**Next Steps**: Review with team, create GitHub project board, start Week 1 tasks  
**Questions**: Contact team lead
