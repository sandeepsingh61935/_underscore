import Dexie, { type EntityTable } from 'dexie';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import type { HighlightEventType } from '@/shared/types/storage';

/**
 * Highlight record stored in IndexedDB
 */
export interface HighlightRecord {
    /** Unique highlight ID */
    id: string;

    /** Page URL where highlight was created */
    url: string;

    /** Full highlight data (ranges, text, colors, etc.) */
    data: HighlightDataV2;

    /** Collection ID (null = default collection) */
    collectionId: string | null;

    /** Array of tag IDs */
    tags: string[];

    /** Creation timestamp */
    createdAt: number;

    /** Last update timestamp */
    updatedAt: number;

    /** Sync status (false = pending sync) */
    synced: boolean;
}

/**
 * Event record for event sourcing
 */
export interface EventRecord {
    /** Unique event ID */
    eventId: string;

    /** Event type (highlight.created, highlight.removed, etc.) */
    type: HighlightEventType;

    /** Event timestamp */
    timestamp: number;

    /** Event payload data */
    data: any;

    /** Sync status */
    synced: boolean;

    /** Retry count for failed syncs */
    retryCount?: number;
}

/**
 * Collection record for organizing highlights
 */
export interface CollectionRecord {
    /** Unique collection ID */
    id: string;

    /** Collection name */
    name: string;

    /** Creation timestamp */
    createdAt: number;

    /** Last update timestamp */
    updatedAt: number;

    /** Sync status */
    synced: boolean;
}

/**
 * Tag record
 */
export interface TagRecord {
    /** Unique tag ID */
    id: string;

    /** Tag name */
    name: string;

    /** Tag color (hex) */
    color: string;

    /** Creation timestamp */
    createdAt: number;
}

/**
 * IndexedDB storage service for Vault Mode
 * 
 * Uses Dexie.js for type-safe IndexedDB operations.
 * Stores highlights, events (for event sourcing), collections, and tags.
 */
export class IndexedDBStorage extends Dexie {
    // Type-safe table definitions
    highlights!: EntityTable<HighlightRecord, 'id'>;
    events!: EntityTable<EventRecord, 'eventId'>;
    collections!: EntityTable<CollectionRecord, 'id'>;
    tags!: EntityTable<TagRecord, 'id'>;

    constructor() {
        super('VaultModeDB');

        // Define schema version 1
        this.version(1).stores({
            // Highlights table
            // Indexes: id (primary), url, collectionId, tags (multi-entry), createdAt, synced
            highlights: 'id, url, collectionId, *tags, createdAt, synced',

            // Events table
            // Indexes: eventId (primary), timestamp, synced
            events: 'eventId, timestamp, synced',

            // Collections table
            // Indexes: id (primary), name, createdAt
            collections: 'id, name, createdAt',

            // Tags table
            // Indexes: id (primary), name
            tags: 'id, name',
        });
    }

    /**
     * Save a highlight to IndexedDB
     */
    async saveHighlight(highlight: HighlightDataV2, collectionId: string | null = null): Promise<void> {
        await this.highlights.put({
            id: highlight.id,
            url: window.location.href,
            data: highlight,
            collectionId,
            tags: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            synced: false,
        });
    }

    /**
     * Get a highlight by ID
     */
    async getHighlight(id: string): Promise<HighlightRecord | undefined> {
        return await this.highlights.get(id);
    }

    /**
     * Get all highlights for a specific URL
     */
    async getHighlightsByUrl(url: string): Promise<HighlightRecord[]> {
        return await this.highlights.where('url').equals(url).toArray();
    }

    /**
     * Get all highlights in a collection
     */
    async getHighlightsByCollection(collectionId: string | null): Promise<HighlightRecord[]> {
        if (collectionId === null) {
            const all = await this.highlights.toArray();
            return all.filter(h => h.collectionId === null);
        }
        return await this.highlights.where('collectionId').equals(collectionId).toArray();
    }

    /**
     * Update highlight sync status
     */
    async markHighlightSynced(id: string): Promise<void> {
        await this.highlights.update(id, { synced: true });
    }

    /**
     * Delete a highlight
     */
    async deleteHighlight(id: string): Promise<void> {
        await this.highlights.delete(id);
    }

    /**
     * Search highlights by text content
     * 
     * Note: This is a simple implementation. For better performance,
     * consider using a full-text search library or backend search.
     */
    async searchHighlights(query: string): Promise<HighlightRecord[]> {
        const lowerQuery = query.toLowerCase();
        const all = await this.highlights.toArray();

        return all.filter(h =>
            h.data.text.toLowerCase().includes(lowerQuery) ||
            (h.data.metadata?.notes && h.data.metadata.notes.toLowerCase().includes(lowerQuery))
        );
    }

    /**
     * Get all unsynced highlights
     */
    async getUnsyncedHighlights(): Promise<HighlightRecord[]> {
        const all = await this.highlights.toArray();
        return all.filter(h => h.synced === false);
    }

    // ========== EVENT METHODS ==========

    /**
     * Save an event to the event log
     */
    async saveEvent(event: Omit<EventRecord, 'eventId'>): Promise<string> {
        const eventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

        await this.events.add({
            eventId,
            ...event,
        });

        return eventId;
    }

    /**
     * Get all unsynced events
     */
    async getUnsyncedEvents(): Promise<EventRecord[]> {
        const all = await this.events.toArray();
        return all.filter(e => e.synced === false);
    }

    /**
     * Mark events as synced
     */
    async markEventsSynced(eventIds: string[]): Promise<void> {
        await this.events.bulkUpdate(
            eventIds.map(id => ({ key: id, changes: { synced: true } }))
        );
    }

    /**
     * Get events by time range
     */
    async getEventsByTimeRange(start: number, end: number): Promise<EventRecord[]> {
        return await this.events
            .where('timestamp')
            .between(start, end, true, true)
            .toArray();
    }

    // ========== COLLECTION METHODS ==========

    /**
     * Create a new collection
     */
    async createCollection(name: string): Promise<string> {
        const id = `col_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

        await this.collections.add({
            id,
            name,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            synced: false,
        });

        return id;
    }

    /**
     * Get all collections
     */
    async getAllCollections(): Promise<CollectionRecord[]> {
        return await this.collections.orderBy('name').toArray();
    }

    /**
     * Rename a collection
     */
    async renameCollection(id: string, newName: string): Promise<void> {
        await this.collections.update(id, {
            name: newName,
            updatedAt: Date.now(),
            synced: false,
        });
    }

    /**
     * Delete a collection
     */
    async deleteCollection(id: string): Promise<void> {
        // Move highlights to default collection (null)
        await this.highlights.where('collectionId').equals(id).modify({ collectionId: null });

        // Delete collection
        await this.collections.delete(id);
    }

    // ========== TAG METHODS ==========

    /**
     * Create a tag
     */
    async createTag(name: string, color: string): Promise<string> {
        const id = `tag_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

        await this.tags.add({
            id,
            name,
            color,
            createdAt: Date.now(),
        });

        return id;
    }

    /**
     * Get all tags
     */
    async getAllTags(): Promise<TagRecord[]> {
        return await this.tags.orderBy('name').toArray();
    }

    /**
     * Add tag to highlight
     */
    async addTagToHighlight(highlightId: string, tagId: string): Promise<void> {
        const highlight = await this.highlights.get(highlightId);

        if (highlight && !highlight.tags.includes(tagId)) {
            await this.highlights.update(highlightId, {
                tags: [...highlight.tags, tagId],
                updatedAt: Date.now(),
                synced: false,
            });
        }
    }

    /**
     * Remove tag from highlight
     */
    async removeTagFromHighlight(highlightId: string, tagId: string): Promise<void> {
        const highlight = await this.highlights.get(highlightId);

        if (highlight) {
            await this.highlights.update(highlightId, {
                tags: highlight.tags.filter(t => t !== tagId),
                updatedAt: Date.now(),
                synced: false,
            });
        }
    }

    /**
     * Get highlights by tag
     */
    async getHighlightsByTag(tagId: string): Promise<HighlightRecord[]> {
        return await this.highlights.where('tags').equals(tagId).toArray();
    }

    // ========== UTILITY METHODS ==========

    /**
     * Get database statistics
     */
    async getStats(): Promise<{
        highlightCount: number;
        eventCount: number;
        collectionCount: number;
        tagCount: number;
        unsyncedCount: number;
    }> {
        const [highlightCount, eventCount, collectionCount, tagCount, allHighlights] =
            await Promise.all([
                this.highlights.count(),
                this.events.count(),
                this.collections.count(),
                this.tags.count(),
                this.highlights.toArray(),
            ]);

        const unsyncedCount = allHighlights.filter(h => h.synced === false).length;

        return {
            highlightCount,
            eventCount,
            collectionCount,
            tagCount,
            unsyncedCount,
        };
    }

    /**
     * Clear all data (for testing or reset)
     */
    async clearAll(): Promise<void> {
        await this.highlights.clear();
        await this.events.clear();
        await this.collections.clear();
        await this.tags.clear();
    }
}

/**
 * Singleton instance
 */
let instance: IndexedDBStorage | null = null;

/**
 * Get the IndexedDB storage instance
 */
export function getIndexedDB(): IndexedDBStorage {
    if (!instance) {
        instance = new IndexedDBStorage();
    }
    return instance;
}
