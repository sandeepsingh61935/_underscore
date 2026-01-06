
/**
 * @file offline-queue-service.ts
 * @description Service to manage offline operations and retry them when online
 */

import { openDB, type IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { SupabaseHighlightRepository } from '@/background/repositories/supabase-highlight-repository';
import type { OfflineOperation } from '@/background/types/offline-queue-types';
import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import type { HighlightDataV2 } from '@/background/schemas/highlight-schema';

const DB_NAME = 'underscore_offline_queue';
const DB_VERSION = 1;
const STORE_NAME = 'queue';

export class OfflineQueueService {
    private db: Promise<IDBPDatabase>;
    private isProcessing = false;

    constructor(
        private readonly cloudRepo: SupabaseHighlightRepository,
        private readonly authManager: IAuthManager,
        private readonly logger: ILogger
    ) {
        this.db = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('timestamp', 'timestamp');
                }
            },
        });

        // Listen for online status
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                this.logger.info('[OfflineQueue] Browser online, triggering processQueue');
                this.processQueue();
            });
        }
    }

    /**
     * Enqueue an operation to be retried later
     */
    async enqueue(
        type: OfflineOperation['type'],
        targetId: string,
        payload?: any
    ): Promise<void> {
        const op: OfflineOperation = {
            id: uuidv4(),
            type,
            targetId,
            payload,
            timestamp: Date.now(),
            retryCount: 0,
        };

        const db = await this.db;
        await db.add(STORE_NAME, op);
        this.logger.info('[OfflineQueue] Enqueued operation', { type, targetId });
    }

    /**
     * Process pending operations in the queue
     */
    async processQueue(): Promise<void> {
        if (this.isProcessing) return;
        if (!navigator.onLine) {
            // Double check online status
            return;
        }

        // Ensure we have a user before syncing
        if (!this.authManager.currentUser) {
            this.logger.debug('[OfflineQueue] Skipping processQueue (not authenticated)');
            return;
        }

        this.isProcessing = true;
        this.logger.debug('[OfflineQueue] Starting queue processing');

        try {
            const db = await this.db;
            // Get all items sorted by timestamp
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const index = tx.store.index('timestamp');
            let cursor = await index.openCursor();

            while (cursor) {
                const op = cursor.value as OfflineOperation;

                try {
                    await this.executeOperation(op);
                    // Success: Remove from queue
                    await cursor.delete();
                    this.logger.debug('[OfflineQueue] Processed and removed operation', { id: op.id });
                } catch (error) {
                    this.logger.error('[OfflineQueue] Failed to execute operation', error as Error, { id: op.id });

                    // Basic Retry Logic
                    if (op.retryCount < 5) {
                        const updatedOp = { ...op, retryCount: op.retryCount + 1 };
                        await cursor.update(updatedOp);
                        // Stop processing to maintain order for this specific item? 
                        // Or continue? Ideally FIFO means we stop if the head fails.
                        // But for now, let's stop to prevent pile up.
                        this.isProcessing = false;
                        return;
                    } else {
                        // Max retries exceeded, delete to unblock queue
                        await cursor.delete();
                        this.logger.error('[OfflineQueue] Max retries exceeded, dropping operation', undefined, { id: op.id });
                    }
                }

                cursor = await cursor.continue();
            }
        } catch (err) {
            this.logger.error('[OfflineQueue] Queue processing error', err as Error);
        } finally {
            this.isProcessing = false;
        }
    }

    private async executeOperation(op: OfflineOperation): Promise<void> {
        this.logger.debug('[OfflineQueue] Executing operation', { type: op.type, targetId: op.targetId });

        switch (op.type) {
            case 'add':
                await this.cloudRepo.add(op.payload as HighlightDataV2);
                break;
            case 'update':
                await this.cloudRepo.update(op.targetId, op.payload as Partial<HighlightDataV2>);
                break;
            case 'remove':
                await this.cloudRepo.remove(op.targetId);
                break;
            default:
                throw new Error(`Unknown operation type: ${(op as any).type}`);
        }
    }

    /**
     * Get queue size (for testing/monitoring)
     */
    async size(): Promise<number> {
        const db = await this.db;
        return await db.count(STORE_NAME);
    }

    /**
     * Close the database connection (useful for testing/cleanup)
     */
    async close(): Promise<void> {
        const db = await this.db;
        db.close();
    }
}
