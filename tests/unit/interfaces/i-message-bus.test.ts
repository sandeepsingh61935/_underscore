import { describe, it, expect, vi } from 'vitest';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type { Message, MessageHandler } from '@/shared/schemas/message-schemas';

/**
 * Mock implementation of IMessageBus for testing
 */
class MockMessageBus implements IMessageBus {
    private handlers = new Map<string, Set<MessageHandler>>();
    public sendCalls: Array<{ target: string; message: Message }> = [];
    public publishCalls: Array<{ messageType: string; payload: unknown }> = [];

    async send<T = unknown>(target: string, message: Message): Promise<T> {
        this.sendCalls.push({ target, message });
        return {} as T;
    }

    subscribe<T = unknown>(messageType: string, handler: MessageHandler<T>): () => void {
        if (!this.handlers.has(messageType)) {
            this.handlers.set(messageType, new Set());
        }
        this.handlers.get(messageType)!.add(handler as MessageHandler);

        return () => {
            this.handlers.get(messageType)?.delete(handler as MessageHandler);
        };
    }

    async publish(messageType: string, payload: unknown): Promise<void> {
        this.publishCalls.push({ messageType, payload });
        const handlers = this.handlers.get(messageType);
        if (handlers) {
            for (const handler of handlers) {
                await handler(payload, {} as chrome.runtime.MessageSender);
            }
        }
    }

    reset() {
        this.sendCalls = [];
        this.publishCalls = [];
        this.handlers.clear();
    }
}

describe('IMessageBus Interface Compliance', () => {
    let messageBus: MockMessageBus;

    beforeEach(() => {
        messageBus = new MockMessageBus();
    });

    describe('Interface Implementation', () => {
        it('should implement IMessageBus interface', () => {
            const bus: IMessageBus = messageBus;
            expect(bus).toBeDefined();
            expect(typeof bus.send).toBe('function');
            expect(typeof bus.subscribe).toBe('function');
            expect(typeof bus.publish).toBe('function');
        });

        it('should have correct method signatures', () => {
            expect(messageBus.send).toHaveLength(2); // target, message
            expect(messageBus.subscribe).toHaveLength(2); // messageType, handler
            expect(messageBus.publish).toHaveLength(2); // messageType, payload
        });
    });

    describe('send() method', () => {
        it('should send message to target', async () => {
            const message: Message = {
                type: 'TEST',
                payload: { data: 'value' },
                timestamp: Date.now(),
            };

            await messageBus.send('background', message);

            expect(messageBus.sendCalls).toHaveLength(1);
            expect(messageBus.sendCalls[0].target).toBe('background');
            expect(messageBus.sendCalls[0].message).toEqual(message);
        });

        it('should return typed response', async () => {
            type Response = { count: number };
            const result = await messageBus.send<Response>('content', {
                type: 'GET_COUNT',
                payload: {},
                timestamp: Date.now(),
            });

            // TypeScript compilation verifies type safety
            expect(result).toBeDefined();
        });
    });

    describe('subscribe() method', () => {
        it('should register message handler', () => {
            const handler = vi.fn();

            const unsubscribe = messageBus.subscribe('TEST_MESSAGE', handler);

            expect(typeof unsubscribe).toBe('function');
        });

        it('should unsubscribe handler', async () => {
            const handler = vi.fn();

            const unsubscribe = messageBus.subscribe('TEST', handler);
            unsubscribe();

            await messageBus.publish('TEST', {});

            expect(handler).not.toHaveBeenCalled();
        });

        it('should support multiple subscribers for same message type', async () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            messageBus.subscribe('TEST', handler1);
            messageBus.subscribe('TEST', handler2);

            await messageBus.publish('TEST', { value: 1 });

            expect(handler1).toHaveBeenCalledOnce();
            expect(handler2).toHaveBeenCalledOnce();
        });

        it('should provide typed payload to handler', async () => {
            type Payload = { count: number };
            const handler = vi.fn<[Payload, chrome.runtime.MessageSender]>();

            messageBus.subscribe<Payload>('COUNT_UPDATE', handler);

            await messageBus.publish('COUNT_UPDATE', { count: 5 });

            expect(handler).toHaveBeenCalledWith(
                { count: 5 },
                expect.any(Object)
            );
        });

        it('should pass MessageSender to handler', async () => {
            const handler = vi.fn();
            messageBus.subscribe('TEST', handler);

            await messageBus.publish('TEST', {});

            expect(handler).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({}) // MessageSender mock
            );
        });
    });

    describe('publish() method', () => {
        it('should publish to all subscribers', async () => {
            const handler = vi.fn();
            messageBus.subscribe('BROADCAST', handler);

            await messageBus.publish('BROADCAST', { message: 'hello' });

            expect(messageBus.publishCalls).toHaveLength(1);
            expect(messageBus.publishCalls[0]).toEqual({
                messageType: 'BROADCAST',
                payload: { message: 'hello' },
            });
        });

        it('should handle publish with no subscribers', async () => {
            await expect(
                messageBus.publish('NONE', {})
            ).resolves.toBeUndefined();
        });
    });

    describe('Type Safety', () => {
        it('should enforce type safety at compile time', () => {
            // These compile-time checks verify interface contract
            const bus: IMessageBus = messageBus;

            // send() returns Promise<T>
            const sendResult: Promise<unknown> = bus.send('background', {
                type: 'TEST',
                payload: {},
                timestamp: 1,
            });
            expect(sendResult).toBeInstanceOf(Promise);

            // subscribe() returns cleanup function
            const cleanup: () => void = bus.subscribe('TEST', () => { });
            expect(typeof cleanup).toBe('function');

            // publish() returns Promise<void>
            const publishResult: Promise<void> = bus.publish('TEST', {});
            expect(publishResult).toBeInstanceOf(Promise);
        });
    });
});
