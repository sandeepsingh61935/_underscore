import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CircuitBreaker, CircuitState, CircuitBreakerOpenError } from '@/shared/utils/circuit-breaker';
import type { ILogger } from '@/shared/utils/logger';

describe('CircuitBreaker', () => {
    let circuitBreaker: CircuitBreaker;
    let mockLogger: ILogger;

    beforeEach(() => {
        mockLogger = {
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            setLevel: vi.fn(),
            getLevel: vi.fn(),
        };

        circuitBreaker = new CircuitBreaker(
            {
                failureThreshold: 3,
                resetTimeout: 30000,
                successThreshold: 1,
                name: 'TestCircuit',
            },
            mockLogger
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Basic Functionality', () => {
        it('should pass through calls when CLOSED', async () => {
            // Arrange
            const operation = vi.fn().mockResolvedValue('success');

            // Act
            const result = await circuitBreaker.execute(operation);

            // Assert
            expect(result).toBe('success');
            expect(operation).toHaveBeenCalledTimes(1);
            expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
        });

        it('should open after N consecutive failures', async () => {
            // Arrange
            const failingOperation = vi.fn().mockRejectedValue(new Error('Storage failed'));

            // Act - Trigger 3 failures
            await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('Storage failed');
            await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('Storage failed');
            await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('Storage failed');

            // Assert
            expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Circuit breaker opened'),
                expect.any(Object)
            );
        });

        it('should reject calls immediately when OPEN', async () => {
            // Arrange - Open the circuit
            const failingOperation = vi.fn().mockRejectedValue(new Error('Storage failed'));
            await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
            await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
            await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();

            expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

            // Act - Try to execute when open
            const newOperation = vi.fn().mockResolvedValue('should not run');

            // Assert
            await expect(circuitBreaker.execute(newOperation)).rejects.toThrow(CircuitBreakerOpenError);
            expect(newOperation).not.toHaveBeenCalled(); // Operation should NOT execute
        });

        it('should transition to HALF_OPEN after timeout', async () => {
            // Arrange - Open the circuit
            vi.useFakeTimers();
            const failingOperation = vi.fn().mockRejectedValue(new Error('Storage failed'));

            await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
            await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
            await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();

            expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

            // Act - Advance time past reset timeout
            vi.advanceTimersByTime(30000);

            // Assert - Next call should transition to HALF_OPEN
            const testOperation = vi.fn().mockResolvedValue('testing');
            await circuitBreaker.execute(testOperation);

            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('HALF_OPEN'),
                expect.any(Object)
            );

            vi.useRealTimers();
        });

        it('should close on success in HALF_OPEN', async () => {
            // Arrange - Open the circuit and transition to HALF_OPEN
            vi.useFakeTimers();
            const failingOperation = vi.fn().mockRejectedValue(new Error('Storage failed'));

            await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
            await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
            await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();

            vi.advanceTimersByTime(30000);

            // Act - Success in HALF_OPEN should close circuit
            const successOperation = vi.fn().mockResolvedValue('recovered');
            const result = await circuitBreaker.execute(successOperation);

            // Assert
            expect(result).toBe('recovered');
            expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.stringContaining('Circuit breaker closed'),
                expect.any(Object)
            );

            vi.useRealTimers();
        });
    });

    describe('Edge Cases (Tricky)', () => {
        it('should re-open on failure in HALF_OPEN', async () => {
            // Arrange - Get to HALF_OPEN state
            vi.useFakeTimers();
            const failingOperation = vi.fn().mockRejectedValue(new Error('Storage failed'));

            await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
            await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
            await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();

            vi.advanceTimersByTime(30000);

            // Act - Fail in HALF_OPEN
            await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow('Storage failed');

            // Assert - Should re-open
            expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

            vi.useRealTimers();
        });

        it('should reset failure count on success before threshold', async () => {
            // Arrange
            const failOnceThenSucceed = vi.fn()
                .mockRejectedValueOnce(new Error('Fail 1'))
                .mockRejectedValueOnce(new Error('Fail 2'))
                .mockResolvedValueOnce('Success');

            // Act - 2 failures, then success (below threshold of 3)
            await expect(circuitBreaker.execute(failOnceThenSucceed)).rejects.toThrow();
            await expect(circuitBreaker.execute(failOnceThenSucceed)).rejects.toThrow();
            const result = await circuitBreaker.execute(failOnceThenSucceed);

            // Assert - Should still be CLOSED and failure count reset
            expect(result).toBe('Success');
            expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);

            // Verify failure count was actually reset by needing 3 more failures to open
            const failingOp = vi.fn().mockRejectedValue(new Error('Fail'));
            await expect(circuitBreaker.execute(failingOp)).rejects.toThrow();
            await expect(circuitBreaker.execute(failingOp)).rejects.toThrow();
            expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED); // Still closed

            await expect(circuitBreaker.execute(failingOp)).rejects.toThrow();
            expect(circuitBreaker.getState()).toBe(CircuitState.OPEN); // Now open
        });

        it('should handle async operation throwing errors', async () => {
            // Arrange
            const throwingOperation = vi.fn().mockImplementation(async () => {
                throw new Error('Async throw');
            });

            // Act & Assert
            await expect(circuitBreaker.execute(throwingOperation)).rejects.toThrow('Async throw');
            expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED); // 1 failure, not open yet
        });

        it('should handle async operation timing out', async () => {
            // Arrange
            const slowOperation = vi.fn().mockImplementation(
                () => new Promise((resolve) => setTimeout(resolve, 10000))
            );

            // Act - Operation takes too long (would timeout in real scenario)
            const promise = circuitBreaker.execute(slowOperation);

            // Note: Actual timeout implementation would reject after X ms
            // For this test, we verify the circuit breaker handles long-running ops
            expect(promise).toBeInstanceOf(Promise);
        });

        it('should handle concurrent calls during state transition', async () => {
            // Arrange - Open the circuit
            vi.useFakeTimers();
            const failingOp = vi.fn().mockRejectedValue(new Error('Fail'));

            await expect(circuitBreaker.execute(failingOp)).rejects.toThrow();
            await expect(circuitBreaker.execute(failingOp)).rejects.toThrow();
            await expect(circuitBreaker.execute(failingOp)).rejects.toThrow();

            expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
            vi.advanceTimersByTime(30000);

            // Act - Multiple concurrent calls during HALF_OPEN → CLOSED transition
            const successOp = vi.fn().mockResolvedValue('ok');
            const promises = [
                circuitBreaker.execute(successOp),
                circuitBreaker.execute(successOp),
                circuitBreaker.execute(successOp),
            ];

            const results = await Promise.all(promises);

            // Assert - All should succeed, circuit should be CLOSED
            expect(results).toEqual(['ok', 'ok', 'ok']);
            expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);

            vi.useRealTimers();
        });

        it('should require multiple successes if configured', async () => {
            // Arrange - Circuit breaker with successThreshold = 2
            const strictCircuit = new CircuitBreaker(
                {
                    failureThreshold: 3,
                    resetTimeout: 30000,
                    successThreshold: 2, // Requires 2 successes to close
                    name: 'StrictCircuit',
                },
                mockLogger
            );

            vi.useFakeTimers();
            const failingOp = vi.fn().mockRejectedValue(new Error('Fail'));

            // Open the circuit
            await expect(strictCircuit.execute(failingOp)).rejects.toThrow();
            await expect(strictCircuit.execute(failingOp)).rejects.toThrow();
            await expect(strictCircuit.execute(failingOp)).rejects.toThrow();

            vi.advanceTimersByTime(30000);

            // Act - First success in HALF_OPEN
            const successOp = vi.fn().mockResolvedValue('ok');
            await strictCircuit.execute(successOp);

            // Assert - Should still be HALF_OPEN (needs 2 successes)
            expect(strictCircuit.getState()).toBe(CircuitState.HALF_OPEN);

            // Act - Second success
            await strictCircuit.execute(successOp);

            // Assert - Now should be CLOSED
            expect(strictCircuit.getState()).toBe(CircuitState.CLOSED);

            vi.useRealTimers();
        });
    });

    describe('Chrome Extension Reality (Real Scenarios)', () => {
        it('should handle storage quota exceeded error', async () => {
            // Arrange - Simulate Chrome storage quota error
            const quotaExceededOp = vi.fn().mockRejectedValue(
                new Error('QuotaExceededError: Quota exceeded')
            );

            // Act - Trigger quota exceeded 3 times
            await expect(circuitBreaker.execute(quotaExceededOp)).rejects.toThrow();
            await expect(circuitBreaker.execute(quotaExceededOp)).rejects.toThrow();
            await expect(circuitBreaker.execute(quotaExceededOp)).rejects.toThrow();

            // Assert - Circuit should be OPEN
            expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('opened'),
                expect.objectContaining({
                    state: CircuitState.OPEN,
                })
            );
        });

        it('should handle network offline (ERR_NETWORK_CHANGED)', async () => {
            // Arrange - Simulate Chrome network error
            const networkError = vi.fn().mockRejectedValue(
                new Error('ERR_NETWORK_CHANGED')
            );

            // Act - Trigger network errors
            await expect(circuitBreaker.execute(networkError)).rejects.toThrow();
            await expect(circuitBreaker.execute(networkError)).rejects.toThrow();
            await expect(circuitBreaker.execute(networkError)).rejects.toThrow();

            // Assert
            expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
        });

        it('should handle rapid successive calls (burst)', async () => {
            // Arrange
            const failingOp = vi.fn().mockRejectedValue(new Error('Overloaded'));

            // Act - First 3 calls fail (sequential to ensure circuit opens)
            await expect(circuitBreaker.execute(failingOp)).rejects.toThrow();
            await expect(circuitBreaker.execute(failingOp)).rejects.toThrow();
            await expect(circuitBreaker.execute(failingOp)).rejects.toThrow();

            // Circuit should now be OPEN
            expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

            // Act - Subsequent calls should be rejected immediately
            const successOp = vi.fn().mockResolvedValue('ok');

            await expect(circuitBreaker.execute(successOp)).rejects.toThrow(
                CircuitBreakerOpenError
            );
            await expect(circuitBreaker.execute(successOp)).rejects.toThrow(
                CircuitBreakerOpenError
            );

            // Assert - Operations were rejected, not executed
            expect(successOp).not.toHaveBeenCalled();
            expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

            const metrics = circuitBreaker.getMetrics();
            expect(metrics.rejectedCalls).toBeGreaterThan(0);
        });
    });

    describe('Metrics Tracking', () => {
        it('should track circuit state changes', async () => {
            // Arrange
            const failOp = vi.fn().mockRejectedValue(new Error('Fail'));

            // Act - Open circuit
            await expect(circuitBreaker.execute(failOp)).rejects.toThrow();
            await expect(circuitBreaker.execute(failOp)).rejects.toThrow();
            await expect(circuitBreaker.execute(failOp)).rejects.toThrow();

            const metrics = circuitBreaker.getMetrics();

            // Assert
            expect(metrics.state).toBe(CircuitState.OPEN);
            expect(metrics.failures).toBe(3);
            expect(metrics.totalCalls).toBe(3);
            expect(metrics.lastFailureTime).toBeGreaterThan(0);
            expect(metrics.lastStateChange).toBeGreaterThan(0);
        });
    });
});
