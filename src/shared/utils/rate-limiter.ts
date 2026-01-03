/**
 * @file rate-limiter.ts
 * @description Token bucket rate limiter for authentication protection
 * @security Prevents brute force attacks
 */

import type { ILogger } from '@/shared/utils/logger';

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
    /** Maximum number of attempts allowed in the window */
    readonly maxAttempts: number;
    /** Time window in milliseconds */
    readonly windowMs: number;
}

/**
 * Token bucket rate limiter implementation
 *
 * @pattern Token Bucket Algorithm
 * @security Prevents brute force attacks (5 attempts per 15min for auth)
 */
export class RateLimiter {
    private attempts = 0;
    private windowStart: number;

    constructor(
        private readonly config: RateLimiterConfig,
        private readonly logger?: ILogger
    ) {
        this.windowStart = Date.now();
    }

    /**
     * Try to acquire a token (attempt)
     *
     * @returns True if attempt allowed, false if rate limit exceeded
     */
    tryAcquire(): boolean {
        const now = Date.now();

        // Check if we need to reset the window
        if (now - this.windowStart >= this.config.windowMs) {
            // Window expired, reset
            this.attempts = 0;
            this.windowStart = now;
        }

        // Check if we have attempts remaining
        if (this.attempts >= this.config.maxAttempts) {
            this.logger?.warn('Rate limit exceeded', {
                attempts: this.attempts,
                maxAttempts: this.config.maxAttempts,
                windowMs: this.config.windowMs,
            });
            return false;
        }

        // Increment and allow
        this.attempts++;
        return true;
    }

    /**
     * Reset the rate limiter
     */
    reset(): void {
        this.attempts = 0;
        this.windowStart = Date.now();
    }

    /**
     * Get current attempt count
     */
    getAttempts(): number {
        const now = Date.now();

        // Return 0 if window expired
        if (now - this.windowStart >= this.config.windowMs) {
            return 0;
        }

        return this.attempts;
    }
}
