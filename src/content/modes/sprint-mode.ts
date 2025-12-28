/**
 * Sprint Mode
 * 
 * Ephemeral highlighting - no persistence
 * Highlights cleared on page reload
 */

import { BaseHighlightMode } from './base-highlight-mode';
import { serializeRange } from '@/shared/utils/range-serializer';
import { EventName } from '@/shared/types/events';
import type { HighlightData } from './highlight-mode.interface';

export class SprintMode extends BaseHighlightMode {
    get name() { return 'sprint' as const; }

    async createHighlight(selection: Selection, color: string): Promise<string> {
        if (selection.rangeCount === 0) {
            throw new Error('No range in selection');
        }

        const range = selection.getRangeAt(0);
        const text = range.toString().trim();

        if (!text) {
            throw new Error('Empty text selection');
        }

        const id = this.generateId();
        const serializedRange = serializeRange(range);

        if (!serializedRange) {
            throw new Error('Failed to serialize range');
        }

        const data: HighlightData = {
            id,
            text,
            color,
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
                color: data.color
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
                color: data.color
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

        // Re-inject CSS if color changed
        if (updates.color) {
            const { injectHighlightCSS } = await import('@/content/styles/highlight-styles');
            injectHighlightCSS(updated.type, id, updates.color);
        }
    }

    async restore(url: string): Promise<void> {
        // Sprint mode: No restoration (ephemeral)
        this.logger.debug('Sprint mode: No highlights to restore');
    }
}
