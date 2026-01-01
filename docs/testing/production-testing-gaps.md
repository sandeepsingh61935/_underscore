# Production Testing Gaps - IPC Layer

**Status**: Deferred to E2E/Production Phase  
**Created**: 2026-01-01  
**Context**: Phase 3 (IPC Layer) unit testing completed with 148 tests. The following gaps are out-of-scope for unit testing but critical for production readiness.

---

## 1. Memory Leak Testing

### Current Gap
Unit tests mock `chrome.runtime` and don't simulate real Chrome extension lifecycle, making memory leak detection impossible.

### Why This Matters
- **IPC layer creates/destroys:** Message listeners, Promise chains, retry timers
- **Risk**: Memory accumulation over hours/days in long-running MV3 service worker
- **Impact**: Extension becomes slow, browser tab crashes, poor UX

### Proposed Solution

**Approach A: E2E Memory Profiling**
```
Tools: Puppeteer + Chrome DevTools Protocol
Duration: 1-hour stress test
Metrics:
- Heap size over time
- Detached DOM listeners  
- Promise leak detection
- Event listener accumulation
```

**Test Scenario:**
```javascript
// Run for 1 hour
for (let i = 0; i < 10000; i++) {
    await messageBus.send('background', {...});
    messageBus.subscribe('EVENT', handler);
    unsubscribe();
    
    // Check heap every 100 iterations
    if (i % 100 === 0) {
        const heapSize = await takeHeapSnapshot();
        assertHeapNotGrowing(heapSize);
    }
}
```

**Acceptance Criteria:**
- ✅ Heap size stable after 10,000 operations
- ✅ No detached listeners
- ✅ Memory growth < 5MB over 1 hour

**Effort**: ~2 days (setup + testing + automation)

---

## 2. Real Chrome Extension E2E Testing

### Current Gap
All tests mock `chrome.runtime` API. Real Chrome behaviors not tested:
- ❌ MV3 service worker suspend/resume lifecycle
- ❌ Actual message channel behavior
- ❌ Context invalidation scenarios
- ❌ Cross-origin messaging constraints

### Why This Matters
**Known MV3 Gotchas:**
- Service workers can suspend mid-request
- `chrome.runtime.onMessage` listeners must be synchronous
- Message channels close unexpectedly
- Port-based messaging has different semantics

### Proposed Solution

**Approach B: Puppeteer + Manifest V3 Extension Testing**

**Setup:**
```javascript
// Load actual extension in headless Chrome
const browser = await puppeteer.launch({
    headless: true,
    args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
    ],
});

// Test real scenarios
await testBackgroundScriptSuspendRecover();
await testContentToBackgroundMessaging();
await testCircuitBreakerInRealExtension();
```

**Test Scenarios:**
1. **MV3 Lifecycle Testing**
   - Force service worker suspend (30s idle)
   - Send message during suspend
   - Verify wake-up + retry behavior

2. **Real Timeout Testing**
   - Dead tab scenario (closed mid-request)
   - Network offline scenario
   - Verify 5s timeout + circuit breaker

3. **Concurrent Load Testing**
   - 100 concurrent messages from content → background
   - Verify circuit breaker prevents cascade
   - Check for race conditions

**Tools:**
- Puppeteer (Chrome automation)
- `chrome.debugger` API (MV3 lifecycle control)
- `chrome.browsingData` (reset between tests)

**Acceptance Criteria:**
- ✅ All unit test scenarios pass in real extension
- ✅ MV3 service worker suspend/resume works correctly
- ✅ Circuit breaker prevents actual Chrome tab crashes
- ✅ Timeout mechanism works with real `chrome.runtime` delays

**Effort**: ~3-5 days (setup infrastructure + write tests + CI integration)

---

## 3. Error Code Refactoring (Technical Debt)

### Current Gap
Error detection relies on string pattern matching:

```typescript
// BRITTLE:
/Message send timeout after/i  // What if we change the message?
/Circuit.*open/i                // Pattern could false-match

// FRAGILE:
if (error.name === 'CircuitBreakerOpenError') // Must match exactly
```

### Why This Matters
**Risks:**
- Changing error message breaks retry logic
- Internationalization impossible (error messages might be translated)
- Debugging harder (no structured error codes)
- False positives/negatives on pattern matching

### Proposed Solution

**Approach C: Error Code Enum System**

**Implementation:**
```typescript
// 1. Define error codes
export enum MessageErrorCode {
    TIMEOUT = 'MSG_TIMEOUT',
    CIRCUIT_OPEN = 'MSG_CIRCUIT_OPEN',
    VALIDATION_ERROR = 'MSG_VALIDATION',
    NETWORK_ERROR = 'MSG_NETWORK',
    CONTEXT_INVALIDATED = 'MSG_CONTEXT_INVALID',
}

// 2. Custom error classes
export class MessageBusError extends Error {
    constructor(
        public readonly code: MessageErrorCode,
        message: string,
        public readonly context?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'MessageBusError';
    }
}

// 3. Update retry logic
private isNonRetryableError(error: Error): boolean {
    if (error instanceof MessageBusError) {
        const nonRetryableCodes = [
            MessageErrorCode.TIMEOUT,
            MessageErrorCode.CIRCUIT_OPEN,
            MessageErrorCode.VALIDATION_ERROR,
        ];
        return nonRetryableCodes.includes(error.code);
    }
    
    // Fallback to pattern matching for non-MessageBusError
    return this.matchesNonRetryablePattern(error.message);
}

// 4. Throw with codes
throw new MessageBusError(
    MessageErrorCode.TIMEOUT,
    `Message send timeout after ${this.timeoutMs}ms`,
    { messageType, target }
);
```

**Benefits:**
- ✅ No string matching brittleness
- ✅ Type-safe error handling
- ✅ Structured logging (error codes in metrics)
- ✅ I18n-ready (code + localized message)
- ✅ Better error analytics

**Migration Strategy:**
1. Create error classes (non-breaking)
2. Update throwers to use new errors
3. Update catchers to check codes first, patterns as fallback
4. Deprecate pattern matching after full migration

**Effort**: ~2 days (refactor + update tests)

---

## 4. Load & Stress Testing

### Current Gap
Integration tests use small loads (10-100 messages). Real production scenarios not tested:

**Missing Scenarios:**
- 1000s of concurrent messages (content scripts heavy usage)
- Sustained load over hours (background script lifetime)
- Burst traffic (user opens 50 tabs at once)
- Circuit breaker under extreme load

### Proposed Solution

**Approach D: K6 or Artillery Load Testing**

```javascript
// K6 load test
import { check } from 'k6';

export const options = {
    stages: [
        { duration: '2m', target: 100 },  // Ramp up
        { duration: '5m', target: 1000 }, // Sustained load
        { duration: '2m', target: 0 },    // Cool down
    ],
};

export default function() {
    const response = chrome.runtime.sendMessage({
        type: 'HIGH_LOAD_TEST',
        payload: { data: 'x'.repeat(1024) }, // 1KB payload
        timestamp: Date.now(),
    });
    
    check(response, {
        'response time < 500ms': (r) => r.latency < 500,
        'no circuit breaker errors': (r) => !r.error,
    });
}
```

**Metrics to Track:**
- P95, P99 latency under load
- Circuit breaker open/close frequency
- Retry success rate
- Memory consumption during burst

**Acceptance Criteria:**
- ✅ P95 latency < 500ms at 1000 req/s
- ✅ Circuit breaker stabilizes system (no cascading failures)
- ✅ No memory leaks over 1-hour test
- ✅ Retry success rate > 95% for transient failures

**Effort**: ~2-3 days (setup + run + analyze)

---

## Summary & Prioritization

| Gap | Impact | Effort | Priority | Phase |
|-----|--------|--------|----------|-------|
| **Memory Leak Testing** | HIGH (production stability) | 2 days | P0 | E2E Phase |
| **Real Chrome E2E** | CRITICAL (validation) | 3-5 days | P0 | E2E Phase |
| **Load Testing** | MEDIUM (performance) | 2-3 days | P1 | Pre-launch |
| **Error Code Refactor** | LOW (tech debt) | 2 days | P2 | Maintenance |

**Total Estimated Effort**: 9-12 days

**Recommended Sequence:**
1. Real Chrome E2E (validates everything works)
2. Memory Leak Testing (production stability)
3. Load Testing (performance baseline)
4. Error Code Refactor (tech debt cleanup)

---

## References

- [Phase 3 IPC Plan](file:///home/sandy/.gemini/antigravity/brain/d89a3bdb-5889-4ee7-9f45-72dfdbe86a13/phase-3-ipc-plan.md)
- [Puppeteer MV3 Testing Guide](https://pptr.dev/guides/chrome-extensions)
- [Chrome Extension E2E Testing](https://developer.chrome.com/docs/extensions/mv3/tut_debugging/)
- [K6 Load Testing](https://k6.io/docs/)
