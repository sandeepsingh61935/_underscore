import type { Message, MessageTarget, MessageHandler } from '../schemas/message-schemas';

/**
 * Message Bus interface for cross-context communication in Chrome extension
 *
 * Enables reliable message passing between:
 * - Content Script ↔ Background Script
 * - Content Script ↔ Popup
 * - Background Script ↔ Popup
 *
 * @example
 * ```typescript
 * // Send message from popup to content script
 * const response = await messageBus.send<{ count: number }>(
 *   'content',
 *   { type: 'GET_HIGHLIGHT_COUNT', payload: { url: window.location.href }, timestamp: Date.now() }
 * );
 * console.log(`Highlights: ${response.count}`);
 *
 * // Subscribe to mode change messages
 * const unsubscribe = messageBus.subscribe<{ mode: string }>(
 *   'MODE_CHANGE',
 *   (payload, sender) => {
 *     console.log(`Mode changed to ${payload.mode} from tab ${sender.tab?.id}`);
 *   }
 * );
 *
 * // Cleanup
 * unsubscribe();
 * ```
 */
export interface IMessageBus {
    /**
     * Send a message to a specific target context
     *
     * @param target - Target context ('background', 'content', or 'popup')
     * @param message - Message to send (validated via MessageSchema)
     * @returns Promise resolving to the response data
     * @throws {ValidationError} if message is invalid
     * @throws {MessagingError} if send fails after retries
     *
     * @example
     * ```typescript
     * const result = await messageBus.send<{ success: boolean }>(
     *   'background',
     *   { type: 'SAVE_HIGHLIGHT', payload: highlightData, timestamp: Date.now() }
     * );
     * ```
     */
    send<T = unknown>(target: MessageTarget, message: Message): Promise<T>;

    /**
     * Subscribe to messages of a specific type
     *
     * @param messageType - Type of message to listen for (matches message.type)
     * @param handler - Function to handle received messages
     * @returns Cleanup function to unsubscribe
     *
     * @example
     * ```typescript
     * const unsubscribe = messageBus.subscribe<{ url: string }>(
     *   'HIGHLIGHT_CREATED',
     *   async (payload, sender) => {
     *     console.log(`Highlight created on ${payload.url}`);
     *   }
     * );
     *
     * // Later: cleanup
     * unsubscribe();
     * ```
     */
    subscribe<T = unknown>(messageType: string, handler: MessageHandler<T>): () => void;

    /**
     * Publish a message to all subscribers of a message type
     *
     * Unlike send(), this does not target a specific context.
     * All registered subscribers (in any context) will receive the message.
     *
     * @param messageType - Type of message (used by subscribers to filter)
     * @param payload - Message payload data
     * @returns Promise that resolves when all handlers complete
     *
     * @example
     * ```typescript
     * await messageBus.publish('STATE_CHANGED', {
     *   from: 'walk',
     *   to: 'vault',
     *   timestamp: Date.now()
     * });
     * ```
     */
    publish(messageType: string, payload: unknown): Promise<void>;
}
