/**
 * @file rate-limiter.test.ts
 * @description Unit tests for RateLimiter (SECURITY CRITICAL)
 * Following Testing Strategy v2: Attack scenarios, realistic testing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimiter } from '@/background/sync/rate-limiter';
import type { ILogger } from '@/shared/interfaces/i-logger';
import { EventBus } from '@/shared/utils/event-bus';

const createMockLogger = (): ILogger => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
    getLevel: vi.fn(() => 1 as any),
});

describe('RateLimiter Unit Tests - SECURITY CRITICAL', () => {
    let rateLimiter: RateLimiter;
    let logger: ILogger;
    let eventBus: EventBus;

    beforeEach(() => {
        logger = createMockLogger();
        eventBus = new EventBus();
        rateLimiter = new RateLimiter(logger, eventBus);
    });

    afterEach(() => {
        rateLimiter.destroy();
    });

    describe('Token Bucket Algorithm', () => {
        it('should allow requests within rate limit (sync: 10/min)', async () => {
            const userId = 'user-123';
            const operation = 'sync';

            // Should allow 10 requests
            for (let i = 0; i < 10; i++) {
                const allowed = await rateLimiter.checkLimit(userId, operation);
                expect(allowed).toBe(true);
            }

            // 11th request should be blocked
            const blocked = await rateLimiter.checkLimit(userId, operation);
            expect(blocked).toBe(false);
        });

        it('should refill tokens over time (Realistic: Wait for refill)', async () => {
            vi.useFakeTimers();

            const userId = 'user-123';
            const operation = 'sync';

            // Consume all 10 tokens
            for (let i = 0; i < 10; i++) {
                await rateLimiter.checkLimit(userId, operation);
            }

            // Should be blocked
            expect(await rateLimiter.checkLimit(userId, operation)).toBe(false);

            // Wait 6 seconds (should refill 1 token at 10/60s rate)
            vi.advanceTimersByTime(6000);

            // Should allow 1 request
            expect(await rateLimiter.checkLimit(userId, operation)).toBe(true);

            // Should be blocked again
            expect(await rateLimiter.checkLimit(userId, operation)).toBe(false);

            vi.useRealTimers();
        });

        it('should enforce different limits per operation', async () => {
            const userId = 'user-123';

            // Sync: 10/min
            for (let i = 0; i < 10; i++) {
                expect(await rateLimiter.checkLimit(userId, 'sync')).toBe(true);
            }
            expect(await rateLimiter.checkLimit(userId, 'sync')).toBe(false);

            // Auth: 5/15min
            for (let i = 0; i < 5; i++) {
                expect(await rateLimiter.checkLimit(userId, 'auth')).toBe(true);
            }
            expect(await rateLimiter.checkLimit(userId, 'auth')).toBe(false);

            // API: 100/min
            for (let i = 0; i < 100; i++) {
                expect(await rateLimiter.checkLimit(userId, 'api')).toBe(true);
            }
            expect(await rateLimiter.checkLimit(userId, 'api')).toBe(false);
        });
    });

    describe('Security - Attack Scenarios', () => {
        it('should block burst attack (Tricky: Attacker sends 100 requests instantly)', async () => {
            const attackerId = 'attacker-456';
            const operation = 'sync';

            let blockedCount = 0;

            // Attacker sends 100 requests
            for (let i = 0; i < 100; i++) {
                const allowed = await rateLimiter.checkLimit(attackerId, operation);
                if (!allowed) {
                    blockedCount++;
                }
            }

            // Should block 90 requests (only 10 allowed)
            expect(blockedCount).toBe(90);
        });

        it('should block sustained attack over time (Tricky: Attacker sends 1 req/sec for 60s)', async () => {
            vi.useFakeTimers();

            const attackerId = 'attacker-789';
            const operation = 'sync';

            let blockedCount = 0;

            // Attacker sends 1 request per second for 60 seconds
            for (let i = 0; i < 60; i++) {
                const allowed = await rateLimiter.checkLimit(attackerId, operation);
                if (!allowed) {
                    blockedCount++;
                }
                vi.advanceTimersByTime(1000); // 1 second
            }

            // Should block ~50 requests (10 initial + ~10 refilled = ~20 allowed, 40 blocked)
            expect(blockedCount).toBeGreaterThan(40);

            vi.useRealTimers();
        });

        it('should maintain separate buckets per user (Multi-user scenario)', async () => {
            const user1 = 'user-1';
            const user2 = 'user-2';
            const operation = 'sync';

            // User 1 exhausts their limit
            for (let i = 0; i < 10; i++) {
                await rateLimiter.checkLimit(user1, operation);
            }
            expect(await rateLimiter.checkLimit(user1, operation)).toBe(false);

            // User 2 should still have full capacity
            expect(await rateLimiter.checkLimit(user2, operation)).toBe(true);
        });

        it('should emit RATE_LIMIT_EXCEEDED event when blocked', async () => {
            const events: any[] = [];
            eventBus.on('RATE_LIMIT_EXCEEDED', (data) => events.push(data));

            const userId = 'user-123';
            const operation = 'sync';

            // Exhaust limit
            for (let i = 0; i < 10; i++) {
                await rateLimiter.checkLimit(userId, operation);
            }

            // Trigger block
            await rateLimiter.checkLimit(userId, operation);

            expect(events).toHaveLength(1);
            expect(events[0]).toMatchObject({ userId, operation });
        });
    });

    describe('Metrics', () => {
        it('should track rate limit metrics correctly', async () => {
            const userId = 'user-123';

            // Make 15 requests (10 allowed, 5 blocked)
            for (let i = 0; i < 15; i++) {
                await rateLimiter.checkLimit(userId, 'sync');
            }

            const metrics = await rateLimiter.getMetrics();

            expect(metrics.totalAttempts).toBe(15);
            expect(metrics.blockedAttempts).toBe(5);
            expect(metrics.blockRate).toBeCloseTo(5 / 15, 2);
            expect(metrics.activeBuckets).toBeGreaterThan(0);
        });
    });

    describe('Management', () => {
        it('should get remaining tokens correctly', async () => {
            const userId = 'user-123';
            const operation = 'sync';

            // Initially should have 10 tokens
            let remaining = await rateLimiter.getRemainingTokens(userId, operation);
            expect(remaining).toBe(10);

            // Consume 5 tokens
            for (let i = 0; i < 5; i++) {
                await rateLimiter.checkLimit(userId, operation);
            }

            // Should have 5 remaining
            remaining = await rateLimiter.getRemainingTokens(userId, operation);
            expect(remaining).toBe(5);
        });

        it('should reset rate limit correctly', async () => {
            const userId = 'user-123';
            const operation = 'sync';

            // Exhaust limit
            for (let i = 0; i < 10; i++) {
                await rateLimiter.checkLimit(userId, operation);
            }

            expect(await rateLimiter.checkLimit(userId, operation)).toBe(false);

            // Reset
            await rateLimiter.reset(userId, operation);

            // Should allow requests again
            expect(await rateLimiter.checkLimit(userId, operation)).toBe(true);
        });
    });
});
