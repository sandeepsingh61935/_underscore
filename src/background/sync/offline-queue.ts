/**
 * @file offline-queue.ts
 * @description Offline queue for handling events when network is unavailable
 * @author System Architect
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { SyncEvent } from '@/background/events/interfaces/i-event-store';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { EventBus } from '@/shared/utils/event-bus';
import type { INetworkDetector } from './interfaces/i-network-detector';

/**
 * IndexedDB database name for offline queue
 */
const DB_NAME = 'offline_queue';

/**
 * Database version
 */
const DB_VERSION = 1;

/**
 * Object store name
 */
const OFFLINE_STORE = 'offline_events';

/**
 * Offline queue entry
 */
interface OfflineEntry {
    id: string;
    event: SyncEvent;
    queuedAt: number;
}

/**
 * OfflineQueue for managing events when offline
 * 
 * Features:
 * - Persistent storage using IndexedDB
 * - Auto-sync when network becomes available
 * - Chronological ordering maintained
 * - Conflict detection
 * - Queue size monitoring
 */
export class OfflineQueue {
    private db: IDBPDatabase | null = null;
    private unsubscribeNetwork: (() => void) | null = null;

    constructor(
        private readonly logger: ILogger,
        private readonly eventBus: EventBus,
        private readonly networkDetector: INetworkDetector
    ) {
        this.subscribeToNetworkChanges();
    }

    /**
     * Initialize IndexedDB database
     */
    private async ensureDatabase(): Promise<IDBPDatabase> {
        if (this.db) {
            return this.db;
        }

        this.logger.debug('Initializing OfflineQueue database');

        this.db = await openDB(DB_NAME, DB_VERSION, {
            upgrade(db: any) {
                const store = db.createObjectStore(OFFLINE_STORE, { keyPath: 'id' });
                store.createIndex('queuedAt', 'queuedAt', { unique: false });
            },
        });

        this.logger.info('OfflineQueue database initialized');
        return this.db;
    }

    /**
     * Subscribe to network status changes
     */
    private subscribeToNetworkChanges(): void {
        this.unsubscribeNetwork = this.networkDetector.subscribe(async (online) => {
            if (online) {
                this.logger.info('Network online - triggering offline sync');
                await this.syncOfflineEvents();
            } else {
                this.logger.warn('Network offline - queueing events locally');
                this.eventBus.emit('OFFLINE_MODE_ENABLED', { timestamp: Date.now() });
            }
        });
    }

    /**
     * Queue event for offline sync
     */
    async queueOffline(event: SyncEvent): Promise<void> {
        this.logger.info('Queueing event for offline sync', { id: event.id });

        const db = await this.ensureDatabase();
        const entry: OfflineEntry = {
            id: event.id,
            event,
            queuedAt: Date.now(),
        };

        try {
            await db.add(OFFLINE_STORE, entry);
            this.logger.debug('Event queued for offline sync', { id: event.id });

            // Emit event
            this.eventBus.emit('OFFLINE_EVENT_QUEUED', { eventId: event.id });

            // Check queue size
            const size = await this.getOfflineQueueSize();
            if (size >= 1000) {
                this.logger.warn('Offline queue exceeds limit', { size });
            }
        } catch (error) {
            if (error instanceof Error && error.name === 'ConstraintError') {
                this.logger.warn('Duplicate event in offline queue', { id: event.id });
                await db.put(OFFLINE_STORE, entry);
            } else {
                this.logger.error('Failed to queue offline event', error as Error);
                throw new Error('Failed to queue offline event');
            }
        }
    }

    /**
     * Sync all offline events when network becomes available
     */
    private async syncOfflineEvents(): Promise<void> {
        const db = await this.ensureDatabase();

        try {
            // Get all offline events
            const entries = await db.getAll(OFFLINE_STORE);

            if (entries.length === 0) {
                this.logger.debug('No offline events to sync');
                return;
            }

            this.logger.info('Syncing offline events', { count: entries.length });

            // Sort by queuedAt (chronological order)
            entries.sort((a, b) => a.queuedAt - b.queuedAt);

            // Emit sync start event
            this.eventBus.emit('OFFLINE_SYNC_STARTED', {
                count: entries.length,
                timestamp: Date.now(),
            });

            // Sync each event
            for (const entry of entries) {
                try {
                    // Emit event for sync processing
                    this.eventBus.emit('OFFLINE_EVENT_READY', {
                        event: entry.event,
                        queuedAt: entry.queuedAt,
                    });

                    // Remove from offline queue after successful emit
                    await db.delete(OFFLINE_STORE, entry.id);
                } catch (error) {
                    this.logger.error('Failed to sync offline event', error as Error, {
                        id: entry.id,
                    });
                    // Keep in queue for retry
                }
            }

            // Emit sync complete
            this.eventBus.emit('OFFLINE_SYNC_COMPLETE', {
                synced: entries.length,
                timestamp: Date.now(),
            });

            this.logger.info('Offline sync complete', { synced: entries.length });
        } catch (error) {
            this.logger.error('Failed to sync offline events', error as Error);
        }
    }

    /**
     * Get offline queue size
     */
    async getOfflineQueueSize(): Promise<number> {
        const db = await this.ensureDatabase();
        try {
            return await db.count(OFFLINE_STORE);
        } catch (error) {
            this.logger.error('Failed to get offline queue size', error as Error);
            throw new Error('Failed to get offline queue size');
        }
    }

    /**
     * Clear offline queue
     */
    async clearOfflineQueue(): Promise<void> {
        this.logger.warn('Clearing offline queue');
        const db = await this.ensureDatabase();
        try {
            await db.clear(OFFLINE_STORE);
            this.logger.info('Offline queue cleared');
        } catch (error) {
            this.logger.error('Failed to clear offline queue', error as Error);
            throw new Error('Failed to clear offline queue');
        }
    }

    /**
     * Get oldest offline event
     */
    async getOldestOfflineEvent(): Promise<SyncEvent | null> {
        const db = await this.ensureDatabase();
        try {
            const entries = await db.getAll(OFFLINE_STORE);
            if (entries.length === 0) {
                return null;
            }

            // Sort by queuedAt
            entries.sort((a, b) => a.queuedAt - b.queuedAt);
            return entries[0].event;
        } catch (error) {
            this.logger.error('Failed to get oldest offline event', error as Error);
            throw new Error('Failed to get oldest offline event');
        }
    }

    /**
     * Cleanup - unsubscribe from network changes
     */
    destroy(): void {
        if (this.unsubscribeNetwork) {
            this.unsubscribeNetwork();
            this.unsubscribeNetwork = null;
        }
    }
}
