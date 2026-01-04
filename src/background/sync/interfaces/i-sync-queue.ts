/**
 * @file i-sync-queue.ts
 * @description Sync queue interface for event sourcing-based synchronization
 * @author System Architect
 */

import type { SyncEvent } from '@/background/events/interfaces/i-event-store';

/**
 * Sync operation types
 */
export type SyncOperation = 'push' | 'pull' | 'bidirectional';

/**
 * Sync queue configuration
 */
export interface SyncQueueConfig {
    readonly maxQueueSize: number;
    readonly batchSize: number;
    readonly syncInterval: number; // milliseconds
    readonly retryAttempts: number;
}

/**
 * Sync queue interface for managing event synchronization
 * 
 * Follows event sourcing pattern (ADR-001):
 * - Events are queued in chronological order
 * - FIFO processing with priority support
 * - Persistent queue using IndexedDB
 * - Automatic retry with exponential backoff
 * 
 * @example
 * ```typescript
 * const queue = container.resolve<ISyncQueue>('syncQueue');
 * 
 * // Enqueue event for sync
 * await queue.enqueue(event);
 * 
 * // Process next event
 * const nextEvent = await queue.dequeue();
 * if (nextEvent) {
 *   await syncToAPI(nextEvent);
 * }
 * ```
 */
export interface ISyncQueue {
    /**
     * Add event to sync queue
     * 
     * @param event - Event to enqueue
     * @throws {QueueFullError} If queue is at max capacity
     * @throws {ValidationError} If event is invalid
     */
    enqueue(event: SyncEvent): Promise<void>;

    /**
     * Remove and return oldest event from queue (FIFO)
     * 
     * Events are dequeued by:
     * 1. Priority (highest first)
     * 2. Timestamp (oldest first)
     * 
     * @returns Next event to sync, or null if queue is empty
     */
    dequeue(): Promise<SyncEvent | null>;

    /**
     * Get oldest event without removing from queue
     * 
     * @returns Next event to sync, or null if queue is empty
     */
    peek(): Promise<SyncEvent | null>;

    /**
     * Get number of events in queue
     * 
     * @returns Queue size
     */
    size(): Promise<number>;

    /**
     * Remove all events from queue
     * 
     * @throws {StorageError} If clear operation fails
     */
    clear(): Promise<void>;

    /**
     * Check if queue is empty
     * 
     * @returns True if queue has no events
     */
    isEmpty(): Promise<boolean>;
}
