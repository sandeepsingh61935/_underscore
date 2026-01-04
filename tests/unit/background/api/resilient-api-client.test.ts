import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResilientAPIClient } from '@/background/api/resilient-api-client';
import { NetworkError, ServerError, AuthenticationError, ValidationError, RateLimitError } from '@/background/api/api-errors';
import type { IAPIClient } from '@/background/api/interfaces/i-api-client';
import type { ILogger } from '@/shared/interfaces/i-logger';

describe('ResilientAPIClient', () => {
    let resilientClient: ResilientAPIClient;
    let mockInnerClient: IAPIClient;
    let mockLogger: ILogger;

    beforeEach(() => {
        vi.useFakeTimers();

        mockInnerClient = {
            createHighlight: vi.fn(),
            updateHighlight: vi.fn(),
            deleteHighlight: vi.fn(),
            getHighlights: vi.fn(),
            pushEvents: vi.fn(),
            pullEvents: vi.fn(),
            createCollection: vi.fn(),
            getCollections: vi.fn(),
        } as unknown as IAPIClient;

        mockLogger = {
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            setLevel: vi.fn(),
            getLevel: vi.fn(),
        };

        resilientClient = new ResilientAPIClient(
            mockInnerClient,
            mockLogger,
            {
                maxRetries: 2, // 2 retries = 3 total attempts
                initialDelayMs: 100,
                maxDelayMs: 1000,
                backoffMultiplier: 2,
            },
            {
                failureThreshold: 3, // Open after 3 failures
                resetTimeout: 5000,
            }
        );
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    describe('Retry Logic', () => {
        it('should pass through successful calls immediately', async () => {
            (mockInnerClient.getHighlights as any).mockResolvedValue(['highlight1']);

            const result = await resilientClient.getHighlights();

            expect(result).toEqual(['highlight1']);
            expect(mockInnerClient.getHighlights).toHaveBeenCalledTimes(1);
        });

        it('should retry on NetworkError', async () => {
            (mockInnerClient.getHighlights as any)
                .mockRejectedValueOnce(new NetworkError('Connection failed'))
                .mockResolvedValueOnce(['highlight-success']);

            const promise = resilientClient.getHighlights();

            // Advance timers to trigger retries
            await vi.runAllTimersAsync();

            const result = await promise;

            expect(result).toEqual(['highlight-success']);
            expect(mockInnerClient.getHighlights).toHaveBeenCalledTimes(2);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('API operation failed, will retry'),
                expect.anything()
            );
        });

        it('should retry on ServerError (5xx)', async () => {
            (mockInnerClient.getHighlights as any)
                .mockRejectedValueOnce(new ServerError('Server busy', 503))
                .mockResolvedValueOnce(['highlight-success']);

            const promise = resilientClient.getHighlights();
            await vi.runAllTimersAsync();

            const result = await promise;
            expect(result).toEqual(['highlight-success']);
            expect(mockInnerClient.getHighlights).toHaveBeenCalledTimes(2);
        });

        it('should NOT retry on AuthenticationError', async () => {
            (mockInnerClient.getHighlights as any).mockRejectedValue(new AuthenticationError('Unauthorized'));

            await expect(resilientClient.getHighlights()).rejects.toThrow(AuthenticationError);
            expect(mockInnerClient.getHighlights).toHaveBeenCalledTimes(1);
        });

        it('should NOT retry on ValidationError', async () => {
            (mockInnerClient.getHighlights as any).mockRejectedValue(new ValidationError('Bad Input'));

            await expect(resilientClient.getHighlights()).rejects.toThrow(ValidationError);
            expect(mockInnerClient.getHighlights).toHaveBeenCalledTimes(1);
        });

        it('should NOT retry on RateLimitError', async () => {
            (mockInnerClient.getHighlights as any).mockRejectedValue(new RateLimitError('Slow down'));

            await expect(resilientClient.getHighlights()).rejects.toThrow(RateLimitError);
            expect(mockInnerClient.getHighlights).toHaveBeenCalledTimes(1);
        });

        it('should exhaust retries and fail', async () => {
            (mockInnerClient.getHighlights as any).mockRejectedValue(new NetworkError('Fail forever'));

            const promise = resilientClient.getHighlights();

            // Handle the rejection to prevent "Unhandled Rejection" warning/error
            // We just want to ensure it completes, then we check the error
            const catchPromise = promise.catch(() => { });

            await vi.runAllTimersAsync();
            await catchPromise;

            await expect(promise).rejects.toThrow(NetworkError);
            // Initial + 2 retries = 3 attempts
            expect(mockInnerClient.getHighlights).toHaveBeenCalledTimes(3);
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('API operation failed after all retries'),
                expect.anything(),
                expect.anything()
            );
        });
    });

    describe('Circuit Breaker Integration', () => {
        it('should open circuit after failure threshold reached', async () => {
            // Threshold is 3
            (mockInnerClient.getHighlights as any).mockRejectedValue(new NetworkError('Fail'));

            // Attempt 1
            const p1 = resilientClient.getHighlights();
            p1.catch(() => { });
            await vi.runAllTimersAsync();
            await expect(p1).rejects.toThrow(NetworkError);

            // Attempt 2
            const p2 = resilientClient.getHighlights();
            p2.catch(() => { });
            await vi.runAllTimersAsync();
            await expect(p2).rejects.toThrow(NetworkError);

            // Attempt 3 -> Opens Circuit
            const p3 = resilientClient.getHighlights();
            p3.catch(() => { });
            await vi.runAllTimersAsync();
            await expect(p3).rejects.toThrow(NetworkError);

            // Attempt 4 -> Circuit Open Error (Immediate)
            await expect(resilientClient.getHighlights()).rejects.toThrow(/Circuit breaker.*is OPEN/);
        });

        it('should NOT count non-retryable errors towards circuit failures', async () => {
            (mockInnerClient.getHighlights as any).mockRejectedValue(new ValidationError('Bad Input'));

            // 5 failures (more than threshold 3)
            for (let i = 0; i < 5; i++) {
                await expect(resilientClient.getHighlights()).rejects.toThrow(ValidationError);
            }

            // Circuit should still be CLOSED (next call shouldn't fail with CircuitBreakerOpenError)
            // We can verify by making a success call
            (mockInnerClient.getHighlights as any).mockResolvedValue(['success']);
            const result = await resilientClient.getHighlights();
            expect(result).toEqual(['success']);
        });

        it('should reset circuit after timeout', async () => {
            // Trip circuit
            (mockInnerClient.getHighlights as any).mockRejectedValue(new NetworkError('Fail'));

            // Attempt 1 (will retry 2 times, total 3 attempts)
            const p1 = resilientClient.getHighlights();
            p1.catch(() => { }); // Prevent unhandled rejection
            await vi.runAllTimersAsync();
            try { await p1; } catch { }

            // Attempt 2
            const p2 = resilientClient.getHighlights();
            p2.catch(() => { });
            await vi.runAllTimersAsync();
            try { await p2; } catch { }

            // Attempt 3 -> Circuit opens after this
            const p3 = resilientClient.getHighlights();
            p3.catch(() => { });
            await vi.runAllTimersAsync();
            try { await p3; } catch { }

            // Verify Open (no timer needed, instant)
            await expect(resilientClient.getHighlights()).rejects.toThrow(/Circuit breaker.*is OPEN/);

            // Wait for reset timeout (5000ms)
            await vi.advanceTimersByTimeAsync(5001);

            // Should pass now (calls HALF_OPEN -> CLOSED)
            (mockInnerClient.getHighlights as any).mockResolvedValue(['success']);
            const result = await resilientClient.getHighlights();
            expect(result).toEqual(['success']);
        });
    });
});
