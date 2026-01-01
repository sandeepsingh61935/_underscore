/**
 * @file app-error.ts
 * @description Hierarchical error classes for typed error handling
 */

/**
 * Structured context metadata for errors
 */
export interface ErrorContext {
    [key: string]: unknown;
}

/**
 * Base Application Error class
 * Extends Error to provide context and structured logging support
 */
export class AppError extends Error {
    public readonly context?: ErrorContext;
    public readonly isOperational: boolean;

    /**
     * @param message - User-friendly error message
     * @param context - Additional debugging metadata
     * @param isOperational - True if error is expected (e.g. validation), false if bug
     */
    constructor(message: string, context?: ErrorContext, isOperational = true) {
        super(message);
        this.name = this.constructor.name;
        this.context = context;
        this.isOperational = isOperational;

        // Restore prototype chain (required for instanceOf checks in TS)
        Object.setPrototypeOf(this, new.target.prototype);

        // Capture stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    /**
     * Convert error to serializable object for logging/messaging
     */
    public toJSON(): object {
        return {
            name: this.name,
            message: this.message,
            context: this.context,
            stack: this.stack,
            isOperational: this.isOperational
        };
    }

    /**
     * Get user-friendly error message
     * Override in subclasses for specific messages
     */
    public toUserMessage(): string {
        return this.message;
    }
}

/**
 * Error related to Mode operations (transitions, state)
 */
export class ModeError extends AppError {
    constructor(message: string, context?: ErrorContext) {
        super(message, context, true);
    }
}

/**
 * Error related to data validation
 */
export class ValidationError extends AppError {
    constructor(message: string, context?: ErrorContext) {
        super(message, context, true);
    }
}

/**
 * Error related to persistence (Repository/Storage)
 */
export class PersistenceError extends AppError {
    constructor(message: string, context?: ErrorContext) {
        super(message, context, true); // Usually operational (IO fail)
    }
}

/**
 * Error related to Chrome Messaging
 */
export class MessagingError extends AppError {
    constructor(message: string, context?: ErrorContext) {
        super(message, context, true);
    }
}

/**
 * Unexpected system errors (bugs)
 */
export class SystemError extends AppError {
    constructor(message: string, context?: ErrorContext) {
        super(message, context, false); // Not operational (programmer error)
    }
}
