/**
 * @file i-event-publisher.ts
 * @description Event Publisher interface for event-driven architecture
 * @author System Architect
 */

/**
 * Event handler function type
 * Handles published events asynchronously
 * 
 * @template T - Event payload type
 * @param payload - Event data
 * @returns Promise that resolves when handling is complete
 */
export type EventHandler<T> = (payload: T) => void | Promise<void>;

/**
 * Unsubscribe function returned by subscribe()
 * Call to remove the event handler
 */
export type UnsubscribeFunction = () => void;

/**
 * Event Publisher interface for pub/sub pattern
 * 
 * Implements Observer pattern for event-driven architecture.
 * Decouples event producers from consumers.
 * 
 * **Design Principles**:
 * - Asynchronous event handling
 * - Multiple subscribers per event type
 * - Error isolation (one subscriber error doesn't affect others)
 * - Unsubscribe support
 * 
 * @example
 * ```typescript
 * const publisher = container.resolve<IEventPublisher>('eventPublisher');
 * 
 * // Subscribe to events
 * const unsubscribe = publisher.subscribe('highlight.created', async (data) => {
 *   console.log('Highlight created:', data);
 *   await syncToCloud(data);
 * });
 * 
 * // Publish event
 * await publisher.publish('highlight.created', {
 *   id: 'highlight-123',
 *   text: 'example'
 * });
 * 
 * // Unsubscribe when done
 * unsubscribe();
 * ```
 */
export interface IEventPublisher {
    /**
     * Publish an event to all subscribers
     * 
     * Calls all registered handlers for the event type.
     * Handlers are called in registration order.
     * If a handler throws, the error is logged but other handlers still execute.
     * 
     * @template T - Event payload type
     * @param eventType - Event type identifier
     * @param payload - Event data to publish
     * @returns Promise that resolves when all handlers complete
     * 
     * @example
     * ```typescript
     * await publisher.publish('highlight.created', {
     *   id: crypto.randomUUID(),
     *   text: 'Important text',
     *   color: 'yellow'
     * });
     * ```
     */
    publish<T>(eventType: string, payload: T): Promise<void>;

    /**
     * Subscribe to an event type
     * 
     * Registers a handler to be called when events of this type are published.
     * Returns an unsubscribe function for cleanup.
     * 
     * @template T - Event payload type
     * @param eventType - Event type to subscribe to
     * @param handler - Function to call when event is published
     * @returns Unsubscribe function
     * @throws {ValidationError} If handler is not a function
     * 
     * @example
     * ```typescript
     * const unsubscribe = publisher.subscribe<HighlightData>(
     *   'highlight.created',
     *   async (data) => {
     *     await repository.save(data);
     *   }
     * );
     * 
     * // Later, cleanup
     * unsubscribe();
     * ```
     */
    subscribe<T>(eventType: string, handler: EventHandler<T>): UnsubscribeFunction;

    /**
     * Unsubscribe a handler from an event type
     * 
     * Removes the handler from the subscriber list.
     * Safe to call even if handler is not subscribed.
     * 
     * @template T - Event payload type
     * @param eventType - Event type to unsubscribe from
     * @param handler - Handler function to remove
     * 
     * @example
     * ```typescript
     * const handler = async (data) => { ... };
     * publisher.subscribe('highlight.created', handler);
     * 
     * // Later
     * publisher.unsubscribe('highlight.created', handler);
     * ```
     */
    unsubscribe<T>(eventType: string, handler: EventHandler<T>): void;
}
