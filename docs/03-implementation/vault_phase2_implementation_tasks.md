# Vault Mode Phase 2: Implementation Tasks

**Version**: 3.0 - Security Enhanced  
**Date**: 2026-01-03  
**Duration**: 7.5 weeks  
**Total Tests**: 322  
**Architecture**: SOLID, Event Sourcing (ADR-001), Event-Driven (ADR-002)

---

## Executive Summary

This document provides a comprehensive task breakdown for Vault Mode Phase 2 implementation, including security enhancements and scalability improvements. Gen Mode components are deferred to Phase 3.

### Key Metrics

| Metric | Value |
|--------|-------|
| Duration | 7.5 weeks |
| Total Tests | 322 |
| Components | 7 (enhanced) |
| Security Posture | 9/10 (was 5/10) |
| New Security Features | 8 |
| New Scalability Features | 2 |

---

## Component 1: Authentication & Security Layer

**Duration**: 1.5 weeks (Week 1 + Week 7)  
**Tests**: 80 (36 original + 44 security)

### Core Authentication (Week 1)

#### Task 1.1: Define Auth Interfaces
- Duration: 2 hours
- Create `IAuthManager`, `ITokenStore`, `IAuthStateObserver` interfaces
- Define `OAuthProvider` enum (Google, Apple, Facebook, Twitter)
- Apply Interface Segregation Principle (ISP)

#### Task 1.2: Implement TokenStore with Encryption
- Duration: 4 hours
- Tests: 8 integration tests
- Implement AES-GCM encryption for tokens
- Generate unique IV per encryption
- Add circuit breaker protection
- Handle storage failures gracefully

#### Task 1.3: Implement AuthManager with OAuth
- Duration: 8 hours
- Tests: 15 unit tests
- Implement all 4 OAuth providers (Google, Apple, Facebook, Twitter)
- Add automatic token refresh (15min expiry)
- Emit auth state change events via EventBus
- Add rate limiting (5 attempts per 15 min)
- Handle OAuth redirect flow with chrome.identity

#### Task 1.4: Implement AuthStateObserver
- Duration: 2 hours
- Tests: 5 unit tests
- Listen to `AUTH_STATE_CHANGED` events
- Notify all subscribers on state change
- Return unsubscribe function
- Handle subscriber errors without breaking others

#### Task 1.5: DI Registration
- Duration: 1 hour
- Tests: 3 integration tests
- Register all auth services as singletons
- Verify dependency injection works correctly

### Security Enhancements (Week 7)

#### Task 1.6: Implement E2EEncryptionService 🔴 CRITICAL
- Duration: 2 days
- Tests: 15 integration tests
- **Security Impact**: GDPR compliance
- Use RSA-OAEP (2048-bit) for highlight encryption
- Encrypt data before sending to Supabase
- Add key versioning for rotation support
- Integrate with SupabaseClient
- Performance target: <50ms for 1KB data

#### Task 1.7: Implement KeyManager 🔴 HIGH
- Duration: 3 days
- Tests: 20 unit tests
- **Security Impact**: Data recovery
- Generate RSA-2048 keypairs for users
- Encrypt private key with AES-GCM before storage
- Store in chrome.storage.local (encrypted)
- Cache keys in memory for performance
- Add key rotation support
- Add key backup/recovery flow

#### Task 1.8: Implement AuditLogger 🟡 MEDIUM
- Duration: 1 day
- Tests: 5 unit tests
- **Security Impact**: Compliance and breach detection
- Log all auth events (login, logout, failed login)
- Log data access (read, write, delete)
- Log suspicious activity
- 90-day retention policy
- Brute force detection (5 failed logins = lock)

#### Task 1.9: Implement CSPValidator 🟡 MEDIUM
- Duration: 0.5 day
- Tests: 2 unit tests
- **Security Impact**: XSS protection for OAuth
- Validate CSP for OAuth redirect pages
- Ensure no `unsafe-inline` scripts
- Log CSP violations

---

## Component 2: API Client Layer + Scalability

**Duration**: Week 1 + Week 3  
**Tests**: 33 (12 original + 21 enhancements)

### Core API Client (Week 1)

#### Task 2.1: Define API Client Interface
- Duration: 2 hours
- Define `IAPIClient` with methods for highlights, sync, collections
- Include pagination support in interface

#### Task 2.2: Implement SupabaseClient
- Duration: 6 hours
- Tests: 12 unit tests
- Implement all interface methods
- Add automatic token injection via AuthManager
- Add request/response logging
- Add timeout handling (5s default)
- Handle 401 (token refresh), 429 (rate limit)

#### Task 2.3: Add Retry and Circuit Breaker Decorators
- Duration: 2 hours
- Reuse RetryDecorator from IPC layer (3 retries, exponential backoff)
- Reuse CircuitBreakerDecorator (5 failures threshold, 30s reset)
- Register composition chain in DI container

### Scalability Enhancements (Week 3)

#### Task 2.4: Implement PaginationClient 🔵 NEW
- Duration: 1 day
- Tests: 8 unit tests
- **Scalability Impact**: HIGH - Prevents timeout on large datasets
- Implement cursor-based pagination
- Page size: 100 events per page
- Use AsyncGenerator for streaming
- Add timeout per page (5s)
- Handle large datasets (10K+ events)

#### Task 2.5: Implement CacheManager 🔵 NEW
- Duration: 1 day
- Tests: 10 unit tests
- **Scalability Impact**: MEDIUM - Reduces bandwidth
- LRU eviction (max 100 entries)
- TTL: 5 minutes
- Cache `pullEvents()` and `getHighlights()` responses
- Track cache hit/miss metrics
- Performance target: <1ms get

#### Task 2.6: Implement HTTPSValidator 🟡 NEW
- Duration: 0.5 day
- Tests: 3 unit tests
- **Security Impact**: MEDIUM - MITM prevention
- Validate all API URLs use HTTPS
- Throw SecurityError if HTTP detected
- Add to SupabaseClient constructor

---

## Component 3: Event Sourcing + Input Validation

**Duration**: Week 2  
**Tests**: 57 (52 original + 5 security)

### Core Event Sourcing (Week 2)

#### Task 3.1: Define Event Schemas (Zod)
- Duration: 4 hours
- Tests: 10 validation tests
- Create `SyncEventType` enum (6 event types)
- Create `SyncEvent` schema with Zod
- Define `VectorClock` type
- Add checksum generation (SHA-256)

#### Task 3.2: Implement EventStore (IndexedDB)
- Duration: 8 hours
- Tests: 15 integration tests
- **CRITICAL**: Events must be in chronological order
- Implement append-only event log
- Add indexes: user_timestamp, synced
- Handle concurrent appends safely
- Support large event batches (1000+)
- Add database migration support
- Handle quota exceeded gracefully

#### Task 3.3: Implement EventPublisher
- Duration: 4 hours
- Tests: 8 unit tests
- Batch publish unsynced events
- Mark events as synced after success
- Handle partial failures
- Emit publish status events

#### Task 3.4: Implement EventReplayer
- Duration: 6 hours
- Tests: 12 integration tests
- Replay events in chronological order
- Reconstruct state from events
- Handle event gaps gracefully
- Support replay from specific timestamp
- Memory efficient (streaming)

### Security Enhancement (Week 2)

#### Task 3.5: Implement InputSanitizer 🔴 CRITICAL
- Duration: 0.5 day
- Tests: 5 unit tests
- **Security Impact**: CRITICAL - XSS protection
- Install DOMPurify: `npm install dompurify @types/dompurify`
- Sanitize highlight text before storing
- Strip all HTML tags from text
- Block JavaScript URLs
- Preserve Unicode characters
- Integrate into EventStore.append()

---

## Component 4: Sync Engine + Rate Limiting

**Duration**: Week 3  
**Tests**: 39 (31 original + 8 security)

### Core Sync Engine (Week 3)

#### Task 4.1: Implement NetworkDetector
- Duration: 2 hours
- Tests: 5 unit tests
- Listen to `online`/`offline` events
- Emit network status change events
- Provide `isOnline()` method

#### Task 4.2: Implement SyncBatcher
- Duration: 4 hours
- Tests: 10 unit tests
- Batch events (max 10 or 30s timeout)
- Flush on batch size reached or timer expiry
- Handle concurrent adds safely
- Use `vi.useFakeTimers()` for testing

#### Task 4.3: Implement SyncQueue
- Duration: 4 hours
- Tests: 8 unit tests
- Enqueue events to EventStore
- Add to batcher if online
- Queue if offline
- Process pending when network returns

#### Task 4.4: Implement OfflineQueue
- Duration: 2 hours
- Tests: 5 unit tests
- Track pending event count
- Handle large queues (1000+ events)

### Security Enhancement (Week 3)

#### Task 4.5: Implement RateLimiter 🔴 HIGH
- Duration: 1 day
- Tests: 8 unit tests
- **Security Impact**: HIGH - DoS protection
- Token bucket algorithm
- Rate limits:
  - Sync: 10/minute
  - Auth: 5/15min
  - API: 100/minute
- Per-user buckets
- Track metrics (attempts, blocked)
- Integrate into SyncQueue and AuthManager

---

## Component 5: Conflict Resolution

**Duration**: Week 4  
**Tests**: 54 (unchanged)

#### Task 5.1: Implement VectorClockManager
- Duration: 4 hours
- Tests: 12 unit tests
- Implement increment, compare, merge operations
- Handle concurrent events detection
- Support large device counts (100+)

#### Task 5.2: Implement ConflictDetector
- Duration: 6 hours
- Tests: 15 integration tests
- Detect concurrent events using vector clocks
- Group events by entity ID
- Determine conflict types (metadata, delete, overlapping)
- Handle three-way conflicts

#### Task 5.3: Implement ConflictResolver
- Duration: 6 hours
- Tests: 12 unit tests
- Implement 4 resolution strategies:
  - Last-write-wins
  - Keep-both
  - Merge
  - Manual (user prompt)
- Merge vector clocks after resolution
- Emit resolution events

---

## Component 6: Real-Time Sync (WebSocket)

**Duration**: Week 5  
**Tests**: 25 (unchanged)

#### Task 6.1: Implement WebSocketClient
- Duration: 8 hours
- Tests: 15 integration tests
- Subscribe to user-specific Supabase Realtime channel
- Handle INSERT/UPDATE/DELETE events
- Emit events via EventBus
- Add reconnection logic (exponential backoff)
- Handle large payloads
- Deduplicate events

#### Task 6.2: Implement ConnectionManager
- Duration: 4 hours
- Tests: 8 unit tests
- Exponential backoff (1s, 2s, 4s, 8s, 16s, 30s max)
- Max 5 reconnection attempts
- Reset counter on successful connection
- Handle manual disconnect

**Note**: ConnectionPool deferred to Phase 3 (Gen Mode prep)

---

## Component 7: Migration Service

**Duration**: Week 6  
**Tests**: 34 (unchanged)

#### Task 7.1: Implement LocalToCloudMigrator
- Duration: 8 hours
- Tests: 18 integration tests
- Read all local highlights from IndexedDB
- Upload to Supabase in batches (10 per batch)
- Validate each highlight before upload
- Track progress (emit events)
- Handle partial failures
- Mark migration complete
- Support resumable migration after crash

#### Task 7.2: Implement MigrationValidator
- Duration: 4 hours
- Tests: 10 unit tests
- Verify counts match (local vs remote)
- Spot-check random highlights (10 samples)
- Validate data integrity (checksums)
- Support partial validation

#### Task 7.3: Implement RollbackService
- Duration: 2 hours
- Tests: 5 unit tests
- Delete all remote data
- Reset migration flag
- Log rollback event
- Idempotent rollback

---

## Week-by-Week Implementation Schedule

### Week 1: Foundation + Security Core
**Focus**: Auth + API + E2E Encryption

**Tasks**:
- C1.1-1.5: Authentication Layer (17 hours)
- C1.6: E2EEncryptionService (16 hours)
- C1.7: KeyManager (24 hours)
- C2.1-2.3: API Client (10 hours)
- C2.6: HTTPSValidator (4 hours)

**Deliverable**: Secure signup/login with E2E encrypted highlights

---

### Week 2: Event Sourcing + Input Validation
**Focus**: Event store + XSS protection

**Tasks**:
- C3.1-3.4: Event Sourcing Layer (22 hours)
- C3.5: InputSanitizer (4 hours)

**Deliverable**: Events persisted securely, XSS attacks blocked

---

### Week 3: Sync + Scalability
**Focus**: Offline-first sync + rate limiting + pagination

**Tasks**:
- C4.1-4.4: Sync Engine (12 hours)
- C4.5: RateLimiter (8 hours)
- C2.4: PaginationClient (8 hours)
- C2.5: CacheManager (8 hours)

**Deliverable**: Sync works offline, rate limited, paginated

---

### Week 4: Conflict Resolution
**Focus**: Multi-device conflicts

**Tasks**:
- C5.1-5.3: Conflict Resolution (16 hours)

**Deliverable**: Vector clock conflicts handled

---

### Week 5: Real-Time Sync
**Focus**: WebSocket real-time updates

**Tasks**:
- C6.1-6.2: WebSocket Integration (12 hours)

**Deliverable**: Highlights sync in real-time (<3s latency)

---

### Week 6: Migration
**Focus**: Local→Cloud migration

**Tasks**:
- C7.1-7.3: Migration Service (14 hours)

**Deliverable**: Existing users migrated

---

### Week 7: Security Hardening + Polish
**Focus**: Production-ready security

**Tasks**:
- C1.8: AuditLogger (8 hours)
- C1.9: CSPValidator (4 hours)
- Integration testing (16 hours)
- Security audit (4 hours)

**Deliverable**: Security gaps closed

---

### Week 7.5: Final Testing + Deploy Prep
**Focus**: Production deployment

**Tasks**:
- E2E testing (8 hours)
- Performance optimization (8 hours)
- Documentation (4 hours)

**Deliverable**: Phase 2 complete ✅

---

## Quality Gates

### Per-Week Gates

**Every Week Must Pass**:
- [ ] 0 TypeScript errors (`npm run type-check`)
- [ ] 0 ESLint errors (`npm run lint`)
- [ ] 100% Prettier compliance (`npm run format`)
- [ ] All tests passing (`npm test`)
- [ ] Code coverage >85%

### Final Gate (Week 7.5)

**Functional**:
- [ ] All 322 tests passing
- [ ] E2E tests passing (9 scenarios)
- [ ] Performance benchmarks:
  - Sync latency <3s (p95)
  - API response <500ms (p95)
  - WebSocket latency <100ms (p95)
  - Encryption overhead <50ms (p95)

**Security**:
- [ ] E2E encryption verified (15 tests)
- [ ] XSS protection verified (5 tests)
- [ ] Rate limiting verified (8 tests)
- [ ] Audit logging verified (5 tests)
- [ ] HTTPS enforcement verified (3 tests)
- [ ] No security vulnerabilities (`npm audit`)

**Scalability**:
- [ ] Pagination handles 10K events
- [ ] Cache hit rate >70%
- [ ] Rate limiting prevents DoS
- [ ] Memory usage <100MB

---

## Test Summary

### Total Tests by Component

| Component | Tests | Type Distribution |
|-----------|-------|-------------------|
| C1: Auth & Security | 80 | 60 unit, 20 integration |
| C2: API + Scalability | 33 | 30 unit, 3 integration |
| C3: Events + Validation | 57 | 15 unit, 42 integration |
| C4: Sync + Rate Limit | 39 | 31 unit, 8 integration |
| C5: Conflicts | 54 | 39 unit, 15 integration |
| C6: Realtime | 25 | 8 unit, 15 integration, 2 E2E |
| C7: Migration | 34 | 15 unit, 18 integration, 1 E2E |
| **TOTAL** | **322** | **198 unit, 121 integration, 3 E2E** |

### Test Distribution
- Unit Tests: 61% (198/322)
- Integration Tests: 38% (121/322)
- E2E Tests: 1% (3/322)

---

## Deferred to Phase 3 (Gen Mode)

The following components are **excluded** from Phase 2 and deferred to Phase 3:

### Gen Mode Components
1. **AI Service Layer** - 50 tests, 2 weeks
   - OpenAI/Claude/Gemini provider abstraction
   - Mindmap generation
   - Sentiment analysis
   - Auto-summarization

2. **Feature Flags System** - 15 tests, 0.5 week
   - User-based rollouts
   - Percentage-based rollouts
   - A/B testing support

3. **Quota Management** - 20 tests, 1 week
   - Per-user quotas (daily/monthly)
   - Operation types (sync, mindmap, sentiment)
   - Quota exceeded handling

4. **Resource Pooling** - 5 tests, 1 day
   - WebSocket connection pooling
   - Performance optimization

**Total Deferred**: 90 tests, 3.5 weeks

---

## File Structure

```
src/background/
├── auth/
│   ├── interfaces/
│   │   ├── i-auth-manager.ts
│   │   ├── i-token-store.ts
│   │   ├── i-encryption-service.ts
│   │   ├── i-key-manager.ts
│   │   └── i-audit-logger.ts
│   ├── auth-manager.ts
│   ├── token-store.ts
│   ├── e2e-encryption-service.ts
│   ├── key-manager.ts
│   ├── audit-logger.ts
│   ├── csp-validator.ts
│   ├── auth-state-observer.ts
│   └── auth-errors.ts
├── api/
│   ├── interfaces/
│   │   ├── i-api-client.ts
│   │   ├── i-pagination-client.ts
│   │   └── i-cache-manager.ts
│   ├── supabase-client.ts
│   ├── pagination-client.ts
│   ├── cache-manager.ts
│   ├── https-validator.ts
│   ├── api-error-handler.ts
│   └── api-errors.ts
├── events/
│   ├── interfaces/
│   │   ├── i-event-store.ts
│   │   ├── i-event-publisher.ts
│   │   └── i-input-sanitizer.ts
│   ├── event-store.ts
│   ├── event-publisher.ts
│   ├── event-replayer.ts
│   ├── input-sanitizer.ts
│   ├── event-validator.ts
│   └── event-types.ts
├── sync/
│   ├── interfaces/
│   │   ├── i-sync-queue.ts
│   │   ├── i-network-detector.ts
│   │   └── i-rate-limiter.ts
│   ├── sync-queue.ts
│   ├── sync-batcher.ts
│   ├── rate-limiter.ts
│   ├── offline-queue.ts
│   ├── network-detector.ts
│   └── sync-status.ts
├── conflicts/
│   ├── interfaces/
│   │   ├── i-conflict-detector.ts
│   │   └── i-conflict-resolver.ts
│   ├── vector-clock-manager.ts
│   ├── conflict-detector.ts
│   ├── conflict-resolver.ts
│   └── conflict-types.ts
├── realtime/
│   ├── interfaces/
│   │   └── i-websocket-client.ts
│   ├── websocket-client.ts
│   ├── realtime-subscription.ts
│   └── connection-manager.ts
└── migration/
    ├── interfaces/
    │   └── i-migrator.ts
    ├── local-to-cloud-migrator.ts
    ├── migration-validator.ts
    └── rollback-service.ts
```

---

## Git Commit Strategy

### Commit Format
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `test`: Add/update tests
- `refactor`: Code refactoring
- `docs`: Documentation
- `chore`: Build/tool changes

### Scopes (Component-based)
- `auth`: Authentication layer
- `api`: API client
- `events`: Event sourcing
- `sync`: Sync engine
- `conflicts`: Conflict resolution
- `realtime`: WebSocket
- `migration`: Migration service
- `security`: Security features

### Example Commits
```
feat(auth): implement E2E encryption with RSA-2048

- Add E2EEncryptionService with RSA-OAEP
- Integrate with SupabaseClient
- Add 15 integration tests

Closes #124
```

```
feat(security): add rate limiting with token bucket

- Implement RateLimiter with configurable limits
- Add per-user, per-operation buckets
- Add 8 unit tests

Refs: docs/06-security/threat-model.md#T7
```

---

## Architecture Patterns Reference

### 1. Dependency Injection
All components use DI container for singleton/transient services.

### 2. Event-Driven Communication
All components emit/listen to events via EventBus (ADR-002).

### 3. Strategy Pattern
Conflict resolution uses multiple strategies (last-write-wins, keep-both, merge, manual).

### 4. Repository Pattern
Data access abstracted via `IRepository<T>` interface.

### 5. Decorator Pattern
API client wrapped with Retry → CircuitBreaker decorators.

### 6. Observer Pattern
Auth state changes notify all subscribers.

### 7. Facade Pattern
SupabaseClient simplifies Supabase SDK complexity.

---

## Security Compliance

### GDPR Requirements
- ✅ E2E encryption (data minimization)
- ✅ Audit logging (Article 32)
- ✅ Data portability (export feature - Phase 3)
- ✅ Right to deletion (delete account flow)

### Threat Mitigation
- ✅ T1: XSS (DOMPurify sanitization)
- ✅ T2: CSS Injection (Shadow DOM - existing)
- ✅ T3: Data Exfiltration (E2E encryption)
- ✅ T4: Dependency Vulnerability (npm audit)
- ✅ T7: Resource Exhaustion (rate limiting)

---

## Performance Targets

| Operation | Target | Measurement |
|-----------|--------|-------------|
| Sync latency | <3s | p95 |
| API response | <500ms | p95 |
| WebSocket latency | <100ms | p95 |
| Encryption overhead | <50ms | p95 (1KB data) |
| Decryption overhead | <50ms | p95 (1KB data) |
| Cache hit | <1ms | p95 |
| Key retrieval (cached) | <10ms | p95 |

---

## Success Criteria

Phase 2 is **COMPLETE** when:

1. ✅ All 322 tests passing
2. ✅ 0 TypeScript/ESLint errors
3. ✅ Security audit passed (8 critical gaps closed)
4. ✅ Performance benchmarks met
5. ✅ E2E encryption working
6. ✅ Rate limiting preventing DoS
7. ✅ XSS protection verified
8. ✅ Migration from Phase 1 successful
9. ✅ Documentation complete
10. ✅ Production deployment ready

---

**Document Status**: Ready for Implementation  
**Next Steps**: Begin Week 1 tasks (Auth + Security Core)  
**Timeline**: 7.5 weeks to production-ready Vault Mode Phase 2
