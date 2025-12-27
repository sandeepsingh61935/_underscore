# System Design Patterns
**Web Highlighter Extension - Design Pattern Catalog**

> **Purpose**: Comprehensive guide to design patterns, architectural decisions, and best practices for building a maintainable, scalable, and robust browser extension.

---

## Table of Contents

1. [Architectural Patterns](#architectural-patterns)
2. [Creational Patterns](#creational-patterns)
3. [Structural Patterns](#structural-patterns)
4. [Behavioral Patterns](#behavioral-patterns)
5. [Extension-Specific Patterns](#extension-specific-patterns)
6. [State Management Patterns](#state-management-patterns)
7. [Communication Patterns](#communication-patterns)
8. [Performance Patterns](#performance-patterns)

---

## Architectural Patterns

### 1. Layered Architecture

**Problem**: Need clear separation of concerns and unidirectional data flow.

**Solution**: Organize code into distinct layers with well-defined responsibilities.

```typescript
/**
 * Layer Structure:
 * 
 * ┌─────────────────────────────────────┐
 * │   PRESENTATION LAYER                │
 * │   - Popup UI                        │
 * │   - Settings Page                   │
 * │   - Content Script UI               │
 * └──────────────┬──────────────────────┘
 *                │
 * ┌──────────────▼──────────────────────┐
 * │   APPLICATION LAYER                 │
 * │   - Mode Managers                   │
 * │   - Highlight Controllers           │
 * │   - Event Handlers                  │
 * └──────────────┬──────────────────────┘
 *                │
 * ┌──────────────▼──────────────────────┐
 * │   DOMAIN LAYER                      │
 * │   - Highlight Entity                │
 * │   - Selection Entity                │
 * │   - Color Entity                    │
 * └──────────────┬──────────────────────┘
 *                │
 * ┌──────────────▼──────────────────────┐
 * │   INFRASTRUCTURE LAYER              │
 * │   - Storage Adapters                │
 * │   - DOM Utilities                   │
 * │   - Browser API Wrappers            │
 * └─────────────────────────────────────┘
 */

// Example: Clear layer boundaries
// Domain Layer - Pure business logic
export class Highlight {
  constructor(
    public readonly id: string,
    public readonly text: string,
    public readonly color: string,
    public readonly timestamp: Date
  ) {}

  isExpired(ttl: number): boolean {
    return Date.now() - this.timestamp.getTime() > ttl;
  }
}

// Application Layer - Orchestrates domain logic
export class HighlightService {
  constructor(
    private readonly repository: IHighlightRepository,
    private readonly renderer: IHighlightRenderer
  ) {}

  async createHighlight(text: string, color: string): Promise<Highlight> {
    const highlight = new Highlight(
      crypto.randomUUID(),
      text,
      color,
      new Date()
    );
    
    await this.repository.save(highlight);
    await this.renderer.render(highlight);
    
    return highlight;
  }
}

// Infrastructure Layer - External dependencies
export class InMemoryHighlightRepository implements IHighlightRepository {
  private storage = new Map<string, Highlight>();

  async save(highlight: Highlight): Promise<void> {
    this.storage.set(highlight.id, highlight);
  }

  async findById(id: string): Promise<Highlight | null> {
    return this.storage.get(id) ?? null;
  }
}
```

**Benefits**:
- ✅ Clear separation of concerns
- ✅ Testable in isolation
- ✅ Easy to replace infrastructure
- ✅ Predictable data flow

---

### 2. Plugin Architecture (Strategy Pattern)

**Problem**: Need to support multiple modes (Sprint/Vault/Gen) with shared core functionality.

**Solution**: Define a plugin interface and implement mode-specific behavior.

```typescript
/**
 * Plugin Architecture for Modes
 */

// Core abstraction
export interface IHighlightMode {
  readonly name: string;
  readonly icon: string;
  
  // Lifecycle hooks
  onActivate(): Promise<void>;
  onDeactivate(): Promise<void>;
  
  // Core operations
  highlight(selection: Selection): Promise<void>;
  removeHighlight(id: string): Promise<void>;
  clearAll(): Promise<void>;
  
  // Restoration
  restore(url: string): Promise<void>;
}

// Base implementation with common logic
export abstract class BaseHighlightMode implements IHighlightMode {
  protected highlights = new Map<string, Highlight>();
  
  constructor(
    protected readonly renderer: IHighlightRenderer,
    protected readonly logger: ILogger
  ) {}

  abstract get name(): string;
  abstract get icon(): string;

  async onActivate(): Promise<void> {
    this.logger.info(`${this.name} mode activated`);
  }

  async onDeactivate(): Promise<void> {
    this.logger.info(`${this.name} mode deactivated`);
  }

  protected async renderHighlight(highlight: Highlight): Promise<void> {
    await this.renderer.render(highlight);
    this.highlights.set(highlight.id, highlight);
  }

  async removeHighlight(id: string): Promise<void> {
    await this.renderer.remove(id);
    this.highlights.delete(id);
  }

  async clearAll(): Promise<void> {
    for (const id of this.highlights.keys()) {
      await this.removeHighlight(id);
    }
  }
}

// Sprint Mode: In-memory only
export class SprintMode extends BaseHighlightMode {
  get name() { return 'Sprint'; }
  get icon() { return '🏃'; }

  async highlight(selection: Selection): Promise<void> {
    const highlight = this.createHighlightFromSelection(selection);
    await this.renderHighlight(highlight);
    // No persistence - in memory only
  }

  async restore(url: string): Promise<void> {
    // Sprint mode: No restoration (ephemeral)
    this.logger.debug('Sprint mode: No highlights to restore');
  }

  private createHighlightFromSelection(selection: Selection): Highlight {
    return new Highlight(
      crypto.randomUUID(),
      selection.toString(),
      this.getDefaultColor(),
      new Date()
    );
  }

  private getDefaultColor(): string {
    return '#FFEB3B'; // Yellow
  }
}

// Vault Mode: With persistence (future)
export class VaultMode extends BaseHighlightMode {
  get name() { return 'Vault'; }
  get icon() { return '🔐'; }

  constructor(
    renderer: IHighlightRenderer,
    logger: ILogger,
    private readonly storage: IStorageAdapter
  ) {
    super(renderer, logger);
  }

  async highlight(selection: Selection): Promise<void> {
    const highlight = this.createHighlightFromSelection(selection);
    
    // Render immediately
    await this.renderHighlight(highlight);
    
    // Persist to storage
    await this.storage.save(highlight);
  }

  async restore(url: string): Promise<void> {
    const highlights = await this.storage.findByUrl(url);
    
    for (const highlight of highlights) {
      await this.renderHighlight(highlight);
    }
  }

  private createHighlightFromSelection(selection: Selection): Highlight {
    // More complex logic with selectors, anchoring, etc.
    return new Highlight(
      crypto.randomUUID(),
      selection.toString(),
      this.getDefaultColor(),
      new Date()
    );
  }

  private getDefaultColor(): string {
    return '#FFEB3B';
  }
}

// Mode Manager: Orchestrates mode switching
export class ModeManager {
  private currentMode: IHighlightMode;
  
  constructor(
    private readonly modes: Map<string, IHighlightMode>,
    private readonly logger: ILogger
  ) {
    // Initialize with Sprint mode
    this.currentMode = modes.get('sprint')!;
  }

  async switchMode(modeName: string): Promise<void> {
    const newMode = this.modes.get(modeName);
    
    if (!newMode) {
      throw new Error(`Mode ${modeName} not found`);
    }

    if (this.currentMode === newMode) {
      return; // Already in this mode
    }

    this.logger.info(`Switching from ${this.currentMode.name} to ${newMode.name}`);

    // Deactivate current mode
    await this.currentMode.onDeactivate();

    // Switch to new mode
    this.currentMode = newMode;

    // Activate new mode
    await this.currentMode.onActivate();
  }

  getCurrentMode(): IHighlightMode {
    return this.currentMode;
  }

  async delegateHighlight(selection: Selection): Promise<void> {
    await this.currentMode.highlight(selection);
  }
}
```

**Benefits**:
- ✅ Easy to add new modes
- ✅ Shared common functionality
- ✅ Mode-specific behavior isolated
- ✅ Hot-swappable at runtime

---

## Creational Patterns

### 1. Factory Pattern

**Problem**: Need to create complex objects with varied configurations.

**Solution**: Centralize object creation logic in factory classes.

```typescript
/**
 * Factory Pattern for Highlight Creation
 */

export interface HighlightData {
  id?: string;
  text: string;
  color: string;
  selectors?: SelectorsData;
  timestamp?: Date;
}

export class HighlightFactory {
  private readonly colorManager: ColorManager;
  private readonly selectorEngine: SelectorEngine;

  constructor(colorManager: ColorManager, selectorEngine: SelectorEngine) {
    this.colorManager = colorManager;
    this.selectorEngine = selectorEngine;
  }

  /**
   * Create highlight from text selection
   */
  createFromSelection(
    selection: Selection,
    userColor?: string
  ): Highlight {
    const text = selection.toString().trim();
    
    if (!text) {
      throw new Error('Cannot create highlight from empty selection');
    }

    const color = userColor ?? this.colorManager.getDefaultColor();
    const id = this.generateId();
    const selectors = this.selectorEngine.generateSelectors(selection);

    return new Highlight(id, text, color, new Date(), selectors);
  }

  /**
   * Create highlight from stored data
   */
  createFromData(data: HighlightData): Highlight {
    return new Highlight(
      data.id ?? this.generateId(),
      data.text,
      data.color,
      data.timestamp ?? new Date(),
      data.selectors
    );
  }

  /**
   * Create multiple highlights in batch
   */
  createBatch(dataList: HighlightData[]): Highlight[] {
    return dataList.map(data => this.createFromData(data));
  }

  private generateId(): string {
    return crypto.randomUUID();
  }
}
```

### 2. Builder Pattern

**Problem**: Need to construct complex configuration objects step-by-step.

**Solution**: Use builder pattern for fluent configuration.

```typescript
/**
 * Builder Pattern for Complex Configuration
 */

export class HighlightRendererConfig {
  constructor(
    public readonly shadowRoot: boolean = true,
    public readonly animationDuration: number = 200,
    public readonly hoverEffect: boolean = true,
    public readonly fadeIn: boolean = true,
    public readonly zIndex: number = 2147483647,
    public readonly className: string = 'app-highlight'
  ) {}
}

export class HighlightRendererConfigBuilder {
  private config: Partial<HighlightRendererConfig> = {};

  withShadowRoot(enabled: boolean): this {
    this.config.shadowRoot = enabled;
    return this;
  }

  withAnimation(duration: number): this {
    this.config.animationDuration = duration;
    return this;
  }

  withHoverEffect(enabled: boolean): this {
    this.config.hoverEffect = enabled;
    return this;
  }

  withFadeIn(enabled: boolean): this {
    this.config.fadeIn = enabled;
    return this;
  }

  withZIndex(value: number): this {
    this.config.zIndex = value;
    return this;
  }

  withClassName(name: string): this {
    this.config.className = name;
    return this;
  }

  build(): HighlightRendererConfig {
    return new HighlightRendererConfig(
      this.config.shadowRoot,
      this.config.animationDuration,
      this.config.hoverEffect,
      this.config.fadeIn,
      this.config.zIndex,
      this.config.className
    );
  }
}

// Usage
const config = new HighlightRendererConfigBuilder()
  .withAnimation(300)
  .withHoverEffect(true)
  .withShadowRoot(true)
  .build();

const renderer = new HighlightRenderer(config);
```

### 3. Singleton Pattern (with Dependency Injection)

**Problem**: Need single instance of certain services (Logger, EventBus).

**Solution**: Use dependency injection container with singleton scope.

```typescript
/**
 * Dependency Injection Container
 */

type ServiceFactory<T> = () => T;
type ServiceLifetime = 'singleton' | 'transient' | 'scoped';

interface ServiceDescriptor<T> {
  factory: ServiceFactory<T>;
  lifetime: ServiceLifetime;
  instance?: T;
}

export class ServiceContainer {
  private services = new Map<string, ServiceDescriptor<any>>();

  /**
   * Register a singleton service
   */
  registerSingleton<T>(token: string, factory: ServiceFactory<T>): void {
    this.services.set(token, {
      factory,
      lifetime: 'singleton'
    });
  }

  /**
   * Register a transient service (new instance each time)
   */
  registerTransient<T>(token: string, factory: ServiceFactory<T>): void {
    this.services.set(token, {
      factory,
      lifetime: 'transient'
    });
  }

  /**
   * Resolve a service
   */
  resolve<T>(token: string): T {
    const descriptor = this.services.get(token);

    if (!descriptor) {
      throw new Error(`Service ${token} not registered`);
    }

    // Singleton: Return cached instance or create new
    if (descriptor.lifetime === 'singleton') {
      if (!descriptor.instance) {
        descriptor.instance = descriptor.factory();
      }
      return descriptor.instance;
    }

    // Transient: Always create new instance
    return descriptor.factory();
  }

  /**
   * Check if service is registered
   */
  has(token: string): boolean {
    return this.services.has(token);
  }

  /**
   * Clear all singleton instances (useful for testing)
   */
  clearSingletons(): void {
    for (const descriptor of this.services.values()) {
      if (descriptor.lifetime === 'singleton') {
        delete descriptor.instance;
      }
    }
  }
}

// Bootstrap application
export function bootstrap(): ServiceContainer {
  const container = new ServiceContainer();

  // Register singletons
  container.registerSingleton('logger', () => new Logger());
  container.registerSingleton('eventBus', () => new EventBus());
  container.registerSingleton('colorManager', () => 
    new ColorManager(container.resolve('logger'))
  );

  // Register transient services
  container.registerTransient('highlightFactory', () =>
    new HighlightFactory(
      container.resolve('colorManager'),
      container.resolve('selectorEngine')
    )
  );

  return container;
}

// Usage
const container = bootstrap();
const logger = container.resolve<ILogger>('logger');
logger.info('Application started');
```

---

## Structural Patterns

### 1. Adapter Pattern

**Problem**: Need to work with different browser APIs (Chrome vs Firefox).

**Solution**: Create adapters that normalize browser API differences.

```typescript
/**
 * Adapter Pattern for Cross-Browser Compatibility
 */

// Target interface (our application expects)
export interface IStorageAdapter {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

// Chrome Storage Adapter
export class ChromeStorageAdapter implements IStorageAdapter {
  async get(key: string): Promise<any> {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        resolve(result[key]);
      });
    });
  }

  async set(key: string, value: any): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        resolve();
      });
    });
  }

  async remove(key: string): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, () => {
        resolve();
      });
    });
  }

  async clear(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.clear(() => {
        resolve();
      });
    });
  }
}

// Firefox Storage Adapter
export class FirefoxStorageAdapter implements IStorageAdapter {
  async get(key: string): Promise<any> {
    const result = await browser.storage.local.get(key);
    return result[key];
  }

  async set(key: string, value: any): Promise<void> {
    await browser.storage.local.set({ [key]: value });
  }

  async remove(key: string): Promise<void> {
    await browser.storage.local.remove(key);
  }

  async clear(): Promise<void> {
    await browser.storage.local.clear();
  }
}

// Factory to create appropriate adapter
export class StorageAdapterFactory {
  static create(): IStorageAdapter {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      return new ChromeStorageAdapter();
    } else if (typeof browser !== 'undefined' && browser.storage) {
      return new FirefoxStorageAdapter();
    } else {
      throw new Error('No supported browser storage API found');
    }
  }
}
```

### 2. Decorator Pattern

**Problem**: Need to add cross-cutting concerns (logging, performance tracking) without modifying core logic.

**Solution**: Use decorators to wrap functionality.

```typescript
/**
 * Decorator Pattern for Cross-Cutting Concerns
 */

// Method decorator for logging
export function LogMethod(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const logger = (this as any).logger as ILogger;
    const className = target.constructor.name;

    logger.debug(`[${className}.${propertyKey}] Called with args:`, args);

    const startTime = performance.now();
    
    try {
      const result = await originalMethod.apply(this, args);
      const duration = performance.now() - startTime;
      
      logger.debug(`[${className}.${propertyKey}] Completed in ${duration.toFixed(2)}ms`);
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      logger.error(
        `[${className}.${propertyKey}] Failed after ${duration.toFixed(2)}ms`,
        error
      );
      
      throw error;
    }
  };

  return descriptor;
}

// Performance monitoring decorator
export function Monitor(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
): PropertyDescriptor {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const mark = `${target.constructor.name}.${propertyKey}`;
    
    performance.mark(`${mark}:start`);
    
    try {
      return await originalMethod.apply(this, args);
    } finally {
      performance.mark(`${mark}:end`);
      performance.measure(mark, `${mark}:start`, `${mark}:end`);
      
      const measure = performance.getEntriesByName(mark)[0];
      if (measure && measure.duration > 50) {
        console.warn(`⚠️ Slow method: ${mark} took ${measure.duration.toFixed(2)}ms`);
      }
    }
  };

  return descriptor;
}

// Retry decorator with exponential backoff
export function Retry(maxAttempts: number = 3, delayMs: number = 100) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      let lastError: Error;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error as Error;

          if (attempt < maxAttempts - 1) {
            const delay = delayMs * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      throw lastError!;
    };

    return descriptor;
  };
}

// Usage
export class HighlightService {
  constructor(private readonly logger: ILogger) {}

  @LogMethod
  @Monitor
  async createHighlight(text: string): Promise<Highlight> {
    // Method implementation
    return new Highlight(crypto.randomUUID(), text, '#FFEB3B', new Date());
  }

  @Retry(3, 100)
  async syncToCloud(highlights: Highlight[]): Promise<void> {
    // Will retry 3 times with exponential backoff
    await fetch('/api/sync', {
      method: 'POST',
      body: JSON.stringify(highlights)
    });
  }
}
```

### 3. Proxy Pattern

**Problem**: Need to control access to expensive operations or add validation.

**Solution**: Create proxy objects that intercept operations.

```typescript
/**
 * Proxy Pattern for Performance and Validation
 */

// Lazy-loading proxy
export class LazyHighlightRenderer implements IHighlightRenderer {
  private realRenderer?: ShadowDOMRenderer;
  
  constructor(private readonly config: HighlightRendererConfig) {}

  private getRenderer(): ShadowDOMRenderer {
    if (!this.realRenderer) {
      console.log('Initializing renderer (lazy)...');
      this.realRenderer = new ShadowDOMRenderer(this.config);
    }
    return this.realRenderer;
  }

  async render(highlight: Highlight): Promise<void> {
    await this.getRenderer().render(highlight);
  }

  async remove(id: string): Promise<void> {
    await this.getRenderer().remove(id);
  }

  async clear(): Promise<void> {
    if (this.realRenderer) {
      await this.realRenderer.clear();
    }
  }
}

// Validation proxy
export class ValidatingHighlightStore implements IHighlightRepository {
  constructor(private readonly innerStore: IHighlightRepository) {}

  async save(highlight: Highlight): Promise<void> {
    this.validate(highlight);
    await this.innerStore.save(highlight);
  }

  async findById(id: string): Promise<Highlight | null> {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid highlight ID');
    }
    return await this.innerStore.findById(id);
  }

  private validate(highlight: Highlight): void {
    if (!highlight.id) {
      throw new Error('Highlight ID is required');
    }
    if (!highlight.text || highlight.text.trim().length === 0) {
      throw new Error('Highlight text cannot be empty');
    }
    if (!this.isValidColor(highlight.color)) {
      throw new Error(`Invalid color: ${highlight.color}`);
    }
  }

  private isValidColor(color: string): boolean {
    // Validate hex color
    return /^#[0-9A-F]{6}$/i.test(color);
  }
}

// Caching proxy
export class CachingHighlightRepository implements IHighlightRepository {
  private cache = new Map<string, Highlight>();

  constructor(
    private readonly innerRepository: IHighlightRepository,
    private readonly ttlMs: number = 60000 // 1 minute
  ) {}

  async save(highlight: Highlight): Promise<void> {
    await this.innerRepository.save(highlight);
    this.cache.set(highlight.id, highlight);
  }

  async findById(id: string): Promise<Highlight | null> {
    // Check cache first
    if (this.cache.has(id)) {
      const cached = this.cache.get(id)!;
      
      // Check if expired
      if (!cached.isExpired(this.ttlMs)) {
        console.log(`Cache hit: ${id}`);
        return cached;
      }
      
      this.cache.delete(id);
    }

    // Cache miss - fetch from inner repository
    console.log(`Cache miss: ${id}`);
    const highlight = await this.innerRepository.findById(id);
    
    if (highlight) {
      this.cache.set(id, highlight);
    }
    
    return highlight;
  }
}
```

---

## Behavioral Patterns

### 1. Observer Pattern (Event Bus)

**Problem**: Need decoupled communication between components.

**Solution**: Implement event bus for pub/sub messaging.

```typescript
/**
 * Observer Pattern - Event Bus Implementation
 */

export type EventHandler<T = any> = (data: T) => void | Promise<void>;

export interface IEventBus {
  subscribe<T>(event: string, handler: EventHandler<T>): () => void;
  publish<T>(event: string, data?: T): Promise<void>;
  clear(): void;
}

export class EventBus implements IEventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private readonly logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  /**
   * Subscribe to an event
   * Returns unsubscribe function
   */
  subscribe<T>(event: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }

    const handlersSet = this.handlers.get(event)!;
    handlersSet.add(handler as EventHandler);

    this.logger.debug(`Subscribed to event: ${event} (${handlersSet.size} handlers)`);

    // Return unsubscribe function
    return () => {
      handlersSet.delete(handler as EventHandler);
      this.logger.debug(`Unsubscribed from event: ${event}`);
    };
  }

  /**
   * Publish an event to all subscribers
   */
  async publish<T>(event: string, data?: T): Promise<void> {
    const handlersSet = this.handlers.get(event);

    if (!handlersSet || handlersSet.size === 0) {
      this.logger.debug(`No handlers for event: ${event}`);
      return;
    }

    this.logger.debug(`Publishing event: ${event} to ${handlersSet.size} handlers`);

    // Execute all handlers concurrently
    const promises = Array.from(handlersSet).map(async (handler) => {
      try {
        await handler(data);
      } catch (error) {
        this.logger.error(`Error in event handler for ${event}:`, error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Clear all event handlers
   */
  clear(): void {
    this.handlers.clear();
    this.logger.debug('Cleared all event handlers');
  }

  /**
   * Get number of handlers for an event
   */
  getHandlerCount(event: string): number {
    return this.handlers.get(event)?.size ?? 0;
  }
}

// Event types (strongly typed events)
export const AppEvents = {
  HIGHLIGHT_CREATED: 'highlight:created',
  HIGHLIGHT_REMOVED: 'highlight:removed',
  HIGHLIGHT_CLEARED: 'highlight:cleared',
  MODE_CHANGED: 'mode:changed',
  COLOR_CHANGED: 'color:changed',
  ERROR_OCCURRED: 'error:occurred'
} as const;

export interface HighlightCreatedEvent {
  highlight: Highlight;
  source: 'user' | 'restore';
}

export interface ModeChangedEvent {
  previousMode: string;
  currentMode: string;
}

// Usage
const eventBus = new EventBus(logger);

// Subscribe
const unsubscribe = eventBus.subscribe<HighlightCreatedEvent>(
  AppEvents.HIGHLIGHT_CREATED,
  (event) => {
    console.log('New highlight created:', event.highlight.text);
  }
);

// Publish
await eventBus.publish<HighlightCreatedEvent>(AppEvents.HIGHLIGHT_CREATED, {
  highlight: new Highlight(/* ... */),
  source: 'user'
});

// Unsubscribe
unsubscribe();
```

### 2. Command Pattern

**Problem**: Need to encapsulate actions for undo/redo functionality.

**Solution**: Implement command pattern with command history.

```typescript
/**
 * Command Pattern for Undo/Redo
 */

export interface ICommand {
  execute(): Promise<void>;
  undo(): Promise<void>;
  getDescription(): string;
}

export class CreateHighlightCommand implements ICommand {
  private highlightId?: string;

  constructor(
    private readonly service: HighlightService,
    private readonly text: string,
    private readonly color: string
  ) {}

  async execute(): Promise<void> {
    const highlight = await this.service.createHighlight(this.text, this.color);
    this.highlightId = highlight.id;
  }

  async undo(): Promise<void> {
    if (this.highlightId) {
      await this.service.removeHighlight(this.highlightId);
    }
  }

  getDescription(): string {
    return `Create highlight: "${this.text.substring(0, 30)}..."`;
  }
}

export class RemoveHighlightCommand implements ICommand {
  private removedHighlight?: Highlight;

  constructor(
    private readonly service: HighlightService,
    private readonly highlightId: string
  ) {}

  async execute(): Promise<void> {
    this.removedHighlight = await this.service.getHighlight(this.highlightId);
    await this.service.removeHighlight(this.highlightId);
  }

  async undo(): Promise<void> {
    if (this.removedHighlight) {
      await this.service.restoreHighlight(this.removedHighlight);
    }
  }

  getDescription(): string {
    return `Remove highlight: ${this.highlightId}`;
  }
}

export class CommandHistory {
  private history: ICommand[] = [];
  private currentIndex = -1;
  private readonly maxHistorySize: number;

  constructor(maxHistorySize: number = 50) {
    this.maxHistorySize = maxHistorySize;
  }

  async execute(command: ICommand): Promise<void> {
    await command.execute();

    // Remove any commands after current index (branching history)
    this.history = this.history.slice(0, this.currentIndex + 1);

    // Add new command
    this.history.push(command);
    this.currentIndex++;

    // Trim history if too large
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.currentIndex--;
    }
  }

  async undo(): Promise<void> {
    if (!this.canUndo()) {
      throw new Error('Nothing to undo');
    }

    const command = this.history[this.currentIndex];
    await command.undo();
    this.currentIndex--;
  }

  async redo(): Promise<void> {
    if (!this.canRedo()) {
      throw new Error('Nothing to redo');
    }

    this.currentIndex++;
    const command = this.history[this.currentIndex];
    await command.execute();
  }

  canUndo(): boolean {
    return this.currentIndex >= 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  getHistory(): string[] {
    return this.history.map(cmd => cmd.getDescription());
  }

  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }
}

// Usage
const commandHistory = new CommandHistory();

// Execute command
await commandHistory.execute(
  new CreateHighlightCommand(highlightService, 'Important text', '#FFEB3B')
);

// Undo
if (commandHistory.canUndo()) {
  await commandHistory.undo();
}

// Redo
if (commandHistory.canRedo()) {
  await commandHistory.redo();
}
```

### 3. State Pattern

**Problem**: Need to handle complex state transitions in mode management.

**Solution**: Implement state pattern with explicit state transitions.

```typescript
/**
 * State Pattern for Mode Management
 */

export interface IModeState {
  enter(): Promise<void>;
  exit(): Promise<void>;
  canTransitionTo(state: string): boolean;
  highlight(selection: Selection): Promise<void>;
}

export class SprintModeState implements IModeState {
  constructor(
    private readonly context: ModeStateContext,
    private readonly logger: ILogger
  ) {}

  async enter(): Promise<void> {
    this.logger.info('Entering Sprint Mode');
    // Setup Sprint mode specific behavior
  }

  async exit(): Promise<void> {
    this.logger.info('Exiting Sprint Mode');
    // Cleanup Sprint mode
  }

  canTransitionTo(state: string): boolean {
    // Can transition to any mode from Sprint
    return ['vault', 'gen'].includes(state);
  }

  async highlight(selection: Selection): Promise<void> {
    // Sprint mode highlight logic
  }
}

export class VaultModeState implements IModeState {
  constructor(
    private readonly context: ModeStateContext,
    private readonly logger: ILogger
  ) {}

  async enter(): Promise<void> {
    this.logger.info('Entering Vault Mode');
    // Setup Vault mode specific behavior
  }

  async exit(): Promise<void> {
    this.logger.info('Exiting Vault Mode');
    // Cleanup Vault mode
  }

  canTransitionTo(state: string): boolean {
    return ['sprint', 'gen'].includes(state);
  }

  async highlight(selection: Selection): Promise<void> {
    // Vault mode highlight logic
  }
}

export class ModeStateContext {
  private currentState: IModeState;

  constructor(initialState: IModeState) {
    this.currentState = initialState;
  }

  async transitionTo(newState: IModeState, stateName: string): Promise<void> {
    if (!this.currentState.canTransitionTo(stateName)) {
      throw new Error(`Cannot transition to ${stateName} from current state`);
    }

    await this.currentState.exit();
    this.currentState = newState;
    await this.currentState.enter();
  }

  async highlight(selection: Selection): Promise<void> {
    await this.currentState.highlight(selection);
  }
}
```

---

*Continued in next sections...*

**Note**: This is Part 1 of the System Design Patterns document. The following sections will cover:
- Extension-Specific Patterns
- State Management Patterns
- Communication Patterns
- Performance Patterns
- Anti-Patterns to Avoid

Each pattern includes:
✅ Problem statement
✅ Solution with code examples
✅ Benefits and trade-offs
✅ When to use / when not to use
