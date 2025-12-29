# Testing Framework & Standards

**Web Highlighter Extension - Quality Assurance**

> **Purpose**: Comprehensive testing strategy for unit, integration, and
> end-to-end tests.

---

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Testing Pyramid](#testing-pyramid)
3. [Unit Testing](#unit-testing)
4. [Integration Testing](#integration-testing)
5. [End-to-End Testing](#end-to-end-testing)
6. [Test Organization](#test-organization)
7. [Mocking Strategies](#mocking-strategies)
8. [Coverage Requirements](#coverage-requirements)

---

## Testing Philosophy

### Principles

1. **Test Behavior, Not Implementation**
   - Focus on what the code does, not how it does it
   - Tests should survive refactoring

2. **Fast, Independent, Repeatable**
   - Tests should run in milliseconds
   - No test should depend on another
   - Results should be deterministic

3. **Readable Tests**
   - Tests are documentation
   - Clear arrange-act-assert structure
   - Descriptive test names

4. **Meaningful Coverage**
   - 80% coverage threshold
   - 100% coverage for critical paths
   - Don't test for the sake of coverage

---

## Testing Pyramid

```
         E2E Tests (10%)
      ─────────────────
         5-10 tests
     Browser automation

    Integration Tests (20%)
  ───────────────────────────
       20-30 tests
   Component interaction

      Unit Tests (70%)
─────────────────────────────────
       100+ tests
   Pure logic, utilities
```

---

## Unit Testing

### 1. Test Structure (AAA Pattern)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ColorManager } from '@/content/services/color-manager';

describe('ColorManager', () => {
  let colorManager: ColorManager mock logger: MockLogger;

  beforeEach(() => {
    // ✅ Arrange: Set up test dependencies
    mockLogger = new MockLogger();
    colorManager = new ColorManager(mockLogger);
  });

  describe('calculateContrast', () => {
    it('should return 21 for black on white', () => {
      // ✅ Arrange
      const background = '#FFFFFF';
      const foreground = '#000000';

      // ✅ Act
      const contrast = colorManager.calculateContrast(background, foreground);

      // ✅ Assert
      expect(contrast).toBe(21);
    });

    it('should return 1 for same colors', () => {
      // ✅ Arrange
      const color = '#FF0000';

      // ✅ Act
      const contrast = colorManager.calculateContrast(color, color);

      // ✅ Assert
      expect(contrast).toBe(1);
    });

    it('should throw ValidationError for invalid color format', () => {
      // ✅ Arrange
      const invalidColor = 'not-a-color';

      // ✅ Act & Assert
      expect(() => {
        colorManager.calculateContrast(invalidColor, '#FFFFFF');
      }).toThrow(ValidationError);
    });
  });

  describe('getContrastingTextColor', () => {
    it('should return black for light backgrounds', () => {
      // ✅ Arrange
      const lightBackground = '#FFEB3B';

      // ✅ Act
      const textColor = colorManager.getContrastingTextColor(lightBackground);

      // ✅ Assert
      expect(textColor).toBe('#000000');
    });

    it('should return white for dark backgrounds', () => {
      // ✅ Arrange
      const darkBackground = '#212121';

      // ✅ Act
      const textColor = colorManager.getContrastingTextColor(darkBackground);

      // ✅ Assert
      expect(textColor).toBe('#FFFFFF');
    });

    it('should meet WCAG AAA contrast ratio (7:1)', () => {
      // ✅ Arrange
      const backgroundColor = '#4CAF50';

      // ✅ Act
      const textColor = colorManager.getContrastingTextColor(backgroundColor);
      const contrast = colorManager.calculateContrast(backgroundColor, textColor);

      // ✅ Assert
      expect(contrast).toBeGreaterThan(7.0);
    });
  });
});
```

### 2. Testing Async Code

```typescript
describe('HighlightService', () => {
  it('should create highlight asynchronously', async () => {
    // ✅ Arrange
    const text = 'Important text';
    const service = new HighlightService(mockRepository, mockLogger);

    // ✅ Act
    const highlight = await service.createHighlight(text);

    // ✅ Assert
    expect(highlight).toBeDefined();
    expect(highlight.text).toBe(text);
    expect(mockRepository.saved).toContain(highlight);
  });

  it('should handle errors gracefully', async () => {
    // ✅ Arrange
    mockRepository.save = vi
      .fn()
      .mockRejectedValue(new Error('Storage failed'));

    // ✅ Act & Assert
    await expect(service.createHighlight('text')).rejects.toThrow(StorageError);
  });
});
```

### 3. Testing with Timers

```typescript
import { vi } from 'vitest';

describe('DebouncedHandler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should debounce rapid calls', () => {
    // ✅ Arrange
    const handler = vi.fn();
    const debounced = debounce(handler, 100);

    // ✅ Act
    debounced('call 1');
    debounced('call 2');
    debounced('call 3');

    // Fast-forward time
    vi.advanceTimersByTime(100);

    // ✅ Assert
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('call 3');
  });
});
```

### 4. Contract Testing

**Purpose**: Verify that data shapes match expected schemas at architectural
boundaries (e.g., between Application and Storage layers).

```typescript
import { HighlightTypeBridge } from '@/content/highlight-type-bridge';

describe('HighlightTypeBridge Contract', () => {
  it('should maintain data integrity across translation', () => {
    // 1. Define the inputs (Runtime contract)
    const runtimeInput = createRuntimeHighlight();

    // 2. Bridge to Storage (Implementation contract)
    const storageOutput = HighlightTypeBridge.toStorage(runtimeInput);

    // 3. Bridge back to Runtime
    const runtimeRestored = HighlightTypeBridge.toRuntime(storageOutput);

    // 4. Verify invariant (A -> B -> A)
    expect(runtimeRestored).toEqual(runtimeInput);
  });

  it('should fail gracefully on schema violation', () => {
    const invalidStorage = { range: null }; // Violates contract
    expect(() => HighlightTypeBridge.toRuntime(invalidStorage)).toThrow();
  });
});
```

---

## Integration Testing

### 1. Component Integration

```typescript
describe('Highlight Creation Flow', () => {
  let container: ServiceContainer;
  let highlightService: HighlightService;
  let renderer: HighlightRenderer;
  let repository: IHighlightRepository;

  beforeEach(() => {
    // ✅ Set up real dependencies (not mocks)
    container = new ServiceContainer();

    // Register real implementations
    container.registerSingleton('logger', () => new SilentLogger());
    container.registerSingleton('repository', () => new InMemoryRepository());
    container.registerSingleton(
      'renderer',
      () => new ShadowDOMRenderer(DEFAULT_CONFIG)
    );
    container.registerSingleton(
      'highlightService',
      () =>
        new HighlightService(
          container.resolve('repository'),
          container.resolve('renderer'),
          container.resolve('logger')
        )
    );

    highlightService = container.resolve('highlightService');
    renderer = container.resolve('renderer');
    repository = container.resolve('repository');
  });

  it('should create, render, and store highlight', async () => {
    // ✅ Arrange
    const text = 'Integration test text';

    // ✅ Act
    const highlight = await highlightService.createHighlight(text);

    // ✅ Assert - Check all integrated components

    // 1. Highlight created
    expect(highlight).toBeDefined();
    expect(highlight.text).toBe(text);

    // 2. Saved to repository
    const retrieved = await repository.findById(highlight.id);
    expect(retrieved).toEqual(highlight);

    // 3. Rendered to DOM
    const element = document.querySelector(
      `[data-highlight-id="${highlight.id}"]`
    );
    expect(element).toBeInTheDocument();
  });

  it('should handle full highlight lifecycle', async () => {
    // ✅ Create
    const highlight = await highlightService.createHighlight('Test');
    expect(await repository.findById(highlight.id)).toBeDefined();

    // ✅ Remove
    await highlightService.removeHighlight(highlight.id);
    expect(await repository.findById(highlight.id)).toBeNull();

    // ✅ Verify cleanup
    const element = document.querySelector(
      `[data-highlight-id="${highlight.id}"]`
    );
    expect(element).not.toBeInTheDocument();
  });
});
```

---

## End-to-End Testing

### 1. Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',

  // Timeout
  timeout: 30000,

  // Retries
  retries: process.env.CI ? 2 : 0,

  // Workers
  workers: process.env.CI ? 1 : undefined,

  // Reporter
  reporter: 'html',

  // Global setup
  use: {
    // Base URL
    baseURL: 'https://example.com',

    // Screenshots
    screenshot: 'only-on-failure',

    // Videos
    video: 'retain-on-failure',

    // Trace
    trace: 'on-first-retry',
  },

  // Projects (browsers)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Web server
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

### 2. E2E Test Example

```typescript
// tests/e2e/basic-highlighting.spec.ts
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Sprint Mode Highlighting', () => {
  test.beforeEach(async ({ context }) => {
    // Load extension
    const extensionPath = path.join(__dirname, '../../dist');
    await context.addInitScript({ path: extensionPath });
  });

  test('should highlight text with double-click', async ({ page }) => {
    // ✅ Navigate to test page
    await page.goto('https://example.com');

    // ✅ Double-click to select text
    await page.locator('h1').dblclick();

    // ✅ Verify highlight appears
    const highlight = page.locator('app-highlight');
    await expect(highlight).toBeVisible();
    await expect(highlight).toHaveCSS('background-color', 'rgb(255, 235, 59)');
  });

  test('should remove highlight on click', async ({ page }) => {
    await page.goto('https://example.com');

    // ✅ Create highlight
    await page.locator('p').first().dblclick();
    const highlight = page.locator('app-highlight').first();
    await expect(highlight).toBeVisible();

    // ✅ Click to remove
    await highlight.click();
    await expect(highlight).not.toBeVisible();
  });

  test('should clear all highlights with keyboard shortcut', async ({
    page,
  }) => {
    await page.goto('https://example.com');

    // ✅ Create multiple highlights
    await page.locator('p').nth(0).dblclick();
    await page.locator('p').nth(1).dblclick();

    const highlights = page.locator('app-highlight');
    await expect(highlights).toHaveCount(2);

    // ✅ Clear all with Ctrl+Shift+U
    await page.keyboard.press('Control+Shift+U');

    // ✅ Verify all removed
    await expect(highlights).toHaveCount(0);
  });

  test('should work across different websites', async ({ page }) => {
    const sites = [
      'https://en.wikipedia.org',
      'https://medium.com',
      'https://github.com',
    ];

    for (const site of sites) {
      await page.goto(site);

      // Find first paragraph
      const paragraph = page.locator('p').first();
      await paragraph.dblclick();

      // Verify highlight works
      const highlight = page.locator('app-highlight');
      await expect(highlight).toBeVisible();

      // Cleanup
      await page.keyboard.press('Control+Shift+U');
    }
  });
});
```

---

## Test Organization

### Directory Structure

```
tests/
├── unit/
│   ├── content/
│   │   ├── color-manager.test.ts
│   │   ├── highlight-factory.test.ts
│   │   ├── highlight-renderer.test.ts
│   │   └── selection-detector.test.ts
│   ├── shared/
│   │   ├── utils/
│   │   │   ├── dom-utils.test.ts
│   │   │   ├── color-utils.test.ts
│   │   │   └── type-guards.test.ts
│   │   └── validators.test.ts
│   └── background/
│       ├── storage.test.ts
│       └── event-bus.test.ts
├── integration/
│   ├── highlight-flow.test.ts
│   ├── mode-switching.test.ts
│   └── storage-sync.test.ts
├── e2e/
│   ├── basic-highlighting.spec.ts
│   ├── keyboard-shortcuts.spec.ts
│   ├── cross-site-compatibility.spec.ts
│   └── performance.spec.ts
├── fixtures/
│   ├── mock-data.ts
│   ├── test-pages/
│   │   ├── simple.html
│   │   ├── complex.html
│   │   └── spa.html
│   └── extensions/
│       └── test-extension/
└── helpers/
    ├── test-utils.ts
    ├── mock-factories.ts
    └── assertions.ts
```

---

## Mocking Strategies

### 1. Mock Objects

```typescript
/**
 * Mock logger for testing
 */
export class MockLogger implements ILogger {
  debugLogs: Array<{ message: string; meta: any[] }> = [];
  infoLogs: Array<{ message: string; meta: any[] }> = [];
  warnLogs: Array<{ message: string; meta: any[] }> = [];
  errorLogs: Array<{ message: string; error?: Error; meta: any[] }> = [];

  debug(message: string, ...meta: any[]): void {
    this.debugLogs.push({ message, meta });
  }

  info(message: string, ...meta: any[]): void {
    this.infoLogs.push({ message, meta });
  }

  warn(message: string, ...meta: any[]): void {
    this.warnLogs.push({ message, meta });
  }

  error(message: string, error?: Error, ...meta: any[]): void {
    this.errorLogs.push({ message, error, meta });
  }

  setLevel(level: LogLevel): void {}
  getLevel(): LogLevel {
    return LogLevel.INFO;
  }

  // Test helpers
  clear(): void {
    this.debugLogs = [];
    this.infoLogs = [];
    this.warnLogs = [];
    this.errorLogs = [];
  }

  hasError(messagePattern: string): boolean {
    return this.errorLogs.some((log) => log.message.includes(messagePattern));
  }
}
```

### 2. Mock Repository

```typescript
export class MockHighlightRepository implements IHighlightRepository {
  saved: Highlight[] = [];
  deleted: string[] = [];

  async save(highlight: Highlight): Promise<void> {
    this.saved.push(highlight);
  }

  async findById(id: string): Promise<Highlight | null> {
    return this.saved.find((h) => h.id === id) ?? null;
  }

  async delete(id: string): Promise<void> {
    this.saved = this.saved.filter((h) => h.id !== id);
    this.deleted.push(id);
  }

  clear(): void {
    this.saved = [];
    this.deleted = [];
  }
}
```

---

## Coverage Requirements

### Coverage Thresholds (`vitest.config.ts`)

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],

      // Coverage thresholds
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,

      // Exclude from coverage
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.config.ts',
        '**/types/**',
      ],

      // Per-file thresholds for critical files
      perFile: true,

      // Fail build if below threshold
      thresholdAutoUpdate: false,
    },
  },
});
```

### Critical Path Coverage (100%)

```typescript
// These files/functions require 100% coverage
const criticalPaths = [
  'src/shared/validators/**',
  'src/content/security/**',
  'src/background/storage/**',
];
```

---

**Next**: [Implementation Plan Template](./06-implementation-plan-template.md)
