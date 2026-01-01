import type { IMessageBus } from '../interfaces/i-message-bus';
import type { Message, MessageTarget, MessageHandler } from '../schemas/message-schemas';
import { CircuitBreaker } from '../utils/circuit-breaker';

/**
 * CircuitBreakerMessageBus - Wraps IMessageBus with Circuit Breaker pattern
 *
 * Protects the messaging system from cascading failures by:
 * - Tracking failures in send() and publish() operations
 * - Opening circuit after threshold failures (fail-fast mode)
 * - Automatically attempting recovery after timeout
 *
 * Design decisions:
 * - send() and publish() are wrapped (they perform network operations)
 * - subscribe() is NOT wrapped (it's a local callback registration)
 *
 * @example
 * ```typescript
 * const circuitBreaker = new CircuitBreaker(config, logger);
 * const messageBus = new CircuitBreakerMessageBus(
 *   new RetryDecorator(new ChromeMessageBus(logger)),
 *   circuitBreaker
 * );
 *
 * // Will fail fast if circuit is OPEN
 * await messageBus.send('background', message);
 * ```
 */
export class CircuitBreakerMessageBus implements IMessageBus {
    constructor(
        private readonly inner: IMessageBus,
        private readonly circuitBreaker: CircuitBreaker
    ) { }

    /**
     * Send message with circuit breaker protection
     * Fails fast when circuit is OPEN
     */
    async send<T = unknown>(target: MessageTarget, message: Message): Promise<T> {
        return await this.circuitBreaker.execute(async () => {
            return await this.inner.send<T>(target, message);
        });
    }

    /**
     * Subscribe to messages (no circuit breaker - local operation)
     * Delegates directly to inner bus
     */
    subscribe<T = unknown>(messageType: string, handler: MessageHandler<T>): () => void {
        return this.inner.subscribe(messageType, handler);
    }

    /**
     * Publish messages with circuit breaker protection
     * Fails fast when circuit is OPEN to conserve resources
     */
    async publish(messageType: string, payload: unknown): Promise<void> {
        await this.circuitBreaker.execute(async () => {
            return await this.inner.publish(messageType, payload);
        });
    }
}
