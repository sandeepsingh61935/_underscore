/**
 * Sprint Mode
 * 
 * Philosophy: "Use and forget" - Zero commitment, minimal trace
 * 
 * Features:
 * - 4-hour TTL (auto-delete after 4 hours)
 * - Local storage with per-domain encryption
 * - In-memory undo/redo
 * - Adaptive theming (Material Design colors)
 * - No account required
 */

import { BaseHighlightMode } from './base-highlight-mode';
import type { HighlightData } from './highlight-mode.interface';

import { serializeRange } from '@/content/utils/range-converter';
import { EventName } from '@/shared/types/events';
import { generateContentHash } from '@/shared/utils/content-hash';

export class SprintMode extends BaseHighlightMode {
    get name() { return 'sprint' as const; }

    async createHighlight(selection: Selection, colorRole: string): Promise<string> {
        if (selection.rangeCount === 0) {
            throw new Error('No range in selection');
        }

        const range = selection.getRangeAt(0);
        const text = range.toString().trim();

        if (!text) {
            throw new Error('Empty text selection');
        }

        // ============================================
        // DEDUPLICATION: Check for existing highlight
        // ============================================
        const contentHash = await generateContentHash(text);
        const existing = this.repository.findByContentHash(contentHash);

        if (existing) {
            this.logger.info('Duplicate content detected - returning existing highlight', {
                existingId: existing.id,
                text: text.substring(0, 50) + '...'
            });
            return existing.id;  // ✅ Return existing instead of creating duplicate
        }

        const id = this.generateId();
        const serializedRange = serializeRange(range);

        if (!serializedRange) {
            throw new Error('Failed to serialize range');
        }

        const data: HighlightData = {
            id,
            text,
            contentHash,  // ✅ Store hash for future dedup
            colorRole,  // ✅ Semantic token
            type: 'underscore',
            ranges: [serializedRange],
            liveRanges: [range],
            createdAt: new Date()
        };

        // ✅ CRITICAL FIX: Register in ALL tracking structures
        // 1. Create Custom Highlight API highlight
        const highlight = new Highlight(range);

        // 2. Add to CSS.highlights (DOM)
        CSS.highlights.set(id, highlight);
        this.logger.info('Added to CSS.highlights', { id });

        // 3. Add to internal maps (mode state)
        this.highlights.set(id, highlight);
        this.data.set(id, data);
        this.logger.info('Added to mode internal maps', { id });

        // 4. Add to repository (persistence)
        this.repository.add(data as any);
        this.logger.info('Added to repository', { id });

        // Unified rendering - ALWAYS registers properly!
        await this.renderAndRegister(data);

        // Emit event
        this.eventBus.emit(EventName.HIGHLIGHT_CREATED, {
            type: EventName.HIGHLIGHT_CREATED,
            highlight: {
                id: data.id,
                text: data.text,
                colorRole: data.colorRole
            },
            ranges: data.ranges
        });

        return id;
    }

    async createFromData(data: HighlightData): Promise<void> {
        // Used by undo/redo and range subtraction
        // CRITICAL: Goes through same renderAndRegister path!
        await this.renderAndRegister(data);

        this.eventBus.emit(EventName.HIGHLIGHT_CREATED, {
            type: EventName.HIGHLIGHT_CREATED,
            highlight: {
                id: data.id,
                text: data.text,
                colorRole: data.colorRole
            },
            ranges: data.ranges
        });
    }

    async updateHighlight(id: string, updates: Partial<HighlightData>): Promise<void> {
        const existing = this.data.get(id);
        if (!existing) {
            throw new Error(`Highlight ${id} not found`);
        }

        const updated = { ...existing, ...updates };
        this.data.set(id, updated);

        // Re-inject CSS if colorRole changed
        if (updates.colorRole) {
            const { injectHighlightCSS } = await import('@/content/styles/highlight-styles');
            injectHighlightCSS(updated.type, id, updates.colorRole);
        }
    }

    override async removeHighlight(id: string): Promise<void> {
        this.logger.info('Removing highlight', { id });

        // 🐛 DEBUG: Check state before deletion
        console.log('🐛 CSS.highlights BEFORE delete:', Array.from(CSS.highlights.keys()));
        console.log('🐛 Has highlight?', CSS.highlights.has(id));

        // ✅ Remove from Custom Highlight API (DOM)
        if (CSS.highlights.has(id)) {
            CSS.highlights.delete(id);
            this.logger.info('Removed from CSS.highlights', { id });

            // 🐛 DEBUG: Verify deletion
            console.log('🐛 CSS.highlights AFTER delete:', Array.from(CSS.highlights.keys()));
            console.log('🐛 Still has highlight?', CSS.highlights.has(id));
        }

        // ✅ Remove from internal maps (state)
        this.highlights.delete(id);
        this.data.delete(id);

        // ✅ Remove from repository (persistence)
        this.repository.remove(id);

        this.logger.info('Highlight removed completely', { id });

        // 🐛 DEBUG: Final check
        console.log('🐛 FINAL CHECK - Still in CSS.highlights?', CSS.highlights.has(id));
    }

    async clearAll(): Promise<void> {
        this.logger.info('Clearing all highlights in sprint mode');

        // ✅ Clear Custom Highlight API (DOM)
        CSS.highlights.clear();

        // ✅ Clear internal maps (state)
        this.highlights.clear();
        this.data.clear();

        // ✅ Clear repository (persistence)
        this.repository.clear();

        this.logger.info('All highlights cleared');
    }

    async restore(): Promise<void> {
        // Sprint mode: No restoration (ephemeral)
        this.logger.debug('Sprint mode: No highlights to restore');
    }
}
