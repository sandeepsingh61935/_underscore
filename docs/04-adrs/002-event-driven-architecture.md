# ADR-002: Event-Driven Architecture with EventBus

**Status**: Accepted  
**Date**: 2025-12-27  
**Decision-makers**: System Architect  
**Consulted**: Development Team  
**Informed**: Full Team

---

## Context

The Web Highlighter Extension requires a robust architecture for component communication that:

1. **Sprint Mode**: Enables loose coupling between selection detection, rendering, storage, and UI updates
2. **Vault Mode** (Future): Provides natural evolution path to Event Sourcing (already decided in ADR-001)
3. **Cross-Context Communication**: Facilitates messaging between content scripts, background worker, and popup
4. **Testing**: Allows components to be tested in isolation with mocked dependencies

**Current Challenge**: Components need to communicate without tight coupling. For example:
- SelectionDetector needs to notify when text is selected
- HighlightRenderer needs to notify when highlight is created
- PopupUI needs to update count when highlights change
- All components need to work independently for testing

**Alternatives Evaluated**:
1. Direct function calls
2. Dependency Injection only
3. Chrome message passing (chrome.runtime.sendMessage)
4. **Event-driven architecture with EventBus** ← Chosen

---

## Decision

We will use **Event-Driven Architecture** with a central **EventBus** for all component communication within the same execution context (content script, popup, background).

**Implementation**:
- Observer pattern with type-safe EventBus class
- TypeScript event type definitions for compile-time safety
- Singleton instance for global coordination
- Chrome message passing for cross-context communication (content ↔ background ↔ popup)

**Event Flow Example**:
```
User double-clicks text
  ↓
SelectionDetector emits 'selection:created'
  ↓
EventBus notifies all listeners
  ↓
├─→ ContentScript orchestrator receives event
│   └─→ Calls HighlightRenderer.create()
│       └─→ Emits 'highlight:created'
│           └─→ HighlightStore listens and stores
├─→ HighlightStore updates count
│   └─→ Emits count update
└─→ Popup listens and updates UI
```

---

## Consequences

### Positive

✅ **Loose Coupling**: Components don't depend on each other directly
- SelectionDetector doesn't need to know about HighlightRenderer
- Easy to add new features (just add event listeners)
- Components can be developed and tested independently

✅ **Scalability**: Natural evolution to Event Sourcing
- Sprint Mode (now): In-memory events
- Vault Mode (future): Events persisted to database
- Event history enables time-travel debugging
- Aligns perfectly with ADR-001 (Event Sourcing for Sync)

✅ **Testability**: Easy to mock and test
```typescript
// Mock EventBus for testing
const mockBus = {
  emit: vi.fn(),
  on: vi.fn(),
};
const detector = new SelectionDetector(mockBus);
// Test in isolation
```

✅ **Extensibility**: Adding features is trivial
- Want to track analytics? Add listener
- Want to sync to cloud? Add listener
- No changes to existing code

✅ **Error Isolation**: Handler errors don't cascade
- One listener failing doesn't break others
- Automatic error logging

✅ **Type Safety**: TypeScript event types
- Autocomplete for event names
- Compile-time validation of event data
- Reduced runtime errors

### Negative

❌ **Complexity**: Slightly more complex than direct calls
- Need to understand event flow
- Debugging requires event logging
- Indirect execution flow

❌ **Maintenance**: Event types must be maintained
- Adding event requires updating type definitions
- Old events need deprecation strategy
- Event catalog can grow large

❌ **Performance**: Small overhead vs. direct calls
- ~1-2ms overhead per event emission
- Not significant for UI interactions
- Negligible for our use case

### Neutral

⚠️ **Learning Curve**: Team needs to understand pattern
- Developers must know when to use events vs. direct calls
- Event naming conventions must be consistent
- Documentation required

⚠️ **Debugging**: Asynchronous event flow
- Need good logging to track event flow
- EventBus logger automatically logs all events
- Chrome DevTools helpful for visualization

---

## Alternatives Considered

### Option 1: Direct Function Calls

**Description**: Components call each other's methods directly

```typescript
const selection = detector.getSelection();
const highlight = renderer.createHighlight(selection);
store.add(highlight);
popup.updateCount(store.count());
```

**Pros**:
- Simple and straightforward
- Easy to debug (stack traces)
- No indirection
- Faster (no event overhead)

**Cons**:
- Tight coupling (hard to change)
- Can't add features without modifying code
- Difficult to test (must mock all dependencies)
- No evolution path to Event Sour cing

**Why not chosen**: Tight coupling makes future Vault Mode difficult. Adding popup communication would require major refactoring.

---

### Option 2: Dependency Injection Only

**Description**: Use DI container without events

```typescript
class ContentScript {
  constructor(
    private detector: SelectionDetector,
    private renderer: HighlightRenderer,
    private store: HighlightStore
  ) {
    detector.onSelection((sel) => {
      const h = renderer.create(sel);
      store.add(h);
    });
  }
}
```

**Pros**:
- Testable (mock dependencies)
- Explicit dependencies
- Type-safe

**Cons**:
- Still coupled (callbacks reference other components)
- Can't add listeners dynamically
- No event history
- Callback hell for complex flows

**Why not chosen**: Still couples components, doesn't align with Event Sourcing future.

---

### Option 3: Chrome Message Passing

**Description**: Use `chrome.runtime.sendMessage` for all communication

**Pros**:
- Built-in to Chrome extensions
- Works across contexts (content/background/popup)
- Reliable

**Cons**:
- **Too heavy** for same-context communication
- Requires JSON serialization
- Asynchronous only (can't await)
- No type safety
- Performance overhead

**Why not chosen**: Overkill for in-context events. We'll use this only for cross-context (content ↔ background ↔ popup), not internal events.

---

## Implementation Notes

### Phase 1: Sprint 0 (Now)
1. ✅ Implement EventBus class
2. ✅ Define event types (TypeScript)
3. ✅ Write EventBus tests
4. ✅ Document this ADR
5. Commit: `feat: add EventBus for event-driven architecture`

### Phase 2: Sprint 1
1. Refactor components to use EventBus
2. SelectionDetector emits events
3. HighlightRenderer listens and emits
4. ContentScript orchestrates via events
5. Update tests to mock EventBus

### Phase 3: Future (Vault Mode)
1. Persist events to database (Event Sourcing)
2. Event replay for restoration
3. Conflict resolution via events
4. Cross-device sync via events

---

## Event Naming Conventions

**Pattern**: `{domain}:{action}`

**Examples**:
- `selection:created` - User created a selection
- `highlight:created` - Highlight was created
- `highlight:removed` - Highlight was removed
- `color:changed` - User changed color
- `error:occurred` - Error happened

**Rules**:
- Use `:`to separate domain and action
- Use past tense for completed actions
- Use present tense for ongoing states
- Keep names short and descriptive

---

## References

- [Observer Pattern - Gang of Four](https://refactoring.guru/design-patterns/observer)
- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)
- Quality Framework: [System Design Patterns](../05-quality-framework/01-system-design-patterns.md)
- [ADR-001: Event Sourcing for Sync](./001-event-sourcing-for-sync.md)

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-12-27 | System Architect | Initial version - Event-driven architecture decision |
