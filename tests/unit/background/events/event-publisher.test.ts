/**
 * @file event-publisher.test.ts
 * @description Unit tests for EventPublisher
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventPublisher } from '@/background/events/event-publisher';
import type { ILogger } from '@/shared/interfaces/i-logger';

const createMockLogger = (): ILogger => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
    getLevel: vi.fn(() => 1 as any),
});

describe('EventPublisher', () => {
    let publisher: EventPublisher;
    let logger: ILogger;

    beforeEach(() => {
        logger = createMockLogger();
        publisher = new EventPublisher(logger);
    });

    describe('Basic Functionality', () => {
        it('should publish event to all subscribers', async () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();
            const payload = { id: '123', text: 'test' };

            publisher.subscribe('test.event', handler1);
            publisher.subscribe('test.event', handler2);

            await publisher.publish('test.event', payload);

            expect(handler1).toHaveBeenCalledWith(payload);
            expect(handler2).toHaveBeenCalledWith(payload);
        });

        it('should register handler via subscribe', () => {
            const handler = vi.fn();

            publisher.subscribe('test.event', handler);

            // Verify handler is called when event is published
            publisher.publish('test.event', { data: 'test' });
            expect(handler).toHaveBeenCalled();
        });

        it('should unsubscribe handler', async () => {
            const handler = vi.fn();

            publisher.subscribe('test.event', handler);
            publisher.unsubscribe('test.event', handler);

            await publisher.publish('test.event', { data: 'test' });

            expect(handler).not.toHaveBeenCalled();
        });

        it('should return unsubscribe function from subscribe', async () => {
            const handler = vi.fn();

            const unsubscribe = publisher.subscribe('test.event', handler);
            unsubscribe();

            await publisher.publish('test.event', { data: 'test' });

            expect(handler).not.toHaveBeenCalled();
        });
    });

    describe('Multiple Subscribers', () => {
        it('should call subscribers in registration order', async () => {
            const callOrder: number[] = [];
            const handler1 = vi.fn(() => callOrder.push(1));
            const handler2 = vi.fn(() => callOrder.push(2));
            const handler3 = vi.fn(() => callOrder.push(3));

            publisher.subscribe('test.event', handler1);
            publisher.subscribe('test.event', handler2);
            publisher.subscribe('test.event', handler3);

            await publisher.publish('test.event', {});

            expect(callOrder).toEqual([1, 2, 3]);
        });

        it('should not affect other subscribers when one unsubscribes', async () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();
            const handler3 = vi.fn();

            publisher.subscribe('test.event', handler1);
            publisher.subscribe('test.event', handler2);
            publisher.subscribe('test.event', handler3);

            publisher.unsubscribe('test.event', handler2);

            await publisher.publish('test.event', {});

            expect(handler1).toHaveBeenCalled();
            expect(handler2).not.toHaveBeenCalled();
            expect(handler3).toHaveBeenCalled();
        });

        it('should handle multiple event types independently', async () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            publisher.subscribe('event.type1', handler1);
            publisher.subscribe('event.type2', handler2);

            await publisher.publish('event.type1', { data: 'test1' });

            expect(handler1).toHaveBeenCalledWith({ data: 'test1' });
            expect(handler2).not.toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        it('should not break other subscribers when one throws error', async () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn(() => {
                throw new Error('Handler error');
            });
            const handler3 = vi.fn();

            publisher.subscribe('test.event', handler1);
            publisher.subscribe('test.event', handler2);
            publisher.subscribe('test.event', handler3);

            await publisher.publish('test.event', {});

            expect(handler1).toHaveBeenCalled();
            expect(handler2).toHaveBeenCalled();
            expect(handler3).toHaveBeenCalled();
        });

        it('should log subscriber error', async () => {
            const handler = vi.fn(() => {
                throw new Error('Test error');
            });

            publisher.subscribe('test.event', handler);

            await publisher.publish('test.event', {});

            expect(logger.error).toHaveBeenCalledWith(
                'Subscriber error',
                expect.any(Error),
                expect.objectContaining({
                    eventType: 'test.event',
                })
            );
        });

        it('should emit SUBSCRIBER_ERROR event', async () => {
            const errorHandler = vi.fn();
            const failingHandler = vi.fn(() => {
                throw new Error('Test error');
            });

            publisher.subscribe('SUBSCRIBER_ERROR', errorHandler);
            publisher.subscribe('test.event', failingHandler);

            await publisher.publish('test.event', {});

            expect(errorHandler).toHaveBeenCalledWith({
                eventType: 'test.event',
                error: expect.any(Error),
            });
        });
    });

    describe('Edge Cases', () => {
        it('should handle unsubscribe of non-existent handler gracefully', () => {
            const handler = vi.fn();

            // Should not throw
            expect(() => {
                publisher.unsubscribe('nonexistent.event', handler);
            }).not.toThrow();
        });

        it('should handle publish with no subscribers', async () => {
            // Should not throw
            await expect(publisher.publish('no.subscribers', {})).resolves.not.toThrow();
        });

        it('should throw when handler is not a function', () => {
            expect(() => {
                // @ts-expect-error Testing validation
                publisher.subscribe('test.event', 'not a function');
            }).toThrow('Handler must be a function');
        });

        it('should handle async handlers', async () => {
            const asyncHandler = vi.fn(async () => {
                await new Promise((resolve) => setTimeout(resolve, 10));
            });

            publisher.subscribe('test.event', asyncHandler);

            await publisher.publish('test.event', {});

            expect(asyncHandler).toHaveBeenCalled();
        });

        it('should handle mix of sync and async handlers', async () => {
            const syncHandler = vi.fn();
            const asyncHandler = vi.fn(async () => {
                await new Promise((resolve) => setTimeout(resolve, 10));
            });

            publisher.subscribe('test.event', syncHandler);
            publisher.subscribe('test.event', asyncHandler);

            await publisher.publish('test.event', {});

            expect(syncHandler).toHaveBeenCalled();
            expect(asyncHandler).toHaveBeenCalled();
        });
    });
});
