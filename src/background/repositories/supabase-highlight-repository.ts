/**
 * @file supabase-highlight-repository.ts
 * @description Repository implementation using Supabase for highlight persistence
 * 
 * Implements IHighlightRepository using SupabaseClient for cloud storage.
 * Provides abstraction between domain layer and Supabase API.
 */

import type { IHighlightRepository, RepositoryOptions } from './i-highlight-repository';
import type { HighlightDataV2, SerializedRange } from '../schemas/highlight-schema';
import { SupabaseClient } from '../api/supabase-client';
import type { ILogger } from '../utils/logger';

/**
 * Supabase-backed highlight repository
 * 
 * Delegates all operations to SupabaseClient which handles:
 * - Authentication checks
 * - Schema transformation
 * - Error handling
 * - Soft deletes
 */
export class SupabaseHighlightRepository implements IHighlightRepository {
    constructor(
        private readonly supabaseClient: SupabaseClient,
        private readonly logger: ILogger
    ) { }

    // ============================================
    // Core CRUD Operations
    // ============================================

    async add(highlight: HighlightDataV2, _options?: RepositoryOptions): Promise<void> {
        this.logger.debug('[SupabaseRepo] Adding highlight', { id: highlight.id });
        await this.supabaseClient.createHighlight(highlight);
    }

    async findById(id: string): Promise<HighlightDataV2 | null> {
        this.logger.debug('[SupabaseRepo] Finding highlight by ID', { id });

        // Note: SupabaseClient doesn't have a findById method,
        // so we fetch all and filter (not optimal, but functional)
        const all = await this.supabaseClient.getHighlights();
        return all.find(h => h.id === id) || null;
    }

    async update(id: string, updates: Partial<HighlightDataV2>, _options?: RepositoryOptions): Promise<void> {
        this.logger.debug('[SupabaseRepo] Updating highlight', { id, fields: Object.keys(updates) });
        await this.supabaseClient.updateHighlight(id, updates);
    }

    async remove(id: string, _options?: RepositoryOptions): Promise<void> {
        this.logger.debug('[SupabaseRepo] Removing highlight', { id });
        await this.supabaseClient.deleteHighlight(id);
    }

    async findAll(): Promise<HighlightDataV2[]> {
        this.logger.debug('[SupabaseRepo] Finding all highlights');
        return await this.supabaseClient.getHighlights();
    }

    async clear(): Promise<void> {
        this.logger.warn('[SupabaseRepo] Clearing all highlights (Soft Delete)');
        await this.supabaseClient.softDeleteAllHighlights();
    }

    // ============================================
    // Synchronous Query Methods (not async in interface)
    // ============================================

    async count(): Promise<number> {
        // This is inefficient but functional for now without a dedicated count API
        const all = await this.supabaseClient.getHighlights();
        return all.length;
    }

    async exists(id: string): Promise<boolean> {
        const item = await this.findById(id);
        return item !== null;
    }

    // ============================================
    // Highlight-Specific Queries
    // ============================================

    async findByContentHash(hash: string): Promise<HighlightDataV2 | null> {
        this.logger.debug('[SupabaseRepo] Finding by content hash', { hash });

        // Fetch all and filter by content hash
        const all = await this.supabaseClient.getHighlights();
        return all.find(h => h.contentHash === hash) || null;
    }

    async findByUrl(url: string): Promise<HighlightDataV2[]> {
        this.logger.debug('[SupabaseRepo] Finding by URL', { url });
        return await this.supabaseClient.getHighlights(url);
    }

    async findOverlapping(_range: SerializedRange): Promise<HighlightDataV2[]> {
        this.logger.debug('[SupabaseRepo] Finding overlapping highlights');

        // TODO: Implement proper overlap detection
        // For now, return empty array
        // This would require fetching highlights and checking range overlap
        return [];
    }

    // ============================================
    // Bulk Operations
    // ============================================

    async addMany(highlights: HighlightDataV2[]): Promise<void> {
        this.logger.info('[SupabaseRepo] Bulk adding highlights', { count: highlights.length });

        // SupabaseClient doesn't have a batch insert method,
        // so we do sequential inserts
        // TODO: Optimize with actual batch insert using Supabase SDK
        for (const highlight of highlights) {
            await this.add(highlight);
        }
    }
}
