/**
 * @file in-memory-highlight-repository.ts
 * @description In-memory implementation of highlight repository
 * 
 * Fast, in-memory storage with indexes for efficient queries
 */

import type { IHighlightRepository } from './i-highlight-repository';
import type { HighlightDataV2 } from '../schemas/highlight-schema';
import { LoggerFactory } from '../utils/logger';
import type { ILogger } from '../utils/logger';

/**
 * In-memory highlight repository
 * 
 * Features:
 * - Fast Map-based storage
 * - Content hash index for deduplication
 * - Idempotent operations
 * - Type-safe with validated data
 */
export class InMemoryHighlightRepository implements IHighlightRepository {
    private highlights = new Map<string, HighlightDataV2>();
    private contentHashIndex = new Map<string, string>();  // hash -> id
    private logger: ILogger = LoggerFactory.getLogger('HighlightRepository');

    // ============================================
    // CRUD Operations
    // ============================================

    async add(highlight: HighlightDataV2): Promise<void> {
        // Idempotent - no error if already exists
        if (this.highlights.has(highlight.id)) {
            this.logger.warn('Highlight already exists, skipping', {
                id: highlight.id
            });
            return;
        }

        // Add to main storage
        this.highlights.set(highlight.id, highlight);

        // Update content hash index
        this.contentHashIndex.set(highlight.contentHash, highlight.id);

        this.logger.debug('Added highlight', {
            id: highlight.id,
            contentHash: highlight.contentHash.substring(0, 16) + '...',
            totalCount: this.highlights.size
        });
    }

    async update(id: string, updates: Partial<HighlightDataV2>): Promise<void> {
        const existing = this.highlights.get(id);

        if (!existing) {
            const error = new Error(`Highlight not found: ${id}`);
            this.logger.error('Update failed - highlight not found', error);
            throw error;
        }

        // Merge updates
        const updated: HighlightDataV2 = {
            ...existing,
            ...updates,
            updatedAt: new Date()
        };

        // Update main storage
        this.highlights.set(id, updated);

        // Update content hash index if hash changed
        if (updates.contentHash && updates.contentHash !== existing.contentHash) {
            this.contentHashIndex.delete(existing.contentHash);
            this.contentHashIndex.set(updates.contentHash, id);
        }

        this.logger.info('Updated highlight', {
            id,
            updatedFields: Object.keys(updates)
        });
    }

    async remove(id: string): Promise<void> {
        const highlight = this.highlights.get(id);

        if (!highlight) {
            // Idempotent - no error if not found
            this.logger.debug('Highlight not found for removal (idempotent)', { id });
            return;
        }

        // Remove from main storage
        this.highlights.delete(id);

        // Remove from content hash index
        this.contentHashIndex.delete(highlight.contentHash);

        this.logger.info('Removed highlight', {
            id,
            remainingCount: this.highlights.size
        });
    }

    // ============================================
    // Queries
    // ============================================

    async findById(id: string): Promise<HighlightDataV2 | null> {
        const highlight = this.highlights.get(id);

        if (!highlight) {
            this.logger.debug('Highlight not found', { id });
            return null;
        }

        return highlight;
    }

    async findAll(): Promise<HighlightDataV2[]> {
        const all = Array.from(this.highlights.values());

        this.logger.debug('Retrieved all highlights', {
            count: all.length
        });

        return all;
    }

    async findByContentHash(hash: string): Promise<HighlightDataV2 | null> {
        const id = this.contentHashIndex.get(hash);

        if (!id) {
            this.logger.debug('No highlight found for content hash', {
                hash: hash.substring(0, 16) + '...'
            });
            return null;
        }

        return this.findById(id);
    }

    async findOverlapping(range: Range): Promise<HighlightDataV2[]> {
        // TODO: Implement proper range overlap detection
        // For now, return empty array
        // Will implement in Phase 3 when we add range index

        this.logger.debug('Range overlap detection not yet implemented', {
            rangeStart: range.startOffset,
            rangeEnd: range.endOffset
        });

        return [];
    }

    // ============================================
    // Metadata
    // ============================================

    count(): number {
        return this.highlights.size;
    }

    exists(id: string): boolean {
        return this.highlights.has(id);
    }

    // ============================================
    // Bulk Operations
    // ============================================

    async addMany(highlights: HighlightDataV2[]): Promise<void> {
        let added = 0;
        let skipped = 0;

        for (const highlight of highlights) {
            if (!this.highlights.has(highlight.id)) {
                await this.add(highlight);
                added++;
            } else {
                skipped++;
            }
        }

        this.logger.info('Bulk add completed', {
            total: highlights.length,
            added,
            skipped,
            finalCount: this.highlights.size
        });
    }

    async clear(): Promise<void> {
        const previousCount = this.highlights.size;

        this.highlights.clear();
        this.contentHashIndex.clear();

        this.logger.warn('Cleared all highlights', {
            previousCount
        });
    }
}
