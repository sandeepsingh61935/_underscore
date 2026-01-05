/**
 * @file rate-limiter.ts
 * @description Rate limiter using token bucket algorithm for DoS protection
 * @author System Architect
 */

import type { IRateLimiter, RateLimitConfig, RateLimitMetrics } from './interfaces/i-rate-limiter';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { EventBus } from '@/background/utils/event-bus';

/**
 * Token bucket for rate limiting
 */
class TokenBucket {
    private tokens: number;
    private lastRefill: number;

    constructor(
        private readonly capacity: number,
        private readonly refillRate: number // tokens per second
    ) {
        this.tokens = capacity;
        this.lastRefill = Date.now();
    }

    /**
     * Try to consume tokens
     */
    tryConsume(count: number = 1): boolean {
        this.refill();

        if (this.tokens >= count) {
            this.tokens -= count;
            return true;
        }

        return false;
    }

    /**
     * Refill tokens based on elapsed time
     */
    private refill(): void {
        const now = Date.now();
        const elapsed = (now - this.lastRefill) / 1000; // seconds
        const tokensToAdd = elapsed * this.refillRate;

        this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
        this.lastRefill = now;
    }

    /**
     * Get remaining tokens
     */
    getRemainingTokens(): number {
        this.refill();
        return Math.floor(this.tokens);
    }

    /**
     * Reset bucket to full capacity
     */
    reset(): void {
        this.tokens = this.capacity;
        this.lastRefill = Date.now();
    }
}

/**
 * RateLimiter implementation using token bucket algorithm
 * 
 * Provides DoS protection by limiting requests per user per operation.
 * 
 * Rate limits:
 * - Sync: 10 requests/minute
 * - Auth: 5 requests/15 minutes
 * - API: 100 requests/minute
 */
export class RateLimiter implements IRateLimiter {
    private buckets = new Map<string, TokenBucket>();
    private metrics: RateLimitMetrics = {
        totalAttempts: 0,
        blockedAttempts: 0,
        blockRate: 0,
        activeBuckets: 0,
    };
    private cleanupInterval: NodeJS.Timeout | null = null;

    constructor(
        private readonly logger: ILogger,
        private readonly eventBus: EventBus
    ) {
        // Start cleanup interval (every 5 minutes)
        this.cleanupInterval = setInterval(() => {
            this.cleanupInactiveBuckets();
        }, 5 * 60 * 1000);
    }

    /**
     * Check if operation is allowed under rate limit
     */
    async checkLimit(userId: string, operation: string): Promise<boolean> {
        const key = `${userId}:${operation}`;
        let bucket = this.buckets.get(key);

        if (!bucket) {
            const config = this.getRateLimitConfig(operation);
            bucket = new TokenBucket(config.capacity, config.refillRate);
            this.buckets.set(key, bucket);
        }

        const allowed = bucket.tryConsume();

        // Track metrics
        this.metrics.totalAttempts++;
        if (!allowed) {
            this.metrics.blockedAttempts++;
            this.metrics.blockRate = this.metrics.blockedAttempts / this.metrics.totalAttempts;

            this.logger.warn('Rate limit exceeded', { userId, operation });
            this.eventBus.emit('RATE_LIMIT_EXCEEDED', { userId, operation });
        }

        this.metrics.activeBuckets = this.buckets.size;

        return allowed;
    }

    /**
     * Get remaining tokens for user operation
     */
    async getRemainingTokens(userId: string, operation: string): Promise<number> {
        const key = `${userId}:${operation}`;
        const bucket = this.buckets.get(key);

        if (!bucket) {
            const config = this.getRateLimitConfig(operation);
            return config.capacity;
        }

        return bucket.getRemainingTokens();
    }

    /**
     * Reset rate limit for user operation
     */
    async reset(userId: string, operation: string): Promise<void> {
        const key = `${userId}:${operation}`;
        const bucket = this.buckets.get(key);

        if (bucket) {
            bucket.reset();
            this.logger.info('Rate limit reset', { userId, operation });
        }
    }

    /**
     * Get rate limit metrics
     */
    async getMetrics(): Promise<RateLimitMetrics> {
        return { ...this.metrics };
    }

    /**
     * Get rate limit configuration for operation
     */
    private getRateLimitConfig(operation: string): RateLimitConfig {
        switch (operation) {
            case 'sync':
                return {
                    capacity: 10,
                    refillRate: 10 / 60, // 10 per minute
                    refillInterval: 60000,
                };
            case 'auth':
                return {
                    capacity: 5,
                    refillRate: 5 / 900, // 5 per 15 minutes
                    refillInterval: 900000,
                };
            case 'api':
                return {
                    capacity: 100,
                    refillRate: 100 / 60, // 100 per minute
                    refillInterval: 60000,
                };
            default:
                return {
                    capacity: 100,
                    refillRate: 100 / 60,
                    refillInterval: 60000,
                };
        }
    }

    /**
     * Cleanup inactive buckets (not used in last 30 minutes)
     */
    private cleanupInactiveBuckets(): void {
        // For now, just log - in production would track last access time
        this.logger.debug('Cleaning up inactive rate limit buckets', {
            count: this.buckets.size,
        });

        // Simple cleanup: if we have too many buckets, clear all
        if (this.buckets.size > 10000) {
            this.logger.warn('Too many rate limit buckets, clearing all');
            this.buckets.clear();
        }
    }

    /**
     * Cleanup - stop cleanup interval
     */
    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
}
