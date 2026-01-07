/**
 * @file event-bus.ts
 * @description Central event bus for event-driven architecture
 */

import { LoggerFactory } from './logger';
import type { ILogger } from './logger';
import type { IEventBus, EventHandler } from '../interfaces/i-event-bus';

/**
 * EventBus - Central event coordination using Observer pattern
 *
 * Provides type-safe event emission and subscription with automatic
 * error handling and logging.
 *
 * @example
 * ```typescript
 * const bus = new EventBus();
 *
 * // Subscribe to event
 * bus.on('user:created', (data) => {
 *   console.log('User created:', data);
 * });
 *
 * // Emit event
 * bus.emit('user:created', { id: '123', name: 'John' });
 * ```
 */
export class EventBus implements IEventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private logger: ILogger;

  constructor(logger?: ILogger) {
    this.logger = logger ?? LoggerFactory.getLogger('EventBus');
  }

  /**
   * Subscribe to an event
   */
  on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }

    this.handlers.get(event)!.add(handler as EventHandler);
    this.logger.debug(`Listener added for "${event}"`);
    
    // Return unsubscribe function
    return () => {
      this.off(event, handler);
    };
  }

  /**
   * Unsubscribe from an event
   */
  off<T = unknown>(event: string, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler as EventHandler);

      // Clean up empty handler sets
      if (handlers.size === 0) {
        this.handlers.delete(event);
      }

      this.logger.debug(`Listener removed for "${event}"`);
    }
  }

  /**
   * Emit an event to all subscribers
   */
  emit<T = unknown>(event: string, data: T): void {
    const handlers = this.handlers.get(event);

    if (!handlers || handlers.size === 0) {
      this.logger.debug(`No listeners for "${event}"`);
      return;
    }

    this.logger.info(`Event: ${event}`, { listenerCount: handlers.size });

    // Execute all handlers
    for (const handler of handlers) {
      try {
        const result = handler(data);

        // Handle async handlers
        if (result instanceof Promise) {
          result.catch((error) => {
            this.logger.error(`Async event handler error: ${event}`, error);
          });
        }
      } catch (error) {
        this.logger.error(`Event handler error: ${event}`, error as Error);
        // Continue executing other handlers even if one fails
      }
    }
  }

  /**
   * Subscribe to an event, but only fire once
   */
  once<T = unknown>(event: string, handler: EventHandler<T>): void {
    const wrappedHandler: EventHandler<T> = (data) => {
      this.off(event, wrappedHandler);
      return handler(data);
    };

    this.on(event, wrappedHandler);
  }

  /**
   * Remove all listeners for a specific event, or all events
   */
  clear(event?: string): void {
    if (event) {
      this.handlers.delete(event);
      this.logger.debug(`Cleared all listeners for "${event}"`);
    } else {
      this.handlers.clear();
      this.logger.debug('Cleared all event listeners');
    }
  }

  /**
   * Get count of listeners for an event
   */
  listenerCount(event: string): number {
    return this.handlers.get(event)?.size ?? 0;
  }

  /**
   * Get all registered event names
   */
  eventNames(): string[] {
    return Array.from(this.handlers.keys());
  }
}

/**
 * Singleton instance for global event bus
 * Use this for application-wide event coordination
 */

/**
 * Singleton instance for global event bus
 */
export const eventBus = new EventBus();
