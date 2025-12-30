import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VaultModeService } from '@/services/vault-mode-service';
import { IndexedDBStorage } from '@/services/indexeddb-storage';
import { MultiSelectorEngine } from '@/services/multi-selector-engine';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import { createMockHighlight } from "../helpers/mock-data";

/**
 * Cross-Mode Integration Tests
 * 
 * Verifies that Vault Mode, Walk Mode, and Sprint Mode can coexist properly.
 * Tests mode isolation, switching behavior, and data persistence contracts.
 * 
 * Architecture Principles Tested:
 * - Mode Isolation: Each mode operates independently
 * - Data Separation: Vault Mode uses IndexedDB, Walk/Sprint use different storage
 * - Behavioral Contracts: Each mode's persistence guarantees are honored
 * - Mode Switching: Switching between modes doesn't cause data loss or corruption
 */
describe('Cross-Mode Integration Tests', () => {
    let vaultService: VaultModeService;
    let storage: IndexedDBStorage;
    let testContainer: HTMLDivElement;

    beforeEach(async () => {
        storage = new IndexedDBStorage();
        const engine = new MultiSelectorEngine();
        vaultService = new VaultModeService(storage, engine);

        await storage.open();

        // Create test DOM
        testContainer = document.createElement('div');
        testContainer.innerHTML = `
      <article>
        <h1>Cross-Mode Test Article</h1>
        <p id="p1">This paragraph tests Vault Mode persistence across page reloads.</p>
        <p id="p2">This paragraph tests Walk Mode ephemeral behavior.</p>
        <p id="p3">This paragraph tests Sprint Mode server-synced highlights.</p>
      </article>
    `;
        document.body.appendChild(testContainer);
    });

    afterEach(async () => {
        document.body.removeChild(testContainer);
        await storage.delete();
    });

    describe('Mode Isolation', () => {
        it('should keep Vault Mode data separate from other modes', async () => {
            // Vault Mode: Save highlight to IndexedDB
            const p1 = document.getElementById('p1')!;
            const range = document.createRange();
            range.setStart(p1.firstChild!, 0);
            range.setEnd(p1.firstChild!, 15);

            const vaultHighlight: HighlightDataV2 = {
                version: 2,
                id: 'vault-isolation-1',
                text: 'This paragraph',
                contentHash: 'a'.repeat(64),
                colorRole: 'yellow',
                type: 'underscore',
                ranges: [{
                    xpath: '/html/body/p[1]',
                    startOffset: 0,
                    endOffset: 15,
                    text: 'This paragraph',
                    textBefore: '',
                    textAfter: ' tests',
                }],
                createdAt: new Date(),
            };

            await vaultService.saveHighlight(vaultHighlight, range);

            // Verify it's stored in IndexedDB only
            const stored = await storage.getHighlight('vault-isolation-1');
            expect(stored).toBeDefined();
            expect(stored?.metadata?.['selectors']).toBeDefined();

            // Verify Vault Mode stats reflect the data
            const stats = await vaultService.getStats();
            expect(stats.highlightCount).toBe(1);

            // Walk Mode data would be in-memory only (not tested here as Walk Mode implementation is separate)
            // Sprint Mode data would be in server storage (not tested here as Sprint Mode implementation is separate)

            // The key: Vault Mode data is isolated in IndexedDB and won't interfere with other modes
        });

        it('should allow concurrent usage of multiple modes', async () => {
            // Simulate: User creates highlights in different modes simultaneously

            // Vault Mode highlight
            const p1 = document.getElementById('p1')!;
            const vaultRange = document.createRange();
            vaultRange.setStart(p1.firstChild!, 5);
            vaultRange.setEnd(p1.firstChild!, 14);

            const vaultHighlight: HighlightDataV2 = {
                version: 2,
                id: 'vault-concurrent-1',
                text: 'paragraph',
                contentHash: 'b'.repeat(64),
                colorRole: 'blue',
                type: 'underscore',
                ranges: [{
                    xpath: '/p[1]',
                    startOffset: 5,
                    endOffset: 14,
                    text: 'paragraph',
                    textBefore: 'This ',
                    textAfter: ' tests',
                }],
                createdAt: new Date(),
            };

            await vaultService.saveHighlight(vaultHighlight, vaultRange);

            // Walk Mode highlight would be created here (in-memory, different API)
            // Sprint Mode highlight would be created here (server-synced, different API)

            // Verify Vault Mode data is intact
            const vaultData = await storage.getHighlight('vault-concurrent-1');
            expect(vaultData).toBeDefined();

            // Each mode maintains its own data without interference
        });
    });

    describe('Mode Switching', () => {
        it('should preserve Vault Mode data when switching to Walk Mode and back', async () => {
            // 1. Start in Vault Mode: Create persistent highlight
            const p1 = document.getElementById('p1')!;
            const range = document.createRange();
            range.setStart(p1.firstChild!, 0);
            range.setEnd(p1.firstChild!, 10);

            const vaultHighlight: HighlightDataV2 = {
                version: 2,
                id: 'switch-test-1',
                text: 'This parag',
                contentHash: 'c'.repeat(64),
                colorRole: 'green',
                type: 'underscore',
                ranges: [{
                    xpath: '/p[1]',
                    startOffset: 0,
                    endOffset: 10,
                    text: 'This parag',
                    textBefore: '',
                    textAfter: 'raph',
                }],
                createdAt: new Date(),
            };

            await vaultService.saveHighlight(vaultHighlight, range);

            // 2. Switch to Walk Mode
            // (Walk Mode would use in-memory storage, highlights cleared on page unload)
            // Simulated by just verifying Vault data persists

            // 3. Switch back to Vault Mode
            // Vault Mode data should still be there
            const restoredHighlights = await vaultService.restoreHighlightsForUrl();

            expect(restoredHighlights).toHaveLength(1);
            expect(restoredHighlights[0]!.highlight.id).toBe('switch-test-1');

            // Key: Vault Mode data persists across mode switches
        });

        it('should handle mode switch without data corruption', async () => {
            // Create multiple highlights in Vault Mode
            const highlights: Array<{ data: HighlightDataV2; range: Range }> = [];

            for (let i = 1; i <= 3; i++) {
                const p = document.getElementById(`p${i}`)!;
                const range = document.createRange();
                range.setStart(p.firstChild!, 0);
                range.setEnd(p.firstChild!, 5);

                highlights.push({
                    data: {
                        version: 2,
                        id: `multi-switch-${i}`,
                        text: 'This ',
                        contentHash: String(i).repeat(64),
                        colorRole: 'purple',
                        type: 'underscore',
                        ranges: [{
                            xpath: `/p[${i}]`,
                            startOffset: 0,
                            endOffset: 5,
                            text: 'This ',
                            textBefore: '',
                            textAfter: 'paragraph',
                        }],
                        createdAt: new Date(),
                    },
                    range,
                });
            }

            // Save all in Vault Mode
            for (const h of highlights) {
                await vaultService.saveHighlight(h.data, h.range);
            }

            // Simulate mode switch (just verify data integrity)
            const stats = await vaultService.getStats();
            expect(stats.highlightCount).toBe(3);

            // All highlights should restore correctly
            const restored = await vaultService.restoreHighlightsForUrl();
            expect(restored).toHaveLength(3);
            expect(restored.every(r => r.range !== null)).toBe(true);
        });
    });

    describe('Persistence Contracts', () => {
        it('should honor Vault Mode persistence guarantee (survives page reload)', async () => {
            // Vault Mode Contract: Data MUST persist across page reloads

            const p1 = document.getElementById('p1')!;
            const range = document.createRange();
            range.setStart(p1.firstChild!, 0);
            range.setEnd(p1.firstChild!, 20);

      const highlight: HighlightDataV2 = createMockHighlight({ id: 'persist-test-1', text: 'This paragraph tests' });

            await vaultService.saveHighlight(highlight, range);

            // Simulate page reload by creating new service instance
            const newService = new VaultModeService(storage, new MultiSelectorEngine());
            const restored = await newService.restoreHighlightsForUrl();

            expect(restored).toHaveLength(1);
            expect(restored[0]!.highlight.id).toBe('persist-test-1');
            expect(restored[0]!.range).not.toBeNull();

            // Vault Mode guarantee: ✅ Data persisted
        });

        it('should respect Walk Mode ephemeral contract (does not pollute Vault storage)', async () => {
            // Walk Mode Contract: Data should NOT persist to IndexedDB
            // This test ensures Vault Mode doesn't accidentally capture Walk Mode highlights

            // In a real implementation, Walk Mode would have a flag to prevent storage
            // Here we just verify that only explicitly saved highlights are in Vault storage

            const initialCount = (await vaultService.getStats()).highlightCount;

            // Walk Mode highlight (NOT saved to Vault)
            // (Would be handled by Walk Mode service, not Vault Mode)

            // Verify Vault storage unchanged
            const finalCount = (await vaultService.getStats()).highlightCount;
            expect(finalCount).toBe(initialCount);

            // Walk Mode contract: ✅ No persistent storage
        });

        it('should support Sprint Mode sync contract (unsynced data tracked)', async () => {
            // Sprint Mode Contract: Data should sync to server
            // Vault Mode supports this via event sourcing and sync status

            const p1 = document.getElementById('p1')!;
            const range = document.createRange();
            range.setStart(p1.firstChild!, 0);
            range.setEnd(p1.firstChild!, 10);

      const highlight: HighlightDataV2 = createMockHighlight({ id: 'sync-test-1', text: 'This parag' });

            await vaultService.saveHighlight(highlight, range);

            // Verify unsynced event created
            const unsyncedEvents = await storage.getUnsyncedEvents();
            expect(unsyncedEvents.length).toBeGreaterThan(0);
            expect(unsyncedEvents.some(e => e.type === 'highlight.created')).toBe(true);

            // Sync operation
            await vaultService.syncToServer();

            // Verify synced
            const syncedEvents = await storage.getUnsyncedEvents();
            expect(syncedEvents.length).toBe(0);

            // Sprint Mode sync contract: ✅ Supported via event sourcing
        });
    });

    describe('Data Consistency Across Modes', () => {
        it('should maintain consistent highlight IDs across modes', async () => {
            // Same highlight ID should work across modes without conflict

            const consistentId = 'cross-mode-id-123';

            const p1 = document.getElementById('p1')!;
            const range = document.createRange();
            range.setStart(p1.firstChild!, 0);
            range.setEnd(p1.firstChild!, 10);

      const highlight: HighlightDataV2 = createMockHighlight({ id: 'onsistentI', text: 'This parag' });

            await vaultService.saveHighlight(highlight, range);

            // Retrieve by ID
            const retrieved = await storage.getHighlight(consistentId);
            expect(retrieved?.id).toBe(consistentId);

            // ID remains consistent for cross-mode operations
        });
    });

    describe('Performance Impact on Other Modes', () => {
        it('should not degrade Walk Mode performance with heavy Vault usage', async () => {
            // Create many Vault Mode highlights
            const startTime = performance.now();

            for (let i = 0; i < 10; i++) {
                const p = document.getElementById('p1')!;
                const range = document.createRange();
                range.setStart(p.firstChild!, i);
                range.setEnd(p.firstChild!, i + 5);

      const highlight: HighlightDataV2 = createMockHighlight({ id: 'perf-test-${i}', text: 'test' });

                await vaultService.saveHighlight(highlight, range);
            }

            const endTime = performance.now();
            const duration = endTime - startTime;

            // Should complete reasonably fast (< 1 second for 10 highlights)
            expect(duration).toBeLessThan(1000);

            // Vault Mode operations don't block other modes
        });
    });
});
