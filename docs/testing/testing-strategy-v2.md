# _underscore Testing Strategy (v2.0 - Revised)

**Version**: 2.0 (Post-Critique Revision)  
**Date**: 2025-12-31  
**Philosophy**: Risk-based, practical, Chrome extension-aware

---

## Core Principles

1. **Test What Matters**: Focus on TextAnchor restoration and IndexedDB persistence (high risk)
2. **Minimize Mocking**: Use real implementations when fast (InMemoryRepository, Logger)
3. **Chrome Extension Reality**: Account for multi-context complexity
4. **Risk-Based Coverage**: More tests for risky code, fewer for simple code
5. **Pragmatic E2E**: Integration tests > E2E for Chrome extensions (E2E is expensive)
6. **Write tricky and real test cases that simulate reality**: Use real APIs, real data, real user flows and edge cases to specify the behavior of the code and find bugs early - THIS IS CRITICAL
---

## Test Distribution - Risk-Based

Instead of arbitrary 50/30/15/5, we test based on **risk**:

### Critical Risk (Heavy Testing)
- **TextAnchor Restoration**: 25 tests
  - Core value proposition
  - Complex fuzzy matching logic
  - DOM mutations break XPaths
  
- **IndexedDB Persistence**: 15 tests
  - Data loss is unacceptable
  - Migration v1→v2 must work
  - Corruption recovery needed

### High Risk (Moderate Testing)
- **Mode Switching**: 12 tests
  - Users will try all combinations
  - State transitions complex
  
- **Repository Layer**: 10 tests
  - Data integrity critical
  - Interface compliance matters

### Medium Risk (Light Testing)
- **Commands (Undo/Redo)**: 8 tests
- **Event Bus**: 5 tests
- **Validation**: 5 tests

### Low Risk (Minimal Testing)
- **Color Selection**: 2 tests
- **Simple DTOs**: 0 tests (TypeScript handles this)

**Total: ~82 tests** (adjust based on actual risk)

---

## Testing Layers (Simplified)

### Layer 1: Unit Tests (60%)

**What**: Individual functions, pure logic, single-responsibility code

**When to Mock**:
- ✅ Chrome APIs (`chrome.tabs`, `chrome.storage`) - not available in Node
- ✅ IndexedDB (use `fake-indexeddb`)
- ✅ Time (`vi.useFakeTimers()`)
- ❌ Your own code (Logger, EventBus, InMemoryRepository) - use real!

**Example** (Good - minimal mocking):

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { TextAnchorMatcher } from '@/shared/utils/text-anchor-matcher';

describe('TextAnchorMatcher', () => {
  it('finds exact match when text unchanged', () => {
    // Arrange
    const container = document.createElement('div');
    container.innerHTML = '<p>The quick brown fox</p>';
    
    const selector = {
      type: 'TextQuoteSelector',
      exact: 'quick brown',
      prefix: 'The ',
      suffix: ' fox'
    };
    
    // Act
    const range = TextAnchorMatcher.find(container, selector);
    
    // Assert
    expect(range).not.toBeNull();
    expect(range?.toString()).toBe('quick brown');
  });
  
  it('uses fuzzy matching when prefix/suffix shifted', () => {
    // Real-world: Ad injected before text
    const container = document.createElement('div');
    container.innerHTML = '<div class="ad">AD</div><p>The quick brown fox</p>';
    
    const selector = {
      type: 'TextQuoteSelector',
      exact: 'quick brown',
      prefix: 'The ',  // ⚠️ Now preceded by "AD" not nothing!
      suffix: ' fox'
    };
    
    // Act: Should still find using exact + suffix
    const range = TextAnchorMatcher.find(container, selector);
    
    // Assert
    expect(range).not.toBeNull();
    expect(range?.toString()).toBe('quick brown');
  });
});
```

### Layer 2: Integration Tests (30%)

**What**: Multiple components working together, real browser APIs (fake-indexeddb)

**Example**:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto'; // ✅ Real IndexedDB, just in-memory
import { VaultMode } from '@/content/modes/vault-mode';
import { HighlightRepository } from '@/shared/repositories/highlight-repository';
import { Logger } from '@/shared/utils/logger';

describe('VaultMode + Repository Integration', () => {
  let mode: VaultMode;
  let repository: HighlightRepository;
  
  beforeEach(async () => {
    // ✅ Real implementations!
    repository = new HighlightRepository();
    await repository.initialize();
    
    const logger = new Logger({ level: 'silent' }); // Real but quiet
    mode = new VaultMode(repository, logger);
  });
  
  it('persists highlight to IndexedDB and restores on next activate', async () => {
    // Arrange: Create DOM
    document.body.innerHTML = '<p>Test content for highlight</p>';
    const range = document.createRange();
    range.selectNode(document.querySelector('p')!);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Act: Create highlight
    const id = await mode.createHighlight(selection, 'yellow');
    await mode.onDeactivate();
    
    // Simulate page refresh: New mode instance
    const freshMode = new VaultMode(repository, new Logger({ level: 'silent' }));
    await freshMode.onActivate();
    await freshMode.restore(window.location.href);
    
    // Assert: Highlight restored
    const restored = freshMode.getHighlight(id);
    expect(restored).not.toBeNull();
    expect(restored?.text).toBe('Test content for highlight');
    
    // ✅ This tests REAL persistence, not mocks!
  });
});
```

### Layer 3: E2E Tests (10%)

**Reality Check**: E2E for Chrome extensions is **expensive**. Use sparingly for critical paths only.

**Setup** (Complete, working example):

```typescript
// tests/e2e/fixtures.ts
import { test as base, chromium } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';

export const test = base.extend({
  context: async ({}, use) => {
    // 1. Build extension
    console.log('Building extension...');
    execSync('npm run build', { stdio: 'inherit' });
    
    const extensionPath = path.join(__dirname, '../../.output/chrome-mv3');
    
    // 2. Launch Chrome with extension loaded
    const context = await chromium.launchPersistentContext('', {
      headless: false, // Extensions don't work in headless
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-sandbox',
      ],
    });
    
    // 3. Wait for extension initialization (critical!)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    await use(context);
    await context.close();
  },
  
  extensionId: async ({ context }, use) => {
    const [background] = context.serviceWorkers();
    const extensionId = background?.url().split('/')[2] ?? '';
    await use(extensionId);
  },
});
```

**Test** (Minimal, high-value):

```typescript
// tests/e2e/highlight-persistence.spec.ts
import { test, expect } from './fixtures';

test('highlights persist across page reloads in Vault mode', async ({ page, extensionId }) => {
  // 1. Navigate
  await page.goto('https://example.com');
  
  // 2. Create highlight (simulate keyboard shortcut)
  await page.evaluate(() => {
    const range = document.createRange();
    const textNode = document.body.querySelector('p')!.firstChild!;
    range.setStart(textNode, 0);
    range.setEnd(textNode, 10);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
  });
  
  await page.keyboard.press('Control+Shift+H');
  
  // 3. Verify highlight visible
  await expect(page.locator('[data-highlight-id]')).toBeVisible();
  
  // 4. Reload page
  await page.reload();
  
  // 5. Verify highlight restored
  await expect(page.locator('[data-highlight-id]')).toBeVisible();
  
  // ✅ This is the MINIMUM E2E test - proves core value prop
});
```

---

## Chrome Extension-Specific Testing Patterns

### Multi-Context Message Passing

```typescript
// tests/helpers/extension-test-env.ts
export class ExtensionTestEnvironment {
  private messageHandlers = new Map<string, Function>();
  
  /**
   * Simulates chrome.runtime.sendMessage
   */
  async sendMessage<T>(from: 'content' | 'popup', to: 'background', msg: Message): Promise<T> {
    const handler = this.messageHandlers.get(to);
    if (!handler) throw new Error(`No handler for ${to}`);
    
    return await handler(msg, {
      id: 'mock-sender',
      url: from === 'content' ? 'https://example.com' : `chrome-extension://abc/popup.html`
    });
  }
  
  /**
   * Register message handler (simulates chrome.runtime.onMessage)
   */
  onMessage(context: string, handler: Function) {
    this.messageHandlers.set(context, handler);
  }
}
```

### IndexedDB Migration Testing

```typescript
describe('IndexedDB Schema Migrations', () => {
  it('migrates v1 highlights to v2 with TextQuoteSelector', async () => {
    // 1. Seed old schema
    const db = await openDB('highlights', 1, {
      upgrade(db) {
        const store = db.createObjectStore('highlights', { keyPath: 'id' });
      },
    });
    
    await db.put('highlights', {
      id: 'old-1',
      text: 'test',
      color: '#ffeb3b',  // v1: hex color
      xpath: '//p[1]',   // v1: no TextQuoteSelector
    });
    
    db.close();
    
    // 2. Initialize with v2 code (triggers migration)
    const repository = new HighlightRepository();
    await repository.initialize(); // Should auto-migrate
    
    // 3. Verify migration
    const highlights = await repository.findAll();
    expect(highlights[0]).toMatchObject({
      colorRole: 'yellow',  // ✅ Migrated
      version: 2,
      ranges: expect.arrayContaining([
        expect.objectContaining({
          selector: expect.objectContaining({
            type: 'TextQuoteSelector',  // ✅ Added
          })
        })
      ])
    });
  });
});
```

---

## Critical Lesson: Never Adjust Tests to Match Bugs

### Real Example from Phase 0.1

**The Bug**: `StorageService.loadEvents()` wasn't sorting events by timestamp.

**The Test**: Expected chronological order (oldest → newest)
```typescript
expect(events[0].data.text).toBe('First');   // timestamp: 100
expect(events[1].data.text).toBe('Middle');  // timestamp: 150
expect(events[2].data.text).toBe('Second');  // timestamp: 200
```

**❌ WRONG Response**: Adjust test to accept any order
```typescript
// DON'T DO THIS!
const texts = events.map(e => e.data?.text);
expect(texts).toContain('First');  // ⚠️ Lost ordering requirement
```

**✅ CORRECT Response**: Fix the implementation
```typescript
// storage-service.ts
return validEvents.sort((a, b) => a.timestamp - b.timestamp);
```

### The Rule

When a test fails:

1. **First**: Is the test wrong?
   - Is it testing the wrong thing?
   - Are expectations incorrect?
   - Is it brittle/flaky?

2. **If test is correct**: **FIX THE CODE, NOT THE TEST**
   - The test caught a real bug ✅
   - Adjusting the test hides the bug ❌
   - You're lying to yourself about quality

3. **Red-Green-Refactor**:
   - 🔴 Test fails → Bug exists
   - 🟢 Fix code → Test passes
   - 🔵 Refactor → Test still passes

### Why This Matters

Event sourcing **requires** chronological order:
- Wrong order = corrupted state reconstruction
- Undo/redo breaks
- Data loss possible

**Tests exist to catch these bugs before production!**

### Discipline Checklist

Before adjusting a failing test, ask:

- [ ] Does the test reflect a real requirement?
- [ ] Is the failure revealing a bug?
- [ ] Will lowering expectations hide a problem?
- [ ] Am I making the test easier to pass vs. making the code correct?

**If YES to any → FIX THE CODE, NOT THE TEST**

---

## When to Mock - Decision Tree



```
Need to test component X
    │
    ├─ Is X a Chrome API (chrome.*)? 
    │   └─ YES → ✅ MOCK (use MockMessaging, MockStorage)
    │
    ├─ Is X slow (>10ms)?
    │   └─ YES → ✅ MOCK (HTTP requests, real IndexedDB in unit tests)
    │   └─ NO  → ❌ Use Real
    │
    ├─ Is X non-deterministic (Date.now(), Math.random())?
    │   └─ YES → ✅ MOCK (vi.useFakeTimers(), vi.spyOn)
    │
    ├─ Is X your own code (Logger, EventBus, Repository)?
    │   └─ YES → ❌ Use Real (InMemoryRepository is fast!)
    │
    └─ Is X a simple DTO or pure function?
        └─ YES → ❌ Use Real (no reason to mock)
```

---

## Phase 0.1: Practical Testing Plan

### Minimum Viable Tests (18 tests, not 28)

**Quality over quantity**. We don't need 28 tests if 18 tests cover the risks.

#### IRepository Interface (5 tests, not 8)
- [ ] InMemoryRepository implements IRepository methods
- [ ] add() + findById() round trip works
- [ ] remove() actually removes
- [ ] count() matches findAll().length
- [ ] Liskov substitution (can swap implementations)

#### IModeManager Interface (4 tests, not 6)
- [ ] Can registerMode() and activateMode()
- [ ] getCurrentMode() returns correct mode
- [ ] createHighlight() delegates to current mode
- [ ] Throws when no mode active

#### IStorage Interface (4 tests, not 6)
- [ ] Can save and load events
- [ ] clear() removes all events
- [ ] Events retrieved in chronological order
- [ ] Works with fake-indexeddb

#### IMessaging Interface (5 tests, not 8)
- [ ] MockMessaging implements IMessaging
- [ ] Can sendToTab() and get canned response
- [ ] onMessage() registers handler
- [ ] removeListener() unregisters
- [ ] Throws when no response configured

**Total: 18 tests** (focused on risk, not arbitrary numbers)

---

## Tools & Setup

### Vitest Config (Optimized)

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    
    coverage: {
      provider: 'v8',
      exclude: [
        'tests/**',
        '**/*.test.ts',
        '**/mocks/**',
      ],
      // ⚠️ Pragmatic thresholds (increase over time)
      thresholds: {
        lines: 70,      // Start at 70%, increase to 80%
        functions: 70,
        branches: 60,   // Branches are hard, 60% is okay
        statements: 70,
      },
    },
  },
});
```

### Test Helpers (Practical)

```typescript
// tests/helpers/test-fixtures.ts
import { v4 as uuid } from 'uuid';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';

export function createTestHighlight(overrides?: Partial<HighlightDataV2>): HighlightDataV2 {
  return {
    version: 2,
    id: uuid(),
    text: 'Test highlight text',
    contentHash: 'abc123',
    colorRole: 'yellow',
    type: 'underscore',
    ranges: [{
      xpath: '//p[1]',
      startOffset: 0,
      endOffset: 10,
      text: 'Test highlight text',
      textBefore: '',
      textAfter: '',
      selector: {
        type: 'TextQuoteSelector',
        exact: 'Test highlight text',
        prefix: '',
        suffix: '',
      },
    }],
    createdAt: new Date(),
    ...overrides,
  };
}
```

---

## Success Criteria (Revised)

Phase 0.1 is **DONE** when:

- ✅ Code compiles (0 TypeScript errors)
- ✅ 18+ focused tests written and passing
- ✅ 70%+ coverage (increase to 80% later)
- ✅ Tests use real implementations (minimal mocking)
- ✅ CI passes
- ✅ No blockers for Phase 0.2

**NOT required for Phase 0.1**:
- ❌ 100% architectural compliance (too early)
- ❌ E2E tests (do in later phase)
- ❌ Perfect coverage (70% is fine to start)

---

## Next Steps: Monday Morning

1. **Fix TypeScript errors** (Chrome types)
2. **Write 5 tests for IRepository** (prove the pattern works)
3. **Write 4 tests for IModeManager**
4. **Write 4 tests for IStorage**
5. **Write 5 tests for IMessaging**
6. **Get to 70% coverage**
7. **Mark Phase 0.1 DONE** ✅

Then proceed to Phase 0.2 (DI Container).

---

## Key Takeaways

1. **Risk-based > Percentage-based**: Test what's risky, not what's easy
2. **Real > Mocks**: Use real implementations unless slow/unavailable
3. **Integration > E2E**: For Chrome extensions, integration tests give better ROI
4. **Pragmatic > Perfect**: 70% coverage with good tests > 90% coverage with brittle tests
5. **Iterate**: Start simple, add complexity as needed

**Remember**: The goal is **confidence to refactor**, not **test count**.

---

## Enforcement Protocols (Added 2025-12-31)

### Incident Report: Phase 0 False Positive
On 2025-12-31, an agent reported "Phase 0 Complete" after fixing integration tests but failing to run the full regression suite. This hid a regression in `multi-selector-engine.test.ts`.
**Root Cause**: Inferred success based on partial data ("I only touched these files") instead of verifying with execution.

### Protocol 1: The Full Regression Mandate
**Inference is NOT Proof.**
- **Rule**: You CANNOT mark a Quality Gate as "PASS" without running the **full** relevant test command (e.g., `npx vitest run` or `npm test`).
- **Forbidden**: "I fixed the component, so the system works."
- **Required**: "I fixed the component, ran the full system test suite, and it all passed."

### Protocol 2: The "Show me the logs" Rule
When reporting success to the user, you must explicit cite the command run and the summary output.
- ❌ "Tests passed."
- ✅ "Ran `npx vitest run`. Output: `Tests 270 passed (270)`."

### Protocol 3: Honest Failure Reporting
If a test fails during a "final verification":
1. **Stop**. Do not try to fix it silently and then report success.
2. **Report** the failure to the user immediately.
3. **Ask** for permission to fix it or if they want to see the error.
*Transparency > Perfection.*

### Agent Enforcement Trigger
To force an agent to adhere to these rules, the user should say:
> "Run Full Strict Verification."

This command triggers:
1. `npm run type-check` (if TS)
2. `npm run lint`
3. `npm test` (Full Suite)
4. **No corner cutting allowed.**
