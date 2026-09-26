/**
 * @file logger.ts
 * @description Logger implementation following the quality framework
 */

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
 * Console logger implementation.
 *
 * SECURITY: this is the single boundary between product code and the
 * user-readable browser console. All metadata is sanitized before it reaches
 * `console.*`: secrets/tokens/emails/user-content are redacted, URLs are
 * reduced to origin, Error objects shrink to {name, message, code}, and
 * stack traces print in development only.
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
      // eslint-disable-next-line no-console
      console.debug(this.format(entry), ...sanitizeForConsole(metadata));
    }
  }

  info(message: string, ...metadata: any[]): void {
    if (this.level <= LogLevel.INFO) {
      const entry = this.createEntry(LogLevel.INFO, message, metadata);
      // eslint-disable-next-line no-console
      console.info(this.format(entry), ...sanitizeForConsole(metadata));
    }
  }

  warn(message: string, ...metadata: any[]): void {
    if (this.level <= LogLevel.WARN) {
      const entry = this.createEntry(LogLevel.WARN, message, metadata);
      console.warn(this.format(entry), ...sanitizeForConsole(metadata));
    }
  }

  error(message: string, error?: Error, ...metadata: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      const entry = this.createEntry(LogLevel.ERROR, message, metadata, error);
      console.error(
        this.format(entry),
        error ? sanitizeForConsole([error])[0] : error,
        ...sanitizeForConsole(metadata)
      );

      if (error?.stack && isDevelopment()) {
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

/** True in development builds (vite/wxt/vitest). Stacks print only here. */
function isDevelopment(): boolean {
  try {
    return (
      typeof import.meta !== 'undefined' &&
      (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true
    );
  } catch {
    return false;
  }
}

const REDACTED = '[redacted]';

/**
 * Metadata keys that must never reach the console with their values.
 * Normalized (lowercased, separators stripped) before comparison.
 */
const REDACT_KEYS = new Set([
  'password',
  'passwd',
  'secret',
  'token',
  'accesstoken',
  'refreshtoken',
  'providertoken',
  'providerrefreshtoken',
  'apikey',
  'xllmapikey',
  'xapikey',
  'authorization',
  'authcode',
  'otp',
  'otptoken',
  'session',
  'email',
  'text',
  'content',
  'quote',
  'excerpt',
  'payload',
  'props',
  'body',
]);

/** Keys reduced to URL origin (path/query may carry tokens or history). */
const ORIGIN_ONLY_KEYS = new Set(['url', 'redirecturl', 'redirectto', 'href', 'link']);

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[_-]+/g, '');
}

function sanitizeUrl(value: unknown): unknown {
  if (typeof value !== 'string') return REDACTED;
  try {
    return new URL(value).origin;
  } catch {
    return REDACTED;
  }
}

function sanitizeValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Error) {
    const code = (value as unknown as { code?: unknown }).code;
    return {
      name: value.name,
      message: value.message,
      ...(typeof code === 'string' ? { code } : {}),
    };
  }
  if (typeof value !== 'object') return value;
  if (seen.has(value)) return REDACTED;
  if (depth <= 0) return REDACTED;
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((v) => sanitizeValue(v, depth - 1, seen));
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const norm = normalizeKey(k);
    if (REDACT_KEYS.has(norm)) {
      out[k] = REDACTED;
    } else if (ORIGIN_ONLY_KEYS.has(norm)) {
      out[k] = sanitizeUrl(v);
    } else {
      out[k] = sanitizeValue(v, depth - 1, seen);
    }
  }
  return out;
}

/**
 * Sanitize console arguments: same shape, sensitive values redacted.
 * Exported for tests. Depth-limited and cycle-safe.
 */
export function sanitizeForConsole(metadata: unknown[]): unknown[] {
  const seen = new WeakSet<object>();
  return metadata.map((m) => sanitizeValue(m, 3, seen));
}

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
      const logger = new ConsoleLogger(namespace, this.defaultLevel);
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
   * Clear all cached loggers
   */
  static clearLoggers(): void {
    this.loggers.clear();
  }
}
