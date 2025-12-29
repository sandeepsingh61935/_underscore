# Architecture Principles & Best Practices

**Web Highlighter Extension - Architectural Excellence**

> **Purpose**: Define core architectural principles that guide all technical
> decisions in the project.

---

## Table of Contents

1. [Core Principles](#core-principles)
2. [SOLID Principles](#solid-principles)
3. [Dependency Management](#dependency-management)
4. [Separation of Concerns](#separation-of-concerns)
5. [Domain-Driven Design](#domain-driven-design)
6. [Performance Architecture](#performance-architecture)
7. [Security Architecture](#security-architecture)
8. [Scalability Patterns](#scalability-patterns)

---

## Core Principles

### 1. KISS (Keep It Simple, Stupid)

**Principle**: Simplicity should be a key goal in design, and unnecessary
complexity should be avoided.

**❌ Bad - Over-engineered**

```typescript
// Abstract factory pattern for simple color creation
interface IColorFactory {
  createColor(): IColor;
}

interface IColor {
  toHex(): string;
  toRGB(): string;
  validate(): boolean;
}

class ColorFactoryBuilder {
  // ... 50 lines of unnecessary abstraction
}
```

**✅ Good - Simple and direct**

```typescript
// Simple color utilities
export const ColorUtils = {
  isValidHex(color: string): boolean {
    return /^#[0-9A-F]{6}$/i.test(color);
  },

  hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  },
};
```

**Guidelines**:

- ✅ Write code that is easy to understand at first glance
- ✅ Avoid premature abstraction
- ✅ Use patterns only when complexity justifies them
- ✅ Prefer composition over inheritance
- ❌ Don't create abstractions you might need "someday"

---

### 2. YAGNI (You Aren't Gonna Need It)

**Principle**: Don't add functionality until deemed necessary.

**❌ Bad - Building for unknown future**

```typescript
// Sprint Mode doesn't need database, but let's add it anyway
export class SprintMode {
  constructor(
    private database: IDatabase, // ❌ Not needed yet
    private syncService: ISyncService, // ❌ Not needed yet
    private aiService: IAIService // ❌ Not needed yet
  ) {}

  // Complex infrastructure for features we haven't built
  async syncToCloud(): Promise<void> {
    // Not needed in Sprint Mode!
  }
}
```

**✅ Good - Build what you need now**

```typescript
// Sprint Mode: In-memory only (exactly what's needed)
export class SprintMode {
  private highlights = new Map<string, Highlight>();

  constructor(private readonly renderer: IHighlightRenderer) {}

  async highlight(selection: Selection): Promise<void> {
    const highlight = this.createHighlight(selection);
    await this.renderer.render(highlight);
    this.highlights.set(highlight.id, highlight);
  }

  // Simple, focused on current requirements
}
```

**Guidelines**:

- ✅ Build features when they're actually required
- ✅ Start simple, refactor when patterns emerge
- ✅ Defer decisions until you have more information
- ❌ Don't add "nice-to-have" features preemptively
- ❌ Avoid building complex infrastructure for hypothetical use cases

---

### 3. DRY (Don't Repeat Yourself)

**Principle**: Every piece of knowledge must have a single, unambiguous,
authoritative representation.

**❌ Bad - Duplicated logic**

```typescript
// Validation duplicated everywhere
export class HighlightService {
  async create(text: string): Promise<Highlight> {
    if (!text || text.trim().length === 0) {
      throw new Error('Empty text');
    }
    if (text.length > 10000) {
      throw new Error('Text too long');
    }
    // ... create highlight
  }
}

export class HighlightFactory {
  createFromSelection(selection: Selection): Highlight {
    const text = selection.toString();
    if (!text || text.trim().length === 0) {
      // ❌ Duplicated
      throw new Error('Empty text');
    }
    if (text.length > 10000) {
      // ❌ Duplicated
      throw new Error('Text too long');
    }
    // ... create highlight
  }
}
```

**✅ Good - Single source of truth**

```typescript
// Centralized validation
export class HighlightValidator {
  static readonly MAX_TEXT_LENGTH = 10000;

  static validateText(text: string): void {
    if (!text || text.trim().length === 0) {
      throw new ValidationError('Highlight text cannot be empty');
    }

    if (text.length > this.MAX_TEXT_LENGTH) {
      throw new ValidationError(
        `Text exceeds maximum length of ${this.MAX_TEXT_LENGTH} characters`
      );
    }
  }

  static isValidColor(color: string): boolean {
    return /^#[0-9A-F]{6}$/i.test(color);
  }
}

// Usage - no duplication
export class HighlightService {
  async create(text: string): Promise<Highlight> {
    HighlightValidator.validateText(text);
    // ... create highlight
  }
}

export class HighlightFactory {
  createFromSelection(selection: Selection): Highlight {
    const text = selection.toString();
    HighlightValidator.validateText(text);
    // ... create highlight
  }
}
```

**Guidelines**:

- ✅ Extract common logic into utilities
- ✅ Use constants for repeated values
- ✅ Create shared validators, formatters, etc.
- ❌ Don't copy-paste code
- ❌ Avoid similar logic in multiple places

---

### 4. Single Responsibility Principle (SRP)

**Principle**: A class should have only one reason to change.

**❌ Bad - God object with multiple responsibilities**

```typescript
export class HighlightManager {
  // ❌ Too many responsibilities
  async createHighlight(text: string): Promise<Highlight> {
    /* ... */
  }
  async saveToStorage(highlight: Highlight): Promise<void> {
    /* ... */
  }
  async syncToCloud(highlight: Highlight): Promise<void> {
    /* ... */
  }
  renderToDOM(highlight: Highlight): void {
    /* ... */
  }
  calculateContrast(bg: string, fg: string): number {
    /* ... */
  }
  generateMindmap(highlights: Highlight[]): string {
    /* ... */
  }
  exportToMarkdown(highlights: Highlight[]): string {
    /* ... */
  }
  validatePermissions(): boolean {
    /* ... */
  }
}
```

**✅ Good - Single responsibility per class**

```typescript
// 1. Domain logic - Creating highlights
export class HighlightFactory {
  createFromSelection(selection: Selection): Highlight {
    // Only responsible for creating Highlight objects
  }
}

// 2. Storage logic
export class HighlightRepository {
  async save(highlight: Highlight): Promise<void> {
    // Only responsible for storage operations
  }

  async findById(id: string): Promise<Highlight | null> {
    // Only responsible for retrieval
  }
}

// 3. Rendering logic
export class HighlightRenderer {
  async render(highlight: Highlight): Promise<void> {
    // Only responsible for DOM rendering
  }
}

// 4. Color calculations
export class ColorManager {
  calculateContrast(bg: string, fg: string): number {
    // Only responsible for color operations
  }
}

// 5. Export logic
export class HighlightExporter {
  toMarkdown(highlights: Highlight[]): string {
    // Only responsible for export transformations
  }
}

// Orchestration
export class HighlightService {
  constructor(
    private readonly factory: HighlightFactory,
    private readonly repository: HighlightRepository,
    private readonly renderer: HighlightRenderer
  ) {}

  async createAndSaveHighlight(selection: Selection): Promise<Highlight> {
    const highlight = this.factory.createFromSelection(selection);
    await this.repository.save(highlight);
    await this.renderer.render(highlight);
    return highlight;
  }
}
```

---

## SOLID Principles

### 1. Open/Closed Principle (OCP)

**Principle**: Software entities should be open for extension, but closed for
modification.

**❌ Bad - Requires modification to add new modes**

```typescript
export class ModeManager {
  async handleHighlight(mode: string, selection: Selection): Promise<void> {
    if (mode === 'sprint') {
      // Sprint mode logic
      this.renderInMemory(selection);
    } else if (mode === 'vault') {
      // Vault mode logic
      this.renderAndSave(selection);
    } else if (mode === 'gen') {
      // Gen mode logic
      this.renderSaveAndAnalyze(selection);
    }
    // ❌ Must modify this function to add new modes
  }
}
```

**✅ Good - Open for extension via plugin pattern**

```typescript
// Abstract interface
export interface IHighlightMode {
  readonly name: string;
  highlight(selection: Selection): Promise<void>;
}

// Implementations
export class SprintMode implements IHighlightMode {
  readonly name = 'sprint';

  async highlight(selection: Selection): Promise<void> {
    // Sprint-specific logic
  }
}

export class VaultMode implements IHighlightMode {
  readonly name = 'vault';

  async highlight(selection: Selection): Promise<void> {
    // Vault-specific logic
  }
}

// Manager doesn't need modification for new modes
export class ModeManager {
  private modes = new Map<string, IHighlightMode>();

  registerMode(mode: IHighlightMode): void {
    this.modes.set(mode.name, mode);
  }

  async highlight(modeName: string, selection: Selection): Promise<void> {
    const mode = this.modes.get(modeName);
    if (!mode) {
      throw new Error(`Mode ${modeName} not registered`);
    }
    await mode.highlight(selection);
  }
}

// ✅ New modes can be added without modifying ModeManager
class CollaborativeMode implements IHighlightMode {
  readonly name = 'collaborative';

  async highlight(selection: Selection): Promise<void> {
    // Collaborative mode logic
  }
}

modeManager.registerMode(new CollaborativeMode());
```

---

### 2. Liskov Substitution Principle (LSP)

**Principle**: Objects of a superclass should be replaceable with objects of a
subclass without breaking the application.

**❌ Bad - Subclass breaks contract**

```typescript
interface IHighlightRepository {
  save(highlight: Highlight): Promise<void>;
  findById(id: string): Promise<Highlight | null>;
}

class InMemoryRepository implements IHighlightRepository {
  async save(highlight: Highlight): Promise<void> {
    // ✅ Works
  }

  async findById(id: string): Promise<Highlight | null> {
    // ✅ Works
  }
}

class ReadOnlyRepository implements IHighlightRepository {
  async save(highlight: Highlight): Promise<void> {
    // ❌ Throws error - violates LSP!
    throw new Error('Read-only repository cannot save');
  }

  async findById(id: string): Promise<Highlight | null> {
    // ✅ Works
  }
}
```

**✅ Good - Proper interface segregation**

```typescript
// Separate read and write concerns
interface IReadableRepository {
  findById(id: string): Promise<Highlight | null>;
  findByUrl(url: string): Promise<Highlight[]>;
}

interface IWritableRepository {
  save(highlight: Highlight): Promise<void>;
  delete(id: string): Promise<void>;
}

// Full repository combines both
interface IHighlightRepository
  extends IReadableRepository, IWritableRepository {}

// ✅ Read-only implementation only implements read interface
class ReadOnlyRepository implements IReadableRepository {
  async findById(id: string): Promise<Highlight | null> {
    // Works
  }

  async findByUrl(url: string): Promise<Highlight[]> {
    // Works
  }
}

// ✅ Full repository implements both
class FullRepository implements IHighlightRepository {
  async save(highlight: Highlight): Promise<void> {
    /* ... */
  }
  async delete(id: string): Promise<void> {
    /* ... */
  }
  async findById(id: string): Promise<Highlight | null> {
    /* ... */
  }
  async findByUrl(url: string): Promise<Highlight[]> {
    /* ... */
  }
}
```

---

### 3. Interface Segregation Principle (ISP)

**Principle**: Clients should not be forced to depend on interfaces they don't
use.

**❌ Bad - Fat interface**

```typescript
interface IHighlightService {
  // Sprint Mode only needs these
  createHighlight(text: string): Promise<Highlight>;
  removeHighlight(id: string): Promise<void>;

  // Vault Mode needs these
  saveToStorage(highlight: Highlight): Promise<void>;
  loadFromStorage(url: string): Promise<Highlight[]>;

  // Gen Mode needs these
  generateMindmap(highlights: Highlight[]): Promise<string>;
  analyzeSentiment(highlights: Highlight[]): Promise<SentimentResult>;

  // Admin needs these
  exportAll(): Promise<Blob>;
  deleteAll(): Promise<void>;
}

// ❌ Sprint Mode forced to implement unused methods
class SprintModeService implements IHighlightService {
  async createHighlight(text: string): Promise<Highlight> {
    /* works */
  }
  async removeHighlight(id: string): Promise<void> {
    /* works */
  }

  // ❌ Not used in Sprint Mode but forced to implement
  async saveToStorage(): Promise<void> {
    throw new Error('Not supported');
  }
  async generateMindmap(): Promise<string> {
    throw new Error('Not supported');
  }
  async analyzeSentiment(): Promise<any> {
    throw new Error('Not supported');
  }
  async exportAll(): Promise<Blob> {
    throw new Error('Not supported');
  }
  async deleteAll(): Promise<void> {
    throw new Error('Not supported');
  }
}
```

**✅ Good - Segregated interfaces**

```typescript
// Core operations
interface IBasicHighlightOperations {
  createHighlight(text: string): Promise<Highlight>;
  removeHighlight(id: string): Promise<void>;
}

// Storage operations
interface IPersistentHighlightOperations {
  saveToStorage(highlight: Highlight): Promise<void>;
  loadFromStorage(url: string): Promise<Highlight[]>;
}

// AI operations
interface IAIHighlightOperations {
  generateMindmap(highlights: Highlight[]): Promise<string>;
  analyzeSentiment(highlights: Highlight[]): Promise<SentimentResult>;
}

// Admin operations
interface IAdminHighlightOperations {
  exportAll(): Promise<Blob>;
  deleteAll(): Promise<void>;
}

// ✅ Sprint Mode only implements what it needs
class SprintModeService implements IBasicHighlightOperations {
  async createHighlight(text: string): Promise<Highlight> {
    /* ... */
  }
  async removeHighlight(id: string): Promise<void> {
    /* ... */
  }
}

// ✅ Vault Mode implements basic + persistent
class VaultModeService
  implements IBasicHighlightOperations, IPersistentHighlightOperations
{
  async createHighlight(text: string): Promise<Highlight> {
    /* ... */
  }
  async removeHighlight(id: string): Promise<void> {
    /* ... */
  }
  async saveToStorage(highlight: Highlight): Promise<void> {
    /* ... */
  }
  async loadFromStorage(url: string): Promise<Highlight[]> {
    /* ... */
  }
}

// ✅ Gen Mode implements all three
class GenModeService
  implements
    IBasicHighlightOperations,
    IPersistentHighlightOperations,
    IAIHighlightOperations {
  // Implements all methods
}
```

---

### 4. Dependency Inversion Principle (DIP)

**Principle**: High-level modules should not depend on low-level modules. Both
should depend on abstractions.

**❌ Bad - Tight coupling to concrete implementations**

```typescript
export class HighlightService {
  private repository: InMemoryRepository; // ❌ Depends on concrete class
  private logger: ConsoleLogger; // ❌ Depends on concrete class

  constructor() {
    this.repository = new InMemoryRepository(); // ❌ Hard-coded
    this.logger = new ConsoleLogger(); // ❌ Hard-coded
  }

  async createHighlight(text: string): Promise<Highlight> {
    this.logger.log('Creating highlight');
    // ...
  }
}

// ❌ Cannot swap implementations for testing or different environments
```

**✅ Good - Depend on abstractions**

```typescript
// Abstractions (interfaces)
export interface IHighlightRepository {
  save(highlight: Highlight): Promise<void>;
  findById(id: string): Promise<Highlight | null>;
}

export interface ILogger {
  debug(message: string, ...meta: any[]): void;
  info(message: string, ...meta: any[]): void;
  error(message: string, error?: Error): void;
}

// ✅ High-level module depends on abstractions
export class HighlightService {
  constructor(
    private readonly repository: IHighlightRepository, // ✅ Interface
    private readonly logger: ILogger // ✅ Interface
  ) {}

  async createHighlight(text: string): Promise<Highlight> {
    this.logger.info('Creating highlight');
    const highlight = new Highlight(/* ... */);
    await this.repository.save(highlight);
    return highlight;
  }
}

// ✅ Can swap implementations easily
const productionService = new HighlightService(
  new InMemoryRepository(),
  new ConsoleLogger()
);

const testService = new HighlightService(
  new MockRepository(),
  new SilentLogger()
);

const cloudService = new HighlightService(
  new CloudRepository(),
  new StructuredLogger()
);
```

---

## Dependency Management

### 1. Dependency Injection

**✅ Constructor Injection (Preferred)**

```typescript
export class HighlightRenderer {
  constructor(
    private readonly logger: ILogger,
    private readonly eventBus: IEventBus,
    private readonly config: RendererConfig
  ) {}
}
```

**✅ Container-Based DI**

```typescript
// Service container
const container = new ServiceContainer();

// Register dependencies
container.registerSingleton('logger', () => new Logger());
container.registerSingleton(
  'eventBus',
  () => new EventBus(container.resolve('logger'))
);

container.registerTransient(
  'highlightService',
  () =>
    new HighlightService(
      container.resolve('repository'),
      container.resolve('logger')
    )
);

// Resolve services
const service = container.resolve<HighlightService>('highlightService');
```

---

## Performance Architecture

### 1. Lazy Loading

```typescript
/**
 * Lazy-load expensive dependencies
 */
export class AIService {
  private aiModel?: AIModel;

  private async loadModel(): Promise<AIModel> {
    if (!this.aiModel) {
      this.logger.info('Loading AI model (lazy)...');
      this.aiModel = await import('./ai-model').then((m) => new m.AIModel());
    }
    return this.aiModel;
  }

  async analyze(text: string): Promise<Analysis> {
    const model = await this.loadModel();
    return model.analyze(text);
  }
}
```

### 2. Caching Strategy

```typescript
/**
 * LRU Cache implementation
 */
export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);

    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }

    return value;
  }

  set(key: K, value: V): void {
    // Delete if exists (will re-insert at end)
    this.cache.delete(key);

    // Add to end
    this.cache.set(key, value);

    // Evict oldest if over capacity
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }
}

// Usage in repository
export class CachingRepository implements IHighlightRepository {
  private cache = new LRUCache<string, Highlight>(100);

  async findById(id: string): Promise<Highlight | null> {
    // Check cache first
    const cached = this.cache.get(id);
    if (cached) {
      return cached;
    }

    // Fetch from storage
    const highlight = await this.storage.get(id);

    if (highlight) {
      this.cache.set(id, highlight);
    }

    return highlight;
  }
}
```

---

**Next Document**:
[Error Handling & Logging Framework](./03-error-logging-framework.md)
