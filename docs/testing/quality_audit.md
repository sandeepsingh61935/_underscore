# Quality Audit - 2026-01-03

**Total Errors**: 213 (across 32 files)

## 1. High-Impact Issues (Blocking)

### 1.1 `ILogger` Interface Mismatch

**Error**:
`Type '{ ... }' is missing the following properties from type 'ILogger': setLevel, getLevel`
**Files**:

- `tests/unit/services/retry-decorator.test.ts`
- Likely others mocking `ILogger`

**Root Cause**: The mock implementation of `ILogger` is outdated and doesn't
match the actual interface which now requires `setLevel` and `getLevel`.

### 1.2 Undefined Property Access (Potential Runtime Crash)

**Error**: `Object is possibly 'undefined'` (TS2532) or
`'entry' is possibly 'undefined'` (TS18048) **Files**:

- `tests/unit/state/state-history.test.ts` (29 errors!)
- `tests/integration/walk-mode-integration.test.ts` (23 errors)
- `tests/integration/popup-integration.test.ts` (25 errors)
- Many others

**Root Cause**: Tests are accessing array elements (e.g., `history[0]`) or
optional properties without non-null assertions (`!`) or optional chaining
(`?.`). TypeScript's strict null checks are flagging these as unsafe.

### 1.3 Unknown Types

**Error**: `'r' is of type 'unknown'` (TS18046) or
`'repositoryFacade' is of type 'unknown'` **Files**:

- `tests/unit/services/retry-decorator.test.ts`
- `tests/integration/command-flow.integration.test.ts` (Fixed previously, but
  similar pattern exists)

**Root Cause**: Missing type annotations in callbacks or variable declarations.

## 2. Low-Impact Issues (Annoyances)

### 2.1 Unused Variables

**Error**: `'unsubscribe' is declared but its value is never read` (TS6133)
**Files**:

- `tests/unit/services/retry-decorator.test.ts`

**Root Cause**: Variables declared but not used, often in tests where return
values are ignored.

## 3. Categorized Error List

| Category                 | Count | Example Files                                            | Fix Strategy                                                                    |
| :----------------------- | :---- | :------------------------------------------------------- | :------------------------------------------------------------------------------ |
| **Strict Null Checks**   | ~150+ | `state-history.test.ts`, `walk-mode-integration.test.ts` | Add non-null assertions (`!`) where sure, or safe checks (`if (!val) throw...`) |
| **Interface Mismatches** | ~10   | `retry-decorator.test.ts`, `chrome-message-bus.test.ts`  | Update mocks to match current interfaces                                        |
| **Type Unknown**         | ~20   | `retry-decorator.test.ts`                                | Add explicit type annotations                                                   |
| **Unused/Misc**          | ~10   | Various                                                  | Remove used vars or prefix with `_`                                             |

## 4. Proposed Action Plan

1.  **Fix Mock Interfaces**: Update `mockLogger` and other mocks to satisfy full
    interfaces.
2.  **Harden Tests**: Add helper methods or assertions for null checks (e.g.,
    using `expect(val).toBeDefined()` before access isn't enough for TS flow
    analysis; consider `const val = history[0]!;`).
3.  **Annotate Types**: explicit types for `unknown` variables.

## 5. Notes

The sheer volume of "Object is possibly undefined" errors suggests that
`strictNullChecks` was recently enabled or the test suite was written without
strict conformace. Fixing these is tedious but essential for type safety.
