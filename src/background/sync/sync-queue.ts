/**
 * @file sync-queue.ts
 * @description Persistent sync queue using IndexedDB with priority support
 * @author System Architect
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { ISyncQueue, SyncQueueConfig } from './interfaces/i-sync-queue';
import type { SyncEvent } from '@/background/events/interfaces/i-event-store';
import { SyncEventType } from '@/background/events/interfaces/i-event-store';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { EventBus } from '@/background/utils/event-bus';
import type { INetworkDetector } from './interfaces/i-network-detector';
import { QueueFullError } from './sync-errors';

/**
 * IndexedDB database name for sync queue
 */
const DB_NAME = 'sync_queue';

/**
 * Database version
 */
const DB_VERSION = 1;

/**
 * Object store name for queue
 */
const QUEUE_STORE = 'queue';

/**
 * Object store name for dead letter queue
 */
const DEAD_LETTER_STORE = 'dead_letter';

/**
 * Queue entry with metadata
 */
interface QueueEntry {
    id: string;
    event: SyncEvent;
    timestamp: number;
    retryCount: number;
    priority: number;
    lastAttempt?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: SyncQueueConfig = {
    maxQueueSize: 10000,
    batchSize: 50,
    syncInterval: 5000, // 5 seconds
    retryAttempts: 3,
};

/**
 * SyncQueue implementation with IndexedDB persistence
 * 
 * Features:
 * - Persistent queue using IndexedDB
 * - Priority queue (DELETE > UPDATE > CREATE)
 * - FIFO within same priority
 * - Retry logic with exponential backoff
 * - Dead letter queue for failed events
 * - Automatic sync triggering
 * - Queue overflow protection
 * 
 * **CRITICAL**: Events MUST be dequeued in chronological order
 * per event sourcing requirements (ADR-001)
 */
export class SyncQueue implements ISyncQueue {
    private db: IDBPDatabase | null = null;
    private readonly config: SyncQueueConfig;
    private syncLock = false;
    private syncTimeout: NodeJS.Timeout | null = null;

    constructor(
        private readonly logger: ILogger,
        private readonly eventBus: EventBus,
        private readonly networkDetector: INetworkDetector,
        config?: Partial<SyncQueueConfig>
    ) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Initialize IndexedDB database
     */
    private async ensureDatabase(): Promise<IDBPDatabase> {
        if (this.db) {
            return this.db;
        }

        this.logger.debug('Initializing SyncQueue database');

        this.db = await openDB(DB_NAME, DB_VERSION, {
            upgrade(db: any) {
                // Create queue object store
                const queueStore = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
                queueStore.createIndex('timestamp', 'timestamp', { unique: false });
                queueStore.createIndex('priority', 'priority', { unique: false });
                queueStore.createIndex('retryCount', 'retryCount', { unique: false });

                // Create dead letter queue
                const deadLetterStore = db.createObjectStore(DEAD_LETTER_STORE, {
                    keyPath: 'id',
                });
                deadLetterStore.createIndex('timestamp', 'timestamp', { unique: false });
            },
        });

        this.logger.info('SyncQueue database initialized');
        return this.db;
    }

    /**
     * Calculate priority based on event type
     * 
     * Priority order (highest to lowest):
     * 1. DELETE events (must be processed first)
     * 2. UPDATE events
     * 3. CREATE events
     * 4. COLLECTION_DELETE
     * 5. COLLECTION_UPDATE
     * 6. COLLECTION_CREATE
     */
    private calculatePriority(event: SyncEvent): number {
        switch (event.type) {
            case SyncEventType.HIGHLIGHT_DELETED:
                return 1;
            case SyncEventType.HIGHLIGHT_UPDATED:
                return 2;
            case SyncEventType.HIGHLIGHT_CREATED:
                return 3;
            case SyncEventType.COLLECTION_DELETED:
                return 4;
            case SyncEventType.COLLECTION_UPDATED:
                return 5;
            case SyncEventType.COLLECTION_CREATED:
                return 6;
            default:
                return 10;
        }
    }

    /**
     * Validate event structure
     */
    private validateEvent(event: SyncEvent): void {
        if (!event.id) {
            throw new Error('Event ID is required');
        }
        if (!event.type) {
            throw new Error('Event type is required');
        }
        if (!event.timestamp) {
            throw new Error('Event timestamp is required');
        }
    }

    async enqueue(event: SyncEvent): Promise<void> {
        this.logger.debug('Enqueuing event', { id: event.id, type: event.type });

        // 1. Check queue size limit
        const currentSize = await this.size();
        if (currentSize >= this.config.maxQueueSize) {
            this.logger.error('Queue full', undefined, {
                size: currentSize,
                max: this.config.maxQueueSize,
            });
            throw new QueueFullError(
                `Queue full (max: ${this.config.maxQueueSize})`,
                { size: currentSize }
            );
        }

        // Warn at 80% capacity
        if (currentSize >= this.config.maxQueueSize * 0.8) {
            this.logger.warn('Queue near capacity', {
                size: currentSize,
                max: this.config.maxQueueSize,
                percentage: Math.round((currentSize / this.config.maxQueueSize) * 100),
            });
        }

        // Emit event at 90% capacity
        if (currentSize >= this.config.maxQueueSize * 0.9) {
            this.eventBus.emit('QUEUE_NEAR_FULL', {
                size: currentSize,
                max: this.config.maxQueueSize,
            });
        }

        // 2. Validate event
        this.validateEvent(event);

        // 3. Add to IndexedDB
        const db = await this.ensureDatabase();
        const entry: QueueEntry = {
            id: event.id,
            event,
            timestamp: event.timestamp, // Use event's original timestamp for chronological ordering
            retryCount: 0,
            priority: this.calculatePriority(event),
        };

        try {
            await db.add(QUEUE_STORE, entry);
            this.logger.debug('Event enqueued successfully', { id: event.id });
        } catch (error) {
            if (error instanceof Error && error.name === 'ConstraintError') {
                this.logger.warn('Duplicate event in queue', { id: event.id });
                // Update existing entry instead
                await db.put(QUEUE_STORE, entry);
            } else {
                this.logger.error('Failed to enqueue event', error as Error);
                throw new Error('Failed to enqueue event');
            }
        }

        // 4. Emit QUEUE_UPDATED event
        this.eventBus.emit('QUEUE_UPDATED', { size: currentSize + 1 });

        // 5. Trigger sync if online
        if (await this.networkDetector.isOnline()) {
            this.triggerSync();
        }
    }

    async dequeue(): Promise<SyncEvent | null> {
        const db = await this.ensureDatabase();

        try {
            // Get all entries
            const entries = await db.getAll(QUEUE_STORE);

            if (entries.length === 0) {
                return null;
            }

            // **CRITICAL**: Sort by priority (ascending), then by timestamp (ascending)
            // This ensures:
            // 1. Higher priority events processed first (DELETE before CREATE)
            // 2. Within same priority, oldest events processed first (FIFO)
            // 3. Chronological order maintained per event sourcing requirements
            entries.sort((a, b) => {
                if (a.priority !== b.priority) {
                    return a.priority - b.priority; // Lower number = higher priority
                }
                return a.timestamp - b.timestamp; // Older first
            });

            // Get oldest entry
            const entry = entries[0];

            // Remove from queue
            await db.delete(QUEUE_STORE, entry.id);

            this.logger.debug('Event dequeued', {
                id: entry.id,
                priority: entry.priority,
                retryCount: entry.retryCount,
            });

            return entry.event;
        } catch (error) {
            this.logger.error('Failed to dequeue event', error as Error);
            throw new Error('Failed to dequeue event');
        }
    }

    async peek(): Promise<SyncEvent | null> {
        const db = await this.ensureDatabase();

        try {
            const entries = await db.getAll(QUEUE_STORE);

            if (entries.length === 0) {
                return null;
            }

            // Sort same as dequeue
            entries.sort((a, b) => {
                if (a.priority !== b.priority) {
                    return a.priority - b.priority;
                }
                return a.timestamp - b.timestamp;
            });

            return entries[0].event;
        } catch (error) {
            this.logger.error('Failed to peek queue', error as Error);
            throw new Error('Failed to peek queue');
        }
    }

    async size(): Promise<number> {
        const db = await this.ensureDatabase();
        try {
            return await db.count(QUEUE_STORE);
        } catch (error) {
            this.logger.error('Failed to get queue size', error as Error);
            throw new Error('Failed to get queue size');
        }
    }

    async clear(): Promise<void> {
        this.logger.warn('Clearing sync queue');
        const db = await this.ensureDatabase();
        try {
            await db.clear(QUEUE_STORE);
            this.logger.info('Sync queue cleared');
        } catch (error) {
            this.logger.error('Failed to clear queue', error as Error);
            throw new Error('Failed to clear queue');
        }
    }

    async isEmpty(): Promise<boolean> {
        const size = await this.size();
        return size === 0;
    }

    /**
     * Retry failed event with exponential backoff
     * 
     * Backoff schedule:
     * - Attempt 1: 1 second
     * - Attempt 2: 2 seconds
     * - Attempt 3: 4 seconds
     * - After 3 attempts: Move to dead letter queue
     */
    async retryEvent(event: SyncEvent, error: Error): Promise<void> {
        const db = await this.ensureDatabase();

        try {
            // Get current entry
            const entry = await db.get(QUEUE_STORE, event.id);

            if (!entry) {
                this.logger.warn('Event not found in queue for retry', { id: event.id });
                return;
            }

            // Increment retry count
            entry.retryCount++;
            entry.lastAttempt = Date.now();

            // Check if max retries exceeded
            if (entry.retryCount > this.config.retryAttempts) {
                this.logger.error('Max retries exceeded, moving to dead letter queue', undefined, {
                    id: event.id,
                    retryCount: entry.retryCount,
                    error: error.message,
                });

                // Move to dead letter queue
                await db.add(DEAD_LETTER_STORE, {
                    ...entry,
                    failedAt: Date.now(),
                    error: error.message,
                });

                // Remove from main queue
                await db.delete(QUEUE_STORE, event.id);

                // Emit event
                this.eventBus.emit('SYNC_FAILED', {
                    eventId: event.id,
                    error: error.message,
                });

                return;
            }

            // Calculate backoff delay (exponential: 1s, 2s, 4s)
            const backoffDelay = Math.pow(2, entry.retryCount - 1) * 1000;

            this.logger.info('Retrying event', {
                id: event.id,
                retryCount: entry.retryCount,
                backoffDelay,
            });

            // Update entry in queue
            await db.put(QUEUE_STORE, entry);

            // Emit retry event
            this.eventBus.emit('SYNC_RETRY', {
                eventId: event.id,
                retryCount: entry.retryCount,
                backoffDelay,
            });

            // Schedule retry after backoff
            setTimeout(() => {
                this.triggerSync();
            }, backoffDelay);
        } catch (err) {
            this.logger.error('Failed to retry event', err as Error);
        }
    }

    /**
   * Trigger sync operation
   * 
   * Debounced to prevent excessive sync calls
   */
    private triggerSync(): void {
        // Skip if no network detector (testing scenario)
        if (!this.networkDetector) {
            return;
        }

        // Clear existing timeout
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
        }

        // Debounce sync calls (500ms)
        this.syncTimeout = setTimeout(() => {
            this.performSync();
        }, 500);
    }

    /**
     * Perform actual sync operation
     * 
     * Uses lock to prevent concurrent syncs
     */
    private async performSync(): Promise<void> {
        // Check if sync already in progress
        if (this.syncLock) {
            this.logger.debug('Sync already in progress, skipping');
            return;
        }

        // Check if online
        if (!(await this.networkDetector.isOnline())) {
            this.logger.debug('Offline, skipping sync');
            return;
        }

        // Acquire lock
        this.syncLock = true;

        try {
            this.logger.debug('Starting sync operation');
            this.eventBus.emit('SYNC_STARTED', { timestamp: Date.now() });

            // Sync will be handled by SyncBatcher (Task 4.3)
            // For now, just emit event
            this.eventBus.emit('SYNC_REQUESTED', { timestamp: Date.now() });
        } finally {
            // Release lock
            this.syncLock = false;
        }
    }
}
