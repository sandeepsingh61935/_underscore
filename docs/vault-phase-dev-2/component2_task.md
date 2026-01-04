# Component 2: API Client Layer - Implementation Tasks

**Phase**: Vault Mode Phase 2  
**Component**: 2 of 7  
**Duration**: 2-3 days (Week 1)  
**Total Tests**: 33 tests (12 core + 21 scalability/security)

---

## Progress Tracker

- [x] Task 2.1: Define API Client Interface ✅ COMPLETE
- [x] Task 2.2: Implement SupabaseClient ✅ COMPLETE
- [x] Task 2.3: Implement API Error Handler ✅ COMPLETE
- [x] Task 2.4: Implement PaginationClient (Scalability) ✅ COMPLETE
- [x] Task 2.5: Implement CacheManager (Scalability) ✅ COMPLETE
- [x] Task 2.6: Implement HTTPSValidator (Security) ✅ COMPLETE
- [x] Task 2.7: Add Retry & Circuit Breaker ✅ COMPLETE
- [x] Task 2.8: DI Registration ✅ COMPLETE

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

## Task 2.2: Implement SupabaseClient ⏱️ 8h ✅ COMPLETE

### Implementation Checklist
- [x] Install dependencies
  - [x] `npm install @supabase/supabase-js`
  - [x] Verify version ^2.x
  
- [x] Create [/src/background/api/supabase-client.ts](file:///home/sandy/projects/_underscore/src/background/api/supabase-client.ts)
  - [x] Class declaration with `implements IAPIClient`
  - [x] Constructor with [IAuthManager](file:///home/sandy/projects/_underscore/src/background/auth/interfaces/i-auth-manager.ts#75-126), `ILogger`, config injection
  - [x] Initialize Supabase client

- [x] Implement highlight operations
  - [x] [createHighlight()](file:///home/sandy/projects/_underscore/src/background/api/interfaces/i-api-client.ts#156-166) - INSERT to highlights table
  - [x] [updateHighlight()](file:///home/sandy/projects/_underscore/src/background/api/supabase-client.ts#97-133) - UPDATE with partial data
  - [x] [deleteHighlight()](file:///home/sandy/projects/_underscore/src/background/api/interfaces/i-api-client.ts#178-187) - Soft delete (set `deleted_at`)
  - [x] [getHighlights()](file:///home/sandy/projects/_underscore/src/background/api/supabase-client.ts#165-200) - SELECT with optional URL filter

- [x] Implement sync operations
  - [x] [pushEvents()](file:///home/sandy/projects/_underscore/src/background/api/interfaces/i-api-client.ts#200-210) - Batch INSERT to events table
  - [x] [pullEvents()](file:///home/sandy/projects/_underscore/src/background/api/supabase-client.ts#257-288) - SELECT events since timestamp
  - [x] Handle vector clock serialization

- [x] Implement collection operations
  - [x] [createCollection()](file:///home/sandy/projects/_underscore/src/background/api/interfaces/i-api-client.ts#223-234) - INSERT to collections table
  - [x] [getCollections()](file:///home/sandy/projects/_underscore/src/background/api/interfaces/i-api-client.ts#235-243) - SELECT user's collections

- [x] Add cross-cutting concerns
  - [x] Authentication check (`authManager.getUser()`)
  - [x] Request timeout (5s default using `AbortController`)
  - [x] Request/response logging (DEBUG level)
  - [x] Error transformation (User APIErrorHandler)
  - [x] Token injection in requests

### Test Cases (12 Unit Tests - Realistic & Tricky)

#### Basic Functionality (4 tests)
- [x] **Test 1**: [createHighlight()](file:///home/sandy/projects/_underscore/src/background/api/interfaces/i-api-client.ts#156-166) inserts correct Supabase schema
- [x] **Test 2**: [updateHighlight()](file:///home/sandy/projects/_underscore/src/background/api/supabase-client.ts#97-133) patches only specified fields
- [x] **Test 3**: [deleteHighlight()](file:///home/sandy/projects/_underscore/src/background/api/interfaces/i-api-client.ts#178-187) soft-deletes (sets `deleted_at`)
- [x] **Test 4**: [getHighlights()](file:///home/sandy/projects/_underscore/src/background/api/supabase-client.ts#165-200) filters by URL correctly

#### Sync Operations (2 tests)
- [x] **Test 5**: [pushEvents()](file:///home/sandy/projects/_underscore/src/background/api/interfaces/i-api-client.ts#200-210) batch inserts 100 events efficiently
- [x] **Test 6**: [pullEvents(since)](file:///home/sandy/projects/_underscore/src/background/api/supabase-client.ts#257-288) queries with correct timestamp filter

#### Error Handling (4 tests)
- [x] **Test 7**: Unauthenticated request throws [AuthenticationError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#48-54)
- [x] **Test 8**: Network timeout (>5s) throws [TimeoutError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#104-112)
- [x] **Test 9**: 401 response triggers token refresh
- [x] **Test 10**: 429 response throws [RateLimitError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#58-67) with retry-after

#### Edge Cases & Tricky Scenarios (2 tests)
- [x] **Test 11**: Large payload (>1MB) handled without truncation
- [x] **Test 12**: Concurrent API calls don't corrupt shared state

#### Additional Realistic Scenarios (Bonus - not counted in 12)
- [x] **Bonus**: Unicode preservation (emoji, CJK characters)
- [x] **Bonus**: Null/undefined fields handled gracefully

---

## Task 2.3: Implement API Error Handler ⏱️ 2h ✅ COMPLETE

### Implementation Checklist
- [x] Create `/src/background/api/api-error-handler.ts`
  - [x] `APIErrorHandler.handle(error: unknown): APIError`
  - [x] Handle `PostgrestError` (Supabase SDK errors)
  - [x] Handle `TypeError` (fetch network errors)
  - [x] Handle timeout errors
  - [x] Default fallback for unknown errors

- [x] Error transformation rules
  - [x] HTTP 401/403 → [AuthenticationError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#48-54)
  - [x] HTTP 429 → [RateLimitError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#58-67) (extract `Retry-After` header)
  - [x] HTTP 500-599 → [ServerError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#71-77)
  - [x] HTTP 400 → [ValidationError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#81-87)
  - [x] HTTP 404 → [NotFoundError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#91-100)
  - [x] Network failure → [NetworkError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#38-44)
  - [x] Request timeout → [TimeoutError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#104-112)

- [x] Logging
  - [x] Log all errors with context (ERROR level)
  - [x] Include request details (method, URL, but NOT tokens)
  - [x] Include user ID for debugging (if available)

**Tests**: Covered by newly created `api-error-handler.test.ts` (10 tests passing).

---

## Task 2.4: Implement PaginationClient ⏱️ 8h ✅ COMPLETE

### Implementation Checklist
- [x] Create `/src/background/api/interfaces/i-pagination-client.ts`
  - [x] `IPaginationClient` interface
  - [x] `PaginatedResponse<T>` type
  - [x] `CursorInfo` type

- [x] Create `/src/background/api/pagination-client.ts`
  - [x] `PaginationClient` class
  - [x] `pullEventsPaginated()` - AsyncGenerator implementation
  - [x] Page size: 100 events
  - [x] Cursor-based iteration
  - [x] Timeout per page (5s)

- [x] Update [SupabaseClient](file:///home/sandy/projects/_underscore/src/background/api/supabase-client.ts#41-457)
  - [x] Add `pullEventsWithCursor()` method
  - [x] Return `{ events, nextCursor }`
  - [x] Handle pagination query params

### Test Cases (8 Unit Tests)
- [x] **Test 1**: Single page (50 events) - no pagination needed
- [x] **Test 2**: Multiple pages (250 events) - streams in 3 pages
- [x] **Test 3**: Empty result - yields nothing, exits gracefully
- [x] **Test 4**: Large dataset (10,000 events) - memory efficient
- [x] **Test 5**: Cursor reset on error - restarts from beginning
- [x] **Test 6**: Timeout per page (page takes >5s) throws error
- [x] **Test 7**: Last page partial (92 events) - handles correctly
- [x] **Test 8**: Integration with SupabaseClient - cursor flow works

---

## Task 2.5: Implement CacheManager ⏱️ 8h ✅ COMPLETE

### Implementation Checklist
- [x] Create `/src/background/api/interfaces/i-cache-manager.ts`
  - [x] `ICacheManager<K, V>` interface
  - [x] `CacheEntry<V>` type (value + timestamp)
  - [x] `CacheStats` type (size, hits, misses, hit rate)

- [x] Create `/src/background/api/cache-manager.ts`
  - [x] `CacheManager<K, V>` class
  - [x] `set(key, value)` - add/update entry
  - [x] [get(key)](file:///home/sandy/projects/_underscore/src/background/auth/interfaces/i-auth-manager.ts#111-117) - retrieve with TTL check, LRU update
  - [x] `invalidate(key)` - remove entry
  - [x] `clear()` - remove all entries
  - [x] `getStats()` - return cache metrics
  - [x] LRU eviction logic (move to end on access)
  - [x] TTL expiration (default 5min)
  - [x] Max size: 100 entries

- [x] Integrate with SupabaseClient
  - [x] Wrap [getHighlights()](file:///home/sandy/projects/_underscore/src/background/api/supabase-client.ts#165-200) with cache
  - [x] Wrap [pullEvents()](file:///home/sandy/projects/_underscore/src/background/api/supabase-client.ts#257-288) with cache (key: `since` timestamp)
  - [x] Invalidate on write operations ([createHighlight](file:///home/sandy/projects/_underscore/src/background/api/interfaces/i-api-client.ts#156-166), etc.)

### Test Cases (10 Unit Tests)
- [x] **Test 1**: Set/get basic operation works
- [x] **Test 2**: LRU eviction - oldest entry removed when full
- [x] **Test 3**: TTL expiration - entry expires after 5min
- [x] **Test 4**: Cache hit/miss metrics tracked correctly
- [x] **Test 5**: Concurrent access doesn't corrupt cache
- [x] **Test 6**: Memory efficient - Map size correct
- [x] **Test 7**: `clear()` removes all entries
- [x] **Test 8**: Cache invalidation on write
- [x] **Test 9**: Performance: [get()](file:///home/sandy/projects/_underscore/src/background/auth/interfaces/i-auth-manager.ts#111-117) < 1ms (p95)
- [x] **Test 10**: Integration test - cache reduces API calls

---

## Task 2.6: Implement HTTPSValidator ⏱️ 4h ✅ COMPLETE

### Implementation Checklist
- [x] Create `/src/background/api/https-validator.ts`
  - [x] `HTTPSValidator.validate(url: string): void`
  - [x] Parse URL and check protocol
  - [x] Throw `SecurityError` if not HTTPS
  - [x] Allow localhost for development

- [x] Integrate with SupabaseClient
  - [x] Call `HTTPSValidator.validate()` in constructor
  - [x] Validate all API endpoints

### Test Cases (3 Unit Tests)
- [x] **Test 1**: HTTPS URL passes `https://api.supabase.co`
- [x] **Test 2**: HTTP URL throws `SecurityError` `http://api.supabase.co`
- [x] **Test 3**: Invalid URL throws error `not-a-url`

---

## Task 2.7: Add Retry & Circuit Breaker ⏱️ 2h ✅ COMPLETE

### Implementation Checklist
- [x] Import from IPC layer
  - [ ] `RetryDecorator` from `/src/shared/resilience/retry-decorator.ts` (Used ResilientAPIClient wrapper instead)
  - [x] `CircuitBreaker` from `/src/shared/utils/circuit-breaker.ts`

- [x] Configure retry behavior
  - [x] Max retries: 3
  - [x] Backoff: exponential (100ms, 200ms, 400ms)
  - [x] Retry on: [NetworkError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#38-44), [ServerError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#71-77)
  - [x] Do NOT retry: [AuthenticationError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#48-54), [ValidationError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#81-87), [RateLimitError](file:///home/sandy/projects/_underscore/src/background/api/api-errors.ts#58-67)

- [x] Configure circuit breaker
  - [x] Failure threshold: 5 consecutive failures
  - [x] Reset timeout: 30 seconds
  - [x] Half-open test: 1 request

- [x] Wrap SupabaseClient in decorators
  - [x] Innermost: [SupabaseClient](file:///home/sandy/projects/_underscore/src/background/api/supabase-client.ts#41-457)
  - [x] Middle: `ResilientAPIClient` (Combines Retry & Circuit Breaker)
  - [x] Outermost: DI Container

**Tests**: Created `resilient-api-client.test.ts` (10 tests) covering all scenarios.

---

## Task 2.8: DI Registration ⏱️ 1h ✅ COMPLETE

### Implementation Checklist
- [x] Register in `/src/background/di/container-registration.ts`
  - [x] [SupabaseClient](file:///home/sandy/projects/_underscore/src/background/api/supabase-client.ts#41-457) as singleton
  - [x] Wrapped with `ResilientAPIClient`
  - [x] `PaginationClient` as singleton
  - [x] `CacheManager` as singleton

- [x] Verify dependencies
  - [x] [IAuthManager](file:///home/sandy/projects/_underscore/src/background/auth/interfaces/i-auth-manager.ts#75-126) resolved
  - [x] `ILogger` resolved
  - [x] Config from environment variables

- [x] Add to bootstrap function

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
- [x] **Decorator**: ResilientAPIClient wraps client
- [x] **Repository**: Data access abstraction
- [x] **Iterator**: `PaginationClient` uses AsyncGenerator
- [x] **Strategy**: LRU eviction strategy

---

## Quality Gates

### Per-Task Gates
- [x] 0 TypeScript errors
- [x] 0 ESLint errors
- [x] All tests passing
- [x] Code coverage > 85%

### Component-Level Gates
- [x] All tests passing
- [x] HTTPS validation enforced
- [x] Pagination handles 10K+ events
- [x] Cache hit rate > 70%
- [x] Performance benchmarks met

---

## Next Steps
**Current**: Task 2.x - Completed all items.
**Next**: Component 1 Security (E2E Encryption)

---

**Status**: ✅ COMPLETE
**Estimated Completion**: Done
