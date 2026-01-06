/**
 * @file dual-write-repository.ts
 * @description Repository that writes to both local and cloud storage
 * 
 * Implements a dual-write pattern:
 * - Local writes are synchronous and fast (primary source of truth)
 * - Cloud writes are async and fire-and-forget
 * - Authentication-aware: skips cloud when offline/unauthenticated
 */

import type { IHighlightRepository } from './i-highlight-repository';
import type { HighlightDataV2, SerializedRange } from '../schemas/highlight-schema';

import type { SupabaseHighlightRepository } from './supabase-highlight-repository';
import type { IAuthManager } from '../auth/interfaces/i-auth-manager';
import type { ILogger } from '../utils/logger';
import type { OfflineQueueService } from '@/background/services/offline-queue-service';

/**
 * Dual-write repository for local-first, cloud-synced storage
 * 
 * Write strategy:
 * 1. Write to local repo (fast, always succeeds)
 * 2. If authenticated, write to cloud async (fire-and-forget)
 * 3. Log cloud errors but don't fail the operation
 * 
 * Read strategy:
 * - Always read from local (fastest, most up-to-date)
 */
export class DualWriteRepository implements IHighlightRepository {
    constructor(
        private readonly localRepo: IHighlightRepository,
        private readonly cloudRepo: SupabaseHighlightRepository,
        private readonly authManager: IAuthManager,
        private readonly offlineQueue: OfflineQueueService,
        private readonly logger: ILogger
    ) { }

    // ============================================
    // Core CRUD Operations (Dual Write)
    // ============================================

    async add(highlight: HighlightDataV2): Promise<void> {
        // Write to local immediately (fast, reliable)
        await this.localRepo.add(highlight);
        this.logger.debug('[DualWrite] Added to local', { id: highlight.id });

        // Write to cloud async if authenticated
        this.writeToCloudAsync(() => this.cloudRepo.add(highlight), 'add', highlight.id, highlight);
    }

    async update(id: string, updates: Partial<HighlightDataV2>): Promise<void> {
        // Update local first
        await this.localRepo.update(id, updates);
        this.logger.debug('[DualWrite] Updated in local', { id });

        // Update cloud async if authenticated
        this.writeToCloudAsync(() => this.cloudRepo.update(id, updates), 'update', id, updates);
    }

    async remove(id: string): Promise<void> {
        // Remove from local first
        await this.localRepo.remove(id);
        this.logger.debug('[DualWrite] Removed from local', { id });

        // Remove from cloud async if authenticated
        this.writeToCloudAsync(() => this.cloudRepo.remove(id), 'remove', id);
    }

    // ============================================
    // Query Operations (Read from Local)
    // ============================================

    async findById(id: string): Promise<HighlightDataV2 | null> {
        // Always read from local (fastest)
        return await this.localRepo.findById(id);
    }

    async findAll(): Promise<HighlightDataV2[]> {
        // Always read from local
        return await this.localRepo.findAll();
    }

    async findByContentHash(hash: string): Promise<HighlightDataV2 | null> {
        return await this.localRepo.findByContentHash(hash);
    }

    async findByUrl(url: string): Promise<HighlightDataV2[]> {
        // 0. Ensure auth state is initialized (prevents race condition on load)
        await this.authManager.initialize();

        // 1. Get from local (always fast)
        const localPromise = this.localRepo.findByUrl(url);

        // 2. Get from cloud (if authenticated)
        let cloudPromise: Promise<HighlightDataV2[]> = Promise.resolve([]);

        if (this.authManager.currentUser) {
            cloudPromise = this.cloudRepo.findByUrl(url).catch(error => {
                this.logger.error('[DualWrite] Failed to fetch from cloud', error);
                return [];
            });
        }

        // 3. Wait for both to ensure cross-device sync on load
        const [localItems, cloudItems] = await Promise.all([localPromise, cloudPromise]);

        // 4. Merge results (deduplicate by ID)
        // If an item is in cloud but not local, we should backfill it to local
        // but that requires write access which might be side-effecty for a "find" method.
        // For now, we just return the merged view.
        // The calling service (VaultModeService) can handle backfilling persistence if needed.

        const mergedMap = new Map<string, HighlightDataV2>();

        // Add local items first
        localItems.forEach(item => mergedMap.set(item.id, item));

        // Add/Overwrite with cloud items (Cloud is source of truth? Or Local?)
        // Usually local has unsynced changes, so local should win overlapping IDs.
        // But cloud has items we don't know about.
        cloudItems.forEach(item => {
            if (!mergedMap.has(item.id)) {
                mergedMap.set(item.id, item);
            }
        });

        const merged = Array.from(mergedMap.values());

        if (cloudItems.length > 0) {
            this.logger.debug('[DualWrite] Merged local and cloud items', {
                localCount: localItems.length,
                cloudCount: cloudItems.length,
                total: merged.length
            });
        }

        return merged;
    }

    async findOverlapping(range: SerializedRange): Promise<HighlightDataV2[]> {
        return await this.localRepo.findOverlapping(range);
    }

    // ============================================
    // Metadata (Local Only)
    // ============================================

    async count(): Promise<number> {
        return await this.localRepo.count();
    }

    async exists(id: string): Promise<boolean> {
        return await this.localRepo.exists(id);
    }

    // ============================================
    // Bulk Operations
    // ============================================

    async addMany(highlights: HighlightDataV2[]): Promise<void> {
        // Add to local first
        await this.localRepo.addMany(highlights);
        this.logger.info('[DualWrite] Added many to local', { count: highlights.length });

        // Add to cloud async if authenticated
        this.writeToCloudAsync(
            () => this.cloudRepo.addMany(highlights),
            'add' as any, // Treat addMany as add for simplicity in queue types
            `${highlights.length} highlights`
        );
    }

    async clear(): Promise<void> {
        // Clear local
        await this.localRepo.clear();
        this.logger.warn('[DualWrite] Cleared local storage');

        // Note: We don't clear cloud automatically (destructive operation)
        // User must explicitly delete from Supabase if needed
    }

    // ============================================
    // Private Helpers
    // ============================================

    /**
     * Write to cloud asynchronously (fire-and-forget)
     * Only writes if user is authenticated
     */
    private writeToCloudAsync(
        operation: () => Promise<void>,
        operationName: 'add' | 'update' | 'remove',
        identifier: string,
        payload?: any
    ): void {
        // Check if user is authenticated
        if (!this.authManager.currentUser) {
            this.logger.debug('[DualWrite] Skipping cloud write (not authenticated)', {
                operation: operationName,
                id: identifier,
            });
            return;
        }

        // Fire-and-forget cloud write
        operation()
            .then(() => {
                this.logger.debug('[DualWrite] Cloud write succeeded', {
                    operation: operationName,
                    id: identifier,
                });
            })
            .catch((error) => {
                // Log error
                this.logger.error('[DualWrite] Cloud write failed (local still succeeded)', error, {
                    operation: operationName,
                    id: identifier,
                });

                // Attempt to queue for offline retry
                this.queueForRetry(operationName, identifier, payload, error);
            });
    }

    private queueForRetry(
        type: 'add' | 'update' | 'remove',
        targetId: string,
        payload: any,
        error: any
    ): void {
        const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
        // Simple retry check: Offline OR 5xx error OR Network Error
        // For now, we queue almost everything except auth errors (which are handled by "if authenticated" check usually,
        // but token expiry might happen during filtering).

        // We assume token refresh happens in AuthManager, so 401 might be retryable after refresh?
        // Let's be aggressive: Queue it. OfflineQueueService handles retries.

        this.logger.info('[DualWrite] Queueing operation for retry', { type, targetId });
        this.offlineQueue.enqueue(type, targetId, payload).catch(err => {
            this.logger.error('[DualWrite] Failed to enqueue offline operation', err);
        });
    }
}

