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
import { serializeRange } from '@/shared/utils/range-serializer';
import { generateContentHash } from '@/shared/utils/content-hash';
import { EventName } from '@/shared/types/events';
import type { HighlightData } from './highlight-mode.interface';

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

    async removeHighlight(id: string): Promise<void> {
        this.logger.info('Removing highlight', { id });

        // ✅ Remove from Custom Highlight API (DOM)
        if (CSS.highlights.has(id)) {
            CSS.highlights.delete(id);
            this.logger.info('Removed from CSS.highlights', { id });
        }

        // ✅ Remove from internal maps (state)
        this.highlights.delete(id);
        this.data.delete(id);

        // ✅ Remove from repository (persistence)
        this.repository.remove(id);

        this.logger.info('Highlight removed completely', { id });
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

    async restore(url: string): Promise<void> {
        // Sprint mode: No restoration (ephemeral)
        this.logger.debug('Sprint mode: No highlights to restore');
    }
}
