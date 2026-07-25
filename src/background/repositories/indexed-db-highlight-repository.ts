
/**
 * @file indexed-db-highlight-repository.ts
 * @description Persistent local highlight repository using IndexedDB
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { IHighlightRepository, RepositoryOptions } from '@/shared/repositories/i-highlight-repository';
import type { HighlightDataV2, SerializedRange } from '@/shared/schemas/highlight-schema';
import type { ILogger } from '@/shared/utils/logger';
import {
  BASIC_HIGHLIGHT_DB_NAME,
  LEGACY_HIGHLIGHT_DB_NAME,
} from '@/shared/constants/highlight-storage-scope';
import { HIGHLIGHT_DB_VERSION, HIGHLIGHTS_STORE } from '@/shared/constants/highlight-db-version';
import { upgradeHighlightDatabase } from '@/shared/storage/highlight-db-upgrade';

export { BASIC_HIGHLIGHT_DB_NAME, LEGACY_HIGHLIGHT_DB_NAME };
export const DB_NAME = LEGACY_HIGHLIGHT_DB_NAME;
const STORE_NAME = HIGHLIGHTS_STORE;

/**
 * IndexedDB implementation of IHighlightRepository
 * 
 * Provides persistent local storage that survives browser restarts and page reloads.
 */
export class IndexedDBHighlightRepository implements IHighlightRepository {
    private dbPromise: Promise<IDBPDatabase>;

    constructor(
        private readonly logger: ILogger,
        private readonly dbName: string = BASIC_HIGHLIGHT_DB_NAME,
    ) {
        this.dbPromise = openDB(this.dbName, HIGHLIGHT_DB_VERSION, {
            upgrade(db) {
                upgradeHighlightDatabase(db);
            },
        });
    }

    async add(highlight: HighlightDataV2, _options?: RepositoryOptions): Promise<void> {
        const db = await this.dbPromise;
        await db.put(STORE_NAME, highlight);
        this.logger.debug('[IndexedDB] Added highlight', { id: highlight.id });
    }

    async update(id: string, updates: Partial<HighlightDataV2>, _options?: RepositoryOptions): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        const existing = await store.get(id);
        if (!existing) {
            this.logger.warn('[IndexedDB] Highlight not found for update', { id });
            return;
        }

        const updated = { ...existing, ...updates, updatedAt: new Date() };
        await store.put(updated);
        await tx.done;
        this.logger.debug('[IndexedDB] Updated highlight', { id });
    }

    async remove(id: string, _options?: RepositoryOptions): Promise<void> {
        const db = await this.dbPromise;
        await db.delete(STORE_NAME, id);
        this.logger.debug('[IndexedDB] Removed highlight', { id });
    }

    async findById(id: string): Promise<HighlightDataV2 | null> {
        const db = await this.dbPromise;
        const highlight = await db.get(STORE_NAME, id);
        return highlight || null;
    }

    async findAll(): Promise<HighlightDataV2[]> {
        const db = await this.dbPromise;
        return await db.getAll(STORE_NAME);
    }

    async findByContentHash(hash: string): Promise<HighlightDataV2 | null> {
        const db = await this.dbPromise;
        const index = db.transaction(STORE_NAME).store.index('contentHash');
        const highlight = await index.get(hash);
        return highlight || null;
    }

    async findByUrl(url: string): Promise<HighlightDataV2[]> {
        const db = await this.dbPromise;
        const index = db.transaction(STORE_NAME).store.index('url');
        const highlights = await index.getAll(url);

        this.logger.debug('[IndexedDB] Found highlights by URL', { url, count: highlights.length });
        return highlights;
    }

    async findOverlapping(_range: SerializedRange): Promise<HighlightDataV2[]> {
        // Range overlap logic is complex in IndexedDB without spatial index.
        // For now, fetch all by URL (if we had URL context) or scan all?
        // Since findAll is expensive, we might skip this optimization for now 
        // OR better: rely on memory layer for fast overlap checks if we cache?
        // But Repository pattern implies direct storage access.
        // Let's implement a naive filter on findAll for now, or just return [] as in memory repo.
        // Given Phase 3 limitation mentioned in InMemoryRepo, let's keep it aligned.
        return [];
    }

    // Metadata

    async count(): Promise<number> {
        const db = await this.dbPromise;
        return await db.count(STORE_NAME);
    }

    async exists(id: string): Promise<boolean> {
        const db = await this.dbPromise;
        const key = await db.getKey(STORE_NAME, id);
        return key !== undefined;
    }

    async addMany(highlights: HighlightDataV2[]): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const promises = highlights.map(h => tx.store.put(h));
        await Promise.all([...promises, tx.done]);
        this.logger.info('[IndexedDB] Batch added highlights', { count: highlights.length });
    }

    async clear(): Promise<void> {
        const db = await this.dbPromise;
        await db.clear(STORE_NAME);
        this.logger.warn('[IndexedDB] Cleared all highlights');
    }

    async close(): Promise<void> {
        const db = await this.dbPromise;
        db.close();
    }
}
