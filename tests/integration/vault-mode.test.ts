import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VaultModeService, getVaultModeService } from '@/services/vault-mode-service';
import { IndexedDBStorage } from '@/services/indexeddb-storage';
import { MultiSelectorEngine } from '@/services/multi-selector-engine';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';

/**
 * Integration Tests for Vault Mode
 * 
 * Tests the complete flow from save to restore using real IndexedDB (fake-indexeddb)
 * and real MultiSelectorEngine. Verifies end-to-end functionality.
 */
describe('VaultModeService - Integration Tests', () => {
    let service: VaultModeService;
    let storage: IndexedDBStorage;
    let engine: MultiSelectorEngine;
    let testContainer: HTMLDivElement;

    beforeEach(async () => {
        // Create real instances (IndexedDB is mocked by fake-indexeddb in vitest setup)
        storage = new IndexedDBStorage();
        engine = new MultiSelectorEngine();
        service = new VaultModeService(storage, engine);

        // Open database
        await storage.open();

        // Create test DOM
        testContainer = document.createElement('div');
        testContainer.innerHTML = `
      <article>
        <h1>Test Article</h1>
        <p id="p1">This is the first paragraph with some test content for highlighting.</p>
        <p id="p2">This is the second paragraph with more content for testing restoration.</p>
        <div class="content">
          <p id="p3">Nested paragraph inside a div element for complex tests.</p>
        </div>
      </article>
    `;
        document.body.appendChild(testContainer);
    });

    afterEach(async () => {
        document.body.removeChild(testContainer);
        await storage.delete();
    });

    describe('Complete Save → Restore Flow', () => {
        it('should save highlight with all 3 selectors and restore successfully', async () => {
            // 1. Create a DOM Range
            const p1 = document.getElementById('p1')!;
            const textNode = p1.firstChild!;

            const range = document.createRange();
            range.setStart(textNode, 8); // "the first"
            range.setEnd(textNode, 17);

            // 2. Create highlight data
            const highlight: HighlightDataV2 = {
                id: 'integration-test-1',
                text: 'the first',
                ranges: [{
                    startContainerPath: '/html/body/div[1]/article[1]/p[1]/text()[1]',
                    endContainerPath: '/html/body/div[1]/article[1]/p[1]/text()[1]',
                    startOffset: 8,
                    endOffset: 17,
                }],
                color: '#ffeb3b',
                createdAt: Date.now(),
            };

            // 3. Save via service
            await service.saveHighlight(highlight, range);

            // 4. Verify storage
            const stored = await storage.getHighlight('integration-test-1');
            expect(stored).toBeDefined();
            expect(stored?.metadata).toBeDefined();
            expect(stored?.metadata?.['selectors']).toBeDefined();

            const selectors = stored!.metadata!['selectors'];
            expect(selectors.xpath).toBeDefined();
            expect(selectors.position).toBeDefined();
            expect(selectors.fuzzy).toBeDefined();

            // 5. Restore via service
            const results = await service.restoreHighlightsForUrl();

            expect(results).toHaveLength(1);
            expect(results[0]!.highlight.id).toBe('integration-test-1');
            expect(results[0]!.range).not.toBeNull();
            expect(results[0]!.range!.toString()).toBe('the first');
            expect(results[0]!.restoredUsing).toBe('xpath'); // XPath should succeed
        });

        it('should fall back to position when XPath fails', async () => {
            // 1. Create and save highlight
            const p2 = document.getElementById('p2')!;
            const textNode = p2.firstChild!;

            const range = document.createRange();
            range.setStart(textNode, 12); // "second paragraph"
            range.setEnd(textNode, 28);

            const highlight: HighlightDataV2 = {
                id: 'position-test-1',
                text: 'second paragraph',
                ranges: [],
                color: '#4caf50',
                createdAt: Date.now(),
            };

            await service.saveHighlight(highlight, range);

            // 2. Break XPath by wrapping element
            const wrapper = document.createElement('span');
            p2.parentElement!.insertBefore(wrapper, p2);
            wrapper.appendChild(p2);

            // 3. Restore - should fall back to position
            const results = await service.restoreHighlightsForUrl();

            expect(results).toHaveLength(1);
            expect(results[0]!.range).not.toBeNull();
            expect(results[0]!.range!.toString()).toBe('second paragraph');
            expect(results[0]!.restoredUsing).toBe('position'); // Position fallback
        });

        it('should fall back to fuzzy when both XPath and Position fail', async () => {
            // 1. Create and save highlight
            const p3 = document.getElementById('p3')!;
            const textNode = p3.firstChild!;

            const range = document.createRange();
            range.setStart(textNode, 0); // "Nested paragraph"
            range.setEnd(textNode, 16);

            const highlight: HighlightDataV2 = {
                id: 'fuzzy-test-1',
                text: 'Nested paragraph',
                ranges: [],
                color: '#2196f3',
                createdAt: Date.now(),
            };

            await service.saveHighlight(highlight, range);

            // 2. Break both XPath and Position by inserting content before
            const newP = document.createElement('p');
            newP.textContent = 'Inserted content that shifts offsets.';
            p3.parentElement!.insertBefore(newP, p3);

            // 3. Restore - should fall back to fuzzy
            const results = await service.restoreHighlightsForUrl();

            expect(results).toHaveLength(1);
            expect(results[0]!.range).not.toBeNull();
            expect(results[0]!.range!.toString()).toBe('Nested paragraph');
            expect(results[0]!.restoredUsing).toBe('fuzzy'); // Fuzzy fallback
        });

        it('should handle multiple highlights on same page', async () => {
            // Create 3 highlights
            const highlights: Array<{ data: HighlightDataV2; range: Range }> = [];

            // Highlight 1
            const p1 = document.getElementById('p1')!;
            const range1 = document.createRange();
            range1.setStart(p1.firstChild!, 8);
            range1.setEnd(p1.firstChild!, 17);
            highlights.push({
                data: {
                    id: 'multi-1',
                    text: 'the first',
                    ranges: [],
                    color: '#ffeb3b',
                    createdAt: Date.now(),
                },
                range: range1,
            });

            // Highlight 2
            const p2 = document.getElementById('p2')!;
            const range2 = document.createRange();
            range2.setStart(p2.firstChild!, 12);
            range2.setEnd(p2.firstChild!, 28);
            highlights.push({
                data: {
                    id: 'multi-2',
                    text: 'second paragraph',
                    ranges: [],
                    color: '#4caf50',
                    createdAt: Date.now(),
                },
                range: range2,
            });

            // Highlight 3
            const p3 = document.getElementById('p3')!;
            const range3 = document.createRange();
            range3.setStart(p3.firstChild!, 0);
            range3.setEnd(p3.firstChild!, 16);
            highlights.push({
                data: {
                    id: 'multi-3',
                    text: 'Nested paragraph',
                    ranges: [],
                    color: '#2196f3',
                    createdAt: Date.now(),
                },
                range: range3,
            });

            // Save all
            for (const h of highlights) {
                await service.saveHighlight(h.data, h.range);
            }

            // Restore all
            const results = await service.restoreHighlightsForUrl();

            expect(results).toHaveLength(3);
            expect(results.every(r => r.range !== null)).toBe(true);
            expect(results.map(r => r.highlight.id).sort()).toEqual(['multi-1', 'multi-2', 'multi-3']);
        });
    });

    describe('Event Sourcing', () => {
        it('should create events for highlight.created', async () => {
            const p1 = document.getElementById('p1')!;
            const range = document.createRange();
            range.setStart(p1.firstChild!, 0);
            range.setEnd(p1.firstChild!, 10);

            const highlight: HighlightDataV2 = {
                id: 'event-test-1',
                text: 'This is th',
                ranges: [],
                color: '#ffeb3b',
                createdAt: Date.now(),
            };

            await service.saveHighlight(highlight, range);

            const events = await storage.getUnsyncedEvents();
            expect(events).toHaveLength(1);
            expect(events[0]!.type).toBe('highlight.created');
            expect(events[0]!.data.highlightId).toBe('event-test-1');
        });

        it('should create events for highlight.removed', async () => {
            await service.deleteHighlight('test-id');

            const events = await storage.getUnsyncedEvents();
            expect(events).toHaveLength(1);
            expect(events[0]!.type).toBe('highlight.removed');
            expect(events[0]!.data.highlightId).toBe('test-id');
        });
    });

    describe('Sync Operations', () => {
        it('should mark highlights and events as synced', async () => {
            // Create highlight
            const p1 = document.getElementById('p1')!;
            const range = document.createRange();
            range.setStart(p1.firstChild!, 0);
            range.setEnd(p1.firstChild!, 10);

            const highlight: HighlightDataV2 = {
                id: 'sync-test-1',
                text: 'This is th',
                ranges: [],
                color: '#ffeb3b',
                createdAt: Date.now(),
            };

            await service.saveHighlight(highlight, range);

            // Verify unsynced
            const unsyncedBefore = await storage.getUnsyncedHighlights();
            expect(unsyncedBefore).toHaveLength(1);

            // Sync
            await service.syncToServer();

            // Verify synced
            const unsyncedAfter = await storage.getUnsyncedHighlights();
            expect(unsyncedAfter).toHaveLength(0);
        });
    });

    describe('Statistics', () => {
        it('should return accurate statistics', async () => {
            // Create some data
            const p1 = document.getElementById('p1')!;
            const range = document.createRange();
            range.setStart(p1.firstChild!, 0);
            range.setEnd(p1.firstChild!, 10);

            const highlight: HighlightDataV2 = {
                id: 'stats-test-1',
                text: 'This is th',
                ranges: [],
                color: '#ffeb3b',
                createdAt: Date.now(),
            };

            await service.saveHighlight(highlight, range);

            const stats = await service.getStats();

            expect(stats.totalHighlights).toBe(1);
            expect(stats.totalEvents).toBe(1);
            expect(stats.unsyncedCount).toBeGreaterThan(0);
        });
    });

    describe('Singleton Pattern', () => {
        it('should return same instance from getVaultModeService', () => {
            const instance1 = getVaultModeService();
            const instance2 = getVaultModeService();

            expect(instance1).toBe(instance2);
        });
    });
});
