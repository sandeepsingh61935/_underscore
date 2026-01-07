/**
 * @file i-event-bus.ts
 * @description Interface for central event bus
 */

/**
 * Event handler function type
 */
export type EventHandler<T = unknown> = (data: T) => void | Promise<void>;

/**
 * Event Bus Interface
 * Implements Observer/PubSub pattern
 */
export interface IEventBus {
    /**
     * Subscribe to an event
     * @param event - Event name
     * @param handler - Function to handle event data
     */
    on<T = unknown>(event: string, handler: EventHandler<T>): () => void;

    /**
     * Unsubscribe from an event
     * @param event - Event name
     * @param handler - Handler function to remove
     */
    off<T = unknown>(event: string, handler: EventHandler<T>): void;

    /**
     * Emit an event
     * @param event - Event name
     * @param data - Event payload
     */
    emit<T = unknown>(event: string, data: T): void;

    /**
     * Subscribe to an event once
     * @param event - Event name
     * @param handler - Function to call once
     */
    once<T = unknown>(event: string, handler: EventHandler<T>): void;

    /**
     * Clear listeners
     * @param event - Optional event name to clear specifically
     */
    clear(event?: string): void;
}
