/**
 * @file api-error-handler.ts
 * @description Centralized error handling and transformation for API operations
 * @architecture Strategy Pattern - transform raw errors to domain APIErrors
 */

import {
    APIError,
    AuthenticationError,
    NetworkError,
    RateLimitError,
    ServerError,
    ValidationError,
    NotFoundError,
} from './api-errors';

/**
 * Handles and transforms raw API errors into typed domain errors
 */
export class APIErrorHandler {
    /**
     * Transform a raw error (from Supabase or fetch) into a typed APIError
     * @param error Raw error object
     * @returns Typed APIError
     */
    static handle(error: any): APIError {
        // Handle null/undefined
        if (!error) {
            return new APIError('Unknown error (null/undefined)', 'UNKNOWN_ERROR');
        }

        // Handle if it's already an APIError
        if (error instanceof APIError) {
            return error;
        }

        // PostgreSQL/Supabase error codes
        // Some libraries return 'code' as string, others as number
        const code = (error.code || error.status)?.toString();

        // Authentication Errors
        // 401: Unauthorized
        // 403: Forbidden
        // PGRST301: JWT expired or invalid
        if (code === '401' || code === '403' || code === 'PGRST301') {
            return new AuthenticationError(error.message || 'Authentication failed', parseInt(code) || 401);
        }

        // Rate Limiting
        // 429: Too Many Requests
        if (code === '429') {
            // Extract Retry-After header if available (Supabase returns headers in error sometimes)
            const retryAfter = error.headers?.['retry-after'] || error.retryAfter;
            return new RateLimitError(
                error.message || 'Rate limit exceeded',
                retryAfter ? parseInt(retryAfter) : undefined
            );
        }

        // Server Errors
        // 5xx: Server Error
        // PGRST000: PostgREST generic error
        if (code?.startsWith('5') || code === 'PGRST000') {
            return new ServerError(error.message || 'Server error', parseInt(code) || 500);
        }

        // Validation Errors
        // 400: Bad Request
        // PGRST103: Invalid input
        // 23505: Unique violation (Postgres)
        // 23503: Foreign key violation (Postgres)
        if (code === '400' || code === 'PGRST103' || code === '23505' || code === '23503') {
            return new ValidationError(error.message || 'Validation failed');
        }

        // Not Found
        // 404: Not Found
        // PGRST116: Resource not found (JSON result is empty)
        if (code === '404' || code === 'PGRST116') {
            return new NotFoundError('Resource', 'unknown');
        }

        // Network errors
        // Fetch errors usually have these messages or types
        const message = error.message?.toLowerCase() || '';
        if (
            message.includes('fetch') ||
            message.includes('network') ||
            message.includes('failed to fetch') ||
            error.name === 'TypeError'
        ) {
            return new NetworkError(error.message || 'Network request failed', error);
        }

        // Fallback
        return new APIError(error.message || 'Unknown API error', 'API_ERROR', {
            originalError: error,
            code: code,
        });
    }
}
