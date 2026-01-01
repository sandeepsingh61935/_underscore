# Task 2.4.3: Circuit Breaker for Storage - Implementation Plan

## Goal
Protect `chrome.storage.sync` operations from cascading failures and provide graceful degradation when storage becomes unavailable.

## Requirements Analysis

### What is a Circuit Breaker?
A resilience pattern that prevents cascading failures by:
1. **CLOSED**: Normal operation, calls pass through
2. **OPEN**: After N failures, stop calling and fail fast
3. **HALF_OPEN**: After timeout, allow test calls to check if service recoveredw

### Why Do We Need It?
- Chrome storage can fail (quota exceeded, sync disabled, offline)
- Repeated failures waste CPU and degrade UX
- Need graceful fallback to in-memory state

### Design Decisions

#### Configuration (Practical)
- `failureThreshold`: 3 (opens after 3 consecutive failures)
- `resetTimeout`: 30000ms (30s before retry)
- `successThreshold`: 1 (close after 1 success in half-open)

#### State Transitions
```
CLOSED --[3 failures]--> OPEN
OPEN --[30s timeout]--> HALF_OPEN
HALF_OPEN --[success]--> CLOSED
HALF_OPEN --[failure]--> OPEN
```

---

## Implementation Steps (TDD Approach)

### Step 1: Create Circuit Breaker Class (Following Testing Strategy v2)

#### File: [src/shared/utils/circuit-breaker.ts](file:///home/sandy/projects/_underscore/src/shared/utils/circuit-breaker.ts)

**Interface Design:**
```typescript
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failureThreshold: number;    // Default: 3
  resetTimeout: number;         // Default: 30000ms
  successThreshold: number;     // Default: 1
  name?: string;                // For logging
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime?: number;
  lastStateChange: number;
  totalCalls: number;
  rejectedCalls: number;
}

export class CircuitBreaker {
  constructor(
    private config: CircuitBreakerConfig,
    private logger: ILogger
  );
  
  async execute<T>(operation: () => Promise<T>): Promise<T>;
  getState(): CircuitState;
  getMetrics():CircuitBreakerMetrics;
  reset(): void; // For testing
}
```

**Key Implementation Details:**
- Track consecutive failures (reset on success)
- Use `Date.now()` for timeout tracking
- Throw [CircuitBreakerOpenError](file:///home/sandy/projects/_underscore/src/shared/utils/circuit-breaker.ts#50-56) when open
- Log all state transitions

---

### Step 2: Write Comprehensive Unit Tests

#### File: [tests/unit/utils/circuit-breaker.test.ts](file:///home/sandy/projects/_underscore/tests/unit/utils/circuit-breaker.test.ts)

**Test Categories (Following Principle #6: Real, Tricky Cases)**

##### Basic Functionality (5 tests)
1. ✅ **Passes through calls when CLOSED**
2. ✅ **Opens after N consecutive failures**
3. ✅ **Rejects calls immediately when OPEN**
4. ✅ **Transitions to HALF_OPEN after timeout**
5. ✅ **Closes on success in HALF_OPEN**

##### Edge Cases (Tricky & Real - Critical!)
6. ✅ **Re-opens on failure in HALF_OPEN**
7. ✅ **Resets failure count on success before threshold**
8. ✅ **Handles async operation throwing errors**
9. ✅ **Handles async operation timing out**
10. ✅ **Concurrent calls during state transition** (race condition)
11. ✅ **Multiple successes needed if configured**
12. ✅ **Metrics tracked correctly across all states**

##### Chrome Extension Reality
13. ✅ **Storage quota exceeded error**
14. ✅ **Network offline (ERR_NETWORK_CHANGED)**
15. ✅ **Rapid successive calls (burst)**

**Why These Tests Matter:**
- Tests 6-9: Prevent state machine bugs
- Tests 10-12: Real concurrency issues
- Tests 13-15: Actual Chrome extension failures

---

### Step 3: Integration with ModeStateManager

#### Changes to [src/content/modes/mode-state-manager.ts](file:///home/sandy/projects/_underscore/src/content/modes/mode-state-manager.ts)

**Inject Circuit Breaker:**
```typescript
constructor(
  private modeManager: IModeManager,
  private logger: ILogger = new Logger('ModeStateManager'),
  private storageCircuitBreaker?: CircuitBreaker
) {
  // Default circuit breaker for storage
  this.storageCircuitBreaker = storageCircuitBreaker ?? new CircuitBreaker(
    { failureThreshold: 3, resetTimeout: 30000, successThreshold: 1 },
    logger
  );
}
```

**Wrap Storage Calls:**
```typescript
private async readFromStorage(): Promise<any> {
  return this.storageCircuitBreaker.execute(async () => {
    return await chrome.storage.sync.get(['defaultMode', 'metadata']);
  });
}

private async writeToStorage(data: any): Promise<void> {
  return this.storageCircuitBreaker.execute(async () => {
    await chrome.storage.sync.set(data);
  });
}
```

**Fallback Strategy:**
- When circuit OPEN: Continue with in-memory state only
- Log warning to user (console.warn)
- Track degraded mode in metrics

---

### Step 4: Integration Tests

#### File: `tests/integration/storage-resilience.test.ts`

**Scenarios (Real Chrome Extension Issues):**

1. ✅ **Quota exceeded loop**
   - Mock `chrome.storage.set` to throw `QuotaExceededError` 3 times
   - Verify circuit opens
   - Verify fallback to in-memory
   - Verify no more storage calls

2. ✅ **Transient failure recovery**
   - Fail 2 times, succeed on 3rd
   - Verify circuit stays CLOSED
   - Verify state persists on recovery

3. ✅ **Full cycle: CLOSED → OPEN → HALF_OPEN → CLOSED**
   - Simulate with fake timers (`vi.useFakeTimers()`)
   - Verify state transitions
   - Verify logging at each step

4. ✅ **Concurrent mode switches during circuit open**
   - Open circuit
   - Call [setMode()](file:///home/sandy/projects/_underscore/src/content/modes/mode-state-manager.ts#216-347) multiple times
   - Verify all succeed with in-memory fallback
   - Verify no storage calls

5. ✅ **Recovery after browser restart simulation**
   - Open circuit
   - Create new [ModeStateManager](file:///home/sandy/projects/_underscore/src/content/modes/mode-state-manager.ts#31-365) instance
   - Verify fresh circuit (CLOSED)

---

## Acceptance Criteria

### Functional Requirements
- [ ] Circuit breaker implements all 3 states correctly
- [ ] Failure threshold configurable
- [ ] Timeout configurable
- [ ] Throws specific error when open ([CircuitBreakerOpenError](file:///home/sandy/projects/_underscore/src/shared/utils/circuit-breaker.ts#50-56))
- [ ] Logs all state transitions

### Quality Gates (Testing Strategy v2 Compliance)
- [ ] **15+ unit tests** (basic + tricky edge cases)
- [ ] **5+ integration tests** (real Chrome extension scenarios)
- [ ] **All tests passing** (`npx vitest run`)
- [ ] **0 TypeScript errors** (`npm run type-check`)
- [ ] **0 ESLint errors** (`npm run lint`)
- [ ] **Metrics tracking** (state changes, failures, successes)

### Integration Requirements
- [ ] Injected into [ModeStateManager](file:///home/sandy/projects/_underscore/src/content/modes/mode-state-manager.ts#31-365)
- [ ] Wraps all `chrome.storage` calls
- [ ] Graceful fallback to in-memory state when open
- [ ] User-facing warning logged when circuit opens

---

## Risk Assessment

### High Risk Areas
1. **Race conditions** during state transitions
   - Mitigation: Synchronization with mutex/lock
   
2. **Time-based tests flakiness**
   - Mitigation: Use `vi.useFakeTimers()`

3. **Circuit never closing** (stuck in OPEN)
   - Mitigation: Explicit timeout tracking + tests

### Testing Coverage
- **Unit tests**: 70%+ coverage on CircuitBreaker class
- **Integration tests**: Full ModeStateManager + CircuitBreaker flow
- **No E2E needed** (integration tests sufficient per testing-strategy-v2)

---

## Implementation Order (TDD)

1. ✅ Write failing unit test #1 (pass through when CLOSED)
2. ✅ Implement minimum CircuitBreaker to pass
3. ✅ Write failing unit test #2 (open after N failures)
4. ✅ Implement failure counting logic
5. ✅ Continue TDD cycle for all 15 unit tests
6. ✅ Write integration test #1 (quota exceeded loop)
7. ✅ Integrate into ModeStateManager
8. ✅ Verify all integration tests pass
9. ✅ Run full regression suite
10. ✅ Document and commit

---

## Commit Strategy

### Commits (Atomic)
1. `feat(utils): add CircuitBreaker utility class`
2. `test(utils): add comprehensive circuit breaker tests`
3. `feat(state): integrate circuit breaker into ModeStateManager`
4. `test(state): add storage resilience integration tests`

---

## Follow-Up Tasks (Out of Scope)

- [ ] Add circuit breaker to other storage operations (if any)
- [ ] Add metrics dashboard for circuit breaker state
- [ ] Add user-facing notification when storage degraded
- [ ] Consider exponential backoff for resetTimeout

---

## References
- Martin Fowler: Circuit Breaker Pattern
- Testing Strategy v2: Principle #6 (Tricky test cases)
- Chrome Extension Storage Limits: https://developer.chrome.com/docs/extensions/reference/api/storage#property-sync

---

# Task 2.4.4: Error Recovery Integration Tests - Implementation Plan

## Goal
Verify that the system gracefully recovers from critical failures (storage, validation, migration) and continues to function in a degraded but usable state, as enforced by the Circuit Breaker and Error Boundaries.

## Requirements Analysis

### Why Do We Need These Tests?
- **Unit tests** verify individual components (CircuitBreaker, Validation Schemas).
- **Integration tests** verify the *interaction* between these components and the [ModeStateManager](file:///home/sandy/projects/_underscore/src/content/modes/mode-state-manager.ts#31-365) under failure conditions.
- We need to prove that:
    1. Storage failures don't crash the app (Circuit Breaker integration).
    2. Corrupt data doesn't crash the app (Validation integration).
    3. Failed migrations don't crash the app (Migration engine integration).

### Test Scenarios (Task 2.4.4 Requirements)

#### 1. Storage Failure Recovery
- **Scenario**: `chrome.storage.sync.set` fails repeatedly (e.g., quota exceeded).
- **Expectation**:
    - Circuit Breaker opens.
    - [setMode()](file:///home/sandy/projects/_underscore/src/content/modes/mode-state-manager.ts#216-347) continues to update **in-memory** state.
    - App remains functional (in-memory mode works).
    - Attempts to read/write storage are skipped while circuit is OPEN.

#### 2. Validation Error Recovery
- **Scenario**: Storage contains invalid data (e.g., `defaultMode: "invalid-mode"`).
- **Expectation**:
    - [init()](file:///home/sandy/projects/_underscore/src/content/modes/mode-state-manager.ts#69-208) detects validation error.
    - App falls back to default "walk" mode.
    - Error is logged but not thrown to user.
    - App enters a valid state.

#### 3. Migration Error Recovery
- **Scenario**: v1 state exists, but migration logic fails (e.g., transformation error).
- **Expectation**:
    - [init()](file:///home/sandy/projects/_underscore/src/content/modes/mode-state-manager.ts#69-208) catches migration error.
    - App falls back to default "walk" mode OR v1 state (safe default).
    - App enters a valid state.

## Implementation Steps

### Step 1: Create Integration Test File
- **File**: [tests/integration/state-error-recovery.test.ts](file:///home/sandy/projects/_underscore/tests/integration/state-error-recovery.test.ts)
- **Setup**:
    - Mock `chrome.storage.sync` with `vi.fn()`.
    - Instantiate [ModeStateManager](file:///home/sandy/projects/_underscore/src/content/modes/mode-state-manager.ts#31-365) with mocked dependencies.
    - Use `EventBus` and [Logger](file:///home/sandy/projects/_underscore/src/shared/utils/logger.ts#32-40) mocks.

### Step 2: Implement Test Scenarios
- **Test 1: Storage Failure (Circuit Breaker)**
    - Simulate 3 failures.
    - Verify Circuit Breaker state is OPEN.
    - Verify [setMode](file:///home/sandy/projects/_underscore/src/content/modes/mode-state-manager.ts#216-347) updates local state but skips storage.
- **Test 2: Validation Failure**
    - Mock storage returning `{ defaultMode: 'flying' }` (invalid).
    - Initialize manager.
    - Verify `currentMode` is 'walk' (fallback).
- **Test 3: Migration Failure**
    - Mock storage returning v1 state.
    - Mock migration engine to throw error.
    - Initialize manager.
    - Verify `currentMode` is 'walk' (fallback).

## Verification Plan
- Run `npx vitest run tests/integration/state-error-recovery.test.ts`
- Verify 100% pass rate.
- Ensure no console errors spill into test output.

---

# Task 2.5.1: Implement State History Tracking - Implementation Plan

## Goal
Implement a history tracking mechanism within [ModeStateManager](file:///home/sandy/projects/_underscore/src/content/modes/mode-state-manager.ts#31-365) to record all state transitions. This will enable debugging, user analytics, and potentially future "undo" functionality for mode switches.

## Requirements Analysis

### Why Do We Need History?
- **Debugging**: When a user reports "my mode keeps switching", we need to know *why* (user action vs. system fallback).
- **Audit Trail**: Track critical state changes for security and compliance.
- **Observability**: Provide visibility into the system's behavior over time.

### Data Structure
We will use the [StateChange](file:///home/sandy/projects/_underscore/src/shared/utils/circuit-breaker.ts#224-246) interface defined in [src/shared/schemas/mode-state-schemas.ts](file:///home/sandy/projects/_underscore/src/shared/schemas/mode-state-schemas.ts):

```typescript
export interface StateChange {
    from: ModeType;
    to: ModeType;
    timestamp: number;
    reason?: string;
}
```

### Constraints
- **Memory Usage**: Cannot store infinite history. Imposed limit: **100 entries**.
- **Eviction Strategy**: LRU (Least Recently Used) - essentially a ring buffer or shifting array.
- **Performance**: Operations must be O(1) or O(N) where N is small (100). Array `shift()` is acceptable for N=100.

## Implementation Steps

### Step 1: Update [ModeStateManager](file:///home/sandy/projects/_underscore/src/content/modes/mode-state-manager.ts#31-365) Class
- **File**: [src/content/modes/mode-state-manager.ts](file:///home/sandy/projects/_underscore/src/content/modes/mode-state-manager.ts)
- **Changes**:
    1. Add `private history: StateChange[] = [];` property.
    2. Add `private readonly MAX_HISTORY_SIZE = 100;` constant.
    3. Update [setMode()](file:///home/sandy/projects/_underscore/src/content/modes/mode-state-manager.ts#216-347) and [init()](file:///home/sandy/projects/_underscore/src/content/modes/mode-state-manager.ts#69-208) to push to `history`.
    4. Implement `getHistory()` and `clearHistory()`.

### Step 2: Implement Logic
- **Recording**:
    ```typescript
    private recordHistory(from: ModeType, to: ModeType, reason?: string) {
        const entry: StateChange = {
            from,
            to,
            timestamp: Date.now(),
            reason
        };
        this.history.push(entry);
        if (this.history.length > this.MAX_HISTORY_SIZE) {
            this.history.shift(); // Remove oldest
        }
    }
    ```

### Step 3: Unit Tests
- **File**: `tests/unit/state/state-history.test.ts`
- **Tests**:
    1. Records state changes correctly.
    2. Includes timestamp and reason.
    3. Respects max size (100) - evicts oldest.
    4. `getHistory()` returns copy (immutability).
    5. `clearHistory()` resets array.

## Verification Plan
- Run `npx vitest run tests/unit/state/state-history.test.ts`
- Verify 100% pass rate.
