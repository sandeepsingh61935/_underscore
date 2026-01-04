# Component 4: Sync Engine + Rate Limiting - Implementation Tasks

**Phase**: Vault Mode Phase 2  
**Component**: 4 of 7  
**Duration**: 1 week (Week 3)  
**Total Tests**: 39 tests (31 core + 8 rate limiting)

---

## Progress Tracker

- [ ] Task 4.1: Define Sync Engine Interfaces
- [ ] Task 4.2: Implement SyncQueue with Event Sourcing
- [ ] Task 4.3: Implement SyncBatcher for Efficient Sync
- [ ] Task 4.4: Implement OfflineQueue with Persistence
- [ ] Task 4.5: Implement RateLimiter with Token Bucket 🔴 NEW
- [ ] Task 4.6: Implement NetworkDetector
- [ ] Task 4.7: Implement SyncStatus Tracker
- [ ] Task 4.8: DI Registration
- [ ] Task 4.9: Integration Testing

---

## Task 4.1: Define Sync Engine Interfaces ⏱️ 2h

### Implementation Checklist

- [ ] Create `/src/background/sync/interfaces/i-sync-queue.ts`
  - [ ] Define `ISyncQueue` interface with methods:
    - `enqueue(event: SyncEvent): Promise<void>`
    - `dequeue(): Promise<SyncEvent | null>`
    - `peek(): Promise<SyncEvent | null>`
    - `size(): Promise<number>`
    - `clear(): Promise<void>`
    - `isEmpty(): Promise<boolean>`
  - [ ] Define `SyncQueueConfig` interface:
    ```typescript
    interface SyncQueueConfig {
      readonly maxQueueSize: number;
      readonly batchSize: number;
      readonly syncInterval: number; // milliseconds
      readonly retryAttempts: number;
    }
    ```
  - [ ] Define `SyncOperation` type:
    ```typescript
    type SyncOperation = 'push' | 'pull' | 'bidirectional';
    ```
  - [ ] Add comprehensive JSDoc documentation
  - [ ] Document queue overflow behavior
  - [ ] Document retry strategy

- [ ] Create `/src/background/sync/interfaces/i-network-detector.ts`
  - [ ] Define `INetworkDetector` interface:
    ```typescript
    interface INetworkDetector {
      isOnline(): Promise<boolean>;
      subscribe(callback: (online: boolean) => void): () => void;
      getConnectionType(): Promise<ConnectionType>;
    }
    ```
  - [ ] Define `ConnectionType` enum:
    ```typescript
    enum ConnectionType {
      WIFI = 'wifi',
      CELLULAR = 'cellular',
      ETHERNET = 'ethernet',
      UNKNOWN = 'unknown',
      OFFLINE = 'offline'
    }
    ```
  - [ ] Document network change events
  - [ ] Document connection quality metrics

- [ ] Create `/src/background/sync/interfaces/i-rate-limiter.ts` 🔴 NEW
  - [ ] Define `IRateLimiter` interface:
    ```typescript
    interface IRateLimiter {
      checkLimit(userId: string, operation: string): Promise<boolean>;
      getRemainingTokens(userId: string, operation: string): Promise<number>;
      reset(userId: string, operation: string): Promise<void>;
      getMetrics(): Promise<RateLimitMetrics>;
    }
    ```
  - [ ] Define `RateLimitConfig` interface:
    ```typescript
    interface RateLimitConfig {
      readonly capacity: number;
      readonly refillRate: number; // tokens per second
      readonly refillInterval: number; // milliseconds
    }
    ```
  - [ ] Define `RateLimitMetrics` interface:
    ```typescript
    interface RateLimitMetrics {
      totalAttempts: number;
      blockedAttempts: number;
      blockRate: number;
      activeBuckets: number;
    }
    ```
  - [ ] Document token bucket algorithm
  - [ ] Document rate limit policies per operation

- [ ] Create `/src/background/sync/sync-errors.ts`
  - [ ] Define `SyncError` base class extending `AppError`
  - [ ] Define `QueueFullError` (queue overflow)
  - [ ] Define `SyncConflictError` (conflict during sync)
  - [ ] Define `NetworkError` (network failure)
  - [ ] Define `RateLimitExceededError` (rate limit hit) 🔴 NEW
  - [ ] Define `OfflineError` (operation requires online)
  - [ ] Add JSON serialization for all errors
  - [ ] Add proper stack trace preservation

**Architecture Compliance**:
- ✅ **ISP**: Segregated interfaces (Queue, Network, RateLimiter)
- ✅ **DIP**: Depend on abstractions, not concretions
- ✅ **SRP**: Each interface has single responsibility

**Duration**: 2 hours

---

## Task 4.2: Implement SyncQueue with Event Sourcing ⏱️ 8h

### Implementation Checklist

- [ ] Create `/src/background/sync/sync-queue.ts`
  - [ ] Implement `SyncQueue` class with `ISyncQueue` interface
  - [ ] Use IndexedDB for persistent queue (database: `sync_queue`)
  - [ ] Object store: `queue` with auto-incrementing key
  - [ ] Add index on `timestamp` for FIFO ordering
  - [ ] Add index on `priority` for priority queue support

- [ ] Implement core queue operations
  - [ ] `enqueue(event: SyncEvent): Promise<void>`
    ```typescript
    async enqueue(event: SyncEvent): Promise<void> {
      // 1. Check queue size limit
      const size = await this.size();
      if (size >= this.config.maxQueueSize) {
        throw new QueueFullError(`Queue full (max: ${this.config.maxQueueSize})`);
      }
      
      // 2. Validate event
      this.validateEvent(event);
      
      // 3. Add to IndexedDB
      await this.db.add('queue', {
        event,
        timestamp: Date.now(),
        retryCount: 0,
        priority: this.calculatePriority(event)
      });
      
      // 4. Emit QUEUE_UPDATED event
      this.eventBus.emit('QUEUE_UPDATED', { size: size + 1 });
      
      // 5. Trigger sync if online
      if (await this.networkDetector.isOnline()) {
        this.triggerSync();
      }
    }
    ```
  - [ ] `dequeue(): Promise<SyncEvent | null>`
    - Get oldest event (FIFO)
    - Remove from queue
    - Return event or null if empty
  - [ ] `peek(): Promise<SyncEvent | null>`
    - Get oldest event without removing
    - Return null if empty
  - [ ] `size(): Promise<number>`
    - Return count of events in queue
  - [ ] `clear(): Promise<void>`
    - Remove all events from queue
  - [ ] `isEmpty(): Promise<boolean>`
    - Return true if queue is empty

- [ ] Add priority queue support
  - [ ] Calculate priority based on event type:
    ```typescript
    private calculatePriority(event: SyncEvent): number {
      switch (event.type) {
        case 'HIGHLIGHT_DELETED': return 1; // Highest priority
        case 'HIGHLIGHT_UPDATED': return 2;
        case 'HIGHLIGHT_CREATED': return 3;
        case 'COLLECTION_DELETED': return 4;
        case 'COLLECTION_UPDATED': return 5;
        case 'COLLECTION_CREATED': return 6; // Lowest priority
        default: return 10;
      }
    }
    ```
  - [ ] Dequeue by priority (highest first), then by timestamp (oldest first)

- [ ] Add retry logic
  - [ ] Track retry count per event
  - [ ] Max retries: 3 (from config)
  - [ ] Exponential backoff: 1s, 2s, 4s
  - [ ] Move to dead letter queue after max retries
  - [ ] Emit `SYNC_RETRY` event on retry
  - [ ] Emit `SYNC_FAILED` event on final failure

- [ ] Add sync triggering
  - [ ] Auto-trigger sync when event enqueued (if online)
  - [ ] Debounce sync calls (500ms)
  - [ ] Batch events for efficiency (use SyncBatcher)
  - [ ] Handle concurrent sync attempts (lock mechanism)

- [ ] Add queue overflow handling
  - [ ] Throw `QueueFullError` when max size reached
  - [ ] Log warning at 80% capacity
  - [ ] Emit `QUEUE_NEAR_FULL` event at 90% capacity
  - [ ] Provide queue size metrics

**Tests** (10 Integration Tests):

> **Testing Strategy v2 Compliance**: 
> - ✅ Use real IndexedDB (fake-indexeddb)
> - ✅ Use real Logger (silent mode)
> - ✅ Use real EventBus
> - ❌ NO mocking of own code
> - ⚠️ **CRITICAL**: Events MUST be in chronological order (oldest → newest). If test fails, FIX THE CODE, NOT THE TEST!

1. **Basic Operations** (3 tests)
   - [ ] Enqueue event succeeds and persists to IndexedDB
   - [ ] Dequeue returns FIFO order (oldest first) - **CRITICAL: chronological order required**
   - [ ] Peek doesn't remove event from queue

2. **Priority Queue** (2 tests)
   - [ ] DELETE events dequeued before CREATE (priority 1 vs 3)
   - [ ] Same priority dequeued by timestamp (oldest first) - **CRITICAL: must sort by timestamp**

3. **Queue Limits** (2 tests - **HIGH RISK**)
   - [ ] Queue full throws QueueFullError (prevents data loss)
   - [ ] Warning logged at 80% capacity, event emitted at 90%

4. **Retry Logic** (2 tests - **HIGH RISK**)
   - [ ] Failed event retried with exponential backoff (1s, 2s, 4s)
   - [ ] Event moved to dead letter queue after 3 retries (prevents infinite loops)

5. **Realistic Edge Cases** (1 test)
   - [ ] **Tricky**: 100 concurrent enqueue/dequeue operations don't corrupt queue
     - Simulates real-world: user creates highlights rapidly while sync is running
     - Must use real IndexedDB transactions (not mocks)

**Reference**: [ADR-001: Event Sourcing](file:///home/sandy/projects/_underscore/docs/04-adrs/001-event-sourcing-for-sync.md)

---

## Task 4.3: Implement SyncBatcher for Efficient Sync ⏱️ 6h

### Implementation Checklist

- [ ] Create `/src/background/sync/sync-batcher.ts`
  - [ ] Implement `SyncBatcher` class
  - [ ] Batch events for efficient API calls
  - [ ] Configurable batch size (default: 50 events)
  - [ ] Configurable batch timeout (default: 5s)

- [ ] Implement batching logic
  - [ ] `addToBatch(event: SyncEvent): void`
    ```typescript
    addToBatch(event: SyncEvent): void {
      this.currentBatch.push(event);
      
      // Flush if batch full
      if (this.currentBatch.length >= this.config.batchSize) {
        this.flush();
      } else {
        // Schedule flush after timeout
        this.scheduleFlush();
      }
    }
    ```
  - [ ] `flush(): Promise<void>`
    - Send batch to API
    - Clear current batch
    - Handle batch failures
    - Retry failed events individually
  - [ ] `scheduleFlush(): void`
    - Debounce flush calls
    - Use timeout to batch events
    - Cancel pending flush if batch full

- [ ] Add batch optimization
  - [ ] Group events by entity ID
  - [ ] Deduplicate events (keep latest per entity)
  - [ ] Compress batch payload (gzip)
  - [ ] Split large batches (max 100 events)

- [ ] Add batch failure handling
  - [ ] Retry entire batch on network error
  - [ ] Retry individual events on validation error
  - [ ] Track batch success/failure metrics
  - [ ] Emit `BATCH_SENT` event with metrics

- [ ] Add batch monitoring
  - [ ] Track batch size distribution
  - [ ] Track batch latency (p50, p95, p99)
  - [ ] Track compression ratio
  - [ ] Expose metrics via `getMetrics()`

**Tests** (8 Unit Tests):

> **Testing Strategy v2 Compliance**:
> - ✅ Use real SyncBatcher implementation
> - ✅ Mock only API calls (slow, external)
> - ✅ Test realistic scenarios (network failures, rapid updates)
> - ❌ NO mocking of batching logic itself

1. **Batching Logic** (3 tests)
   - [ ] Events batched up to batch size (50 events)
   - [ ] Batch flushed after timeout (5s) even if not full
   - [ ] Full batch flushed immediately (no waiting)

2. **Optimization** (2 tests)
   - [ ] **Tricky**: Duplicate events deduplicated (latest wins)
     - Real-world: User updates highlight color 5 times rapidly
     - Only latest update should be in batch
   - [ ] Large batches split correctly (max 100 events per API call)

3. **Failure Handling** (2 tests - **HIGH RISK**)
   - [ ] **Tricky**: Network error mid-batch retries entire batch
     - Simulates real-world: WiFi drops during sync
     - All events must be preserved, none lost
   - [ ] Validation error retries individual events (not entire batch)
     - One bad event shouldn't block 49 good events

4. **Performance** (1 test)
   - [ ] **Realistic**: Batch compression reduces payload size by >50%
     - Use real highlight data (not tiny test strings)
     - Verify gzip compression actually helps

**Design Pattern**: Batch Processing Pattern

---

## Task 4.4: Implement OfflineQueue with Persistence ⏱️ 6h

### Implementation Checklist

- [ ] Create `/src/background/sync/offline-queue.ts`
  - [ ] Implement `OfflineQueue` class
  - [ ] Persist events when offline
  - [ ] Auto-sync when online
  - [ ] Handle offline → online transitions

- [ ] Implement offline detection
  - [ ] Subscribe to network status changes
  - [ ] Detect online/offline transitions
  - [ ] Emit `OFFLINE_MODE_ENABLED` event
  - [ ] Emit `OFFLINE_MODE_DISABLED` event

- [ ] Implement offline queueing
  - [ ] `queueOffline(event: SyncEvent): Promise<void>`
    ```typescript
    async queueOffline(event: SyncEvent): Promise<void> {
      // 1. Validate event
      this.validateEvent(event);
      
      // 2. Store in IndexedDB (offline_queue)
      await this.db.add('offline_queue', {
        event,
        timestamp: Date.now(),
        queuedAt: Date.now()
      });
      
      // 3. Log offline event
      this.logger.info('Event queued for offline sync', { 
        eventId: event.id,
        type: event.type 
      });
      
      // 4. Emit event
      this.eventBus.emit('OFFLINE_EVENT_QUEUED', { eventId: event.id });
    }
    ```
  - [ ] Persist to IndexedDB (separate object store)
  - [ ] Track queue size
  - [ ] Warn if offline queue exceeds limit (1000 events)

- [ ] Implement online sync
  - [ ] Detect online transition
  - [ ] Load all offline events
  - [ ] Sync in chronological order
  - [ ] Handle sync failures gracefully
  - [ ] Clear offline queue after successful sync
  - [ ] Emit `OFFLINE_SYNC_COMPLETE` event

- [ ] Add conflict detection
  - [ ] Check for conflicts before syncing
  - [ ] Use vector clocks for ordering
  - [ ] Defer conflict resolution to ConflictResolver (Component 5)
  - [ ] Emit `SYNC_CONFLICT_DETECTED` event

- [ ] Add offline queue management
  - [ ] `getOfflineQueueSize(): Promise<number>`
  - [ ] `clearOfflineQueue(): Promise<void>`
  - [ ] `getOldestOfflineEvent(): Promise<SyncEvent | null>`
  - [ ] Track offline duration
  - [ ] Expose offline metrics

**Tests** (8 Integration Tests):

> **Testing Strategy v2 Compliance**:
> - ✅ Use real IndexedDB for offline queue
> - ✅ Use real NetworkDetector (mock navigator.onLine)
> - ✅ Test realistic offline scenarios (extended offline, network flapping)
> - ⚠️ **CRITICAL**: Events MUST sync in chronological order when back online

1. **Offline Queueing** (3 tests)
   - [ ] Events queued when offline (navigator.onLine = false)
   - [ ] Offline queue persists across browser restarts
     - Close IndexedDB, reopen, verify events still there
   - [ ] Offline queue size tracked correctly

2. **Online Sync** (3 tests - **HIGH RISK**)
   - [ ] **Tricky**: Offline events synced in chronological order when online
     - Real-world: User creates 50 highlights while offline for 2 hours
     - All 50 must sync in correct order (oldest → newest)
     - **CRITICAL**: If test fails, FIX THE CODE, NOT THE TEST
   - [ ] **Realistic**: Network flapping doesn't cause duplicate syncs
     - Offline → Online → Offline → Online rapidly (5 transitions in 10s)
     - Events synced exactly once, no duplicates
   - [ ] Offline queue cleared after successful sync

3. **Conflict Detection** (1 test)
   - [ ] Conflicts detected and deferred to ConflictResolver
     - Simulates: Same highlight edited on two devices while offline

4. **Realistic Edge Cases** (1 test - **HIGH RISK**)
   - [ ] **Tricky**: Large offline queue (1000+ events) synced efficiently
     - Real-world: User offline for 1 week, creates many highlights
     - Must batch sync (not 1000 individual API calls)
     - Must not timeout or crash
     - Verify progress tracking works

**Design Pattern**: Queue Pattern, Observer Pattern

---

## Task 4.5: Implement RateLimiter with Token Bucket 🔴 NEW ⏱️ 8h

**Complexity**: Medium  
**Duration**: 1 day  
**Test Count**: 8 unit tests  
**Security Impact**: **HIGH** - DoS protection

### Implementation Checklist

- [ ] Create `/src/background/sync/rate-limiter.ts`
  - [ ] Implement `RateLimiter` class with `IRateLimiter` interface
  - [ ] Use token bucket algorithm
  - [ ] Per-user, per-operation buckets
  - [ ] In-memory bucket storage (Map)

- [ ] Implement token bucket algorithm
  - [ ] `TokenBucket` class:
    ```typescript
    class TokenBucket {
      private tokens: number;
      private lastRefill: number;
      
      constructor(
        private readonly capacity: number,
        private readonly refillRate: number // tokens per second
      ) {
        this.tokens = capacity;
        this.lastRefill = Date.now();
      }
      
      tryConsume(count: number = 1): boolean {
        this.refill();
        
        if (this.tokens >= count) {
          this.tokens -= count;
          return true;
        }
        
        return false;
      }
      
      private refill(): void {
        const now = Date.now();
        const elapsed = (now - this.lastRefill) / 1000; // seconds
        const tokensToAdd = elapsed * this.refillRate;
        
        this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
        this.lastRefill = now;
      }
      
      getRemainingTokens(): number {
        this.refill();
        return Math.floor(this.tokens);
      }
    }
    ```

- [ ] Implement rate limit policies
  - [ ] Define rate limits per operation:
    ```typescript
    private getRateLimitConfig(operation: string): RateLimitConfig {
      switch (operation) {
        case 'sync':
          return { 
            capacity: 10, 
            refillRate: 10 / 60 // 10 per minute
          };
        case 'auth':
          return { 
            capacity: 5, 
            refillRate: 5 / 900 // 5 per 15 minutes
          };
        case 'api':
          return { 
            capacity: 100, 
            refillRate: 100 / 60 // 100 per minute
          };
        default:
          return { 
            capacity: 100, 
            refillRate: 100 / 60 
          };
      }
    }
    ```

- [ ] Implement RateLimiter methods
  - [ ] `checkLimit(userId: string, operation: string): Promise<boolean>`
    ```typescript
    async checkLimit(userId: string, operation: string): Promise<boolean> {
      const key = `${userId}:${operation}`;
      let bucket = this.buckets.get(key);
      
      if (!bucket) {
        const config = this.getRateLimitConfig(operation);
        bucket = new TokenBucket(config.capacity, config.refillRate);
        this.buckets.set(key, bucket);
      }
      
      const allowed = bucket.tryConsume();
      
      // Track metrics
      this.metrics.totalAttempts++;
      if (!allowed) {
        this.metrics.blockedAttempts++;
        this.logger.warn('Rate limit exceeded', { userId, operation });
        this.eventBus.emit('RATE_LIMIT_EXCEEDED', { userId, operation });
      }
      
      return allowed;
    }
    ```
  - [ ] `getRemainingTokens(userId: string, operation: string): Promise<number>`
  - [ ] `reset(userId: string, operation: string): Promise<void>`
  - [ ] `getMetrics(): Promise<RateLimitMetrics>`

- [ ] Add bucket cleanup
  - [ ] Periodic cleanup of inactive buckets (every 5 minutes)
  - [ ] Remove buckets not used in last 30 minutes
  - [ ] Prevent memory leaks from abandoned buckets

- [ ] Integrate with SyncQueue
  - [ ] Check rate limit before syncing
  - [ ] Throw `RateLimitExceededError` if limit hit
  - [ ] Defer sync if rate limited
  - [ ] Log rate limit violations

- [ ] Integrate with AuthManager
  - [ ] Check rate limit before auth operations
  - [ ] Lock account after 5 failed login attempts
  - [ ] Unlock after 15 minutes
  - [ ] Log suspicious activity

**Tests** (8 Unit Tests):

> **Testing Strategy v2 Compliance**:
> - ✅ Use real TokenBucket implementation
> - ✅ Mock only Date.now() for time control (vi.useFakeTimers)
> - ✅ Test realistic attack scenarios (burst, sustained, distributed)
> - ⚠️ **CRITICAL**: Rate limits MUST be enforced. If test fails, FIX THE CODE, NOT THE TEST!

1. **Token Bucket Algorithm** (3 tests)
   - [ ] Tokens consumed correctly (capacity decreases)
   - [ ] Tokens refilled over time (verify refill rate)
   - [ ] Capacity not exceeded (max tokens = capacity)

2. **Rate Limiting** (3 tests - **CRITICAL SECURITY**)
   - [ ] **Tricky**: Rate limit enforced under burst attack
     - Real-world: Attacker sends 100 sync requests in 1 second
     - Only first 10 should succeed (capacity = 10)
     - Remaining 90 blocked
     - **CRITICAL**: If >10 succeed, security vulnerability!
   - [ ] **Realistic**: Sustained attack throttled correctly
     - Attacker sends 1 request/second for 120 seconds
     - Should allow ~20 requests (10/min rate limit)
     - Verify exponential backoff doesn't help attacker
   - [ ] Burst traffic handled (up to capacity)
     - Legitimate user: 5 rapid requests, then wait
     - All 5 should succeed (within capacity)

3. **Multi-User** (1 test)
   - [ ] **Tricky**: Different users have separate buckets
     - User A hits rate limit
     - User B should still be able to sync
     - Verify no shared state between users

4. **Metrics** (1 test)
   - [ ] Metrics tracked correctly (attempts, blocked, block rate)
     - 100 attempts, 30 blocked → blockRate = 0.3

**Reference**: [Threat Model T7](file:///home/sandy/projects/_underscore/docs/06-security/threat-model.md) (Resource exhaustion mitigation)

**Design Pattern**: Token Bucket Algorithm, Throttling Pattern

---

## Task 4.6: Implement NetworkDetector ⏱️ 4h

### Implementation Checklist

- [ ] Create `/src/background/sync/network-detector.ts`
  - [ ] Implement `NetworkDetector` class with `INetworkDetector` interface
  - [ ] Use `navigator.onLine` for online/offline detection
  - [ ] Use Network Information API for connection type
  - [ ] Subscribe to `online`/`offline` events

- [ ] Implement network detection
  - [ ] `isOnline(): Promise<boolean>`
    ```typescript
    async isOnline(): Promise<boolean> {
      // 1. Check navigator.onLine
      if (!navigator.onLine) {
        return false;
      }
      
      // 2. Verify with ping to API (optional)
      try {
        const response = await fetch(this.config.pingUrl, {
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(3000)
        });
        return response.ok;
      } catch {
        return false;
      }
    }
    ```
  - [ ] `getConnectionType(): Promise<ConnectionType>`
    - Use Network Information API
    - Fallback to 'unknown' if not supported
    - Return connection type enum

- [ ] Implement network change subscription
  - [ ] `subscribe(callback: (online: boolean) => void): () => void`
    ```typescript
    subscribe(callback: (online: boolean) => void): () => void {
      const onlineHandler = () => {
        this.logger.info('Network online');
        callback(true);
      };
      
      const offlineHandler = () => {
        this.logger.warn('Network offline');
        callback(false);
      };
      
      window.addEventListener('online', onlineHandler);
      window.addEventListener('offline', offlineHandler);
      
      // Return unsubscribe function
      return () => {
        window.removeEventListener('online', onlineHandler);
        window.removeEventListener('offline', offlineHandler);
      };
    }
    ```

- [ ] Add connection quality detection
  - [ ] Detect slow connections (>2s latency)
  - [ ] Emit `SLOW_CONNECTION` event
  - [ ] Adjust sync behavior for slow connections
  - [ ] Track connection quality metrics

- [ ] Add network monitoring
  - [ ] Track online/offline duration
  - [ ] Track connection type distribution
  - [ ] Track network errors
  - [ ] Expose metrics via `getMetrics()`

**Tests** (3 Unit Tests):

1. **Online Detection** (1 test)
   - [ ] `isOnline()` returns correct status

2. **Subscription** (1 test)
   - [ ] Subscribers notified on network change

3. **Connection Type** (1 test)
   - [ ] Connection type detected correctly

**Design Pattern**: Observer Pattern

---

## Task 4.7: Implement SyncStatus Tracker ⏱️ 3h

### Implementation Checklist

- [ ] Create `/src/background/sync/sync-status.ts`
  - [ ] Implement `SyncStatus` class
  - [ ] Track sync state (idle, syncing, error)
  - [ ] Track last sync timestamp
  - [ ] Track sync progress

- [ ] Define sync states
  - [ ] `SyncState` enum:
    ```typescript
    enum SyncState {
      IDLE = 'idle',
      SYNCING = 'syncing',
      ERROR = 'error',
      OFFLINE = 'offline',
      RATE_LIMITED = 'rate_limited'
    }
    ```

- [ ] Implement status tracking
  - [ ] `setState(state: SyncState): void`
  - [ ] `getState(): SyncState`
  - [ ] `getLastSyncTime(): Date | null`
  - [ ] `getSyncProgress(): number` (0-100)
  - [ ] `getErrorMessage(): string | null`

- [ ] Add status persistence
  - [ ] Persist status to chrome.storage.local
  - [ ] Load status on initialization
  - [ ] Emit `SYNC_STATUS_CHANGED` event

- [ ] Add status UI integration
  - [ ] Provide status for popup UI
  - [ ] Show sync indicator
  - [ ] Show error messages
  - [ ] Show last sync time

**Tests** (2 Unit Tests):

1. **State Tracking** (1 test)
   - [ ] State transitions work correctly

2. **Persistence** (1 test)
   - [ ] Status persists across restarts

---

## Task 4.8: DI Registration ⏱️ 1h

### Implementation Checklist

- [ ] Register in `/src/background/di/container-registration.ts`
  - [ ] `SyncQueue` as singleton
  - [ ] `SyncBatcher` as singleton
  - [ ] `OfflineQueue` as singleton
  - [ ] `RateLimiter` as singleton 🔴 NEW
  - [ ] `NetworkDetector` as singleton
  - [ ] `SyncStatus` as singleton

- [ ] Verify dependencies
  - [ ] `IEventStore` resolved
  - [ ] `IAPIClient` resolved
  - [ ] `IEventBus` resolved
  - [ ] `ILogger` resolved
  - [ ] Config from environment variables

- [ ] Add to bootstrap function
  - [ ] Initialize SyncQueue on startup
  - [ ] Subscribe to network changes
  - [ ] Start sync scheduler

**Tests**: Integration tests verify DI resolution (1 test)

---

## Task 4.9: Integration Testing ⏱️ 4h

### Implementation Checklist

- [ ] Create end-to-end sync flow test
  - [ ] Create highlight → Event enqueued → Synced to API
  - [ ] Verify event removed from queue after sync
  - [ ] Verify API called with correct payload

- [ ] Test offline → online flow
  - [ ] Create highlights while offline
  - [ ] Verify events queued in offline queue
  - [ ] Go online
  - [ ] Verify offline events synced
  - [ ] Verify offline queue cleared

- [ ] Test rate limiting integration
  - [ ] Exceed rate limit
  - [ ] Verify sync deferred
  - [ ] Verify error logged
  - [ ] Verify sync resumes after refill

**Tests** (3 Integration Tests):

1. **Full Sync Flow** (1 test)
   - [ ] Highlight created → Event synced → Queue cleared

2. **Offline Sync** (1 test)
   - [ ] Offline events queued → Online → Events synced

3. **Rate Limiting** (1 test)
   - [ ] Rate limit hit → Sync deferred → Resumes after refill

---

## Architecture Compliance

### SOLID Principles

- [ ] **S**: Single Responsibility
  - SyncQueue: Queue management only
  - SyncBatcher: Batching only
  - OfflineQueue: Offline handling only
  - RateLimiter: Rate limiting only
  - NetworkDetector: Network detection only

- [ ] **O**: Open/Closed
  - New sync strategies added without modifying core
  - New rate limit policies added via config

- [ ] **L**: Liskov Substitution
  - Any `ISyncQueue` implementation interchangeable
  - Any `IRateLimiter` implementation interchangeable

- [ ] **I**: Interface Segregation
  - Separate interfaces for Queue, Network, RateLimiter

- [ ] **D**: Dependency Inversion
  - All services depend on interfaces, not concrete classes

### Design Patterns

- [ ] **Queue Pattern**: SyncQueue, OfflineQueue
- [ ] **Observer Pattern**: NetworkDetector, SyncStatus
- [ ] **Batch Processing**: SyncBatcher
- [ ] **Token Bucket**: RateLimiter
- [ ] **Retry Pattern**: SyncQueue retry logic
- [ ] **Circuit Breaker**: Integrated from Component 2

### Event Sourcing (ADR-001)

- [ ] **Event-Driven**: All sync operations emit events
- [ ] **Immutable Events**: Events never modified in queue
- [ ] **Chronological Order**: Events synced in order
- [ ] **Offline Support**: Events queued when offline
- [ ] **Retry Logic**: Failed events retried with backoff

---

## Quality Gates

### Per-Task Gates

- [ ] 0 TypeScript errors
- [ ] 0 ESLint errors
- [ ] 100% Prettier compliance
- [ ] All tests passing
- [ ] Code coverage >85%

### Component-Level Gates

- [ ] All 39 tests passing
- [ ] Rate limiting verified (8 tests)
- [ ] Offline sync verified (8 tests)
- [ ] Queue overflow handled gracefully
- [ ] Performance benchmarks met:
  - [ ] Enqueue operation <10ms (p95)
  - [ ] Dequeue operation <10ms (p95)
  - [ ] Batch sync <500ms (p95, 50 events)
  - [ ] Rate limit check <1ms (p95)

---

## Risk Assessment

### Critical Risks 🔴

1. **Queue Overflow**: Queue full = data loss
   - **Mitigation**: Queue size limits, overflow warnings, dead letter queue

2. **Sync Conflicts**: Concurrent updates = data corruption
   - **Mitigation**: Vector clocks, conflict detection, defer to ConflictResolver

3. **Rate Limit Bypass**: Attackers bypass rate limit = DoS
   - **Mitigation**: Token bucket algorithm, per-user buckets, metrics tracking

### High Risks 🟡

1. **Network Flapping**: Rapid online/offline transitions = sync thrashing
   - **Mitigation**: Debounce network changes, exponential backoff

2. **Large Offline Queue**: 1000+ events = slow sync
   - **Mitigation**: Batch syncing, progress tracking, user notification

---

## Testing Strategy v2 Compliance

### Core Principles Applied to Component 4

1. **Risk-Based Testing** ✅
   - **Critical Risk** (Heavy Testing):
     - Queue overflow: 2 tests (data loss prevention)
     - Rate limiting: 8 tests (DoS protection - SECURITY CRITICAL)
     - Offline sync: 8 tests (data integrity)
     - Chronological ordering: Multiple tests (event sourcing requirement)
   
   - **High Risk** (Moderate Testing):
     - Retry logic: 2 tests (prevents infinite loops)
     - Network failures: 3 tests (real-world reliability)
     - Batch processing: 8 tests (efficiency)
   
   - **Medium Risk** (Light Testing):
     - Network detection: 3 tests
     - Status tracking: 2 tests

2. **Realistic, Tricky Test Cases** ✅
   - ✅ 100 concurrent enqueue/dequeue operations (real user behavior)
   - ✅ User updates highlight color 5 times rapidly (deduplication test)
   - ✅ WiFi drops mid-batch (network failure recovery)
   - ✅ User offline for 1 week, 1000+ events (large offline queue)
   - ✅ Network flapping: 5 transitions in 10s (offline/online rapid changes)
   - ✅ Attacker sends 100 requests in 1 second (burst DoS attack)
   - ✅ Sustained attack: 1 request/sec for 120 seconds (throttling test)

3. **Minimal Mocking** ✅
   - ✅ Use real IndexedDB (fake-indexeddb)
   - ✅ Use real Logger (silent mode)
   - ✅ Use real EventBus
   - ✅ Use real TokenBucket algorithm
   - ✅ Mock only:
     - API calls (slow, external)
     - navigator.onLine (browser API)
     - Date.now() (non-deterministic, use vi.useFakeTimers)
   - ❌ NO mocking of own code (SyncQueue, SyncBatcher, OfflineQueue, RateLimiter)

4. **Never Adjust Tests to Match Bugs** ⚠️ CRITICAL
   
   **The Rule**: When a test fails:
   1. **First**: Is the test wrong?
      - Is it testing the wrong thing?
      - Are expectations incorrect?
   2. **If test is correct**: **FIX THE CODE, NOT THE TEST**
      - The test caught a real bug ✅
      - Adjusting the test hides the bug ❌
   
   **Critical Examples for Component 4**:
   
   - ❌ **WRONG**: Test expects chronological order, but queue returns random order
     - **Bad response**: "Let me adjust the test to accept any order"
     - **Why wrong**: Event sourcing REQUIRES chronological order for state reconstruction
   
   - ✅ **CORRECT**: Fix the queue implementation to sort by timestamp
     ```typescript
     // Fix in SyncQueue.dequeue()
     return events.sort((a, b) => a.timestamp - b.timestamp);
     ```
   
   - ❌ **WRONG**: Rate limiter allows 15 requests when limit is 10
     - **Bad response**: "Let me change the test to expect 15"
     - **Why wrong**: Security vulnerability! DoS attack possible!
   
   - ✅ **CORRECT**: Fix the token bucket algorithm
     ```typescript
     // Fix in TokenBucket.tryConsume()
     if (this.tokens >= count) {  // Was: > instead of >=
       this.tokens -= count;
       return true;
     }
     ```

### Test Execution Protocol

Following **Protocol 1: The Full Regression Mandate** from Testing Strategy v2:

- ❌ **FORBIDDEN**: "I fixed the SyncQueue, so the component works."
- ✅ **REQUIRED**: "I fixed the SyncQueue, ran `npm test`, and all 39 tests passed."

**When reporting test results**:
- Must cite exact command run
- Must include summary output
- Example: "Ran `npx vitest run src/background/sync`. Output: `Tests 39 passed (39)`."

**If tests fail during verification**:
1. **STOP** - Do not try to fix silently
2. **REPORT** failure to user immediately
3. **ASK** for permission to fix or if they want to see the error

---

## Testing Strategy

### Test Distribution (39 Total Tests)

- **Unit Tests**: 21 (54%)
  - SyncBatcher: 8
  - RateLimiter: 8
  - NetworkDetector: 3
  - SyncStatus: 2

- **Integration Tests**: 18 (46%)
  - SyncQueue: 10
  - OfflineQueue: 8

### Critical Test Cases (Per Testing Strategy v2)

**Risk-Based Testing**:
- ✅ Queue overflow (CRITICAL - 2 tests)
- ✅ Rate limiting (HIGH - 8 tests)
- ✅ Offline sync (HIGH - 8 tests)
- ✅ Sync conflicts (MEDIUM - 1 test)

**Realistic Scenarios**:
- ✅ Large offline queue (1000+ events)
- ✅ Rapid network transitions
- ✅ Concurrent sync operations
- ✅ Rate limit exceeded

**Minimal Mocking**:
- ✅ Use real IndexedDB (fake-indexeddb)
- ✅ Use real Network API (mock navigator.onLine)
- ✅ Use real Logger (silent mode)
- ❌ No mocking of own code

---

## Next Steps After Completion

1. ✅ Component 4 complete
2. → Begin Component 5: Conflict Resolution

---

## References

- [ADR-001: Event Sourcing for Sync](file:///home/sandy/projects/_underscore/docs/04-adrs/001-event-sourcing-for-sync.md)
- [System Design Patterns](file:///home/sandy/projects/_underscore/docs/05-quality-framework/01-system-design-patterns.md)
- [Coding Standards](file:///home/sandy/projects/_underscore/docs/05-quality-framework/02-coding-standards.md)
- [Architecture Principles](file:///home/sandy/projects/_underscore/docs/05-quality-framework/03-architecture-principles.md)
- [Component Breakdown v3](file:///home/sandy/projects/_underscore/docs/03-implementation/vault_phase2_component_breakdown_v3.md)
- [Threat Model](file:///home/sandy/projects/_underscore/docs/06-security/threat-model.md)

---

**Status**: Ready for Implementation  
**Next**: Task 4.1 - Define Sync Engine Interfaces
