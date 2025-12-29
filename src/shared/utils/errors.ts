/**
 * @file errors.ts
 * @description Custom error hierarchy for the application
 */

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
    const captureStackTrace = (Error as any).captureStackTrace;
    if (captureStackTrace) {
      captureStackTrace(this, this.constructor);
    }
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
    super(`${resource} with identifier ${identifier} not found`, 'NOT_FOUND', true, {
      resource,
      identifier,
    });
  }

  override toUserMessage(): string {
    const resource = this.context?.['resource'] as string | undefined;
    return `The requested ${resource ?? 'resource'} could not be found.`;
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

  override toUserMessage(): string {
    return 'Failed to save your data. Please try again.';
  }
}

/**
 * Internal/programming errors (5xx category)
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

  override toUserMessage(): string {
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
