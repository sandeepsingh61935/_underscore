# Component 4: Sync Engine + Rate Limiting - Progress Tracker

**Component**: 4 of 7  
**Duration**: 1 week (Week 3)  
**Total Tests**: 39 tests (31 core + 8 rate limiting)  
**Status**: 🔄 In Progress

---

## Week 3: Sync Engine + Rate Limiting (40 hours)

### Task 4.1: Define Sync Engine Interfaces ⏱️ 2h ✅ COMPLETE

- [x] Create `i-sync-queue.ts`
  - [x] Define `ISyncQueue` interface (6 methods)
  - [x] Add `SyncQueueConfig` interface
  - [x] Add `SyncOperation` type
  - [x] Add JSDoc documentation

- [x] Create `i-network-detector.ts`
  - [x] Define `INetworkDetector` interface
  - [x] Define `ConnectionType` enum
  - [x] Document network change events

- [x] Create `i-rate-limiter.ts` 🔴 NEW
  - [x] Define `IRateLimiter` interface
  - [x] Define `RateLimitConfig` interface
  - [x] Define `RateLimitMetrics` interface
  - [x] Document token bucket algorithm

- [x] Create `sync-errors.ts`
  - [x] Define `SyncError` base class
  - [x] Define `QueueFullError`
  - [x] Define `SyncConflictError`
  - [x] Define `NetworkError`
  - [x] Define `RateLimitExceededError` 🔴 NEW
  - [x] Define `OfflineError`

---

### Task 4.2: Implement SyncQueue with Event Sourcing ⏱️ 8h ✅ COMPLETE

- [x] Create `sync-queue.ts`
  - [x] Implement `SyncQueue` class with `ISyncQueue` interface
  - [x] Use IndexedDB for persistent queue (database: `sync_queue`)
  - [x] Add indexes on `timestamp` and `priority`

- [x] Implement core queue operations
  - [x] `enqueue(event)` - validate, persist, emit event
  - [x] `dequeue()` - get oldest event (FIFO)
  - [x] `peek()` - get oldest without removing
  - [x] `size()` - return count
  - [x] `clear()` - remove all events
  - [x] `isEmpty()` - check if empty

- [x] Add priority queue support
  - [x] Calculate priority based on event type
  - [x] Dequeue by priority, then timestamp

- [x] Add retry logic
  - [x] Track retry count per event
  - [x] Max retries: 3
  - [x] Exponential backoff: 1s, 2s, 4s
  - [x] Move to dead letter queue after max retries

- [x] Add sync triggering
  - [x] Auto-trigger sync when event enqueued (if online)
  - [x] Debounce sync calls (500ms)
  - [x] Handle concurrent sync attempts (lock)

- [x] Add queue overflow handling
  - [x] Throw `QueueFullError` when max size reached
  - [x] Log warning at 80% capacity
  - [x] Emit `QUEUE_NEAR_FULL` event at 90%

- [x] Write 13 integration tests ✅ ALL PASSING
  - [x] Basic operations (3 tests)
  - [x] Priority queue (2 tests)
  - [x] Queue limits (2 tests)
  - [x] Concurrent operations (1 test)
  - [x] Edge cases (5 tests)

---

### Task 4.3: Implement SyncBatcher for Efficient Sync ⏱️ 6h

- [ ] Create `sync-batcher.ts`
  - [ ] Implement `SyncBatcher` class
  - [ ] Configurable batch size (default: 50)
  - [ ] Configurable batch timeout (default: 5s)

- [ ] Implement batching logic
  - [ ] `addToBatch(event)` - add to current batch
  - [ ] `flush()` - send batch to API
  - [ ] `scheduleFlush()` - debounce flush calls

- [ ] Add batch optimization
  - [ ] Group events by entity ID
  - [ ] Deduplicate events (keep latest per entity)
  - [ ] Compress batch payload (gzip)
  - [ ] Split large batches (max 100 events)

- [ ] Add batch failure handling
  - [ ] Retry entire batch on network error
  - [ ] Retry individual events on validation error
  - [ ] Track batch success/failure metrics

- [ ] Add batch monitoring
  - [ ] Track batch size distribution
  - [ ] Track batch latency (p50, p95, p99)
  - [ ] Track compression ratio
  - [ ] Expose metrics via `getMetrics()`

- [ ] Write 8 unit tests
  - [ ] Batching logic (3 tests)
  - [ ] Optimization (2 tests)
  - [ ] Failure handling (2 tests)
  - [ ] Performance (1 test)

---

### Task 4.4: Implement OfflineQueue with Persistence ⏱️ 6h

- [ ] Create `offline-queue.ts`
  - [ ] Implement `OfflineQueue` class
  - [ ] Persist events when offline
  - [ ] Auto-sync when online

- [ ] Implement offline detection
  - [ ] Subscribe to network status changes
  - [ ] Detect online/offline transitions
  - [ ] Emit `OFFLINE_MODE_ENABLED` event
  - [ ] Emit `OFFLINE_MODE_DISABLED` event

- [ ] Implement offline queueing
  - [ ] `queueOffline(event)` - store in IndexedDB
  - [ ] Track queue size
  - [ ] Warn if offline queue exceeds limit (1000 events)

- [ ] Implement online sync
  - [ ] Detect online transition
  - [ ] Load all offline events
  - [ ] Sync in chronological order
  - [ ] Handle sync failures gracefully
  - [ ] Clear offline queue after successful sync

- [ ] Add conflict detection
  - [ ] Check for conflicts before syncing
  - [ ] Use vector clocks for ordering
  - [ ] Defer conflict resolution to ConflictResolver
  - [ ] Emit `SYNC_CONFLICT_DETECTED` event

- [ ] Add offline queue management
  - [ ] `getOfflineQueueSize()`
  - [ ] `clearOfflineQueue()`
  - [ ] `getOldestOfflineEvent()`
  - [ ] Track offline duration
  - [ ] Expose offline metrics

- [ ] Write 8 integration tests
  - [ ] Offline queueing (3 tests)
  - [ ] Online sync (3 tests)
  - [ ] Conflict detection (1 test)
  - [ ] Large offline queue (1 test)

---

### Task 4.5: Implement RateLimiter with Token Bucket 🔴 NEW ⏱️ 8h

**Security Impact**: HIGH - DoS protection

- [ ] Create `rate-limiter.ts`
  - [ ] Implement `RateLimiter` class with `IRateLimiter` interface
  - [ ] Use token bucket algorithm
  - [ ] Per-user, per-operation buckets
  - [ ] In-memory bucket storage (Map)

- [ ] Implement token bucket algorithm
  - [ ] Create `TokenBucket` class
  - [ ] `tryConsume(count)` - attempt to consume tokens
  - [ ] `refill()` - refill tokens based on elapsed time
  - [ ] `getRemainingTokens()` - return available tokens

- [ ] Implement rate limit policies
  - [ ] Sync: 10/minute
  - [ ] Auth: 5/15min
  - [ ] API: 100/minute
  - [ ] Default: 100/minute

- [ ] Implement RateLimiter methods
  - [ ] `checkLimit(userId, operation)` - check if allowed
  - [ ] `getRemainingTokens(userId, operation)` - get available tokens
  - [ ] `reset(userId, operation)` - reset bucket
  - [ ] `getMetrics()` - return rate limit metrics

- [ ] Add bucket cleanup
  - [ ] Periodic cleanup of inactive buckets (every 5 minutes)
  - [ ] Remove buckets not used in last 30 minutes
  - [ ] Prevent memory leaks

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

- [ ] Write 8 unit tests
  - [ ] Token bucket algorithm (3 tests)
  - [ ] Rate limiting (3 tests)
  - [ ] Multi-user (1 test)
  - [ ] Metrics (1 test)

---

### Task 4.6: Implement NetworkDetector ⏱️ 4h

- [ ] Create `network-detector.ts`
  - [ ] Implement `NetworkDetector` class with `INetworkDetector` interface
  - [ ] Use `navigator.onLine` for online/offline detection
  - [ ] Use Network Information API for connection type
  - [ ] Subscribe to `online`/`offline` events

- [ ] Implement network detection
  - [ ] `isOnline()` - check if online
  - [ ] `getConnectionType()` - return connection type enum
  - [ ] Verify with ping to API (optional)

- [ ] Implement network change subscription
  - [ ] `subscribe(callback)` - register callback
  - [ ] Listen to `online` event
  - [ ] Listen to `offline` event
  - [ ] Return unsubscribe function

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

- [ ] Write 3 unit tests
  - [ ] Online detection (1 test)
  - [ ] Subscription (1 test)
  - [ ] Connection type (1 test)

---

### Task 4.7: Implement SyncStatus Tracker ⏱️ 3h

- [ ] Create `sync-status.ts`
  - [ ] Implement `SyncStatus` class
  - [ ] Track sync state (idle, syncing, error, offline, rate_limited)
  - [ ] Track last sync timestamp
  - [ ] Track sync progress

- [ ] Define sync states
  - [ ] Create `SyncState` enum
  - [ ] IDLE, SYNCING, ERROR, OFFLINE, RATE_LIMITED

- [ ] Implement status tracking
  - [ ] `setState(state)` - set current state
  - [ ] `getState()` - get current state
  - [ ] `getLastSyncTime()` - get last sync timestamp
  - [ ] `getSyncProgress()` - get progress (0-100)
  - [ ] `getErrorMessage()` - get error message if any

- [ ] Add status persistence
  - [ ] Persist status to chrome.storage.local
  - [ ] Load status on initialization
  - [ ] Emit `SYNC_STATUS_CHANGED` event

- [ ] Add status UI integration
  - [ ] Provide status for popup UI
  - [ ] Show sync indicator
  - [ ] Show error messages
  - [ ] Show last sync time

- [ ] Write 2 unit tests
  - [ ] State tracking (1 test)
  - [ ] Persistence (1 test)

---

### Task 4.8: DI Registration ⏱️ 1h

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

- [ ] Write 1 integration test
  - [ ] All services resolve correctly

---

### Task 4.9: Integration Testing ⏱️ 4h

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

- [ ] Write 3 integration tests
  - [ ] Full sync flow (1 test)
  - [ ] Offline sync (1 test)
  - [ ] Rate limiting (1 test)

---

## Quality Gates

### Per-Task Gates
- [ ] 0 TypeScript errors (`npm run type-check`)
- [ ] 0 ESLint errors (`npm run lint`)
- [ ] 100% Prettier compliance (`npm run format`)
- [ ] All tests passing (`npm test`)
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

## Architecture Compliance

### SOLID Principles
- [ ] **S**: Single Responsibility - Each class has one purpose
- [ ] **O**: Open/Closed - New sync strategies added via config
- [ ] **L**: Liskov Substitution - Any `ISyncQueue` implementation interchangeable
- [ ] **I**: Interface Segregation - Separate interfaces for Queue, Network, RateLimiter
- [ ] **D**: Dependency Inversion - Depend on interfaces, not concrete classes

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
- [ ] **Chronological Order**: Events synced in order (oldest → newest)
- [ ] **Offline Support**: Events queued when offline
- [ ] **Retry Logic**: Failed events retried with backoff

---

## Next Steps After Completion

1. ✅ Component 4 complete
2. → Begin Component 5: Conflict Resolution

---

**Status**: 🔄 In Progress  
**Started**: [Date]  
**Target Completion**: End of Week 3  
**Next**: Task 4.1 - Define Sync Engine Interfaces
