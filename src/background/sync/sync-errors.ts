/**
 * @file sync-errors.ts
 * @description Custom error classes for sync operations
 * @author System Architect
 */

/**
 * Base error class for sync operations
 */
export abstract class SyncError extends Error {
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
            context: this.context,
        };
    }
}

/**
 * Queue full error - thrown when sync queue reaches max capacity
 * 
 * Prevents data loss by failing fast when queue is full
 */
export class QueueFullError extends SyncError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, 'QUEUE_FULL', context);
    }
}

/**
 * Sync conflict error - thrown when conflicting updates detected
 * 
 * Deferred to ConflictResolver (Component 5) for resolution
 */
export class SyncConflictError extends SyncError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, 'SYNC_CONFLICT', context);
    }
}

/**
 * Network error - thrown when network operation fails
 * 
 * Triggers retry logic with exponential backoff
 */
export class NetworkError extends SyncError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, 'NETWORK_ERROR', context);
    }
}

/**
 * Rate limit exceeded error - thrown when rate limit hit
 * 
 * Security-critical: prevents DoS attacks
 */
export class RateLimitExceededError extends SyncError {
    constructor(
        message: string,
        public readonly retryAfter?: number, // Seconds until retry allowed
        context?: Record<string, any>
    ) {
        super(message, 'RATE_LIMIT_EXCEEDED', context);
    }
}

/**
 * Offline error - thrown when operation requires online connection
 * 
 * Events are queued in offline queue for later sync
 */
export class OfflineError extends SyncError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, 'OFFLINE', context);
    }
}
