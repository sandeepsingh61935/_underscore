import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IndexedDBStorage } from '@/services/indexeddb-storage';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

// Mock IndexedDB
global.indexedDB = indexedDB as any;
global.IDBKeyRange = IDBKeyRange as any;

describe('IndexedDBStorage', () => {
    let storage: IndexedDBStorage;

    beforeEach(async () => {
        storage = new IndexedDBStorage();
        await storage.open();
    });

    afterEach(async () => {
        await storage.delete();
    });

    describe('Highlight Operations', () => {
        const mockHighlight: HighlightDataV2 = {
            id: 'hl_test_123',
            text: 'Test highlight text',
            type: 'underscore',
            colorRole: 'yellow',
            version: 2,
            contentHash: 'hash123',
            createdAt: new Date(),
            ranges: [{
                startOffset: 0,
                endOffset: 10,
                text: 'Test highlight text',
                textBefore: 'Before ',
                textAfter: ' after',
                xpath: '//div[1]/p[1]',
            }],
        };

        it('should save a highlight', async () => {
            await storage.saveHighlight(mockHighlight);

            const saved = await storage.getHighlight(mockHighlight.id);
            expect(saved).toBeDefined();
            expect(saved?.id).toBe(mockHighlight.id);
            expect(saved?.data.text).toBe(mockHighlight.text);
            expect(saved?.synced).toBe(false);
        });

        it('should get highlights by URL', async () => {
            // Save highlights
            await storage.saveHighlight(mockHighlight);
            await storage.saveHighlight({
                ...mockHighlight,
                id: 'hl_test_456',
                text: 'Another highlight',
            });

            const highlights = await storage.getHighlightsByUrl(window.location.href);
            expect(highlights).toHaveLength(2);
        });

        it('should update highlight sync status', async () => {
            await storage.saveHighlight(mockHighlight);

            await storage.markHighlightSynced(mockHighlight.id);

            const updated = await storage.getHighlight(mockHighlight.id);
            expect(updated?.synced).toBe(true);
        });

        it('should delete a highlight', async () => {
            await storage.saveHighlight(mockHighlight);

            await storage.deleteHighlight(mockHighlight.id);

            const deleted = await storage.getHighlight(mockHighlight.id);
            expect(deleted).toBeUndefined();
        });

        it('should search highlights by text', async () => {
            await storage.saveHighlight(mockHighlight);
            await storage.saveHighlight({
                ...mockHighlight,
                id: 'hl_test_789',
                text: 'Different content',
            });

            const results = await storage.searchHighlights('test highlight');
            expect(results).toHaveLength(1);
            expect(results[0]!.id).toBe(mockHighlight.id);
        });

        it('should get unsynced highlights', async () => {
            await storage.saveHighlight(mockHighlight);
            await storage.saveHighlight({
                ...mockHighlight,
                id: 'hl_test_456',
            });

            await storage.markHighlightSynced(mockHighlight.id);

            const unsynced = await storage.getUnsyncedHighlights();
            expect(unsynced).toHaveLength(1);
            expect(unsynced[0]!.id).toBe('hl_test_456');
        });
    });

    describe('Event Operations', () => {
        it('should save an event', async () => {
            const eventId = await storage.saveEvent({
                type: 'highlight.created',
                timestamp: Date.now(),
                data: { highlightId: 'hl_123' },
                synced: false,
            });

            expect(eventId).toMatch(/^evt_/);

            const events = await storage.getUnsyncedEvents();
            expect(events).toHaveLength(1);
            expect(events[0].eventId).toBe(eventId);
        });

        it('should mark events as synced', async () => {
            const eventId1 = await storage.saveEvent({
                type: 'HIGHLIGHT_CREATED',
                timestamp: Date.now(),
                data: {},
                synced: false,
            });

            const eventId2 = await storage.saveEvent({
                type: 'HIGHLIGHT_REMOVED',
                timestamp: Date.now(),
                data: {},
                synced: false,
            });

            await storage.markEventsSynced([eventId1, eventId2]);

            const unsynced = await storage.getUnsyncedEvents();
            expect(unsynced).toHaveLength(0);
        });

        it('should get events by time range', async () => {
            const now = Date.now();

            await storage.saveEvent({
                type: 'HIGHLIGHT_CREATED',
                timestamp: now - 1000,
                data: {},
                synced: false,
            });

            await storage.saveEvent({
                type: 'HIGHLIGHT_CREATED',
                timestamp: now,
                data: {},
                synced: false,
            });

            await storage.saveEvent({
                type: 'HIGHLIGHT_CREATED',
                timestamp: now + 1000,
                data: {},
                synced: false,
            });

            const events = await storage.getEventsByTimeRange(now - 500, now + 500);
            expect(events).toHaveLength(1);
            expect(events[0].timestamp).toBe(now);
        });
    });

    describe('Collection Operations', () => {
        it('should create a collection', async () => {
            const id = await storage.createCollection('Research Notes');

            expect(id).toMatch(/^col_/);

            const collections = await storage.getAllCollections();
            expect(collections).toHaveLength(1);
            expect(collections[0].name).toBe('Research Notes');
        });

        it('should rename a collection', async () => {
            const id = await storage.createCollection('Old Name');

            await storage.renameCollection(id, 'New Name');

            const collections = await storage.getAllCollections();
            expect(collections[0].name).toBe('New Name');
            expect(collections[0].synced).toBe(false);
        });

        it('should delete a collection and move highlights to default', async () => {
            const colId = await storage.createCollection('Test Collection');

            // Save highlight in collection
            const mockHighlight: HighlightDataV2 = {
                id: 'hl_test_123',
                text: 'Test',
                type: 'underscore',
                colorRole: 'yellow',
                version: 2,
                contentHash: 'hash123',
                createdAt: new Date(),
                ranges: [],
            };

            await storage.saveHighlight(mockHighlight, colId);

            // Delete collection
            await storage.deleteCollection(colId);

            // Verify highlight moved to default (null)
            const highlight = await storage.getHighlight(mockHighlight.id);
            expect(highlight?.collectionId).toBeNull();

            // Verify collection deleted
            const collections = await storage.getAllCollections();
            expect(collections).toHaveLength(0);
        });
    });

    describe('Tag Operations', () => {
        it('should create a tag', async () => {
            const id = await storage.createTag('Important', '#FF0000');

            expect(id).toMatch(/^tag_/);

            const tags = await storage.getAllTags();
            expect(tags).toHaveLength(1);
            expect(tags[0]!.name).toBe('Important');
            expect(tags[0]!.color).toBe('#FF0000');
        });

        it('should add tag to highlight', async () => {
            const tagId = await storage.createTag('Important', '#FF0000');

            const mockHighlight: HighlightDataV2 = {
                id: 'hl_test_123',
                text: 'Test',
                type: 'underscore',
                colorRole: 'yellow',
                version: 2,
                contentHash: 'hash123',
                createdAt: new Date(),
                ranges: [],
            };

            await storage.saveHighlight(mockHighlight);
            await storage.addTagToHighlight(mockHighlight.id, tagId);

            const highlight = await storage.getHighlight(mockHighlight.id);
            expect(highlight?.tags).toContain(tagId);
        });

        it('should not add duplicate tags', async () => {
            const tagId = await storage.createTag('Important', '#FF0000');

            const mockHighlight: HighlightDataV2 = {
                id: 'hl_test_123',
                text: 'Test',
                type: 'underscore',
                colorRole: 'yellow',
                version: 2,
                contentHash: 'hash123',
                createdAt: new Date(),
                ranges: [],
            };

            await storage.saveHighlight(mockHighlight);
            await storage.addTagToHighlight(mockHighlight.id, tagId);
            await storage.addTagToHighlight(mockHighlight.id, tagId);

            const highlight = await storage.getHighlight(mockHighlight.id);
            expect(highlight?.tags).toHaveLength(1);
        });

        it('should remove tag from highlight', async () => {
            const tagId = await storage.createTag('Important', '#FF0000');

            const mockHighlight: HighlightDataV2 = {
                id: 'hl_test_123',
                text: 'Test',
                type: 'underscore',
                colorRole: 'yellow',
                version: 2,
                contentHash: 'hash123',
                createdAt: new Date(),
                ranges: [],
            };

            await storage.saveHighlight(mockHighlight);
            await storage.addTagToHighlight(mockHighlight.id, tagId);
            await storage.removeTagFromHighlight(mockHighlight.id, tagId);

            const highlight = await storage.getHighlight(mockHighlight.id);
            expect(highlight?.tags).toHaveLength(0);
        });

        it('should get highlights by tag', async () => {
            const tagId = await storage.createTag('Important', '#FF0000');

            const highlight1: HighlightDataV2 = {
                id: 'hl_1',
                text: 'Test 1',
                type: 'underscore',
                colorRole: 'yellow',
                version: 2,
                contentHash: 'hash1',
                createdAt: new Date(),
                ranges: [],
            };

            const highlight2: HighlightDataV2 = {
                id: 'hl_2',
                text: 'Test 2',
                type: 'underscore',
                colorRole: 'yellow',
                version: 2,
                contentHash: 'hash2',
                createdAt: new Date(),
                ranges: [],
            };

            await storage.saveHighlight(highlight1);
            await storage.saveHighlight(highlight2);
            await storage.addTagToHighlight('hl_1', tagId);

            const tagged = await storage.getHighlightsByTag(tagId);
            expect(tagged).toHaveLength(1);
            expect(tagged[0]!.id).toBe('hl_1');
        });
    });

    describe('Statistics', () => {
        it('should get database stats', async () => {
            // Create some data
            await storage.createCollection('Test Collection');
            await storage.createTag('Important', '#FF0000');

            const mockHighlight: HighlightDataV2 = {
                id: 'hl_test_123',
                text: 'Test',
                type: 'underscore',
                colorRole: 'yellow',
                version: 2,
                contentHash: 'hash123',
                createdAt: new Date(),
                ranges: [],
            };

            await storage.saveHighlight(mockHighlight);
            await storage.saveEvent({
                type: 'HIGHLIGHT_CREATED',
                timestamp: Date.now(),
                data: {},
                synced: false,
            });

            const stats = await storage.getStats();

            expect(stats.highlightCount).toBe(1);
            expect(stats.eventCount).toBe(1);
            expect(stats.collectionCount).toBe(1);
            expect(stats.tagCount).toBe(1);
            expect(stats.unsyncedCount).toBe(1); // Highlight not synced
        });
    });

    describe('Clear Operations', () => {
        it('should clear all data', async () => {
            // Create data
            await storage.createCollection('Test');
            await storage.createTag('Important', '#FF0000');

            const mockHighlight: HighlightDataV2 = {
                id: 'hl_test_123',
                text: 'Test',
                type: 'underscore',
                colorRole: 'yellow',
                version: 2,
                contentHash: 'hash123',
                createdAt: new Date(),
                ranges: [],
            };

            await storage.saveHighlight(mockHighlight);

            // Clear all
            await storage.clearAll();

            // Verify empty
            const stats = await storage.getStats();
            expect(stats.highlightCount).toBe(0);
            expect(stats.eventCount).toBe(0);
            expect(stats.collectionCount).toBe(0);
            expect(stats.tagCount).toBe(0);
        });
    });
});
