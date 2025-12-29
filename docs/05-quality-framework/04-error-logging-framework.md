# Error Handling & Logging Framework

**Web Highlighter Extension - Robust Error Management**

> **Purpose**: Comprehensive error handling and logging system for
> production-ready applications.

---

## Table of Contents

1. [Error Hierarchy](#error-hierarchy)
2. [Logging System](#logging-system)
3. [Error Boundaries](#error-boundaries)
4. [Monitoring & Telemetry](#monitoring--telemetry)
5. [Best Practices](#best-practices)

---

## Error Hierarchy

### 1. Base Error Classes

```typescript
/**
 * Base application error
 * All custom errors should extend this class
 */
export abstract class AppError extends Error {
  public readonly timestamp: Date;
  public readonly code: string;
  public readonly context?: Record<string, any>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);

    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date();
    this.isOperational = isOperational;
    this.context = context;

    // Maintains proper stack trace for where error was thrown (V8 only)
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON for logging
   */
  toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp.toISOString(),
      isOperational: this.isOperational,
      context: this.context,
      stack: this.stack,
    };
  }

  /**
   * Convert error to user-friendly message
   */
  toUserMessage(): string {
    return this.message;
  }
}
```

### 2. Domain-Specific Errors

```typescript
/**
 * Validation errors (4xx category)
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', true, context);
  }
}

/**
 * Resource not found errors
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier: string) {
    super(
      `${resource} with identifier ${identifier} not found`,
      'NOT_FOUND',
      true,
      { resource, identifier }
    );
  }

  toUserMessage(): string {
    return `The requested ${this.context?.resource} could not be found.`;
  }
}

/**
 * Authorization errors
 */
export class UnauthorizedError extends AppError {
  constructor(action: string, context?: Record<string, any>) {
    super(`Unauthorized to perform action: ${action}`, 'UNAUTHORIZED', true, {
      action,
      ...context,
    });
  }

  toUserMessage(): string {
    return 'You do not have permission to perform this action.';
  }
}

/**
 * Storage/persistence errors
 */
export class StorageError extends AppError {
  constructor(operation: string, cause?: Error) {
    super(`Storage operation failed: ${operation}`, 'STORAGE_ERROR', true, {
      operation,
      cause: cause?.message,
    });
  }

  toUserMessage(): string {
    return 'Failed to save your data. Please try again.';
  }
}

/**
 * Network/API errors
 */
export class NetworkError extends AppError {
  constructor(url: string, status?: number, cause?: Error) {
    super(`Network request failed: ${url}`, 'NETWORK_ERROR', true, {
      url,
      status,
      cause: cause?.message,
    });
  }

  toUserMessage(): string {
    return 'Network connection failed. Please check your internet connection.';
  }
}

/**
 * Unexpected/programming errors (5xx category)
 */
export class InternalError extends AppError {
  constructor(message: string, cause?: Error) {
    super(
      message,
      'INTERNAL_ERROR',
      false, // Not operational - programmer error
      { cause: cause?.message, stack: cause?.stack }
    );
  }

  toUserMessage(): string {
    return 'An unexpected error occurred. Please try again later.';
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends AppError {
  constructor(setting: string, reason: string) {
    super(
      `Invalid configuration for ${setting}: ${reason}`,
      'CONFIGURATION_ERROR',
      false,
      { setting, reason }
    );
  }
}
```

### 3. Error Type Guards

```typescript
/**
 * Check if error is operational (expected) vs programmer error
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Type guard for AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: Error): boolean {
  if (error instanceof NetworkError) {
    const status = error.context?.status as number | undefined;
    // Retry on 5xx errors and rate limiting
    return !status || status >= 500 || status === 429;
  }

  if (error instanceof StorageError) {
    // Storage errors might be transient
    return true;
  }

  return false;
}
```

---

## Logging System

### 1. Logger Interface & Implementation

```typescript
/**
 * Log levels (ordered by severity)
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 999,
}

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  namespace: string;
  message: string;
  metadata?: Record<string, any>;
  error?: Error;
}

/**
 * Logger interface
 */
export interface ILogger {
  debug(message: string, ...metadata: any[]): void;
  info(message: string, ...metadata: any[]): void;
  warn(message: string, ...metadata: any[]): void;
  error(message: string, error?: Error, ...metadata: any[]): void;
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
}

/**
 * Console logger implementation
 */
export class ConsoleLogger implements ILogger {
  private level: LogLevel;

  constructor(
    private readonly namespace: string,
    level: LogLevel = LogLevel.INFO
  ) {
    this.level = level;
  }

  debug(message: string, ...metadata: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      const entry = this.createEntry(LogLevel.DEBUG, message, metadata);
      console.debug(this.format(entry), ...metadata);
    }
  }

  info(message: string, ...metadata: any[]): void {
    if (this.level <= LogLevel.INFO) {
      const entry = this.createEntry(LogLevel.INFO, message, metadata);
      console.info(this.format(entry), ...metadata);
    }
  }

  warn(message: string, ...metadata: any[]): void {
    if (this.level <= LogLevel.WARN) {
      const entry = this.createEntry(LogLevel.WARN, message, metadata);
      console.warn(this.format(entry), ...metadata);
    }
  }

  error(message: string, error?: Error, ...metadata: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      const entry = this.createEntry(LogLevel.ERROR, message, metadata, error);
      console.error(this.format(entry), error, ...metadata);

      if (error?.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  private createEntry(
    level: LogLevel,
    message: string,
    metadata: any[],
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date(),
      level,
      namespace: this.namespace,
      message,
      metadata: metadata.length > 0 ? { data: metadata } : undefined,
      error,
    };
  }

  private format(entry: LogEntry): string {
    const level = LogLevel[entry.level];
    const timestamp = entry.timestamp.toISOString();
    return `[${timestamp}] [${level}] [${entry.namespace}] ${entry.message}`;
  }
}
```

### 2. Structured Logger (Production)

```typescript
/**
 * Structured logger for production use
 * Outputs JSON logs for easier parsing
 */
export class StructuredLogger implements ILogger {
  private level: LogLevel;
  private buffer: LogEntry[] = [];
  private readonly maxBufferSize = 100;

  constructor(
    private readonly namespace: string,
    level: LogLevel = LogLevel.INFO
  ) {
    this.level = level;
  }

  debug(message: string, ...metadata: any[]): void {
    this.log(LogLevel.DEBUG, message, undefined, metadata);
  }

  info(message: string, ...metadata: any[]): void {
    this.log(LogLevel.INFO, message, undefined, metadata);
  }

  warn(message: string, ...metadata: any[]): void {
    this.log(LogLevel.WARN, message, undefined, metadata);
  }

  error(message: string, error?: Error, ...metadata: any[]): void {
    this.log(LogLevel.ERROR, message, error, metadata);
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }

  private log(
    level: LogLevel,
    message: string,
    error?: Error,
    metadata: any[] = []
  ): void {
    if (this.level > level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      namespace: this.namespace,
      message,
      metadata: this.sanitizeMetadata(metadata),
      error: error ? this.serializeError(error) : undefined,
    };

    // Add to buffer
    this.buffer.push(entry);

    // Trim buffer if too large
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }

    // Output JSON
    const output = JSON.stringify(entry);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(output);
        break;
      case LogLevel.INFO:
        console.info(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.ERROR:
        console.error(output);
        break;
    }
  }

  private sanitizeMetadata(metadata: any[]): Record<string, any> | undefined {
    if (metadata.length === 0) {
      return undefined;
    }

    // Convert to object
    if (metadata.length === 1 && typeof metadata[0] === 'object') {
      return metadata[0];
    }

    return { data: metadata };
  }

  private serializeError(error: Error): any {
    if (isAppError(error)) {
      return error.toJSON();
    }

    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  /**
   * Get buffered logs (useful for debugging)
   */
  getBufferedLogs(): LogEntry[] {
    return [...this.buffer];
  }

  /**
   * Clear log buffer
   */
  clearBuffer(): void {
    this.buffer = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.buffer, null, 2);
  }
}
```

### 3. Logger Factory

```typescript
/**
 * Logger factory for consistent logger creation
 */
export class LoggerFactory {
  private static defaultLevel: LogLevel = LogLevel.INFO;
  private static loggers = new Map<string, ILogger>();

  /**
   * Create or get logger for namespace
   */
  static getLogger(namespace: string): ILogger {
    if (!this.loggers.has(namespace)) {
      const logger = this.createLogger(namespace);
      this.loggers.set(namespace, logger);
    }

    return this.loggers.get(namespace)!;
  }

  /**
   * Set global log level
   */
  static setGlobalLevel(level: LogLevel): void {
    this.defaultLevel = level;

    // Update all existing loggers
    for (const logger of this.loggers.values()) {
      logger.setLevel(level);
    }
  }

  /**
   * Create logger based on environment
   */
  private static createLogger(namespace: string): ILogger {
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isDevelopment) {
      return new ConsoleLogger(namespace, this.defaultLevel);
    } else {
      return new StructuredLogger(namespace, this.defaultLevel);
    }
  }

  /**
   * Clear all cached loggers
   */
  static clearLoggers(): void {
    this.loggers.clear();
  }
}

// Usage
const logger = LoggerFactory.getLogger('HighlightService');
logger.info('Service initialized');
```

---

## Error Boundaries

### 1. Global Error Handler

```typescript
/**
 * Global error handler for uncaught errors
 */
export class GlobalErrorHandler {
  private static instance?: GlobalErrorHandler;
  private logger: ILogger;

  private constructor() {
    this.logger = LoggerFactory.getLogger('GlobalErrorHandler');
    this.setupHandlers();
  }

  static getInstance(): GlobalErrorHandler {
    if (!this.instance) {
      this.instance = new GlobalErrorHandler();
    }
    return this.instance;
  }

  private setupHandlers(): void {
    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error);
      event.preventDefault();
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason);
      event.preventDefault();
    });
  }

  private handleError(error: Error | any): void {
    if (isOperationalError(error)) {
      // Expected error - log and show user-friendly message
      this.logger.warn('Operational error occurred', error);
      this.showUserNotification(error);
    } else {
      // Programming error - log with full details
      this.logger.error('Unexpected error occurred', error);
      this.showErrorNotification();

      // In development, rethrow for debugging
      if (process.env.NODE_ENV === 'development') {
        throw error;
      }
    }
  }

  private showUserNotification(error: AppError): void {
    const message = error.toUserMessage();
    // Show user-friendly notification
    // e.g., browser notification API or UI toast
  }

  private showErrorNotification(): void {
    // Show generic error message
  }
}

// Initialize global error handler
GlobalErrorHandler.getInstance();
```

### 2. Async Error Wrapper

```typescript
/**
 * Wrap async functions with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  logger: ILogger
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error) {
      logger.error(`Error in ${fn.name}`, error as Error);

      if (isRetryableError(error as Error)) {
        logger.info(`Retrying ${fn.name}...`);
        // Implement retry logic
      }

      throw error;
    }
  }) as T;
}

// Usage
class HighlightService {
  constructor(private logger: ILogger) {}

  @withErrorHandling
  async createHighlight(text: string): Promise<Highlight> {
    // Implementation
  }
}
```

---

## Best Practices

### 1. Logging Guidelines

```typescript
/**
 * ✅ Good Logging Practices
 */
export class GoodLoggingExample {
  private logger = LoggerFactory.getLogger('GoodExample');

  async processHighlight(id: string): Promise<void> {
    // ✅ Log entry with context
    this.logger.debug('Processing highlight', { highlightId: id });

    const startTime = performance.now();

    try {
      const highlight = await this.repository.findById(id);

      if (!highlight) {
        // ✅ Log warning for expected errors
        this.logger.warn('Highlight not found', { highlightId: id });
        throw new NotFoundError('Highlight', id);
      }

      await this.renderer.render(highlight);

      const duration = performance.now() - startTime;

      // ✅ Log success with metrics
      this.logger.info('Highlight processed', {
        highlightId: id,
        duration: `${duration.toFixed(2)}ms`,
      });
    } catch (error) {
      const duration = performance.now() - startTime;

      // ✅ Log error with full context
      this.logger.error('Failed to process highlight', error as Error, {
        highlightId: id,
        duration: `${duration.toFixed(2)}ms`,
      });

      throw error;
    }
  }
}

/**
 * ❌ Bad Logging Practices
 */
export class BadLoggingExample {
  async processHighlight(id: string): Promise<void> {
    // ❌ No context, unclear message
    console.log('processing...');

    try {
      const highlight = await this.repository.findById(id);

      if (!highlight) {
        // ❌ Silent failure, lost information
        console.log('not found');
        return;
      }

      await this.renderer.render(highlight);

      // ❌ Vague success message
      console.log('done');
    } catch (error) {
      // ❌ No context, swallowed error
      console.log('error');
    }
  }
}
```

### 2. Error Handling Checklist

```typescript
/**
 * Error Handling Checklist
 */

// ✅ 1. Validate inputs early
function createHighlight(text: string, color: string): Highlight {
  if (!text?.trim()) {
    throw new ValidationError('Text cannot be empty');
  }
  if (!isValidColor(color)) {
    throw new ValidationError('Invalid color format', { color });
  }
  // ... proceed
}

// ✅ 2. Use specific error types
async function loadData(id: string): Promise<Data> {
  const data = await storage.get(id);

  if (!data) {
    throw new NotFoundError('Data', id); // Specific error
  }

  return data;
}

// ✅ 3. Add context to errors
async function syncToCloud(highlights: Highlight[]): Promise<void> {
  try {
    await api.sync(highlights);
  } catch (error) {
    throw new NetworkError('/api/sync', undefined, error as Error); // Wrapped with context
  }
}

// ✅ 4. Log before rethrowing
async function criticalOperation(): Promise<void> {
  try {
    await performOperation();
  } catch (error) {
    this.logger.error('Critical operation failed', error as Error);
    throw error; // Rethrow after logging
  }
}

// ✅ 5. Provide recovery options
async function fetchWithFallback(url: string): Promise<Data> {
  try {
    return await fetch(url).then((r) => r.json());
  } catch (error) {
    this.logger.warn('Primary fetch failed, using cache', error as Error);
    return (await this.cache.get(url)) ?? this.getDefault();
  }
}
```

---

**Next**: [TypeScript Configuration](./04-typescript-config.md)
