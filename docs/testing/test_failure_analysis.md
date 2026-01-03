# Test Failure Analysis - 2026-01-02

## Overview
Analysis of 57 failed test cases observed in the test suite execution.

- **Total Failures**: 57
- **Primary Error**: `StateTransitionError: Activation failed`
- **Underlying Cause**: `TypeError: Cannot read properties of undefined (reading 'catch')`

## Root Cause Analysis

The failures are systematic and stem from a discrepancy between the implementation code and the test environment mocks for `chrome.runtime.sendMessage`.

### Implementation Code (`src/content/modes/mode-state-manager.ts`)
The `setMode` method in `ModeStateManager` treats `chrome.runtime.sendMessage` as a Promise-returning function (common in WXT/modern extension wrappers), attaching a `.catch()` handler to handle broadcast errors gracefully.

```typescript
// src/content/modes/mode-state-manager.ts:342-347
chrome.runtime.sendMessage({
    type: 'MODE_CHANGED',
    mode: validatedMode,
}).catch((msgError) => {
    this.logger.debug('[ModeState] Failed to broadcast mode change', { error: msgError });
});
```

### Test Mocks (`tests/setup.ts` & Individual Test Files)
The test environment mocks `chrome.runtime.sendMessage` using `vi.fn()` without a return value. By default, `vi.fn()` returns `undefined`.

```typescript
// tests/setup.ts
global.chrome = {
  // ...
  runtime: {
    sendMessage: vi.fn(), // Returns undefined
    // ...
  }
}
```

### The Conflict
1. Code calls `chrome.runtime.sendMessage(...)`.
2. Mock returns `undefined`.
3. Code attempts to call `.catch()` on `undefined`.
4. Runtime throws `TypeError: Cannot read properties of undefined (reading 'catch')`.
5. `ModeStateManager.setMode` wraps this unexpected error in a `StateTransitionError` and aborts the mode switch.
6. Tests asserting that the mode changed fail because the transition was aborted.

## Affected Test Suites
The following test suites failed due to this shared root cause:

1.  **`tests/integration/mode-state-manager-full.test.ts`** (6 failures)
    - All scenarios involving `setMode`.
2.  **`tests/integration/mode-state-validation.test.ts`** (2 failures)
    - Full validation flow.
3.  **`tests/integration/state-error-recovery.test.ts`** (1 failure)
    - Storage Failure Recovery (ironically failed by the broadcast error, not the storage error being tested).
4.  **`tests/unit/modes/mode-state-manager-integration.test.ts`** (9 failures)
    - State machine integration tests.
5.  **`tests/unit/modes/mode-state-manager-validation.test.ts`** (5 failures)
    - Validation flow tests.
6.  **`tests/unit/modes/mode-state-metadata.test.ts`** (5 failures)
    - Metadata persistence tests.
7.  **`tests/unit/state/state-debugging.test.ts`** (5 failures)
    - Debugging tools relying on state transitions.
8.  **`tests/unit/state/state-history.test.ts`** (11 failures)
    - History tracking failing because transitions aborted.
9.  **`tests/unit/state/state-metrics.test.ts`** (9 failures)
    - Metrics tracking failing for the same reason.

## Solution Strategy
To fix these failures, the mocks must be updated to return a Promise, matching the expected interface.

**Required Change:**
Update all instances of `chrome.runtime.sendMessage` mocks in `tests/setup.ts` and individual test files:

```diff
- sendMessage: vi.fn(),
+ sendMessage: vi.fn().mockResolvedValue(undefined),
```

This ensures `chrome.runtime.sendMessage(...).catch(...)` executes validly (resolving successfully), allowing the code to proceed.
