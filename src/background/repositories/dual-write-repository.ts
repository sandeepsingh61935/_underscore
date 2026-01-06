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
import type { InMemoryHighlightRepository } from './in-memory-highlight-repository';
import type { SupabaseHighlightRepository } from './supabase-highlight-repository';
import type { IAuthManager } from '../auth/interfaces/i-auth-manager';
import type { ILogger } from '../utils/logger';

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
        private readonly localRepo: InMemoryHighlightRepository,
        private readonly cloudRepo: SupabaseHighlightRepository,
        private readonly authManager: IAuthManager,
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
        this.writeToCloudAsync(() => this.cloudRepo.add(highlight), 'add', highlight.id);
    }

    async update(id: string, updates: Partial<HighlightDataV2>): Promise<void> {
        // Update local first
        await this.localRepo.update(id, updates);
        this.logger.debug('[DualWrite] Updated in local', { id });

        // Update cloud async if authenticated
        this.writeToCloudAsync(() => this.cloudRepo.update(id, updates), 'update', id);
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

    async findOverlapping(range: SerializedRange): Promise<HighlightDataV2[]> {
        return await this.localRepo.findOverlapping(range);
    }

    // ============================================
    // Metadata (Local Only)
    // ============================================

    count(): number {
        return this.localRepo.count();
    }

    exists(id: string): boolean {
        return this.localRepo.exists(id);
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
            'addMany',
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
        operationName: string,
        identifier: string
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
                // Log error but don't fail the operation
                this.logger.error('[DualWrite] Cloud write failed (local still succeeded)', error, {
                    operation: operationName,
                    id: identifier,
                });
            });
    }
}
