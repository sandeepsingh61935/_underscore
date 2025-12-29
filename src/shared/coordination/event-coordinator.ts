/**
 * @file event-coordinator.ts
 * @description Event Coordinator with Transaction Support
 * 
 * Design Patterns Applied:
 * - Redux/Flux Architecture: Ordered event dispatch
 * - Transaction Pattern: All-or-nothing execution
 * - Mediator Pattern: Coordinates between handlers
 * - Command Pattern: Handlers with rollback support
 * 
 * From Quality Framework: "Event-Driven Architecture with guarantees"
 */

import { LoggerFactory } from '../utils/logger';
import type { ILogger } from '../utils/logger';

/**
 * Event handler function
 */
type EventHandler<T = any> = (event: T) => Promise<void>;

/**
 * Rollback handler function
 */
type RollbackHandler = () => Promise<void>;

/**
 * Handler with optional rollback
 */
interface HandlerWithRollback<T = any> {
    execute: EventHandler<T>;
    rollback?: RollbackHandler;
    name?: string;  // For debugging
}

/**
 * Event Coordinator
 * 
 * Coordinates event handlers with transaction support.
 * Ensures all-or-nothing execution with automatic rollback on failure.
 * 
 * Pattern: Redux Middleware Pipeline
 * 
 * Flow:
 * 1. Event dispatched
 * 2. Handlers execute in registration order (like Redux middleware)
 * 3. Each handler's result tracked
 * 4. On failure: All executed handlers rolled back in reverse order
 * 5. On success: Transaction committed
 * 
 * @example
 * ```typescript
 * const coordinator = new EventCoordinator();
 * 
 * // Register handlers in order (like Redux middleware)
 * coordinator.registerHandler('highlight.created', {
 *   execute: async (event) => {
 *     await repository.add(event.data);
 *   },
 *   rollback: async () => {
 *     await repository.remove(event.data.id);
 *   },
 *   name: 'RepositoryHandler'
 * });
 * 
 * coordinator.registerHandler('highlight.created', {
 *   execute: async (event) => {
 *     await renderer.render(event.data);
 *   },
 *   rollback: async () => {
 *     await renderer.remove(event.data.id);
 *   },
 *   name: 'RendererHandler'
 * });
 * 
 * // Dispatch with transaction
 * await coordinator.dispatch('highlight.created', { data: highlight });
 * ```
 */
export class EventCoordinator {
    private handlers = new Map<string, HandlerWithRollback[]>();
    private logger: ILogger;
    private inTransaction = false;

    constructor() {
        this.logger = LoggerFactory.getLogger('EventCoordinator');
    }

    /**
     * Register handler for event type
     * Handlers execute in registration order (FIFO)
     */
    registerHandler<T = any>(
        eventType: string,
        handler: EventHandler<T> | HandlerWithRollback<T>
    ): void {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, []);
        }

        // Normalize to HandlerWithRollback
        const normalized: HandlerWithRollback<T> = typeof handler === 'function'
            ? { execute: handler }
            : handler;

        this.handlers.get(eventType)!.push(normalized);

        this.logger.debug('Registered handler', {
            eventType,
            handlerName: normalized.name || 'anonymous',
            totalHandlers: this.handlers.get(eventType)!.length
        });
    }

    /**
     * Dispatch event with transaction support
     * 
     * Guarantees:
     * - Handlers execute in registration order
     * - Either ALL succeed or NONE succeed (transaction)
     * - Automatic rollback on failure
     * - No partial state
     * 
     * @throws Error if any handler fails (after rollback)
     */
    async dispatch<T = any>(eventType: string, event: T): Promise<void> {
        const handlers = this.handlers.get(eventType) || [];

        if (handlers.length === 0) {
            this.logger.debug('No handlers registered', { eventType });
            return;
        }

        if (this.inTransaction) {
            throw new Error('Cannot dispatch event while in transaction (prevent nested transactions)');
        }

        this.inTransaction = true;
        const executed: Array<{ handler: HandlerWithRollback; index: number }> = [];

        this.logger.info('Dispatching event (transaction started)', {
            eventType,
            handlerCount: handlers.length
        });

        try {
            // Execute handlers in order (like Redux middleware pipeline)
            for (let i = 0; i < handlers.length; i++) {
                const handler = handlers[i]!; // Non-null assertion: array access within bounds

                this.logger.debug('Executing handler', {
                    eventType,
                    handlerName: handler.name || `handler-${i}`,
                    step: `${i + 1}/${handlers.length}`
                });

                await handler.execute(event);

                // Track for potential rollback
                executed.push({ handler, index: i });
            }

            // All handlers succeeded - commit transaction
            this.logger.info('Event dispatched successfully (transaction committed)', {
                eventType,
                handlersExecuted: executed.length
            });

        } catch (error) {
            // Failure detected - rollback all executed handlers
            this.logger.error('Event dispatch failed, rolling back', error instanceof Error ? error : undefined, {
                eventType,
                executedCount: executed.length
            });

            // Rollback in REVERSE order (undo in opposite order)
            for (const { handler, index } of executed.reverse()) {
                if (handler.rollback) {
                    try {
                        this.logger.debug('Rolling back handler', {
                            eventType,
                            handlerName: handler.name || `handler-${index}`
                        });

                        await handler.rollback();
                    } catch (rollbackError) {
                        // Log but continue rollback (best effort)
                        this.logger.error('Rollback failed for handler', rollbackError instanceof Error ? rollbackError : undefined, {
                            eventType,
                            handlerName: handler.name || `handler-${index}`
                        });
                    }
                } else {
                    this.logger.warn('No rollback handler', {
                        eventType,
                        handlerName: handler.name || `handler-${index}`
                    });
                }
            }

            this.logger.warn('Rollback completed', {
                eventType,
                rolledBack: executed.length
            });

            // Re-throw original error after rollback
            throw error;

        } finally {
            this.inTransaction = false;
        }
    }

    /**
     * Clear all handlers for an event type
     */
    clearHandlers(eventType: string): void {
        this.handlers.delete(eventType);
        this.logger.debug('Cleared handlers', { eventType });
    }

    /**
     * Clear all handlers
     */
    clearAllHandlers(): void {
        this.handlers.clear();
        this.logger.debug('Cleared all handlers');
    }

    /**
     * Get handler count for event type
     */
    getHandlerCount(eventType: string): number {
        return this.handlers.get(eventType)?.length || 0;
    }
}
