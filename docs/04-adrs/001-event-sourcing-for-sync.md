# ADR-001: Event Sourcing for Cross-Device Sync

**Status**: Accepted  
**Date**: 2025-12-27  
**Decision-makers**: System Architect  
**Consulted**: Backend Team  
**Informed**: Full Development Team

---

## Context

The Web Highlighter Extension will support three modes:

1. **Sprint Mode**: Ephemeral, in-memory highlights (no persistence)
2. **Vault Mode**: Persistent storage with cross-device sync
3. **Gen Mode**: AI-powered insights

For Vault Mode, we need a robust synchronization strategy that can:

- Handle offline-first scenarios
- Resolve conflicts across devices
- Maintain data integrity
- Support future migration from Supabase to Oracle Cloud
- Enable time-travel debugging
- Provide audit trails

---

## Decision

We will use **Event Sourcing** as the architectural pattern for Vault Mode's
data synchronization.

**Key Components**:

1. **Events Table**: Immutable log of all highlight operations (create, update,
   delete)
2. **Local Event Store**: IndexedDB for offline-first support
3. **Sync Queue**: Ordered events waiting to be synchronized
4. **Event Replay**: Reconstruct current state from event history
5. **Conflict Resolution**: Last-write-wins with vector clocks

**Schema Example**:

```sql
CREATE TABLE highlight_events (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  entity_id UUID NOT NULL,  -- highlight ID
  event_type VARCHAR(50) NOT NULL,  -- created, updated, deleted
  payload JSONB NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  device_id VARCHAR(100) NOT NULL,
  vector_clock JSONB NOT NULL,
  checksum VARCHAR(64) NOT NULL
);
```

---

## Consequences

### Positive

✅ **Offline-First**: Users can highlight while offline, sync later  
✅ **Conflict Resolution**: Vector clocks enable automatic conflict resolution  
✅ **Audit Trail**: Complete history of all operations  
✅ **Time Travel**: Can reconstruct state at any point in time  
✅ **Database Agnostic**: Easy migration from Supabase → Oracle Cloud  
✅ **Scalability**: Append-only log is highly scalable  
✅ **Debugging**: Full event history for troubleshooting

### Negative

❌ **Complexity**: More complex than simple CRUD operations  
❌ **Storage**: Events accumulate over time (mitigated by
compression/archival)  
❌ **Learning Curve**: Team must understand event sourcing patterns  
❌ **Initial Development Time**: More upfront implementation work

### Neutral

⚠️ **Event Replay Performance**: May need snapshots for large event histories  
⚠️ **Schema Evolution**: Event payloads must be versioned

---

## Alternatives Considered

### Option 1: Traditional CRUD with Timestamps

**Description**: Standard database CRUD operations with `updated_at` timestamps

**Pros**:

- Simple to implement
- Well-understood pattern
- Smaller storage footprint

**Cons**:

- No conflict resolution strategy
- No audit trail
- Difficult to debug sync issues
- No time-travel capability

**Why not chosen**: Insufficient for robust cross-device sync with offline
support

### Option 2: CRDTs (Conflict-Free Replicated Data Types)

**Description**: Use CRDT algorithms for automatic conflict resolution

**Pros**:

- Automatic conflict resolution
- No central authority needed
- Proven for distributed systems

**Cons**:

- Very complex to implement
- Limited CRDT libraries for highlights use case
- Difficult to debug
- Overkill for current requirements

**Why not chosen**: Too complex for MVP, event sourcing provides sufficient
benefits

### Option 3: Operational Transformation (OT)

**Description**: Real-time collaborative editing approach (like Google Docs)

**Pros**:

- Real-time collaboration
- Well-established for text editing

**Cons**:

- Requires persistent connection
- Very complex algorithm
- Not suitable for offline-first
- Highlights aren't collaborative documents

**Why not chosen**: Doesn't match offline-first requirements

---

## Implementation Notes

### Phase 1: Sprint 0-2 (Sprint Mode)

- No implementation needed
- In-memory only, no persistence

### Phase 2: Sprint 3-5 (Vault Mode Prep)

- Design event schema
- Set up Supabase project
- Create migration scripts
- Implement local IndexedDB event store

###Phase 3: Sprint 6+ (Vault Mode Implementation)

- Implement event sourcing logic
- Build sync queue
- Add conflict resolution
- Test offline scenarios

### Migration Strategy (Supabase → Oracle Cloud)

1. Export events from Supabase (already in event format)
2. Import events to Oracle Cloud
3. No data transformation needed (database-agnostic)
4. Update connection strings only

---

## References

- [Event Sourcing Pattern - Martin Fowler](https://martinfowler.com/eaaDev/EventSourcing.html)
- [Vector Clock Conflict Resolution](https://en.wikipedia.org/wiki/Vector_clock)
- [Supabase Architecture](https://supabase.com/docs/guides/database)
- ADR-002: Supabase for Development, Oracle for Production

---

## Revision History

| Date       | Author           | Changes         |
| ---------- | ---------------- | --------------- |
| 2025-12-27 | System Architect | Initial version |
