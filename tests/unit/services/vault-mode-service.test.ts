import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VaultModeService } from '@/services/vault-mode-service';
import { IndexedDBStorage } from '@/services/indexeddb-storage';
import { MultiSelectorEngine } from '@/services/multi-selector-engine';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';

/**
 * Comprehensive Unit Tests for VaultModeService
 * 
 * Tests the integration layer in isolation using mocked dependencies.
 * Verifies correct coordination between storage and selector engine.
 */
describe('VaultModeService - Unit Tests', () => {
    let service: VaultModeService;
    let mockStorage: IndexedDBStorage;
    let mockEngine: MultiSelectorEngine;
    let mockLogger: Console;

    beforeEach(() => {
        // Create mock dependencies
        mockStorage = {
            saveHighlight: vi.fn(),
            saveEvent: vi.fn(),
            getHighlightsByUrl: vi.fn(),
            deleteHighlight: vi.fn(),
            getUnsyncedEvents: vi.fn(),
            getUnsyncedHighlights: vi.fn(),
            markEventsSynced: vi.fn(),
            markHighlightSynced: vi.fn(),
            getStats: vi.fn(),
            clearAll: vi.fn(),
        } as any;

        mockEngine = {
            createSelectors: vi.fn(),
            restore: vi.fn(),
        } as any;

        mockLogger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            log: vi.fn(),
        } as any;

        service = new VaultModeService(mockStorage, mockEngine, mockLogger);
    });

    describe('saveHighlight', () => {
        it('should generate selectors and store highlight with metadata', async () => {
            const highlight: HighlightDataV2 = {
                id: 'test-1',
                text: 'Test highlight',
                ranges: [{
                    startContainerPath: '/html/body/p[1]',
                    endContainerPath: '/html/body/p[1]',
                    startOffset: 0,
                    endOffset: 10,
                }],
                color: '#ffeb3b',
                createdAt: Date.now(),
            };

            const range = document.createRange();
            const mockSelectors = {
                xpath: { xpath: '/html/body/p[1]', startOffset: 0, endOffset: 10, text: 'Test highlight', textBefore: '', textAfter: '' },
                position: { startOffset: 0, endOffset: 10, text: 'Test highlight', textBefore: '', textAfter: '' },
                fuzzy: { text: 'Test highlight', textBefore: '', textAfter: '', threshold: 0.8 },
                contentHash: 'abc123',
                createdAt: Date.now(),
            };

            vi.mocked(mockEngine.createSelectors).mockReturnValue(mockSelectors);

            await service.saveHighlight(highlight, range, 'collection-1');

            // Verify selectors were generated
            expect(mockEngine.createSelectors).toHaveBeenCalledWith(range);

            // Verify storage was called with metadata
            expect(mockStorage.saveHighlight).toHaveBeenCalledWith(
                highlight,
                'collection-1',
                expect.objectContaining({
                    selectors: mockSelectors,
                    url: expect.any(String),
                })
            );

            // Verify event was created
            expect(mockStorage.saveEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'highlight.created',
                    data: expect.objectContaining({
                        highlightId: 'test-1',
                    }),
                })
            );

            // Verify logging
            expect(mockLogger.info).toHaveBeenCalled();
        });

        it('should handle errors and rethrow', async () => {
            const highlight: HighlightDataV2 = {
                id: 'test-1',
                text: 'Test',
                ranges: [],
                color: '#ffeb3b',
                createdAt: Date.now(),
            };

            const range = document.createRange();
            const error = new Error('Storage failed');

            vi.mocked(mockEngine.createSelectors).mockReturnValue({} as any);
            vi.mocked(mockStorage.saveHighlight).mockRejectedValue(error);

            await expect(service.saveHighlight(highlight, range)).rejects.toThrow('Storage failed');

            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('restoreHighlightsForUrl', () => {
        it('should restore highlights using multi-selector engine', async () => {
            const mockRecords = [
                {
                    id: 'h1',
                    url: 'https://example.com',
                    data: {
                        id: 'h1',
                        text: 'Highlight 1',
                        ranges: [],
                        color: '#ffeb3b',
                        createdAt: Date.now(),
                    },
                    collectionId: null,
                    tags: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    synced: false,
                    metadata: {
                        selectors: {
                            xpath: { xpath: '/p[1]', startOffset: 0, endOffset: 10, text: 'Highlight 1', textBefore: '', textAfter: '' },
                            position: { startOffset: 0, endOffset: 10, text: 'Highlight 1', textBefore: '', textAfter: '' },
                            fuzzy: { text: 'Highlight 1', textBefore: '', textAfter: '', threshold: 0.8 },
                            contentHash: 'hash1',
                            createdAt: Date.now(),
                        },
                    },
                },
            ];

            const mockRange = document.createRange();

            vi.mocked(mockStorage.getHighlightsByUrl).mockResolvedValue(mockRecords);
            vi.mocked(mockEngine.restore).mockResolvedValue(mockRange);

            const results = await service.restoreHighlightsForUrl();

            expect(results).toHaveLength(1);
            expect(results[0]?.highlight.id).toBe('h1');
            expect(results[0]?.range).toBe(mockRange);
            expect(results[0]?.restoredUsing).toBeDefined();

            expect(mockStorage.getHighlightsByUrl).toHaveBeenCalled();
            expect(mockEngine.restore).toHaveBeenCalled();
        });

        it('should handle highlights without selectors', async () => {
            const mockRecords = [
                {
                    id: 'h1',
                    url: 'https://example.com',
                    data: {
                        id: 'h1',
                        text: 'No selectors',
                        ranges: [],
                        color: '#ffeb3b',
                        createdAt: Date.now(),
                    },
                    collectionId: null,
                    tags: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    synced: false,
                    metadata: undefined, // No metadata
                },
            ];

            vi.mocked(mockStorage.getHighlightsByUrl).mockResolvedValue(mockRecords);

            const results = await service.restoreHighlightsForUrl();

            expect(results).toHaveLength(1);
            expect(results[0]?.range).toBeNull();
            expect(results[0]?.restoredUsing).toBe('failed');

            expect(mockLogger.warn).toHaveBeenCalled();
        });

        it('should continue on restoration failures', async () => {
            const mockRecords = [
                {
                    id: 'h1',
                    url: 'https://example.com',
                    data: {
                        id: 'h1',
                        text: 'Test',
                        ranges: [],
                        color: '#ffeb3b',
                        createdAt: Date.now(),
                    },
                    collectionId: null,
                    tags: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    synced: false,
                    metadata: {
                        selectors: {
                            xpath: { xpath: '/p[1]', startOffset: 0, endOffset: 10, text: 'Test', textBefore: '', textAfter: '' },
                            position: { startOffset: 0, endOffset: 10, text: 'Test', textBefore: '', textAfter: '' },
                            fuzzy: { text: 'Test', textBefore: '', textAfter: '', threshold: 0.8 },
                            contentHash: 'hash1',
                            createdAt: Date.now(),
                        },
                    },
                },
            ];

            vi.mocked(mockStorage.getHighlightsByUrl).mockResolvedValue(mockRecords);
            vi.mocked(mockEngine.restore).mockResolvedValue(null); // Restoration failed

            const results = await service.restoreHighlightsForUrl();

            expect(results).toHaveLength(1);
            expect(results[0]?.range).toBeNull();
            expect(results[0]?.restoredUsing).toBe('failed');
        });
    });

    describe('deleteHighlight', () => {
        it('should delete highlight and create event', async () => {
            await service.deleteHighlight('test-123');

            expect(mockStorage.deleteHighlight).toHaveBeenCalledWith('test-123');
            expect(mockStorage.saveEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'highlight.removed',
                    data: { highlightId: 'test-123' },
                })
            );
            expect(mockLogger.info).toHaveBeenCalled();
        });

        it('should handle delete errors', async () => {
            const error = new Error('Delete failed');
            vi.mocked(mockStorage.deleteHighlight).mockRejectedValue(error);

            await expect(service.deleteHighlight('test-123')).rejects.toThrow('Delete failed');
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('syncToServer', () => {
        it('should sync unsynced data and mark as synced', async () => {
            const mockEvents = [
                { eventId: 'e1', type: 'highlight.created' as const, timestamp: Date.now(), data: {}, synced: false },
                { eventId: 'e2', type: 'highlight.removed' as const, timestamp: Date.now(), data: {}, synced: false },
            ];

            const mockHighlights = [
                {
                    id: 'h1',
                    url: 'https://example.com',
                    data: {} as HighlightDataV2,
                    collectionId: null,
                    tags: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    synced: false,
                },
            ];

            vi.mocked(mockStorage.getUnsyncedEvents).mockResolvedValue(mockEvents);
            vi.mocked(mockStorage.getUnsyncedHighlights).mockResolvedValue(mockHighlights);

            const syncedIds = await service.syncToServer();

            expect(syncedIds).toEqual(['e1', 'e2']);
            expect(mockStorage.markEventsSynced).toHaveBeenCalledWith(['e1', 'e2']);
            expect(mockStorage.markHighlightSynced).toHaveBeenCalledWith('h1');
            expect(mockLogger.info).toHaveBeenCalledTimes(2); // Start and complete
        });

        it('should handle sync errors', async () => {
            const error = new Error('Sync failed');
            vi.mocked(mockStorage.getUnsyncedEvents).mockRejectedValue(error);

            await expect(service.syncToServer()).rejects.toThrow('Sync failed');
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('getStats', () => {
        it('should return storage statistics', async () => {
            const mockStats = {
                totalHighlights: 10,
                totalEvents: 20,
                totalCollections: 2,
                totalTags: 5,
                unsyncedCount: 3,
            };

            vi.mocked(mockStorage.getStats).mockResolvedValue(mockStats);

            const stats = await service.getStats();

            expect(stats).toEqual(mockStats);
            expect(mockStorage.getStats).toHaveBeenCalled();
        });
    });

    describe('clearAll', () => {
        it('should clear all data', async () => {
            await service.clearAll();

            expect(mockStorage.clearAll).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalled();
        });
    });
});
