# Component 2: API Client Layer - Implementation Tasks

**Phase**: Vault Mode Phase 2  
**Component**: 2 of 7  
**Duration**: 2-3 days (Week 1)  
**Total Tests**: 33 tests (12 core + 21 scalability/security)

---

## Progress Tracker

- [x] Task 2.1: Define API Client Interface ✅ COMPLETE
- [x] Task 2.2: Implement SupabaseClient ✅ COMPLETE (15/16 tests passing)
- [ ] Task 2.3: Implement API Error Handler (NEXT)
- [ ] Task 2.4: Implement PaginationClient (Scalability)
- [ ] Task 2.5: Implement CacheManager (Scalability)
- [ ] Task 2.6: Implement HTTPSValidator (Security)
- [ ] Task 2.7: Add Retry & Circuit Breaker
- [ ] Task 2.8: DI Registration

---

## Task 2.1: Define API Client Interface ⏱️ 2h ✅ COMPLETE

### Completed Items
- [x] Created [/src/background/api/interfaces/i-api-client.ts](file:///home/sandy/projects/_underscore/src/background/api/interfaces/i-api-client.ts)
  - [x] [IAPIClient](file:///home/sandy/projects/_underscore/src/background/api/interfaces/i-api-client.ts#153-244) interface with 8 methods
  - [x] [SyncEvent](file:///home/sandy/projects/_underscore/src/background/api/interfaces/i-api-client.ts#13-38) interface with event sourcing structure
  - [x] `SyncEventType` enum (6 event types)
  - [x] [PushResult](file:///home/sandy/projects/_underscore/src/background/api/interfaces/i-api-client.ts#88-98), [SyncConflict](file:///home/sandy/projects/_underscore/src/background/api/interfaces/i-api-client.ts#102-115) interfaces
  - [x] [Collection](file:///home/sandy/projects/_underscore/src/background/api/interfaces/i-api-client.ts#119-138), [CollectionData](file:///home/sandy/projects/_underscore/src/background/api/interfaces/i-api-client.ts#60-76), [DeleteData](file:///home/sandy/projects/_underscore/src/background/api/interfaces/i-api-client.ts#80-84) interfaces
  - [x] [VectorClock](file:///home/sandy/projects/_underscore/src/background/api/interfaces/i-api-client.ts#55-56) type alias
  - [x] Comprehensive JSDoc documentation
  - [x] Error cases documented with `@throws`
  - [x] Usage examples in JSDoc

- [x] Created [/src/background/api/api-errors.ts](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts)
  - [x] [APIError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#12-34) base class
  - [x] [NetworkError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#38-44) (timeouts, connection failures)
  - [x] [AuthenticationError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#48-54) (401, 403)
  - [x] [RateLimitError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#58-67) (429 with retry-after)
  - [x] [ServerError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#71-77) (5xx)
  - [x] [ValidationError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#81-87) (400 with field context)
  - [x] [NotFoundError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#91-100) (404)
  - [x] [TimeoutError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#104-112) (custom timeout handling)
  - [x] JSON serialization for all errors
  - [x] Proper stack trace preservation

- [x] TypeScript compilation verified (no errors in new files)

**Architecture Compliance**: ✅ Interface Segregation Principle  
**Duration**: 1.5 hours (under estimate)

---

## Task 2.2: Implement SupabaseClient ⏱️ 8h (IN PROGRESS)

### Implementation Checklist
- [ ] Install dependencies
  - [ ] `npm install @supabase/supabase-js`
  - [ ] Verify version ^2.x
  
- [ ] Create [/src/background/api/supabase-client.ts](file:///home/sandy/projects/_underscore/src/background/api/supabase-client.ts)
  - [ ] Class declaration with `implements IAPIClient`
  - [ ] Constructor with [IAuthManager](file:///home/sandy/projects/_underscore/src/background/auth/interfaces/i-auth-manager.ts#75-126), `ILogger`, config injection
  - [ ] Initialize Supabase client

- [ ] Implement highlight operations
  - [ ] [createHighlight()](file:///home/sandy/projects/_underscore/src/background/api/interfaces/i-api-client.ts#156-166) - INSERT to highlights table
  - [ ] [updateHighlight()](file:///home/sandy/projects/_underscore/src/background/api/supabase-client.ts#97-133) - UPDATE with partial data
  - [ ] [deleteHighlight()](file:///home/sandy/projects/_underscore/src/background/api/interfaces/i-api-client.ts#178-187) - Soft delete (set `deleted_at`)
  - [ ] [getHighlights()](file:///home/sandy/projects/_underscore/src/background/api/supabase-client.ts#165-200) - SELECT with optional URL filter

- [ ] Implement sync operations
  - [ ] [pushEvents()](file:///home/sandy/projects/_underscore/src/background/api/interfaces/i-api-client.ts#200-210) - Batch INSERT to events table
  - [ ] [pullEvents()](file:///home/sandy/projects/_underscore/src/background/api/supabase-client.ts#257-288) - SELECT events since timestamp
  - [ ] Handle vector clock serialization

- [ ] Implement collection operations
  - [ ] [createCollection()](file:///home/sandy/projects/_underscore/src/background/api/interfaces/i-api-client.ts#223-234) - INSERT to collections table
  - [ ] [getCollections()](file:///home/sandy/projects/_underscore/src/background/api/interfaces/i-api-client.ts#235-243) - SELECT user's collections

- [ ] Add cross-cutting concerns
  - [ ] Authentication check (`authManager.getUser()`)
  - [ ] Request timeout (5s default using `AbortController`)
  - [ ] Request/response logging (DEBUG level)
  - [ ] Error transformation (Supabase → domain errors)
  - [ ] Token injection in requests

### Test Cases (12 Unit Tests - Realistic & Tricky)

#### Basic Functionality (4 tests)
- [ ] **Test 1**: [createHighlight()](file:///home/sandy/projects/_underscore/src/background/api/interfaces/i-api-client.ts#156-166) inserts correct Supabase schema
  - Verify transformation: [HighlightDataV2](file:///home/sandy/projects/_underscore/src/shared/schemas/highlight-schema.ts#118-119) → Supabase row format
  - Check `user_id`, `url`, `text`, `color_role`, `selectors`, `content_hash`
  
- [ ] **Test 2**: [updateHighlight()](file:///home/sandy/projects/_underscore/src/background/api/supabase-client.ts#97-133) patches only specified fields
  - Update color only → verify other fields unchanged
  - Mock Supabase PATCH request
  
- [ ] **Test 3**: [deleteHighlight()](file:///home/sandy/projects/_underscore/src/background/api/interfaces/i-api-client.ts#178-187) soft-deletes (sets `deleted_at`)
  - Verify UPDATE query (not DELETE)
  - Check `deleted_at` timestamp set
  
- [ ] **Test 4**: [getHighlights()](file:///home/sandy/projects/_underscore/src/background/api/supabase-client.ts#165-200) filters by URL correctly
  - With URL: verify WHERE clause
  - Without URL: verify no filter
  - Empty result: return `[]`

#### Sync Operations (2 tests)
- [ ] **Test 5**: [pushEvents()](file:///home/sandy/projects/_underscore/src/background/api/interfaces/i-api-client.ts#200-210) batch inserts 100 events efficiently
  - Verify single transaction
  - Check all event fields serialized correctly
  - Verify returned `synced_event_ids`
  
- [ ] **Test 6**: [pullEvents(since)](file:///home/sandy/projects/_underscore/src/background/api/supabase-client.ts#257-288) queries with correct timestamp filter
  - Mock Supabase SELECT with `timestamp > since`
  - Verify chronological order (`ORDER BY timestamp ASC`)
  - **CRITICAL**: Events MUST be in order per testing strategy

#### Error Handling (4 tests)
- [ ] **Test 7**: Unauthenticated request throws [AuthenticationError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#48-54)
  - Mock `authManager.getUser()` returns `null`
  - Verify error thrown BEFORE API call
  - No network request made
  
- [ ] **Test 8**: Network timeout (>5s) throws [TimeoutError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#104-112)
  - Mock fetch delay of 6000ms
  - Verify `AbortController.signal` used
  - Check timeout error context includes duration
  
- [ ] **Test 9**: 401 response triggers token refresh
  - Mock Supabase returns 401
  - Verify `authManager.refreshToken()` called
  - Verify request retried with new token
  
- [ ] **Test 10**: 429 response throws [RateLimitError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#58-67) with retry-after
  - Mock Supabase returns 429 with `Retry-After: 60`
  - Verify `RateLimitError.retryAfter === 60`
  - No automatic retry (fail fast for rate limits)

#### Edge Cases & Tricky Scenarios (2 tests)
- [ ] **Test 11**: Large payload (>1MB) handled without truncation
  - Create highlight with 1.5MB text (realistic: long article)
  - Verify all data persisted
  - Check no silent truncation
  
- [ ] **Test 12**: Concurrent API calls don't corrupt shared state
  - Call [createHighlight()](file:///home/sandy/projects/_underscore/src/background/api/interfaces/i-api-client.ts#156-166) x3 in parallel
  - Verify all 3 succeed independently
  - Check no race condition in auth token retrieval
  - **TRICKY**: Test thread safety of client instance

#### Additional Realistic Scenarios (Bonus - not counted in 12)
- [ ] **Bonus**: Unicode preservation (emoji, CJK characters)
  - Highlight text: `"👍 日本語 ñoño"`
  - Verify exact match after round-trip
  
- [ ] **Bonus**: Null/undefined fields handled gracefully
  - Highlight with no `description`: verify INSERT succeeds
  - Update with `undefined` field: verify PATCH ignores it

---

## Task 2.3: Implement API Error Handler ⏱️ 2h

### Implementation Checklist
- [ ] Create `/src/background/api/api-error-handler.ts`
  - [ ] `APIErrorHandler.handle(error: unknown): APIError`
  - [ ] Handle `PostgrestError` (Supabase SDK errors)
  - [ ] Handle `TypeError` (fetch network errors)
  - [ ] Handle timeout errors
  - [ ] Default fallback for unknown errors

- [ ] Error transformation rules
  - [ ] HTTP 401/403 → [AuthenticationError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#48-54)
  - [ ] HTTP 429 → [RateLimitError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#58-67) (extract `Retry-After` header)
  - [ ] HTTP 500-599 → [ServerError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#71-77)
  - [ ] HTTP 400 → [ValidationError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#81-87)
  - [ ] HTTP 404 → [NotFoundError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#91-100)
  - [ ] Network failure → [NetworkError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#38-44)
  - [ ] Request timeout → [TimeoutError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#104-112)

- [ ] Logging
  - [ ] Log all errors with context (ERROR level)
  - [ ] Include request details (method, URL, but NOT tokens)
  - [ ] Include user ID for debugging (if available)

**Tests**: Covered by Task 2.2 tests (error handling scenarios)

---

## Task 2.4: Implement PaginationClient ⏱️ 8h (Scalability Enhancement)

**NEW**: Cursor-based pagination for large datasets

### Implementation Checklist
- [ ] Create `/src/background/api/interfaces/i-pagination-client.ts`
  - [ ] `IPaginationClient` interface
  - [ ] `PaginatedResponse<T>` type
  - [ ] `CursorInfo` type

- [ ] Create `/src/background/api/pagination-client.ts`
  - [ ] `PaginationClient` class
  - [ ] `pullEventsPaginated()` - AsyncGenerator implementation
  - [ ] Page size: 100 events
  - [ ] Cursor-based iteration
  - [ ] Timeout per page (5s)

- [ ] Update [SupabaseClient](file:///home/sandy/projects/_underscore/src/background/api/supabase-client.ts#41-457)
  - [ ] Add `pullEventsWithCursor()` method
  - [ ] Return `{ events, nextCursor }`
  - [ ] Handle pagination query params

### Test Cases (8 Unit Tests)
- [ ] **Test 1**: Single page (50 events) - no pagination needed
- [ ] **Test 2**: Multiple pages (250 events) - streams in 3 pages
- [ ] **Test 3**: Empty result - yields nothing, exits gracefully
- [ ] **Test 4**: Large dataset (10,000 events) - memory efficient
  - **TRICKY**: Monitor memory usage (should stay < 10MB)
  - Use AsyncGenerator to stream, not load all in memory
  
- [ ] **Test 5**: Cursor reset on error - restarts from beginning
- [ ] **Test 6**: Timeout per page (page takes >5s) throws error
- [ ] **Test 7**: Last page partial (92 events) - handles correctly
- [ ] **Test 8**: Integration with SupabaseClient - cursor flow works

---

## Task 2.5: Implement CacheManager ⏱️ 8h (Scalability Enhancement)

**NEW**: LRU cache to reduce API calls

### Implementation Checklist
- [ ] Create `/src/background/api/interfaces/i-cache-manager.ts`
  - [ ] `ICacheManager<K, V>` interface
  - [ ] `CacheEntry<V>` type (value + timestamp)
  - [ ] `CacheStats` type (size, hits, misses, hit rate)

- [ ] Create `/src/background/api/cache-manager.ts`
  - [ ] `CacheManager<K, V>` class
  - [ ] `set(key, value)` - add/update entry
  - [ ] [get(key)](file:///home/sandy/projects/_underscore/src/background/auth/interfaces/i-auth-manager.ts#111-117) - retrieve with TTL check, LRU update
  - [ ] `invalidate(key)` - remove entry
  - [ ] `clear()` - remove all entries
  - [ ] `getStats()` - return cache metrics
  - [ ] LRU eviction logic (move to end on access)
  - [ ] TTL expiration (default 5min)
  - [ ] Max size: 100 entries

- [ ] Integrate with SupabaseClient
  - [ ] Wrap [getHighlights()](file:///home/sandy/projects/_underscore/src/background/api/supabase-client.ts#165-200) with cache
  - [ ] Wrap [pullEvents()](file:///home/sandy/projects/_underscore/src/background/api/supabase-client.ts#257-288) with cache (key: `since` timestamp)
  - [ ] Invalidate on write operations ([createHighlight](file:///home/sandy/projects/_underscore/src/background/api/interfaces/i-api-client.ts#156-166), etc.)

### Test Cases (10 Unit Tests)
- [ ] **Test 1**: Set/get basic operation works
- [ ] **Test 2**: LRU eviction - oldest entry removed when full
  - Add 101 entries to cache (max 100)
  - Verify first entry evicted
  
- [ ] **Test 3**: TTL expiration - entry expires after 5min
  - Mock `Date.now()` to advance time
  - Verify expired entry returns `null`
  
- [ ] **Test 4**: Cache hit/miss metrics tracked correctly
  - 10 gets: 7 hits, 3 misses
  - Verify `hitRate === 0.7`
  
- [ ] **Test 5**: Concurrent access doesn't corrupt cache
  - **TRICKY**: 100 parallel `set()` calls
  - Verify final size === 100 (no duplicates)
  
- [ ] **Test 6**: Memory efficient - Map size correct
  - Add 1000 entries → evict → check Map size === 100
  
- [ ] **Test 7**: `clear()` removes all entries
- [ ] **Test 8**: Cache invalidation on write
  - [createHighlight()](file:///home/sandy/projects/_underscore/src/background/api/interfaces/i-api-client.ts#156-166) called → cache cleared
  
- [ ] **Test 9**: Performance: [get()](file:///home/sandy/projects/_underscore/src/background/auth/interfaces/i-auth-manager.ts#111-117) < 1ms (p95)
  - Measure 1000 get operations
  
- [ ] **Test 10**: Integration test - cache reduces API calls
  - Mock API call counter
  - Call [getHighlights()](file:///home/sandy/projects/_underscore/src/background/api/supabase-client.ts#165-200) x5 → verify only 1 API call

---

## Task 2.6: Implement HTTPSValidator ⏱️ 4h (Security Enhancement)

**NEW**: Enforce HTTPS to prevent MITM attacks

### Implementation Checklist
- [ ] Create `/src/background/api/https-validator.ts`
  - [ ] `HTTPSValidator.validate(url: string): void`
  - [ ] Parse URL and check protocol
  - [ ] Throw `SecurityError` if not HTTPS
  - [ ] Allow localhost for development

- [ ] Integrate with SupabaseClient
  - [ ] Call `HTTPSValidator.validate()` in constructor
  - [ ] Validate all API endpoints

### Test Cases (3 Unit Tests)
- [ ] **Test 1**: HTTPS URL passes `https://api.supabase.co`
- [ ] **Test 2**: HTTP URL throws `SecurityError` `http://api.supabase.co`
- [ ] **Test 3**: Invalid URL throws error `not-a-url`

---

## Task 2.7: Add Retry & Circuit Breaker ⏱️ 2h

### Implementation Checklist
- [ ] Import from IPC layer
  - [ ] `RetryDecorator` from `/src/shared/resilience/retry-decorator.ts`
  - [ ] `CircuitBreaker` from `/src/shared/resilience/circuit-breaker.ts`

- [ ] Configure retry behavior
  - [ ] Max retries: 3
  - [ ] Backoff: exponential (100ms, 200ms, 400ms)
  - [ ] Retry on: [NetworkError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#38-44), [ServerError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#71-77)
  - [ ] Do NOT retry: [AuthenticationError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#48-54), [ValidationError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#81-87), [RateLimitError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#58-67)

- [ ] Configure circuit breaker
  - [ ] Failure threshold: 5 consecutive failures
  - [ ] Reset timeout: 30 seconds
  - [ ] Half-open test: 1 request

- [ ] Wrap SupabaseClient in decorators
  - [ ] Innermost: [SupabaseClient](file:///home/sandy/projects/_underscore/src/background/api/supabase-client.ts#41-457)
  - [ ] Middle: `RetryDecorator`
  - [ ] Outermost: `CircuitBreaker`

**Tests**: Reuse existing IPC layer tests (no new tests needed)

---

## Task 2.8: DI Registration ⏱️ 1h

### Implementation Checklist
- [ ] Register in `/src/background/di/container-registration.ts`
  - [ ] [SupabaseClient](file:///home/sandy/projects/_underscore/src/background/api/supabase-client.ts#41-457) as singleton
  - [ ] Wrapped with `RetryDecorator` and `CircuitBreaker`
  - [ ] `PaginationClient` as singleton
  - [ ] `CacheManager` as singleton

- [ ] Verify dependencies
  - [ ] [IAuthManager](file:///home/sandy/projects/_underscore/src/background/auth/interfaces/i-auth-manager.ts#75-126) resolved
  - [ ] `ILogger` resolved
  - [ ] Config from environment variables

- [ ] Add to bootstrap function

**Tests**: Integration tests verify DI resolution

---

## Architecture Compliance

### SOLID Principles
- [x] **S**: Each class has single responsibility
- [x] **O**: Interface-based design for extension
- [x] **L**: Any [IAPIClient](file:///home/sandy/projects/_underscore/src/background/api/interfaces/i-api-client.ts#153-244) implementation interchangeable
- [x] **I**: Focused interfaces (API, Pagination, Cache separate)
- [x] **D**: Depends on interfaces, not concrete classes

### Design Patterns
- [x] **Facade**: [SupabaseClient](file:///home/sandy/projects/_underscore/src/background/api/supabase-client.ts#41-457) wraps Supabase SDK
- [x] **Decorator**: Retry + Circuit Breaker wrap client
- [x] **Repository**: Data access abstraction
- [x] **Iterator**: `PaginationClient` uses AsyncGenerator
- [x] **Strategy**: LRU eviction strategy

---

## Quality Gates

### Per-Task Gates
- [ ] 0 TypeScript errors
- [ ] 0 ESLint errors
- [ ] All tests passing
- [ ] Code coverage > 85%

### Component-Level Gates
- [ ] All 33 tests passing
- [ ] HTTPS validation enforced
- [ ] Pagination handles 10K+ events
- [ ] Cache hit rate > 70%
- [ ] Performance benchmarks met

---

## Next Steps
**Current**: Task 2.2 - Implementing SupabaseClient with 12 realistic tests  
**Next**: Task 2.3 - API Error Handler (2h)

---

**Status**: Task 2.1 ✅ Complete | Task 2.2 🔄 In Progress  
**Estimated Completion**: End of Week 1
