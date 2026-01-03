# Component 3: Event Sourcing + Input Validation - Implementation Tasks

**Phase**: Vault Mode Phase 2  
**Component**: 3 of 7  
**Duration**: 1 week (Week 2)  
**Total Tests**: 57 tests (52 core + 5 security)

---

## Task Breakdown

### Week 2: Event Sourcing + Input Validation (40 hours)

#### Task 3.1: Define Event Sourcing Interfaces ⏱️ 3h

- [ ] Create [i-event-store.ts](file:///home/sandy/projects/_underscore/src/background/events/interfaces/i-event-store.ts)
  - [ ] Define `IEventStore` interface with 6 methods
  - [ ] Define `SyncEvent` interface (id, type, payload, timestamp, deviceId, vectorClock)
  - [ ] Define `SyncEventType` enum (HIGHLIGHT_CREATED, HIGHLIGHT_UPDATED, HIGHLIGHT_DELETED, COLLECTION_CREATED, COLLECTION_UPDATED, COLLECTION_DELETED)
  - [ ] Define `EventFilter` interface (since, until, eventType, entityId)
  - [ ] Apply Interface Segregation Principle
  - [ ] Add comprehensive JSDoc documentation

- [ ] Create [i-event-publisher.ts](file:///home/sandy/projects/_underscore/src/background/events/interfaces/i-event-publisher.ts)
  - [ ] Define `IEventPublisher` interface
  - [ ] Methods: `publish()`, `subscribe()`, `unsubscribe()`
  - [ ] Define `EventHandler<T>` type
  - [ ] Document event flow patterns

- [ ] Create [i-input-sanitizer.ts](file:///home/sandy/projects/_underscore/src/background/events/interfaces/i-input-sanitizer.ts) 🔴 NEW
  - [ ] Define `IInputSanitizer` interface
  - [ ] Methods: `sanitizeText()`, `sanitizeHTML()`, `sanitizeURL()`
  - [ ] Document XSS protection strategy

- [ ] Create [event-types.ts](file:///home/sandy/projects/_underscore/src/background/events/event-types.ts)
  - [ ] Define all event payload types
  - [ ] `HighlightCreatedPayload`, `HighlightUpdatedPayload`, `HighlightDeletedPayload`
  - [ ] `CollectionCreatedPayload`, `CollectionUpdatedPayload`, `CollectionDeletedPayload`
  - [ ] Use readonly properties for immutability

**Architecture Compliance**:
- ✅ **SRP**: Each interface has single responsibility
- ✅ **ISP**: Segregated interfaces (Store, Publisher, Sanitizer)
- ✅ **DIP**: Depend on abstractions, not concretions

---

#### Task 3.2: Implement EventStore with IndexedDB ⏱️ 12h

- [ ] Create [event-store.ts](file:///home/sandy/projects/_underscore/src/background/events/event-store.ts)
  - [ ] Implement `EventStore` class with `IEventStore` interface
  - [ ] Use IndexedDB for persistence (database: `vault_events`)
  - [ ] Object store: `events` with indexes on `timestamp`, `eventType`, `entityId`
  - [ ] Implement append-only log pattern (no updates/deletes)
  - [ ] Add checksum validation for event integrity
  - [ ] Handle storage quota exceeded gracefully

- [ ] Implement core methods
  - [ ] `append(event: SyncEvent): Promise<void>`
    - Validate event structure
    - Generate checksum (SHA-256 of payload)
    - Store in IndexedDB
    - Emit `EVENT_APPENDED` via EventBus
  - [ ] `getEvents(filter: EventFilter): Promise<SyncEvent[]>`
    - Query with timestamp range
    - Filter by event type
    - Filter by entity ID
    - **CRITICAL**: Return in chronological order (oldest → newest)
  - [ ] `getEventsSince(timestamp: number): Promise<SyncEvent[]>`
    - Optimized query for sync operations
    - Use timestamp index
  - [ ] `getLatestEvent(entityId: string): Promise<SyncEvent | null>`
    - Get most recent event for entity
  - [ ] `count(): Promise<number>`
    - Return total event count
  - [ ] `clear(): Promise<void>`
    - Remove all events (for testing/reset)

- [ ] Add event validation
  - [ ] Validate required fields (id, type, payload, timestamp, deviceId)
  - [ ] Validate timestamp is not in future
  - [ ] Validate vector clock format
  - [ ] Throw `ValidationError` for invalid events

- [ ] Add checksum verification
  - [ ] Generate SHA-256 checksum on append
  - [ ] Verify checksum on retrieval
  - [ ] Detect corrupted events
  - [ ] Log corruption warnings

**Tests** (20 Integration Tests):

1. **Basic Operations** (5 tests)
   - [ ] Append event succeeds
   - [ ] Get events returns chronological order (CRITICAL)
   - [ ] Get events since timestamp works
   - [ ] Get latest event for entity works
   - [ ] Count returns correct number

2. **Filtering** (4 tests)
   - [ ] Filter by event type works
   - [ ] Filter by entity ID works
   - [ ] Filter by timestamp range works
   - [ ] Empty filter returns all events

3. **Validation** (4 tests)
   - [ ] Missing required field throws ValidationError
   - [ ] Future timestamp throws ValidationError
   - [ ] Invalid vector clock throws ValidationError
   - [ ] Valid event passes validation

4. **Checksum** (3 tests)
   - [ ] Checksum generated on append
   - [ ] Checksum verified on retrieval
   - [ ] Corrupted event detected

5. **Edge Cases** (4 tests)
   - [ ] Large event (>1MB) handled
   - [ ] 1000+ events query performance acceptable (<100ms)
   - [ ] Storage quota exceeded handled gracefully
   - [ ] Concurrent appends don't corrupt data

**Reference**: [ADR-001: Event Sourcing](file:///home/sandy/projects/_underscore/docs/04-adrs/001-event-sourcing-for-sync.md)

---

#### Task 3.3: Implement EventPublisher with EventBus ⏱️ 6h

- [ ] Create [event-publisher.ts](file:///home/sandy/projects/_underscore/src/background/events/event-publisher.ts)
  - [ ] Implement `EventPublisher` class
  - [ ] Use EventBus for pub/sub
  - [ ] Support multiple subscribers per event type
  - [ ] Return unsubscribe function

- [ ] Implement methods
  - [ ] `publish<T>(eventType: string, payload: T): Promise<void>`
    - Emit event via EventBus
    - Log event publication (DEBUG level)
    - Handle subscriber errors without breaking others
  - [ ] `subscribe<T>(eventType: string, handler: EventHandler<T>): () => void`
    - Register handler with EventBus
    - Return unsubscribe function
    - Validate handler is function
  - [ ] `unsubscribe(eventType: string, handler: EventHandler<any>): void`
    - Remove handler from EventBus
    - Log unsubscription

- [ ] Add error handling
  - [ ] Wrap subscriber calls in try-catch
  - [ ] Log subscriber errors (ERROR level)
  - [ ] Continue to next subscriber on error
  - [ ] Emit `SUBSCRIBER_ERROR` event

**Tests** (12 Unit Tests):

1. **Basic Functionality** (4 tests)
   - [ ] Publish event calls all subscribers
   - [ ] Subscribe registers handler
   - [ ] Unsubscribe removes handler
   - [ ] Unsubscribe function works

2. **Multiple Subscribers** (3 tests)
   - [ ] Multiple subscribers receive same event
   - [ ] Subscribers called in registration order
   - [ ] Removing one subscriber doesn't affect others

3. **Error Handling** (3 tests)
   - [ ] Subscriber error doesn't break other subscribers
   - [ ] Subscriber error logged
   - [ ] SUBSCRIBER_ERROR event emitted

4. **Edge Cases** (2 tests)
   - [ ] Unsubscribe non-existent handler doesn't throw
   - [ ] Publish with no subscribers doesn't throw

**Design Pattern**: Observer Pattern (Event-Driven Architecture per ADR-002)

---

#### Task 3.4: Implement EventReplayer for State Reconstruction ⏱️ 8h

- [ ] Create [event-replayer.ts](file:///home/sandy/projects/_underscore/src/background/events/event-replayer.ts)
  - [ ] Implement `EventReplayer` class
  - [ ] Reconstruct current state from event log
  - [ ] Support incremental replay (from checkpoint)
  - [ ] Handle event ordering correctly

- [ ] Implement core logic
  - [ ] `replay(events: SyncEvent[]): Promise<HighlightDataV2[]>`
    - Start with empty state
    - Apply events in chronological order
    - Handle CREATED, UPDATED, DELETED events
    - Return final state
  - [ ] `replayFrom(checkpoint: number): Promise<HighlightDataV2[]>`
    - Load events since checkpoint
    - Apply to existing state
    - Optimize for incremental sync
  - [ ] `applyEvent(state: Map<string, HighlightDataV2>, event: SyncEvent): void`
    - CREATED: Add to state
    - UPDATED: Merge changes
    - DELETED: Remove from state (soft delete)

- [ ] Add conflict detection
  - [ ] Detect concurrent updates (same entity, different devices)
  - [ ] Use vector clocks for ordering
  - [ ] Emit `CONFLICT_DETECTED` event
  - [ ] Defer resolution to ConflictResolver (Component 5)

- [ ] Add validation
  - [ ] Validate events are in chronological order
  - [ ] Validate no duplicate event IDs
  - [ ] Validate entity exists for UPDATE/DELETE
  - [ ] Log validation warnings

**Tests** (15 Integration Tests):

1. **Basic Replay** (4 tests)
   - [ ] Empty event log returns empty state
   - [ ] Single CREATE event reconstructs highlight
   - [ ] CREATE → UPDATE sequence works
   - [ ] CREATE → DELETE sequence removes highlight

2. **Complex Sequences** (4 tests)
   - [ ] Multiple CREATEs for different entities
   - [ ] CREATE → UPDATE → UPDATE chain
   - [ ] CREATE → DELETE → CREATE (same ID) works
   - [ ] Interleaved events for multiple entities

3. **Incremental Replay** (3 tests)
   - [ ] Replay from checkpoint applies only new events
   - [ ] Checkpoint optimization reduces processing
   - [ ] Replay from middle of log works

4. **Conflict Detection** (2 tests)
   - [ ] Concurrent updates detected (different vector clocks)
   - [ ] CONFLICT_DETECTED event emitted

5. **Edge Cases** (2 tests)
   - [ ] Out-of-order events handled (sort by timestamp)
   - [ ] Malformed event skipped with warning

**Reference**: Event Sourcing Pattern - State Reconstruction

---

#### Task 3.5: Implement InputSanitizer with DOMPurify 🔴 NEW ⏱️ 4h

**Complexity**: Medium  
**Duration**: 0.5 day  
**Test Count**: 5 unit tests  
**Security Impact**: **CRITICAL** - XSS protection

- [ ] Install dependencies
  - [ ] `npm install dompurify @types/dompurify`
  - [ ] Verify DOMPurify version ^3.x

- [ ] Create [input-sanitizer.ts](file:///home/sandy/projects/_underscore/src/background/events/input-sanitizer.ts)
  - [ ] Implement `InputSanitizer` class with `IInputSanitizer` interface
  - [ ] Use DOMPurify for sanitization
  - [ ] Configure allowed tags/attributes
  - [ ] Log sanitization events

- [ ] Implement sanitization methods
  - [ ] `sanitizeText(text: string): string`
    ```typescript
    sanitizeText(text: string): string {
      return DOMPurify.sanitize(text, {
        ALLOWED_TAGS: [], // Strip all tags
        KEEP_CONTENT: true, // Keep text content
      });
    }
    ```
  - [ ] `sanitizeHTML(html: string): string`
    ```typescript
    sanitizeHTML(html: string): string {
      return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'mark'],
        ALLOWED_ATTR: [], // No attributes allowed
      });
    }
    ```
  - [ ] `sanitizeURL(url: string): string | null`
    ```typescript
    sanitizeURL(url: string): string | null {
      try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          this.logger.warn('Blocked non-HTTP(S) URL', { url });
          return null;
        }
        return parsed.href;
      } catch {
        this.logger.warn('Invalid URL format', { url });
        return null;
      }
    }
    ```

- [ ] Integrate with EventStore
  - [ ] Sanitize highlight text before appending event
  - [ ] Sanitize collection names
  - [ ] Sanitize all user-generated content
  - [ ] Add sanitization logging (DEBUG level)

**Tests** (5 Unit Tests):

1. **XSS Protection** (2 tests)
   - [ ] `<script>alert('xss')</script>` → empty string
   - [ ] `javascript:alert(1)` URL → null

2. **Safe Content Preservation** (2 tests)
   - [ ] `<strong>bold</strong>` → `<strong>bold</strong>` (HTML mode)
   - [ ] Unicode text preserved: `日本語 emoji 👍` → exact match

3. **Edge Cases** (1 test)
   - [ ] Empty string handled gracefully

**Reference**: 
- [Security Architecture](file:///home/sandy/projects/_underscore/docs/06-security/security-architecture.md) (DOMPurify requirement)
- [Threat Model T1](file:///home/sandy/projects/_underscore/docs/06-security/threat-model.md) (XSS mitigation)

---

#### Task 3.6: Implement EventValidator 🟡 NEW ⏱️ 3h

- [ ] Create [event-validator.ts](file:///home/sandy/projects/_underscore/src/background/events/event-validator.ts)
  - [ ] Implement `EventValidator` class
  - [ ] Validate event structure
  - [ ] Validate payload schemas
  - [ ] Use Zod for schema validation

- [ ] Implement validation rules
  - [ ] Event ID is valid UUID
  - [ ] Event type is valid enum value
  - [ ] Timestamp is valid (not future, not too old)
  - [ ] Device ID is non-empty string
  - [ ] Vector clock is valid format
  - [ ] Payload matches event type schema

- [ ] Add schema validation
  - [ ] Define Zod schemas for each event type
  - [ ] Validate HIGHLIGHT_CREATED payload
  - [ ] Validate HIGHLIGHT_UPDATED payload
  - [ ] Validate HIGHLIGHT_DELETED payload
  - [ ] Validate COLLECTION_* payloads

**Tests** (5 Unit Tests):

1. **Valid Events** (1 test)
   - [ ] Valid event passes all checks

2. **Invalid Structure** (2 tests)
   - [ ] Missing required field throws ValidationError
   - [ ] Invalid event type throws ValidationError

3. **Invalid Payload** (2 tests)
   - [ ] Payload doesn't match schema throws ValidationError
   - [ ] Invalid timestamp throws ValidationError

---

#### Task 3.7: DI Registration ⏱️ 2h

- [ ] Register in `/src/background/di/container-registration.ts`
  - [ ] `EventStore` as singleton
  - [ ] `EventPublisher` as singleton
  - [ ] `EventReplayer` as singleton
  - [ ] `InputSanitizer` as singleton
  - [ ] `EventValidator` as singleton

- [ ] Verify dependencies
  - [ ] `ILogger` resolved
  - [ ] `IEventBus` resolved
  - [ ] Config from environment variables

- [ ] Add to bootstrap function
  - [ ] Initialize EventStore on startup
  - [ ] Create IndexedDB database
  - [ ] Verify schema version

**Tests**: Integration tests verify DI resolution (2 tests)

---

#### Task 3.8: Integration Testing ⏱️ 2h

- [ ] Create end-to-end event flow test
  - [ ] Append event → EventStore
  - [ ] Publish event → EventPublisher
  - [ ] Replay events → EventReplayer
  - [ ] Verify state reconstruction

- [ ] Test with InputSanitizer
  - [ ] Malicious input sanitized before storage
  - [ ] XSS attempts blocked
  - [ ] Safe content preserved

**Tests** (3 Integration Tests):

1. **Full Event Flow** (1 test)
   - [ ] Create highlight → Event appended → Published → Replayed

2. **Sanitization Integration** (1 test)
   - [ ] XSS in highlight text sanitized before storage

3. **DI Container** (1 test)
   - [ ] All services resolve correctly

---

## Architecture Compliance

### SOLID Principles

- [x] **S**: Single Responsibility
  - EventStore: Persistence only
  - EventPublisher: Pub/sub only
  - EventReplayer: State reconstruction only
  - InputSanitizer: Sanitization only

- [x] **O**: Open/Closed
  - New event types added without modifying EventStore
  - New sanitization rules added without breaking existing

- [x] **L**: Liskov Substitution
  - Any `IEventStore` implementation interchangeable
  - Any `IInputSanitizer` implementation interchangeable

- [x] **I**: Interface Segregation
  - Separate interfaces for Store, Publisher, Replayer, Sanitizer

- [x] **D**: Dependency Inversion
  - All services depend on interfaces, not concrete classes

### Design Patterns

- [x] **Repository Pattern**: EventStore abstracts IndexedDB
- [x] **Observer Pattern**: EventPublisher for event-driven architecture
- [x] **Command Pattern**: Events as immutable commands
- [x] **Strategy Pattern**: InputSanitizer with configurable rules
- [x] **Facade Pattern**: EventReplayer simplifies state reconstruction

### Event Sourcing (ADR-001)

- [x] **Append-Only Log**: Events never updated/deleted
- [x] **Immutable Events**: Readonly properties
- [x] **Chronological Order**: Events sorted by timestamp
- [x] **State Reconstruction**: Replay events to rebuild state
- [x] **Audit Trail**: Complete history of all operations
- [x] **Checksum Validation**: Detect corrupted events

---

## Quality Gates

### Per-Task Gates

- [ ] 0 TypeScript errors
- [ ] 0 ESLint errors
- [ ] 100% Prettier compliance
- [ ] All tests passing
- [ ] Code coverage >85%

### Component-Level Gates

- [ ] All 57 tests passing (52 core + 5 security)
- [ ] XSS protection verified (5 tests)
- [ ] Event ordering verified (chronological)
- [ ] Checksum validation verified
- [ ] Performance benchmarks met:
  - [ ] Event append <10ms (p95)
  - [ ] Event query (1000 events) <100ms (p95)
  - [ ] State replay (1000 events) <500ms (p95)

---

## Risk Assessment

### Critical Risks 🔴

1. **Event Ordering Corruption**: Wrong order = corrupted state
   - **Mitigation**: Strict timestamp sorting, validation tests
   
2. **XSS Injection**: Malicious scripts in highlight text
   - **Mitigation**: DOMPurify sanitization, comprehensive XSS tests

3. **Data Corruption**: Checksum mismatch = data loss
   - **Mitigation**: SHA-256 checksums, corruption detection

### High Risks 🟡

1. **Storage Quota Exceeded**: User runs out of space
   - **Mitigation**: Graceful degradation, user notification

2. **Concurrent Appends**: Race conditions in IndexedDB
   - **Mitigation**: Transaction isolation, concurrency tests

---

## Testing Strategy

### Test Distribution

- **Unit Tests**: 22 (39%)
  - EventPublisher: 12
  - InputSanitizer: 5
  - EventValidator: 5

- **Integration Tests**: 35 (61%)
  - EventStore: 20
  - EventReplayer: 15

### Critical Test Cases (Per Testing Strategy v2)

**Risk-Based Testing**:
- ✅ Event ordering (CRITICAL - 5 tests)
- ✅ XSS protection (CRITICAL - 5 tests)
- ✅ State reconstruction (HIGH - 15 tests)
- ✅ Checksum validation (HIGH - 3 tests)

**Realistic Scenarios**:
- ✅ 1000+ events query performance
- ✅ Concurrent appends
- ✅ Storage quota exceeded
- ✅ Corrupted event detection
- ✅ Malicious input sanitization

**Minimal Mocking**:
- ✅ Use real IndexedDB (fake-indexeddb)
- ✅ Use real DOMPurify
- ✅ Use real Logger (silent mode)
- ❌ No mocking of own code

---

## Next Steps After Completion

1. ✅ Component 3 complete
2. → Begin Component 4: Sync Engine + Rate Limiting

---

## References

- [ADR-001: Event Sourcing for Sync](file:///home/sandy/projects/_underscore/docs/04-adrs/001-event-sourcing-for-sync.md)
- [System Design Patterns](file:///home/sandy/projects/_underscore/docs/05-quality-framework/01-system-design-patterns.md)
- [Coding Standards](file:///home/sandy/projects/_underscore/docs/05-quality-framework/02-coding-standards.md)
- [Testing Strategy v2](file:///home/sandy/projects/_underscore/docs/testing/testing-strategy-v2.md)
- [Component Breakdown v3](file:///home/sandy/projects/_underscore/docs/03-implementation/vault_phase2_component_breakdown_v3.md)

---

**Status**: Ready for Implementation  
**Estimated Completion**: End of Week 2
