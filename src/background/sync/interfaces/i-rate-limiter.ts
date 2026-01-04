/**
 * @file i-rate-limiter.ts
 * @description Rate limiter interface for DoS protection
 * @author System Architect
 */

/**
 * Rate limit configuration for token bucket algorithm
 */
export interface RateLimitConfig {
    readonly capacity: number; // Maximum tokens in bucket
    readonly refillRate: number; // Tokens per second
    readonly refillInterval: number; // Milliseconds between refills
}

/**
 * Rate limit metrics for monitoring
 */
export interface RateLimitMetrics {
    totalAttempts: number;
    blockedAttempts: number;
    blockRate: number; // Percentage of blocked attempts (0-1)
    activeBuckets: number;
}

/**
 * Rate limiter interface using token bucket algorithm
 * 
 * Provides DoS protection by limiting requests per user per operation.
 * 
 * Rate limits (default):
 * - Sync: 10 requests/minute
 * - Auth: 5 requests/15 minutes
 * - API: 100 requests/minute
 * 
 * @example
 * ```typescript
 * const limiter = container.resolve<IRateLimiter>('rateLimiter');
 * 
 * // Check if user can perform sync
 * const allowed = await limiter.checkLimit(userId, 'sync');
 * if (!allowed) {
 *   throw new RateLimitExceededError('Sync rate limit exceeded');
 * }
 * 
 * // Proceed with sync
 * await syncQueue.flush();
 * ```
 * 
 * @see docs/06-security/threat-model.md#T7 (Resource exhaustion mitigation)
 */
export interface IRateLimiter {
    /**
     * Check if operation is allowed under rate limit
     * 
     * Uses token bucket algorithm:
     * 1. Refill tokens based on elapsed time
     * 2. Try to consume 1 token
     * 3. Return true if token available, false otherwise
     * 
     * @param userId - User identifier
     * @param operation - Operation type ('sync', 'auth', 'api')
     * @returns True if allowed, false if rate limited
     */
    checkLimit(userId: string, operation: string): Promise<boolean>;

    /**
     * Get remaining tokens for user operation
     * 
     * @param userId - User identifier
     * @param operation - Operation type
     * @returns Number of tokens remaining
     */
    getRemainingTokens(userId: string, operation: string): Promise<number>;

    /**
     * Reset rate limit for user operation
     * 
     * Used for testing or manual intervention
     * 
     * @param userId - User identifier
     * @param operation - Operation type
     */
    reset(userId: string, operation: string): Promise<void>;

    /**
     * Get rate limit metrics
     * 
     * @returns Metrics for monitoring
     */
    getMetrics(): Promise<RateLimitMetrics>;
}
