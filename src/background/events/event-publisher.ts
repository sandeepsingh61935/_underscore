/**
 * @file event-publisher.ts
 * @description Event Publisher implementation using Observer pattern
 * @author System Architect
 */

import type {
    IEventPublisher,
    EventHandler,
    UnsubscribeFunction,
} from './interfaces/i-event-publisher';
import type { ILogger } from '@/shared/interfaces/i-logger';

/**
 * Event Publisher implementation
 * 
 * Implements Observer pattern for event-driven architecture.
 * Allows components to publish and subscribe to events without tight coupling.
 */
export class EventPublisher implements IEventPublisher {
    private readonly subscribers = new Map<string, Set<EventHandler<any>>>();
    private readonly logger: ILogger;

    constructor(logger: ILogger) {
        this.logger = logger;
    }

    async publish<T>(eventType: string, payload: T): Promise<void> {
        this.logger.debug('Publishing event', { eventType, payload });

        const handlers = this.subscribers.get(eventType);
        if (!handlers || handlers.size === 0) {
            this.logger.debug('No subscribers for event type', { eventType });
            return;
        }

        // Call all handlers in registration order
        const promises: Promise<void>[] = [];
        for (const handler of handlers) {
            try {
                const result = handler(payload);
                // Handle both sync and async handlers
                if (result instanceof Promise) {
                    promises.push(result);
                }
            } catch (error) {
                // Log error but don't break other subscribers
                this.logger.error('Subscriber error', error as Error, {
                    eventType,
                    error: (error as Error).message,
                });

                // Emit subscriber error event
                this.emitSubscriberError(eventType, error as Error);
            }
        }

        // Wait for all async handlers to complete
        if (promises.length > 0) {
            await Promise.all(promises);
        }

        this.logger.debug('Event published successfully', {
            eventType,
            handlerCount: handlers.size,
        });
    }

    subscribe<T>(eventType: string, handler: EventHandler<T>): UnsubscribeFunction {
        // Validate handler
        if (typeof handler !== 'function') {
            throw new Error('Handler must be a function');
        }

        this.logger.debug('Subscribing to event', { eventType });

        // Get or create subscriber set
        let handlers = this.subscribers.get(eventType);
        if (!handlers) {
            handlers = new Set();
            this.subscribers.set(eventType, handlers);
        }

        // Add handler
        handlers.add(handler);

        // Return unsubscribe function
        return () => {
            this.unsubscribe(eventType, handler);
        };
    }

    unsubscribe<T>(eventType: string, handler: EventHandler<T>): void {
        this.logger.debug('Unsubscribing from event', { eventType });

        const handlers = this.subscribers.get(eventType);
        if (!handlers) {
            return; // No subscribers for this event type
        }

        handlers.delete(handler);

        // Clean up empty sets
        if (handlers.size === 0) {
            this.subscribers.delete(eventType);
        }
    }

    /**
     * Emit subscriber error event
     * Internal event for error tracking
     */
    private emitSubscriberError(eventType: string, error: Error): void {
        const errorHandlers = this.subscribers.get('SUBSCRIBER_ERROR');
        if (!errorHandlers) {
            return;
        }

        for (const handler of errorHandlers) {
            try {
                handler({ eventType, error });
            } catch (err) {
                // Don't let error handler errors propagate
                this.logger.error('Error in subscriber error handler', err as Error);
            }
        }
    }
}
