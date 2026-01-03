/**
 * @file rate-limiter.test.ts
 * @description Unit tests for RateLimiter
 * @testing Covering token bucket algorithm, window expiry, edge cases
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RateLimiter } from '@/shared/utils/rate-limiter';
import type { ILogger } from '@/shared/utils/logger';

/**
 * Mock Logger
 */
class MockLogger implements ILogger {
    debug = vi.fn();
    info = vi.fn();
    warn = vi.fn();
    error = vi.fn();
    setLevel = vi.fn();
    getLevel = vi.fn(() => 1);
}

describe('RateLimiter Unit Tests', () => {
    let rateLimiter: RateLimiter;
    let mockLogger: MockLogger;

    beforeEach(() => {
        mockLogger = new MockLogger();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    /**
     * Test 1: BASIC - Allows attempts within limit
     */
    it('should allow attempts within the rate limit', () => {
        // Arrange: 5 attempts per 1000ms
        rateLimiter = new RateLimiter(
            { maxAttempts: 5, windowMs: 1000 },
            mockLogger
        );

        // Act & Assert: First 5 attempts succeed
        for (let i = 0; i < 5; i++) {
            expect(rateLimiter.tryAcquire()).toBe(true);
        }

        // Assert: 6th attempt fails
        expect(rateLimiter.tryAcquire()).toBe(false);
    });

    /**
     * Test 2: TRICKY - Window resets after expiry
     */
    it('should reset attempts after window expires', () => {
        // Arrange
        vi.useFakeTimers();
        rateLimiter = new RateLimiter(
            { maxAttempts: 3, windowMs: 1000 },
            mockLogger
        );

        // Act: Use all 3 attempts
        expect(rateLimiter.tryAcquire()).toBe(true);
        expect(rateLimiter.tryAcquire()).toBe(true);
        expect(rateLimiter.tryAcquire()).toBe(true);
        expect(rateLimiter.tryAcquire()).toBe(false); // 4th fails

        // Act: Advance time past window
        vi.advanceTimersByTime(1001);

        // Assert: Can acquire again
        expect(rateLimiter.tryAcquire()).toBe(true);
    });

    /**
     * Test 3: REALISTIC - Logs warning when rate limit exceeded
     */
    it('should log warning when rate limit is exceeded', () => {
        // Arrange
        rateLimiter = new RateLimiter(
            { maxAttempts: 2, windowMs: 1000 },
            mockLogger
        );

        // Act: Exceed limit
        rateLimiter.tryAcquire();
        rateLimiter.tryAcquire();
        rateLimiter.tryAcquire(); // This should fail and log

        // Assert
        expect(mockLogger.warn).toHaveBeenCalledWith(
            'Rate limit exceeded',
            expect.objectContaining({
                attempts: 2,
                maxAttempts: 2,
            })
        );
    });

    /**
     * Test 4: TRICKY - getAttempts returns 0 after window expiry
     */
    it('should return 0 attempts after window expires', () => {
        // Arrange
        vi.useFakeTimers();
        rateLimiter = new RateLimiter(
            { maxAttempts: 5, windowMs: 1000 },
            mockLogger
        );

        // Act: Make 3 attempts
        rateLimiter.tryAcquire();
        rateLimiter.tryAcquire();
        rateLimiter.tryAcquire();

        // Assert: 3 attempts recorded
        expect(rateLimiter.getAttempts()).toBe(3);

        // Act: Advance time past window
        vi.advanceTimersByTime(1001);

        // Assert: Attempts reset to 0
        expect(rateLimiter.getAttempts()).toBe(0);
    });

    /**
     * Test 5: REALISTIC - Reset clears attempts immediately
     */
    it('should clear attempts when reset is called', () => {
        // Arrange
        rateLimiter = new RateLimiter(
            { maxAttempts: 3, windowMs: 1000 },
            mockLogger
        );

        // Act: Use all attempts
        rateLimiter.tryAcquire();
        rateLimiter.tryAcquire();
        rateLimiter.tryAcquire();

        expect(rateLimiter.tryAcquire()).toBe(false); // Blocked

        // Act: Reset
        rateLimiter.reset();

        // Assert: Can acquire again
        expect(rateLimiter.tryAcquire()).toBe(true);
    });

    /**
     * Test 6: TRICKY - Concurrent rapid-fire attempts
     */
    it('should handle rapid concurrent attempts correctly', () => {
        // Arrange
        rateLimiter = new RateLimiter(
            { maxAttempts: 10, windowMs: 1000 },
            mockLogger
        );

        // Act: 20 rapid attempts
        const results = [];
        for (let i = 0; i < 20; i++) {
            results.push(rateLimiter.tryAcquire());
        }

        // Assert: First 10 succeed, rest fail
        const successes = results.filter((r) => r === true).length;
        const failures = results.filter((r) => r === false).length;

        expect(successes).toBe(10);
        expect(failures).toBe(10);
    });

    /**
     * Test 7: REALISTIC - Different window sizes work correctly
     */
    it('should work with different window sizes', () => {
        // Arrange: 15-minute window (auth use case)
        vi.useFakeTimers();
        rateLimiter = new RateLimiter(
            { maxAttempts: 5, windowMs: 15 * 60 * 1000 }, // 15 minutes
            mockLogger
        );

        // Act: Use all attempts
        for (let i = 0; i < 5; i++) {
            rateLimiter.tryAcquire();
        }

        expect(rateLimiter.tryAcquire()).toBe(false);

        // Act: Advance 14 minutes (not enough)
        vi.advanceTimersByTime(14 * 60 * 1000);
        expect(rateLimiter.tryAcquire()).toBe(false);

        // Act: Advance 1 more minute (total 15min)
        vi.advanceTimersByTime(1 * 60 * 1000);
        expect(rateLimiter.tryAcquire()).toBe(true); // Now allowed
    });

    /**
     * Test 8: TRICKY - Edge case: maxAttempts = 0
     */
    it('should block all attempts when maxAttempts is 0', () => {
        // Arrange
        rateLimiter = new RateLimiter(
            { maxAttempts: 0, windowMs: 1000 },
            mockLogger
        );

        // Act & Assert: All attempts blocked
        expect(rateLimiter.tryAcquire()).toBe(false);
        expect(rateLimiter.tryAcquire()).toBe(false);
    });

    /**
     * Test 9: REALISTIC - Edge case: maxAttempts = 1 (strict limiting)
     */
    it('should allow only 1 attempt when maxAttempts is 1', () => {
        // Arrange
        rateLimiter = new RateLimiter(
            { maxAttempts: 1, windowMs: 1000 },
            mockLogger
        );

        // Act & Assert
        expect(rateLimiter.tryAcquire()).toBe(true); // First succeeds
        expect(rateLimiter.tryAcquire()).toBe(false); // Second fails
        expect(rateLimiter.tryAcquire()).toBe(false); // Third fails
    });

    /**
     * Test 10: TRICKY - Window boundary timing precision
     */
    it('should handle window boundary timing precisely', () => {
        // Arrange
        vi.useFakeTimers();
        rateLimiter = new RateLimiter(
            { maxAttempts: 1, windowMs: 1000 },
            mockLogger
        );

        // Act: First attempt
        expect(rateLimiter.tryAcquire()).toBe(true);

        // Act: Advance to 999ms (just before window expires)
        vi.advanceTimersByTime(999);
        expect(rateLimiter.tryAcquire()).toBe(false); // Still blocked

        // Act: Advance 1ms more (exactly 1000ms)
        vi.advanceTimersByTime(1);
        expect(rateLimiter.tryAcquire()).toBe(true); // Now allowed
    });
});
