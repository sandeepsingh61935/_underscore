/**
 * @file conflict-errors.ts
 * @description Custom error classes for conflict resolution operations
 * @see docs/05-quality-framework/02-coding-standards.md (Error Handling)
 */

import { AppError } from '../../shared/errors/app-error';

/**
 * Base error class for all conflict-related errors
 */
export abstract class ConflictError extends AppError {
    constructor(
        message: string,
        code: string,
        context?: Record<string, unknown>
    ) {
        super(message, code, context);
        this.name = 'ConflictError';
    }
}

/**
 * Error thrown when a conflict cannot be automatically resolved
 * Requires manual intervention or different resolution strategy
 * 
 * @example
 * throw new UnresolvableConflictError(
 *   'Content conflict requires manual resolution',
 *   { conflictId: '123', type: 'CONTENT_CONFLICT' }
 * );
 */
export class UnresolvableConflictError extends ConflictError {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, 'UNRESOLVABLE_CONFLICT', context);
        this.name = 'UnresolvableConflictError';
    }
}

/**
 * Error thrown when vector clock is malformed or invalid
 * 
 * **Validation Failures**:
 * - Negative counter values
 * - Non-integer counter values
 * - NaN or Infinity values
 * - Empty or invalid device IDs
 * - Too many devices (>100)
 * 
 * @example
 * throw new InvalidVectorClockError(
 *   'Vector clock contains negative counter',
 *   { clock: { 'device-1': -1 } }
 * );
 */
export class InvalidVectorClockError extends ConflictError {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, 'INVALID_VECTOR_CLOCK', context);
        this.name = 'InvalidVectorClockError';
    }
}

/**
 * Error thrown when conflict detection fails
 * 
 * **Possible Causes**:
 * - Invalid event data
 * - Missing vector clocks
 * - Corrupted event store
 * - Internal algorithm error
 * 
 * @example
 * throw new ConflictDetectionError(
 *   'Failed to detect conflicts: missing vector clock',
 *   { eventId: '456' }
 * );
 */
export class ConflictDetectionError extends ConflictError {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, 'CONFLICT_DETECTION_ERROR', context);
        this.name = 'ConflictDetectionError';
    }
}

/**
 * Error thrown when resolution strategy is invalid or incompatible
 * 
 * **Validation Failures**:
 * - Unknown strategy name
 * - Strategy incompatible with conflict type
 * - Strategy requires user input but timeout occurred
 * 
 * @example
 * throw new ResolutionStrategyError(
 *   'MERGE strategy cannot resolve DELETE_CONFLICT',
 *   { strategy: 'MERGE', conflictType: 'DELETE_CONFLICT' }
 * );
 */
export class ResolutionStrategyError extends ConflictError {
    constructor(message: string, context?: Record<string, unknown>) {
        super(message, 'RESOLUTION_STRATEGY_ERROR', context);
        this.name = 'ResolutionStrategyError';
    }
}
