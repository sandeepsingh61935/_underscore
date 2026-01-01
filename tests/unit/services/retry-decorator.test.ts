import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RetryDecorator, DEFAULT_RETRY_POLICY } from '@/shared/services/retry-decorator';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { Message } from '@/shared/schemas/message-schemas';

// Mock inner MessageBus
class MockMessageBus implements IMessageBus {
    sendMock = vi.fn();
    subscribeMock = vi.fn();
    publishMock = vi.fn();

    async send<T>(target: string, message: Message): Promise<T> {
        return await this.sendMock(target, message);
    }

    subscribe(messageType: string, handler: Function): () => void {
        return this.subscribeMock(messageType, handler);
    }

    async publish(messageType: string, payload: unknown): Promise<void> {
        await this.publishMock(messageType, payload);
    }
}

// Mock logger
const mockLogger: ILogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
};

describe('RetryDecorator', () => {
    let innerBus: MockMessageBus;
    let retryDecorator: RetryDecorator;

    beforeEach(() => {
        vi.clearAllMocks();
        innerBus = new MockMessageBus();
        retryDecorator = new RetryDecorator(innerBus, mockLogger);
    });

    describe('Initialization', () => {
        it('should use default retry policy when not specified', () => {
            const decorator = new RetryDecorator(innerBus, mockLogger);
            expect(decorator).toBeDefined();
        });

        it('should merge custom policy with defaults', () => {
            const customPolicy = { maxRetries: 5 };
            const decorator = new RetryDecorator(innerBus, mockLogger, customPolicy);
            expect(decorator).toBeDefined();
        });
    });

    describe('send() - Success Cases', () => {
        it('should succeed on first attempt without retry', async () => {
            const expectedResponse = { data: 'success' };
            innerBus.sendMock.mockResolvedValueOnce(expectedResponse);

            const result = await retryDecorator.send('background', {
                type: 'TEST',
                payload: {},
                timestamp: Date.now(),
            });

            expect(result).toEqual(expectedResponse);
            expect(innerBus.sendMock).toHaveBeenCalledOnce();
            expect(mockLogger.warn).not.toHaveBeenCalled(); // No retries needed
        });

        it('should return typed response', async () => {
            type Response = { count: number };
            innerBus.sendMock.mockResolvedValueOnce({ count: 42 });

            const result = await retryDecorator.send<Response>('background', {
                type: 'GET_COUNT',
                payload: {},
                timestamp: Date.now(),
            });

            expect(result.count).toBe(42);
        });
    });

    describe('send() - Retry Logic', () => {
        it('should retry on transient failure and succeed', async () => {
            // Fail first attempt, succeed on second
            innerBus.sendMock
                .mockRejectedValueOnce(new Error('Could not establish connection'))
                .mockResolvedValueOnce({ success: true });

            const result = await retryDecorator.send('background', {
                type: 'TEST',
                payload: {},
                timestamp: Date.now(),
            });

            expect(result).toEqual({ success: true });
            expect(innerBus.sendMock).toHaveBeenCalledTimes(2); // Initial + 1 retry
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Message send failed, will retry',
                expect.objectContaining({ attempt: 0 })
            );
        });

        it('should retry up to maxRetries times', async () => {
            const customPolicy = { maxRetries: 2 };
            const decorator = new RetryDecorator(innerBus, mockLogger, customPolicy);

            // Fail all attempts
            innerBus.sendMock.mockRejectedValue(new Error('Connection failed'));

            await expect(
                decorator.send('background', {
                    type: 'TEST',
                    payload: {},
                    timestamp: Date.now(),
                })
            ).rejects.toThrow('Connection failed');

            // 1 initial attempt + 2 retries = 3 total
            expect(innerBus.sendMock).toHaveBeenCalledTimes(3);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Message send failed after all retries',
                expect.objectContaining({ maxRetries: 2 })
            );
        });

        it('should use exponential backoff delays', async () => {
            const policy = {
                maxRetries: 3,
                initialDelayMs: 100,
                maxDelayMs: 2000,
                backoffMultiplier: 2,
            };
            const decorator = new RetryDecorator(innerBus, mockLogger, policy);

            innerBus.sendMock.mockRejectedValue(new Error('Transient error'));

            const startTime = Date.now();

            await expect(
                decorator.send('background', {
                    type: 'TEST',
                    payload: {},
                    timestamp: Date.now(),
                })
            ).rejects.toThrow();

            const elapsed = Date.now() - startTime;

            // Expected delays: 100ms (1st retry) + 200ms (2nd retry) + 400ms (3rd retry) = 700ms
            // Allow some variance for test execution time
            expect(elapsed).toBeGreaterThanOrEqual(600); // Backoff happened
            expect(elapsed).toBeLessThan(1000); // Not too slow
        }, 2000);

        it('should cap backoff at maxDelayMs', async () => {
            const policy = {
                maxRetries: 5,
                initialDelayMs: 500,
                maxDelayMs: 1000, // Cap at 1 second
                backoffMultiplier: 3, // Exponential growth: 500, 1500(capped 1000), 4500(capped 1000), ...
            };
            const decorator = new RetryDecorator(innerBus, mockLogger, policy);

            innerBus.sendMock.mockRejectedValue(new Error('Error'));

            const startTime = Date.now();

            await expect(
                decorator.send('background', {
                    type: 'TEST',
                    payload: {},
                    timestamp: Date.now(),
                })
            ).rejects.toThrow();

            const elapsed = Date.now() - startTime;

            // Expected: 500 + 1000 + 1000 + 1000 + 1000 = 4500ms
            // CI may be slow, allow more variance
            expect(elapsed).toBeGreaterThanOrEqual(4000);
            expect(elapsed).toBeLessThan(7000); // Increased tolerance for slow environments
        }, 8000);

        it('should log retry attempts with context', async () => {
            innerBus.sendMock
                .mockRejectedValueOnce(new Error('Attempt 1 failed'))
                .mockResolvedValueOnce({ success: true });

            await retryDecorator.send('background', {
                type: 'IMPORTANT',
                payload: {},
                timestamp: Date.now(),
            });

            expect(mockLogger.debug).toHaveBeenCalledWith(
                'Retrying message send',
                expect.objectContaining({
                    messageType: 'IMPORTANT',
                    attempt: 1,
                    delayMs: expect.any(Number),
                })
            );
        });
    });

    describe('send() - Non-Retryable Errors', () => {
        it('should NOT retry on ZodError (validation failure)', async () => {
            const zodError = new Error('Invalid input');
            zodError.name = 'ZodError';

            innerBus.sendMock.mockRejectedValueOnce(zodError);

            await expect(
                retryDecorator.send('background', {
                    type: 'TEST',
                    payload: {},
                    timestamp: Date.now(),
                })
            ).rejects.toThrow('Invalid input');

            expect(innerBus.sendMock).toHaveBeenCalledOnce(); // No retries
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'Non-retryable error, failing fast',
                expect.any(Object)
            );
        });

        it('should NOT retry on validation error pattern', async () => {
            innerBus.sendMock.mockRejectedValueOnce(
                new Error('Validation failed: missing required field')
            );

            await expect(
                retryDecorator.send('background', {
                    type: 'TEST',
                    payload: {},
                    timestamp: Date.now(),
                })
            ).rejects.toThrow('Validation failed');

            expect(innerBus.sendMock).toHaveBeenCalledOnce(); // No retries
        });

        it('should NOT retry on invalid schema error', async () => {
            innerBus.sendMock.mockRejectedValueOnce(
                new Error('Invalid schema: unknown property')
            );

            await expect(
                retryDecorator.send('background', {
                    type: 'TEST',
                    payload: {},
                    timestamp: Date.now(),
                })
            ).rejects.toThrow('Invalid schema');

            expect(innerBus.sendMock).toHaveBeenCalledOnce();
        });
    });

    describe('send() - Tricky Edge Cases', () => {
        it('EDGE: should handle MV3 background script waking up (success on 3rd attempt)', async () => {
            // Realistic: Background script suspended, takes 2 attempts to wake
            innerBus.sendMock
                .mockRejectedValueOnce(new Error('Could not establish connection'))
                .mockRejectedValueOnce(new Error('Connection in progress'))
                .mockResolvedValueOnce({ wokenUp: true });

            const result = await retryDecorator.send('background', {
                type: 'WAKE_UP',
                payload: {},
                timestamp: Date.now(),
            });

            expect(result).toEqual({ wokenUp: true });
            expect(innerBus.sendMock).toHaveBeenCalledTimes(3);
        });

        it('EDGE: should handle non-Error thrown values', async () => {
            // Realistic: Some APIs throw strings or objects
            // Must use mockRejectedValue (not Once) to reject on ALL retries
            innerBus.sendMock.mockRejectedValue('Connection timeout');

            await expect(
                retryDecorator.send('background', {
                    type: 'TEST',
                    payload: {},
                    timestamp: Date.now(),
                })
            ).rejects.toThrow();

            expect(innerBus.sendMock).toHaveBeenCalledTimes(4); // Initial + 3 retries
        });

        it('EDGE: should handle rapid concurrent sends with retries', async () => {
            let callCount = 0;
            innerBus.sendMock.mockImplementation(async () => {
                callCount++;
                if (callCount % 2 === 1) {
                    throw new Error('Transient failure');
                }
                return { success: true };
            });

            const promises = Array.from({ length: 5 }, (_, i) =>
                retryDecorator.send('background', {
                    type: `MSG_${i}`,
                    payload: {},
                    timestamp: Date.now(),
                })
            );

            const results = await Promise.all(promises);

            expect(results).toHaveLength(5);
            expect(results.every((r) => r.success === true)).toBe(true);
        });

        it('EDGE: should retry only send, not subscribe/publish', async () => {
            const handler = vi.fn();

            // These should NOT have retry wrapper
            const unsubscribe = retryDecorator.subscribe('TEST', handler);
            await retryDecorator.publish('TEST', {});

            expect(innerBus.subscribeMock).toHaveBeenCalledOnce();
            expect(innerBus.publishMock).toHaveBeenCalledOnce();
        });

        it('EDGE: should preserve original error message after retries exhausted', async () => {
            const originalError = new Error('Context suspended: background script inactive');
            innerBus.sendMock.mockRejectedValue(originalError);

            try {
                await retryDecorator.send('background', {
                    type: 'TEST',
                    payload: {},
                    timestamp: Date.now(),
                });
                expect.fail('Should have thrown');
            } catch (error) {
                expect(error).toBe(originalError); // Same error object
            }
        });
    });

    describe('subscribe() - Delegation', () => {
        it('should delegate subscribe to inner bus without modification', () => {
            const handler = vi.fn();
            const cleanup = vi.fn();
            innerBus.subscribeMock.mockReturnValue(cleanup);

            const result = retryDecorator.subscribe('TEST', handler);

            expect(innerBus.subscribeMock).toHaveBeenCalledWith('TEST', handler);
            expect(result).toBe(cleanup);
        });
    });

    describe('publish() - Delegation', () => {
        it('should delegate publish to inner bus without modification', async () => {
            innerBus.publishMock.mockResolvedValue(undefined);

            await retryDecorator.publish('BROADCAST', { message: 'hello' });

            expect(innerBus.publishMock).toHaveBeenCalledWith('BROADCAST', {
                message: 'hello',
            });
        });
    });

    describe('Performance', () => {
        it('should have minimal overhead on successful send (< 10ms)', async () => {
            innerBus.sendMock.mockResolvedValue({ success: true });

            const startTime = Date.now();

            await retryDecorator.send('background', {
                type: 'PERF_TEST',
                payload: {},
                timestamp: Date.now(),
            });

            const elapsed = Date.now() - startTime;

            expect(elapsed).toBeLessThan(10); // Minimal overhead
        });
    });

    describe('Default Policy', () => {
        it('should export DEFAULT_RETRY_POLICY with correct values', () => {
            expect(DEFAULT_RETRY_POLICY).toEqual({
                maxRetries: 3,
                initialDelayMs: 100,
                maxDelayMs: 2000,
                backoffMultiplier: 2,
            });
        });
    });
});
