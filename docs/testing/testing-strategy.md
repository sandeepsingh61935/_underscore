# \_underscore Testing Strategy

**Version**: 1.0  
**Date**: 2025-12-31  
**Based On**: Comprehensive Domain Testing Strategy (Python/Pytest adaptation)  
**Applicable To**: All Vault Mode Sprint phases & future development

---

## Executive Summary

### The Problem We're Solving

**Before (Current State)**:

- ❌ Tests validate "does it work?" (functional)
- ❌ Tests don't validate "does it follow architecture?" (structural)
- ❌ Missing tests = false confidence
- ❌ Can't refactor safely without comprehensive coverage

**After (This Framework)**:

- ✅ Tests validate BOTH function AND architecture
- ✅ Tests enforce SOLID principles, not just outcomes
- ✅ Architectural compliance is measurable
- ✅ Safe refactoring with 85%+ coverage

### Critical Rule from Definition of DONE

> **A task is NOT DONE unless:**
>
> 1. ✅ Code compiles (0 TypeScript errors)
> 2. ✅ Tests written AND passing
> 3. ✅ Coverage targets met

---

## Testing Pyramid (4 Layers)

```
              ┌─────────────────┐
              │   E2E Tests     │ (5% - Full Extension)
              │  (Playwright)   │
              └─────────────────┘
           ┌────────────────────────┐
           │  Integration Tests     │ (15% - Cross-Layer)
           │    (Vitest + DOM)      │
           └────────────────────────┘
        ┌───────────────────────────────┐
        │    Architectural Tests        │ (30% - Pattern Compliance)
        │    (AST/Reflection)           │
        └───────────────────────────────┘
    ┌────────────────────────────────────────┐
    │       Behavioral Unit Tests            │ (50% - Functionality)
    │         (Vitest)                       │
    └────────────────────────────────────────┘
```

---

## Layer 1: Behavioral Unit Tests (50% of Test Suite)

### Purpose

Verify **functionality** - "Does the code work as expected?"

### Scope

- Individual functions/methods
- Interface implementations
- Mode behavior (Walk/Sprint/Vault)
- Repository CRUD operations
- Command execution

### Example Template

**File**: `tests/unit/interfaces/repository.test.ts`

```typescript
/**
 * Behavioral unit tests for Repository interfaces.
 *
 * Tests follow AAA (Arrange, Act, Assert) pattern.
 * Focus: Functionality, not architecture.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import { InMemoryHighlightRepository } from '@/shared/repositories/in-memory-highlight-repository';
import { createTestHighlight } from '../../helpers/test-fixtures';

describe('InMemoryHighlightRepository', () => {
  let repository: InMemoryHighlightRepository;

  beforeEach(() => {
    // Arrange: Fresh repository for each test
    repository = new InMemoryHighlightRepository();
  });

  // ========================================================================
  // HAPPY PATH TESTS
  // ========================================================================

  it('should add highlight and make it retrievable', async () => {
    // Arrange
    const highlight = createTestHighlight({
      text: 'Test highlight',
    });

    // Act
    await repository.add(highlight);
    const retrieved = await repository.findById(highlight.id);

    // Assert
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(highlight.id);
    expect(retrieved?.text).toBe('Test highlight');
  });

  it('should return all highlights when findAll called', async () => {
    // Arrange
    const highlight1 = createTestHighlight({ text: 'First' });
    const highlight2 = createTestHighlight({ text: 'Second' });
    await repository.add(highlight1);
    await repository.add(highlight2);

    // Act
    const all = await repository.findAll();

    // Assert
    expect(all).toHaveLength(2);
    expect(all.map((h) => h.text)).toContain('First');
    expect(all.map((h) => h.text)).toContain('Second');
  });

  // ========================================================================
  // ERROR PATH TESTS
  // ========================================================================

  it('should return null when finding non-existent highlight', async () => {
    // Act
    const result = await repository.findById('non-existent-id');

    // Assert
    expect(result).toBeNull();
  });

  it('should throw ValidationError when adding invalid data', async () => {
    // Arrange: Invalid highlight (missing required fields)
    const invalid = {
      id: 'test',
      // Missing: text, contentHash, colorRole, etc.
    } as any;

    // Act & Assert
    await expect(repository.add(invalid)).rejects.toThrow();
  });

  // ========================================================================
  // EDGE CASE TESTS
  // ========================================================================

  it('should be idempotent when adding same highlight twice', async () => {
    // Arrange
    const highlight = createTestHighlight();

    // Act
    await repository.add(highlight);
    await repository.add(highlight); // Add again

    const all = await repository.findAll();

    // Assert: Should not duplicate
    expect(all).toHaveLength(1);
  });

  it('should maintain count consistency with findAll', async () => {
    // Arrange
    await repository.add(createTestHighlight());
    await repository.add(createTestHighlight());
    await repository.add(createTestHighlight());

    // Act
    const count = repository.count();
    const all = await repository.findAll();

    // Assert
    expect(count).toBe(3);
    expect(all.length).toBe(count);
  });
});
```

### Behavioral Test Template for Modes

**File**: `tests/unit/modes/sprint-mode.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SprintMode } from '@/content/modes/sprint-mode';
import { MockRepository } from '../../helpers/mocks/mock-repository';
import { MockLogger } from '../../helpers/mocks/mock-logger';
import { createMockSelection } from '../../helpers/mock-dom';

describe('SprintMode', () => {
  let mode: SprintMode;
  let mockRepository: MockRepository;
  let mockLogger: MockLogger;

  beforeEach(() => {
    mockRepository = new MockRepository();
    mockLogger = new MockLogger();
    mode = new SprintMode(mockRepository, mockLogger);
  });

  describe('createHighlight()', () => {
    it('should create highlight and persist to repository', async () => {
      // Arrange
      const selection = createMockSelection('test text');
      const color = 'yellow';

      // Act
      const id = await mode.createHighlight(selection, color);

      // Assert: Repository called
      expect(mockRepository.add).toHaveBeenCalledOnce();

      // Assert: Returns valid ID
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');

      // Assert: Highlight retrievable
      const highlight = mockRepository.get(id);
      expect(highlight).not.toBeNull();
      expect(highlight?.text).toBe('test text');
    });

    it('should apply CSS Highlight to DOM', async () => {
      // Arrange
      const selection = createMockSelection('test');
      const addSpy = vi.spyOn(CSS.highlights, 'set');

      // Act
      await mode.createHighlight(selection, 'yellow');

      // Assert: CSS.highlights.set called
      expect(addSpy).toHaveBeenCalled();
    });
  });

  describe('onDeactivate()', () => {
    it('should clear all highlights when deactivated', async () => {
      // Arrange
      await mode.createHighlight(createMockSelection('test1'), 'yellow');
      await mode.createHighlight(createMockSelection('test2'), 'blue');
      expect(mockRepository.count()).toBe(2);

      // Act
      await mode.onDeactivate();

      // Assert: Sprint mode clears on deactivate
      expect(mockRepository.count()).toBe(0);
    });
  });
});
```

### Checklist for Behavioral Tests

- [ ] **Happy Path**: All success scenarios covered
- [ ] **Error Paths**: All validation failures tested
- [ ] **Edge Cases**: Null, undefined, empty arrays, duplicates
- [ ] **AAA Pattern**: Arrange-Act-Assert clearly separated
- [ ] **Fixtures**: Reusable test data in `test-fixtures.ts`
- [ ] **Mocks**: All external dependencies mocked (Chrome API, DOM, IndexedDB)
- [ ] **Assertions**: Verify outcomes, not implementation details
- [ ] **Isolation**: Each test can run independently

---

## Layer 2: Architectural Tests (30% of Test Suite) ⭐ CRITICAL

### Purpose

Verify **pattern compliance** - "Does the code follow our architecture?"

### Scope

- Interface implementation
- Dependency injection usage
- SOLID principles
- Error hierarchy
- No Chrome API in testable code (abstracted)

### Example Template

**File**: `tests/architecture/interface-compliance.test.ts`

```typescript
/**
 * Architectural compliance tests for Interface implementations.
 *
 * These tests verify code follows SOLID principles.
 * They validate structure, not behavior.
 */
import { describe, it, expect } from 'vitest';
import type { IRepository } from '@/shared/interfaces/i-repository';
import type { IModeManager } from '@/shared/interfaces/i-mode-manager';
import { InMemoryHighlightRepository } from '@/shared/repositories/in-memory-highlight-repository';
import { ModeManager } from '@/content/modes/mode-manager';

describe('Repository Interface Compliance', () => {
  it('InMemoryHighlightRepository implements IRepository', () => {
    // Arrange
    const repo = new InMemoryHighlightRepository();

    // Assert: Has all required methods
    expect(typeof repo.add).toBe('function');
    expect(typeof repo.findById).toBe('function');
    expect(typeof repo.findAll).toBe('function');
    expect(typeof repo.remove).toBe('function');
    expect(typeof repo.count).toBe('function');
    expect(typeof repo.exists).toBe('function');
    expect(typeof repo.clear).toBe('function');
  });

  it('Repository methods return correct types', async () => {
    const repo = new InMemoryHighlightRepository();

    // Assert: Async methods return Promises
    expect(repo.add({} as any)).toBeInstanceOf(Promise);
    expect(repo.findById('test')).toBeInstanceOf(Promise);
    expect(repo.findAll()).toBeInstanceOf(Promise);

    // Assert: Sync methods return primitives
    expect(typeof repo.count()).toBe('number');
    expect(typeof repo.exists('test')).toBe('boolean');
  });

  it('Repository is substitutable (Liskov Substitution Principle)', async () => {
    // Arrange: Function that accepts IRepository
    async function useRepository(repo: IRepository<any>) {
      await repo.add({ id: 'test' } as any);
      return await repo.findById('test');
    }

    // Act: Pass concrete implementation
    const repo = new InMemoryHighlightRepository();
    const result = await useRepository(repo);

    // Assert: Works without knowing concrete type
    expect(result).not.toBeNull();
  });
});

describe('ModeManager Interface Compliance', () => {
  it('ModeManager implements IModeManager', () => {
    // Arrange
    const mockEventBus = {} as any;
    const mockLogger = { info: vi.fn(), debug: vi.fn(), error: vi.fn() } as any;
    const manager = new ModeManager(mockEventBus, mockLogger);

    // Assert: Has all required methods from IModeManager
    expect(typeof manager.registerMode).toBe('function');
    expect(typeof manager.activateMode).toBe('function');
    expect(typeof manager.getCurrentMode).toBe('function');
    expect(typeof manager.createHighlight).toBe('function');
    expect(typeof manager.removeHighlight).toBe('function');
    expect(typeof manager.getHighlight).toBe('function');
  });
});
```

**File**: `tests/architecture/dependency-injection.test.ts`

```typescript
/**
 * Tests verifying Dependency Injection compliance.
 */
import { describe, it, expect } from 'vitest';
import { Container } from '@/shared/di/container';
import type { ILogger } from '@/shared/utils/logger';

describe('Dependency Injection Architecture', () => {
  it('Container enforces singleton lifecycle', () => {
    // Arrange
    const container = new Container();
    let instanceCount = 0;

    container.registerSingleton('logger', () => {
      instanceCount++;
      return { log: () => {} } as ILogger;
    });

    // Act
    const logger1 = container.resolve<ILogger>('logger');
    const logger2 = container.resolve<ILogger>('logger');

    // Assert: Same instance returned
    expect(logger1).toBe(logger2);
    expect(instanceCount).toBe(1);
  });

  it('Container enforces transient lifecycle', () => {
    // Arrange
    const container = new Container();
    let instanceCount = 0;

    container.registerTransient('temp', () => {
      instanceCount++;
      return { id: Math.random() };
    });

    // Act
    const obj1 = container.resolve('temp');
    const obj2 = container.resolve('temp');

    // Assert: Different instances
    expect(obj1).not.toBe(obj2);
    expect(instanceCount).toBe(2);
  });

  it('Container detects circular dependencies', () => {
    // Arrange
    const container = new Container();

    container.registerSingleton('A', () => {
      return { b: container.resolve('B') };
    });

    container.registerSingleton('B', () => {
      return { a: container.resolve('A') };
    });

    // Act & Assert: Should throw
    expect(() => container.resolve('A')).toThrow(/circular/i);
  });
});
```

**File**: `tests/architecture/chrome-api-abstraction.test.ts`

```typescript
/**
 * Tests verifying Chrome API is properly abstracted.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Chrome API Abstraction', () => {
  const checkFileForChromeGlobal = (filePath: string): boolean => {
    const content = readFileSync(join(process.cwd(), filePath), 'utf-8');

    // Check for direct chrome.* usage
    const chromeUsageRegex = /\bchrome\.(tabs|runtime|storage)\./;
    return chromeUsageRegex.test(content);
  };

  it('Commands do NOT use chrome APIs directly', () => {
    // Commands should be pure - no Chrome dependencies!
    const commandFiles = [
      'src/content/commands/highlight-commands.ts',
      // Add other command files
    ];

    for (const file of commandFiles) {
      const hasChrome = checkFileForChromeGlobal(file);
      expect(hasChrome).toBe(
        false,
        `${file} should not use chrome API directly`
      );
    }
  });

  it('Services use IMessaging interface, not chrome APIs', () => {
    const serviceFiles = [
      'src/shared/services/storage-service.ts',
      // Add other services
    ];

    for (const file of serviceFiles) {
      const content = readFileSync(join(process.cwd(), file), 'utf-8');

      // Should import IMessaging
      expect(content).toMatch(/import.*IMessaging/);

      // Should NOT use chrome directly
      expect(content).not.toMatch(/\bchrome\.(tabs|runtime)\./);
    }
  });
});
```

### Checklist for Architectural Tests

- [ ] **Interface Implementation**: All repositories/managers implement
      interfaces
- [ ] **Liskov Substitution**: Implementations are interchangeable
- [ ] **Dependency Injection**: All services use constructor injection
- [ ] **No Hardcoded Dependencies**: Zero `new Service()` in business logic
- [ ] **Chrome API Abstraction**: No direct `chrome.*` in testable code
- [ ] **SOLID Compliance**: Single Responsibility, Interface Segregation
      verified

---

## Layer 3: Integration Tests (15% of Test Suite)

### Purpose

Verify **cross-layer interaction** - "Do layers work together correctly?"

### Scope

- Repository ↔ IndexedDB
- Mode Manager ↔ Modes ↔ Repository
- Command ↔ Mode ↔ Repository flow
- Event propagation

### Example Template

**File**: `tests/integration/repository-storage.test.ts`

```typescript
/**
 * Integration tests for Repository + IndexedDB.
 *
 * Uses fake-indexeddb for testing.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { HighlightRepository } from '@/shared/repositories/highlight-repository';
import { createTestHighlight } from '../helpers/test-fixtures';

describe('Repository + IndexedDB Integration', () => {
  let repository: HighlightRepository;

  beforeEach(async () => {
    // Arrange: Real repository with fake IndexedDB
    repository = new HighlightRepository();
    await repository.initialize();
  });

  afterEach(async () => {
    // Cleanup
    await repository.clear();
  });

  it('should persist highlight to IndexedDB and retrieve it', async () => {
    // Arrange
    const highlight = createTestHighlight({ text: 'Integration test' });

    // Act: Add to repository
    await repository.add(highlight);

    // Flush to IndexedDB
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Assert: Can retrieve from fresh repository instance
    const freshRepo = new HighlightRepository();
    await freshRepo.initialize();

    const retrieved = await freshRepo.findById(highlight.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.text).toBe('Integration test');
  });

  it('should maintain referential integrity on delete', async () => {
    // Arrange
    const highlight1 = createTestHighlight({ text: 'First' });
    const highlight2 = createTestHighlight({ text: 'Second' });

    await repository.add(highlight1);
    await repository.add(highlight2);

    // Act: Delete one
    await repository.remove(highlight1.id);

    // Assert: Other still exists
    const all = await repository.findAll();
    expect(all).toHaveLength(1);
    expect(all[0].text).toBe('Second');
  });
});
```

**File**: `tests/integration/mode-repository-integration.test.ts`

```typescript
/**
 * Integration tests for Mode + Repository interactions.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { VaultMode } from '@/content/modes/vault-mode';
import { InMemoryHighlightRepository } from '@/shared/repositories/in-memory-highlight-repository';
import { MockLogger } from '../helpers/mocks/mock-logger';
import { createMockSelection } from '../helpers/mock-dom';

describe('VaultMode + Repository Integration', () => {
  let mode: VaultMode;
  let repository: InMemoryHighlightRepository;

  beforeEach(() => {
    repository = new InMemoryHighlightRepository();
    const logger = new MockLogger();
    mode = new VaultMode(repository, logger);
  });

  it('should create highlight via mode and persist to repository', async () => {
    // Arrange
    const selection = createMockSelection('Vault test');

    // Act
    const id = await mode.createHighlight(selection, 'yellow');

    // Assert: Highlight in repository
    const highlight = await repository.findById(id);
    expect(highlight).not.toBeNull();
    expect(highlight?.text).toBe('Vault test');
  });

  it('should restore highlights from repository on activate', async () => {
    // Arrange: Add highlights directly to repository
    const highlight1 = createTestHighlight({ text: 'First' });
    const highlight2 = createTestHighlight({ text: 'Second' });
    await repository.add(highlight1);
    await repository.add(highlight2);

    // Act: Activate mode (should restore)
    await mode.onActivate();

    // Assert: Mode has highlights
    const all = mode.getAllHighlights();
    expect(all).toHaveLength(2);
  });
});
```

### Checklist for Integration Tests

- [ ] **Storage Persistence**: Data survives repository restart
- [ ] **Transaction Integrity**: Partial failures roll back
- [ ] **Mode Lifecycle**: activate/deactivate works with repository
- [ ] **Event Flow**: Events published and handled correctly
- [ ] **Performance**: Operations complete in < 100ms
- [ ] **Cleanup**: Each test cleans up its data

---

## Layer 4: End-to-End Tests (5% of Test Suite)

### Purpose

Verify **full extension behavior** - "Does the entire feature work?"

### Scope

- Full user workflows
- Cross-context communication (content ↔ background ↔ popup)
- Real Chrome extension environment
- UI interactions

### Example Template

**File**: `tests/e2e/highlight-workflow.spec.ts`

```typescript
/**
 * E2E tests for complete highlight workflow.
 *
 * Uses Playwright with Chrome extension support.
 */
import { test, expect } from './fixtures';

test.describe('Highlight Creation Workflow', () => {
  test('user can create and see highlight in all modes', async ({
    page,
    extensionId,
  }) => {
    // Step 1: Navigate to test page
    await page.goto('https://example.com/test-article.html');

    // Step 2: Select text
    await page.evaluate(() => {
      const range = document.createRange();
      const textNode = document.body.firstChild;
      range.setStart(textNode!, 0);
      range.setEnd(textNode!, 10);

      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
    });

    // Step 3: Trigger highlight (keyboard shortcut)
    await page.keyboard.press('Control+Shift+H');

    // Step 4: Verify highlight appears
    const highlight = page.locator('mark[data-highlight-id]');
    await expect(highlight).toBeVisible();

    // Step 5: Open popup
    const popup = await page.context().newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);

    // Step 6: Verify highlight count in popup
    const count = popup.locator('[data-testid="highlight-count"]');
    await expect(count).toHaveText('1');

    // Step 7: Switch mode
    await popup.click('[data-testid="mode-vault"]');

    // Step 8: Verify highlight persists in Vault mode
    await page.reload();
    await expect(highlight).toBeVisible(); // Still there!
  });
});
```

### Checklist for E2E Tests

- [ ] **Complete Workflows**: Simulates real user journeys
- [ ] **Cross-Context**: Tests content ↔ background ↔ popup
- [ ] **Persistence**: Data survives page reload/extension restart
- [ ] **UI State**: Popup reflects content script state
- [ ] **Error Handling**: Shows user-friendly errors

---

## Automation & CI/CD Integration

### Vitest Configuration

**File**: `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],

    // Coverage thresholds (ENFORCED)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['tests/**', '**/*.test.ts', '**/types/**', '**/*.d.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },

    // Test organization
    include: [
      'tests/unit/**/*.test.ts',
      'tests/architecture/**/*.test.ts',
      'tests/integration/**/*.test.ts',
    ],
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
```

### GitHub Actions Workflow

**File**: `.github/workflows/test.yml`

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  behavioral-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run Unit Tests
        run: npm run test:unit -- --coverage

      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  architectural-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run Architecture Tests
        run: npm run test:architecture

      - name: Fail if < 100% architecture compliance
        run: |
          if [ $? -ne 0 ]; then
            echo "❌ Architectural tests failed!"
            exit 1
          fi

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run Integration Tests
        run: npm run test:integration

  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: TypeScript Check
        run: npm run type-check

      - name: Fail on errors
        run: |
          if [ $? -ne 0 ]; then
            echo "❌ TypeScript errors found!"
            exit 1
          fi

  quality-gate:
    needs:
      [behavioral-tests, architectural-tests, integration-tests, type-check]
    runs-on: ubuntu-latest
    steps:
      - name: All Tests Passed
        run: echo "✅ All quality gates passed!"
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:unit": "vitest run tests/unit",
    "test:architecture": "vitest run tests/architecture",
    "test:integration": "vitest run tests/integration",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test"
  }
}
```

---

## Phase 0.1 Testing Requirements

For Phase 0.1 to be DONE, we need:

### Interface Tests (28 tests minimum)

#### Task 0.1.1: Repository Interfaces (8 tests)

- [ ] InMemoryRepository implements IRepository
- [ ] RepositoryFacade implements IHighlightRepository
- [ ] All methods defined
- [ ] Return types correct
- [ ] Can swap implementations
- [ ] Mock implementation works
- [ ] Interface segregation (no unused methods)
- [ ] Liskov substitution (implementations interchangeable)

#### Task 0.1.2: Mode Manager Interface (6 tests)

- [ ] ModeManager implements IModeManager
- [ ] Can register modes
- [ ] Can activate modes
- [ ] getCurrentMode returns active mode
- [ ] Can create highlights via current mode
- [ ] Mock implementation works

#### Task 0.1.3: Storage Interface (6 tests)

- [ ] StorageService implements IStorage
- [ ] Save/load events
- [ ] Clear storage
- [ ] Mock storage works
- [ ] IndexedDB storage implements IPersistentStorage
- [ ] Can swap storage backends

#### Task 0.1.4: Messaging Interface (8 tests)

- [ ] ChromeMessaging implements IMessaging
- [ ] Can send to tab
- [ ] Can send to runtime
- [ ] Can add/remove listeners
- [ ] MockMessaging for unit tests
- [ ] Error handling on send failure
- [ ] Timeout handling
- [ ] Message validation

---

## Success Criteria

A phase is **DONE** when:

- ✅ **Code Compiles**: 0 TypeScript errors
- ✅ **Behavioral**: ≥80% code coverage, all tests green
- ✅ **Architectural**: 100% compliance, zero violations
- ✅ **Integration**: All cross-layer flows verified
- ✅ **CI/CD**: All quality gates pass
- ✅ **Documentation**: Tests document expected behavior

---

## Quick Reference

### Test File Structure

```
tests/
├── architecture/              # Layer 2: Pattern compliance
│   ├── interface-compliance.test.ts
│   ├── dependency-injection.test.ts
│   └── chrome-api-abstraction.test.ts
├── unit/                      # Layer 1: Behavioral
│   ├── interfaces/
│   │   ├── repository.test.ts
│   │   ├── mode-manager.test.ts
│   │   ├── storage.test.ts
│   │   └── messaging.test.ts
│   ├── modes/
│   │   ├── walk-mode.test.ts
│   │   ├── sprint-mode.test.ts
│   │   └── vault-mode.test.ts
│   └── commands/
│       ├── create-highlight-command.test.ts
│       └── remove-highlight-command.test.ts
├── integration/               # Layer 3: Cross-layer
│   ├── repository-storage.test.ts
│   ├── mode-repository-integration.test.ts
│   └── command-mode-flow.test.ts
├── e2e/                       # Layer 4: Full system
│   ├── fixtures.ts
│   └── highlight-workflow.spec.ts
└── helpers/
    ├── mocks/
    │   ├── mock-repository.ts
    │   ├── mock-mode-manager.ts
    │   ├── mock-storage.ts
    │   ├── mock-messaging.ts
    │   └── mock-logger.ts
    ├── test-fixtures.ts
    ├── mock-dom.ts
    └── mock-chrome.ts
```

---

## Next Steps

1. **Fix TypeScript errors** (Chrome types)
2. **Write 28 tests for Phase 0.1**
3. **Achieve 80%+ coverage**
4. **All tests passing**
5. **THEN mark Phase 0.1 complete**

Remember: **Tests are not just for catching bugs. Tests are for enforcing
architecture.**
