/**
 * @file api-errors.ts
 * @description Custom error types for API operations
 * @architecture Following error handling best practices
 * @see docs/05-quality-framework/02-coding-standards.md:509-567
 */

/**
 * Base API error class
 * All API-related errors extend from this
 */
export class APIError extends Error {
    constructor(
        message: string,
        public readonly code: string = 'API_ERROR',
        public readonly context?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'APIError';

        // Maintain proper stack trace for debugging
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
 * Network-related errors (timeouts, connection failures)
 */
export class NetworkError extends APIError {
    constructor(message: string, cause?: Error) {
        super(message, 'NETWORK_ERROR', { cause: cause?.message });
        this.name = 'NetworkError';
    }
}

/**
 * Authentication errors (401, 403)
 */
export class AuthenticationError extends APIError {
    constructor(message: string, statusCode?: number) {
        super(message, 'AUTHENTICATION_ERROR', { statusCode });
        this.name = 'AuthenticationError';
    }
}

/**
 * Rate limiting errors (429)
 */
export class RateLimitError extends APIError {
    constructor(
        message: string,
        public readonly retryAfter?: number // seconds
    ) {
        super(message, 'RATE_LIMIT_ERROR', { retryAfter });
        this.name = 'RateLimitError';
    }
}

/**
 * Server errors (5xx)
 */
export class ServerError extends APIError {
    constructor(message: string, statusCode?: number) {
        super(message, 'SERVER_ERROR', { statusCode });
        this.name = 'ServerError';
    }
}

/**
 * Validation errors (400)
 */
export class ValidationError extends APIError {
    constructor(message: string, field?: string) {
        super(message, 'VALIDATION_ERROR', { field });
        this.name = 'ValidationError';
    }
}

/**
 * Resource not found errors (404)
 */
export class NotFoundError extends APIError {
    constructor(resourceType: string, id: string) {
        super(`${resourceType} with ID ${id} not found`, 'NOT_FOUND', {
            resourceType,
            id,
        });
        this.name = 'NotFoundError';
    }
}

/**
 * Timeout errors
 */
export class TimeoutError extends APIError {
    constructor(timeoutMs: number) {
        super(`Request exceeded timeout of ${timeoutMs}ms`, 'TIMEOUT_ERROR', {
            timeoutMs,
        });
        this.name = 'TimeoutError';
    }
}
