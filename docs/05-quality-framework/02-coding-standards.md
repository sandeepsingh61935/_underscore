# Coding Standards & Style Guide
**Web Highlighter Extension - Code Quality Blueprint**

> **Purpose**: Establish consistent, maintainable, and high-quality code across the entire project.

---

## Table of Contents

1. [TypeScript Standards](#typescript-standards)
2. [Naming Conventions](#naming-conventions)
3. [Code Organization](#code-organization)
4. [Error Handling](#error-handling)
5. [Logging Standards](#logging-standards)
6. [Testing Standards](#testing-standards)
7. [Documentation Standards](#documentation-standards)
8. [Performance Guidelines](#performance-guidelines)
9. [Security Guidelines](#security-guidelines)
10. [Accessibility Guidelines](#accessibility-guidelines)

---

## TypeScript Standards

### 1. Strict Mode Configuration

**`tsconfig.json`** - Maximum Type Safety

```json
{
  "compilerOptions": {
    // Strict Type-Checking Options
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,

    // Additional Checks
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,

    // Module Resolution
    "moduleResolution": "node",
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,

    // Output
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "declaration": true,
    "sourceMap": true,
    "outDir": "./dist",

    // Path Mapping
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/content/*": ["src/content/*"],
      "@/background/*": ["src/background/*"],
      "@/shared/*": ["src/shared/*"],
      "@/utils/*": ["src/utils/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 2. Type Definitions

**❌ Bad - Loose types**
```typescript
function processHighlight(data: any): any {
  return data.text;
}

const highlights = [];
const config = {};
```

**✅ Good - Strict types**
```typescript
interface HighlightData {
  readonly id: string;
  readonly text: string;
  readonly color: string;
  readonly timestamp: Date;
  readonly selectors?: SelectorsData;
}

function processHighlight(data: HighlightData): string {
  return data.text;
}

const highlights: Highlight[] = [];
const config: HighlightRendererConfig = {
  shadowRoot: true,
  animationDuration: 200
};
```

### 3. Null Safety

**❌ Bad - Potential null reference errors**
```typescript
function getHighlightText(id: string): string {
  const highlight = store.get(id);
  return highlight.text; // ❌ Could be null!
}
```

**✅ Good - Explicit null handling**
```typescript
function getHighlightText(id: string): string | null {
  const highlight = store.get(id);
  
  if (!highlight) {
    return null;
  }
  
  return highlight.text;
}

// Or with Optional Chaining
function getHighlightText(id: string): string | undefined {
  return store.get(id)?.text;
}

// Or with Null Coalescing
function getHighlightText(id: string): string {
  const highlight = store.get(id);
  return highlight?.text ?? 'No text available';
}
```

### 4. Type Guards

```typescript
/**
 * Type guard to check if value is defined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard for Highlight interface
 */
export function isHighlight(value: unknown): value is Highlight {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'text' in value &&
    'color' in value &&
    typeof (value as any).id === 'string' &&
    typeof (value as any).text === 'string'
  );
}

// Usage
const highlights = data.filter(isDefined);
const validHighlights = highlights.filter(isHighlight);
```

### 5. Immutability

**❌ Bad - Mutating objects**
```typescript
function updateHighlight(highlight: Highlight, newColor: string): void {
  highlight.color = newColor; // ❌ Mutates input
}
```

**✅ Good - Immutable updates**
```typescript
function updateHighlight(
  highlight: Highlight,
  newColor: string
): Highlight {
  return {
    ...highlight,
    color: newColor
  };
}

// Or with readonly properties
interface Highlight {
  readonly id: string;
  readonly text: string;
  readonly color: string; // Cannot be modified after creation
}
```

### 6. Enums vs Union Types

**✅ Prefer Union Types for Constants**
```typescript
// ✅ Good - Union types (tree-shakeable)
export const Mode = {
  SPRINT: 'sprint',
  VAULT: 'vault',
  GEN: 'gen'
} as const;

export type ModeType = typeof Mode[keyof typeof Mode];

function setMode(mode: ModeType): void {
  // mode can only be 'sprint' | 'vault' | 'gen'
}

// ✅ Good - Use enums for numeric values or flags
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}
```

---

## Naming Conventions

### 1. Files and Directories

```
✅ Good:
  - highlight-service.ts       (kebab-case for files)
  - color-manager.ts
  - i-highlight-repository.ts  (interface prefix)

❌ Bad:
  - HighlightService.ts        (PascalCase)
  - highlight_service.ts       (snake_case)
  - highlightService.ts        (camelCase)

✅ Directory Structure:
  src/
    content/               (lowercase, plural if collection)
    background/
    shared/
      interfaces/          (group related files)
      utils/
      constants/
```

### 2. Variables and Functions

```typescript
// ✅ camelCase for variables and functions
const highlightCount = 10;
let currentMode: ModeType = 'sprint';

function createHighlight(text: string): Highlight {
  // ...
}

async function fetchHighlights(): Promise<Highlight[]> {
  // ...
}

// ✅ UPPER_SNAKE_CASE for constants
const MAX_HIGHLIGHTS_PER_PAGE = 50;
const DEFAULT_HIGHLIGHT_COLOR = '#FFEB3B';
const API_BASE_URL = 'https://api.example.com';

// ❌ Bad naming
const hl = createHl(); // Too terse
const highlightInformationDataStructure = {}; // Too verbose
```

### 3. Classes and Interfaces

```typescript
// ✅ PascalCase for classes
export class HighlightService {
  // ...
}

export class ColorManager {
  // ...
}

// ✅ PascalCase with 'I' prefix for interfaces
export interface IHighlightRepository {
  save(highlight: Highlight): Promise<void>;
  findById(id: string): Promise<Highlight | null>;
}

export interface ILogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

// ✅ Type aliases - PascalCase, descriptive
export type HighlightId = string;
export type ColorHex = string;
export type EventHandler<T> = (data: T) => void | Promise<void>;
```

### 4. Private Members

```typescript
export class HighlightRenderer {
  // ✅ Private fields with # prefix (ES2022)
  #shadowRoot: ShadowRoot;
  #config: RendererConfig;

  // ✅ Or use private keyword
  private highlights = new Map<string, HTMLElement>();
  private eventBus: IEventBus;

  // ✅ Public interface
  public async render(highlight: Highlight): Promise<void> {
    // ...
  }

  // ✅ Protected for inheritance
  protected validateHighlight(highlight: Highlight): boolean {
    return !!highlight.text && !!highlight.color;
  }

  // ✅ Private implementation details
  #createElement(highlight: Highlight): HTMLElement {
    // ...
  }
}
```

### 5. Boolean Variables

```typescript
// ✅ Use 'is', 'has', 'can', 'should' prefixes
const isActive = true;
const hasPermission = false;
const canEdit = true;
const shouldRender = false;
const wasSuccessful = true;

// ❌ Bad - ambiguous
const active = true;
const permission = false;
const edit = true;
```

---

## Code Organization

### 1. File Structure

**Standard File Template:**

```typescript
/**
 * @file highlight-service.ts
 * @description Service for managing highlight operations
 * @author Your Name
 */

// 1. External imports (third-party libraries)
import { v4 as uuidv4 } from 'uuid';

// 2. Internal imports - Types/Interfaces
import type { IHighlightRepository } from '@/shared/interfaces/i-highlight-repository';
import type { ILogger } from '@/shared/interfaces/i-logger';

// 3. Internal imports - Classes/Implementations
import { Highlight } from '@/shared/entities/highlight';
import { ColorManager } from '@/content/color-manager';

// 4. Internal imports - Utilities
import { isDefined } from '@/shared/utils/type-guards';

// 5. Internal imports - Constants
import { DEFAULT_HIGHLIGHT_COLOR } from '@/shared/constants/colors';

// 6. Type definitions (local to this file)
interface HighlightServiceConfig {
  readonly maxHighlightsPerPage: number;
  readonly defaultColor: string;
}

// 7. Constants (local to this file)
const DEFAULT_CONFIG: HighlightServiceConfig = {
  maxHighlightsPerPage: 50,
  defaultColor: DEFAULT_HIGHLIGHT_COLOR
};

// 8. Main implementation
export class HighlightService {
  // Class implementation
}

// 9. Helper functions (if needed)
function validateColor(color: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(color);
}
```

### 2. Function Organization

```typescript
export class HighlightRenderer {
  // 1. Static properties
  private static readonly MAX_RETRIES = 3;

  // 2. Instance properties
  private readonly config: RendererConfig;
  private highlights = new Map<string, HTMLElement>();

  // 3. Constructor
  constructor(
    config: RendererConfig,
    private readonly logger: ILogger
  ) {
    this.config = config;
  }

  // 4. Public methods (API surface)
  public async render(highlight: Highlight): Promise<void> {
    // Implementation
  }

  public async remove(id: string): Promise<void> {
    // Implementation
  }

  // 5. Protected methods (for inheritance)
  protected validateConfig(config: RendererConfig): boolean {
    // Implementation
  }

  // 6. Private methods (implementation details)
  private createElement(highlight: Highlight): HTMLElement {
    // Implementation
  }

  private attachEventListeners(element: HTMLElement): void {
    // Implementation
  }

  // 7. Static methods
  public static createDefault(logger: ILogger): HighlightRenderer {
    return new HighlightRenderer(DEFAULT_CONFIG, logger);
  }
}
```

### 3. Barrel Exports

**`src/content/index.ts`** - Barrel file for clean imports

```typescript
/**
 * Content script public API
 */

// Export entities
export { Highlight } from './entities/highlight';
export { Selection } from './entities/selection';

// Export services
export { HighlightService } from './services/highlight-service';
export { ColorManager } from './services/color-manager';
export { SelectionDetector } from './services/selection-detector';

// Export interfaces
export type { IHighlightRepository } from './interfaces/i-highlight-repository';
export type { IHighlightRenderer } from './interfaces/i-highlight-renderer';

// Re-export common types
export type {
  HighlightData,
  SelectorsData,
  ColorHex
} from './types';
```

**Usage:**
```typescript
// ✅ Clean import from barrel
import { HighlightService, ColorManager, Highlight } from '@/content';

// ❌ Avoid deep imports (breaks encapsulation)
import { HighlightService } from '@/content/services/highlight-service';
```

---

## Error Handling

### 1. Custom Error Classes

```typescript
/**
 * Base application error
 */
export abstract class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    
    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context
    };
  }
}

/**
 * Validation errors
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', context);
  }
}

/**
 * Highlight not found error
 */
export class HighlightNotFoundError extends AppError {
  constructor(highlightId: string) {
    super(
      `Highlight with ID ${highlightId} not found`,
      'HIGHLIGHT_NOT_FOUND',
      { highlightId }
    );
  }
}

/**
 * Storage errors
 */
export class StorageError extends AppError {
  constructor(message: string, cause?: Error) {
    super(message, 'STORAGE_ERROR', { cause: cause?.message });
  }
}
```

### 2. Error Handling Patterns

**❌ Bad - Silent failures**
```typescript
async function loadHighlights(): Promise<Highlight[]> {
  try {
    return await storage.getAll();
  } catch (error) {
    console.log('Error loading highlights');
    return []; // ❌ Silently fails, loses error information
  }
}
```

**✅ Good - Explicit error handling**
```typescript
async function loadHighlights(): Promise<Highlight[]> {
  try {
    const highlights = await storage.getAll();
    return highlights;
  } catch (error) {
    this.logger.error('Failed to load highlights', error);
    
    // Re-throw with context
    throw new StorageError(
      'Failed to load highlights from storage',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

// Or return Result type
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

async function loadHighlights(): Promise<Result<Highlight[]>> {
  try {
    const highlights = await storage.getAll();
    return { success: true, data: highlights };
  } catch (error) {
    this.logger.error('Failed to load highlights', error);
    return {
      success: false,
      error: new StorageError('Failed to load highlights', error as Error)
    };
  }
}

// Usage
const result = await loadHighlights();
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

### 3. Input Validation

```typescript
/**
 * Validation utilities
 */
export class Validator {
  static isValidHighlightId(id: unknown): id is string {
    return typeof id === 'string' && id.length > 0;
  }

  static isValidColor(color: unknown): color is string {
    return (
      typeof color === 'string' &&
      /^#[0-9A-F]{6}$/i.test(color)
    );
  }

  static isValidHighlightText(text: unknown): text is string {
    return (
      typeof text === 'string' &&
      text.trim().length > 0 &&
      text.length <= 10000 // Max length
    );
  }
}

// Usage in service
export class HighlightService {
  async createHighlight(text: string, color: string): Promise<Highlight> {
    // Validate inputs
    if (!Validator.isValidHighlightText(text)) {
      throw new ValidationError('Invalid highlight text', { text });
    }

    if (!Validator.isValidColor(color)) {
      throw new ValidationError('Invalid color format', { color });
    }

    // Proceed with creation
    // ...
  }
}
```

---

## Logging Standards

### 1. Logger Interface

```typescript
/**
 * Logging levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 999
}

/**
 * Logger interface
 */
export interface ILogger {
  debug(message: string, ...meta: any[]): void;
  info(message: string, ...meta: any[]): void;
  warn(message: string, ...meta: any[]): void;
  error(message: string, error?: Error, ...meta: any[]): void;
  setLevel(level: LogLevel): void;
}

/**
 * Logger implementation
 */
export class Logger implements ILogger {
  private level: LogLevel;

  constructor(
    private readonly namespace: string,
    level: LogLevel = LogLevel.INFO
  ) {
    this.level = level;
  }

  debug(message: string, ...meta: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(this.format('DEBUG', message), ...meta);
    }
  }

  info(message: string, ...meta: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.info(this.format('INFO', message), ...meta);
    }
  }

  warn(message: string, ...meta: any[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(this.format('WARN', message), ...meta);
    }
  }

  error(message: string, error?: Error, ...meta: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(this.format('ERROR', message), error, ...meta);
      
      // Log stack trace for errors
      if (error?.stack) {
        console.error(error.stack);
      }
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private format(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [${this.namespace}] ${message}`;
  }
}
```

### 2. Logging Best Practices

```typescript
export class HighlightService {
  private readonly logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  async createHighlight(text: string): Promise<Highlight> {
    // ✅ Log entry with context
    this.logger.debug('Creating highlight', { textLength: text.length });

    try {
      const highlight = new Highlight(
        crypto.randomUUID(),
        text,
        DEFAULT_COLOR,
        new Date()
      );

      await this.repository.save(highlight);

      // ✅ Log success
      this.logger.info('Highlight created', { id: highlight.id });

      return highlight;
    } catch (error) {
      // ✅ Log error with context
      this.logger.error(
        'Failed to create highlight',
        error as Error,
        { textLength: text.length }
      );

      throw error;
    }
  }

  async fetchHighlights(url: string): Promise<Highlight[]> {
    const startTime = performance.now();

    this.logger.debug('Fetching highlights', { url });

    try {
      const highlights = await this.repository.findByUrl(url);

      const duration = performance.now() - startTime;

      // ✅ Log performance metrics
      this.logger.info('Highlights fetched', {
        count: highlights.length,
        duration: `${duration.toFixed(2)}ms`,
        url
      });

      return highlights;
    } catch (error) {
      this.logger.error('Failed to fetch highlights', error as Error, { url });
      throw error;
    }
  }
}
```

---

## Testing Standards

### 1. Unit Test Structure

```typescript
/**
 * Unit test example
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HighlightService } from '@/content/services/highlight-service';
import { Highlight } from '@/content/entities/highlight';

describe('HighlightService', () => {
  let service: HighlightService;
  let mockRepository: MockHighlightRepository;
  let mockLogger: MockLogger;

  beforeEach(() => {
    // ✅ Setup fresh instances for each test
    mockRepository = new MockHighlightRepository();
    mockLogger = new MockLogger();
    service = new HighlightService(mockRepository, mockLogger);
  });

  afterEach(() => {
    // ✅ Cleanup
    vi.clearAllMocks();
  });

  describe('createHighlight', () => {
    it('should create highlight with valid input', async () => {
      // ✅ Arrange
      const text = 'Important text';
      const color = '#FFEB3B';

      // ✅ Act
      const highlight = await service.createHighlight(text, color);

      // ✅ Assert
      expect(highlight).toBeInstanceOf(Highlight);
      expect(highlight.text).toBe(text);
      expect(highlight.color).toBe(color);
      expect(mockRepository.saved).toContain(highlight);
    });

    it('should throw ValidationError for empty text', async () => {
      // ✅ Arrange
      const text = '';
      const color = '#FFEB3B';

      // ✅ Act & Assert
      await expect(
        service.createHighlight(text, color)
      ).rejects.toThrow(ValidationError);
    });

    it('should log creation', async () => {
      // ✅ Arrange
      const text = 'Important text';
      const color = '#FFEB3B';

      // ✅ Act
      await service.createHighlight(text, color);

      // ✅ Assert
      expect(mockLogger.infoLogs).toContainEqual(
        expect.objectContaining({
          message: 'Highlight created'
        })
      );
    });
  });

  describe('removeHighlight', () => {
    it('should remove existing highlight', async () => {
      // Test implementation
    });

    it('should throw HighlightNotFoundError for non-existent ID', async () => {
      // Test implementation
    });
  });
});
```

### 2. Test Coverage Requirements

```yaml
Coverage Targets:
  Statements: 80%
  Branches: 75%
  Functions: 80%
  Lines: 80%

Critical Paths (100% coverage required):
  - Error handling
  - Validation logic
  - Security-sensitive code
  - Data transformation

Acceptable Low Coverage:
  - UI components (manual testing)
  - Browser API wrappers (integration tests)
  - Configuration files
```

---

**Continued in Part 2...**

This document covers:
✅ TypeScript strict mode configuration
✅ Naming conventions (files, variables, classes)
✅ Code organization patterns
✅ Error handling strategies
✅ Logging standards
✅ Testing structure

*Next sections will cover:*
- Documentation Standards
- Performance Guidelines
- Security Guidelines
- Accessibility Guidelines
- Code Review Checklist
