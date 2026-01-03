/**
 * @file state-errors.ts
 * @description Error hierarchy for state management operations
 * 
 * Provides specific error types for different state management failures:
 * - StateValidationError: Invalid state data (schema/type errors)
 * - StateTransitionError: Invalid mode transitions
 * - StatePersistenceError: Storage/persistence failures
 * - StateMigrationError: State migration failures
 * 
 * All errors extend AppError and include structured context for debugging.
 */

import type { ModeType } from '../schemas/mode-state-schemas';

import { AppError, type ErrorContext } from './app-error';

/**
 * Error thrown when state data fails validation
 * 
 * @example
 * ```typescript
 * throw new StateValidationError('Invalid mode value', {
 *   field: 'defaultMode',
 *   value: 'invalid',
 *   validValues: ['walk', 'sprint', 'vault']
 * });
 * ```
 */
export class StateValidationError extends AppError {
    public readonly code = 'STATE_001';

    constructor(message: string, context?: ErrorContext) {
        super(message, context, true);
    }

    public override toJSON(): object {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            context: safeStringify(this.context),
            stack: this.stack,
            isOperational: this.isOperational,
        };
    }

    public override toString(): string {
        return `[${this.code}] ${this.message}`;
    }
}

/**
 * Safely stringify context, handling circular references
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeStringify(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }

    const seen = new WeakSet();

    try {
        return JSON.parse(JSON.stringify(obj, (_key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                    return '[Circular]';
                }
                seen.add(value);
            }
            // Handle Error objects in context (error chaining)
            if (value instanceof Error) {
                return {
                    name: value.name,
                    message: value.message,
                    stack: value.stack,
                };
            }
            return value;
        }));
    } catch (_error) {
        // Fallback if stringify still fails
        return '[Serialization Failed]';
    }
}

/**
 * Error thrown when attempting an invalid mode transition
 * 
 * @example
 * ```typescript
 * throw new StateTransitionError(
 *   'Cannot transition from walk to gen',
 *   'walk',
 *   'gen'
 * );
 * ```
 */
export class StateTransitionError extends AppError {
    public readonly code = 'STATE_002';
    public readonly from: ModeType | string;
    public readonly to: ModeType | string;

    constructor(message: string, from: ModeType | string, to: ModeType | string, context?: ErrorContext) {
        super(message, {
            ...context,
            from,
            to,
        }, true);
        this.from = from;
        this.to = to;
    }

    public override toJSON(): object {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            from: this.from,
            to: this.to,
            context: safeStringify(this.context),
            stack: this.stack,
            isOperational: this.isOperational,
        };
    }

    public override toString(): string {
        return `[${this.code}] ${this.message} (${this.from} → ${this.to})`;
    }
}

/**
 * Error thrown when state persistence fails
 * 
 * @example
 * ```typescript
 * throw new StatePersistenceError('Failed to save state: quota exceeded', {
 *   quotaExceeded: true,
 *   currentSize: 102400,
 *   maxSize: 102400
 * });
 * ```
 */
export class StatePersistenceError extends AppError {
    public readonly code = 'STATE_003';

    constructor(message: string, context?: ErrorContext) {
        super(message, context, true); // Operational - IO failures happen
    }

    public override toJSON(): object {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            context: safeStringify(this.context),
            stack: this.stack,
            isOperational: this.isOperational,
        };
    }

    public override toString(): string {
        return `[${this.code}] ${this.message}`;
    }
}

/**
 * Error thrown when state migration fails
 * 
 * @example
 * ```typescript
 * throw new StateMigrationError(
 *   'Cannot migrate from v1 to v3: missing v2',
 *   1,
 *   3,
 *   { missingVersion: 2 }
 * );
 * ```
 */
export class StateMigrationError extends AppError {
    public readonly code = 'STATE_004';
    public readonly fromVersion: number;
    public readonly toVersion: number;

    constructor(
        message: string,
        fromVersion: number,
        toVersion: number,
        context?: ErrorContext
    ) {
        super(message, {
            ...context,
            fromVersion,
            toVersion,
        }, true);
        this.fromVersion = fromVersion;
        this.toVersion = toVersion;
    }

    public override toJSON(): object {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            fromVersion: this.fromVersion,
            toVersion: this.toVersion,
            context: safeStringify(this.context),
            stack: this.stack,
            isOperational: this.isOperational,
        };
    }

    public override toString(): string {
        return `[${this.code}] ${this.message} (v${this.fromVersion} → v${this.toVersion})`;
    }
}
