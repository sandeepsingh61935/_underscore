/**
 * @file simple-highlight-commands.ts
 * @description Simplified commands for Custom Highlight API
 * 
 * These commands work with both HighlightManager (Custom API) and HighlightRenderer (legacy)
 */

import type { Command } from '@/shared/patterns/command';
import type { Highlight, HighlightStore } from '@/content/highlight-store';
import type { HighlightRenderer } from '@/content/highlight-renderer';
import type { HighlightManager, HighlightData } from '@/content/highlight-manager';
import { StorageService } from '@/shared/services/storage-service';
import { deserializeRange, serializeRange, type SerializedRange } from '@/shared/utils/range-serializer';

import { getHighlightName, injectHighlightCSS } from '@/content/styles/highlight-styles';

/**
 * Create highlight command - works with both APIs
 * FIXED: Stores serialized range so redo works even after selection is lost
 */
export class CreateHighlightCommand implements Command {
    private highlightData: HighlightData | Highlight | null = null;
    private readonly type = 'underscore';  // Single mode only
    private serializedRange: SerializedRange | null = null;

    constructor(
        private selection: Selection,
        private color: string,

        private manager: HighlightManager | HighlightRenderer,
        private store: HighlightStore,
        private storage: StorageService
    ) {
        // CRITICAL: Store serialized range for redo
        if (selection.rangeCount > 0) {
            this.serializedRange = serializeRange(selection.getRangeAt(0));
        }
    }

    async execute(): Promise<void> {
        // First execution - use selection
        if (!this.highlightData) {
            this.highlightData = this.manager.createHighlight(
                this.selection,
                this.color,
                this.type
            );

            if (!this.highlightData) {
                throw new Error('Failed to create highlight');
            }

            // CRITICAL: Store with liveRange for click detection!
            this.store.addFromData({
                ...this.highlightData,
                liveRange: this.highlightData.liveRange  // Ensure liveRange is included
            });

            // Save to storage
            await this.storage.saveEvent({
                type: 'highlight.created',
                timestamp: Date.now(),
                eventId: crypto.randomUUID(),
                data: this.highlightData as any
            });
        } else {
            // REDO: Recreate visual highlight with SAME ID
            if (!this.serializedRange) {
                console.warn('[Redo] No serialized range - skipping redo');
                return;
            }

            const range = deserializeRange(this.serializedRange);
            if (!range) {
                console.warn('[Redo] Range deserialization failed - text may have changed');
                return;
            }

            // Recreate the visual highlight using manager directly
            const highlightName = getHighlightName(this.type, this.highlightData.id);

            // Inject CSS
            injectHighlightCSS(this.type, this.highlightData.id, this.color);

            // Create native Highlight
            const nativeHighlight = new Highlight(range);
            CSS.highlights.set(highlightName, nativeHighlight);

            // CRITICAL: Re-add to store with liveRange for click detection!
            this.store.addFromData({
                ...this.highlightData,
                liveRange: range  // CRITICAL for click detection!
            });

            // Save event
            await this.storage.saveEvent({
                type: 'highlight.created',
                timestamp: Date.now(),
                eventId: crypto.randomUUID(),
                data: this.highlightData as any
            });
        }
    }

    async undo(): Promise<void> {
        if (!this.highlightData) return;

        // Remove highlight
        if ('removeHighlight' in this.manager) {
            this.manager.removeHighlight(this.highlightData.id, this.highlightData.type);
        }

        // Remove from store
        this.store.remove(this.highlightData.id);

        // Save removal event
        await this.storage.saveEvent({
            type: 'highlight.removed',
            timestamp: Date.now(),
            eventId: crypto.randomUUID(),
            highlightId: this.highlightData.id
        });
    }
}

/**
 * Remove highlight command
 */
export class RemoveHighlightCommand implements Command {
    private serializedRange: SerializedRange | null = null;

    constructor(
        private highlight: Highlight,
        private manager: HighlightManager | HighlightRenderer,
        private store: HighlightStore,
        private storage: StorageService
    ) {
        // Store range for undo
        if (highlight.liveRange) {
            this.serializedRange = serializeRange(highlight.liveRange);
        }
    }

    async execute(): Promise<void> {
        // Remove
        if ('removeHighlight' in this.manager) {
            this.manager.removeHighlight(this.highlight.id, this.highlight.type);
        }

        this.store.remove(this.highlight.id);

        // Save event
        await this.storage.saveEvent({
            type: 'highlight.removed',
            timestamp: Date.now(),
            eventId: crypto.randomUUID(),
            highlightId: this.highlight.id
        });
    }

    async undo(): Promise<void> {
        if (!this.serializedRange) return;

        // Recreate from serialized range
        const range = deserializeRange(this.serializedRange);
        if (!range) return;

        const selection = window.getSelection();
        if (!selection) return;

        selection.removeAllRanges();
        selection.addRange(range);

        // Recreate highlight
        const highlightData = this.manager.createHighlight(
            selection,
            this.highlight.color,
            this.highlight.type
        );

        if (highlightData) {
            this.store.addFromData(highlightData);

            await this.storage.saveEvent({
                type: 'highlight.created',
                timestamp: Date.now(),
                eventId: crypto.randomUUID(),
                data: highlightData as any
            });
        }

        selection.removeAllRanges();
    }
}

/**
 * Clear selection command
 */
export class ClearSelectionCommand implements Command {
    private serializedHighlights: Array<{
        id: string;
        color: string;
        type: AnnotationType;
        range: SerializedRange | null;
    }> = [];

    constructor(
        private highlights: Highlight[],
        private manager: HighlightManager | HighlightRenderer,
        private store: HighlightStore,
        private storage: StorageService
    ) {
        // Store data for undo
        this.serializedHighlights = highlights.map(hl => ({
            id: hl.id,
            color: hl.color,
            type: hl.type,
            range: hl.liveRange ? serializeRange(hl.liveRange) : null
        }));
    }

    async execute(): Promise<void> {
        for (const hl of this.highlights) {
            if ('removeHighlight' in this.manager) {
                this.manager.removeHighlight(hl.id, hl.type);
            }

            this.store.remove(hl.id);

            await this.storage.saveEvent({
                type: 'highlight.removed',
                timestamp: Date.now(),
                eventId: crypto.randomUUID(),
                highlightId: hl.id
            });
        }
    }

    async undo(): Promise<void> {
        for (const data of this.serializedHighlights) {
            if (!data.range) continue;

            const range = deserializeRange(data.range);
            if (!range) continue;

            const selection = window.getSelection();
            if (!selection) continue;

            selection.removeAllRanges();
            selection.addRange(range);

            const highlightData = this.manager.createHighlight(
                selection,
                data.color,
                data.type
            );

            if (highlightData) {
                this.store.addFromData(highlightData);

                await this.storage.saveEvent({
                    type: 'highlight.created',
                    timestamp: Date.now(),
                    eventId: crypto.randomUUID(),
                    data: highlightData as any
                });
            }

            selection.removeAllRanges();
        }
    }
}

/**
 * Clear all command
 */
export class ClearAllCommand implements Command {
    private serializedHighlights: Array<{
        id: string;
        color: string;
        type: AnnotationType;
        range: SerializedRange | null;
    }> = [];

    constructor(
        private highlights: Highlight[],
        private manager: HighlightManager | HighlightRenderer,
        private store: HighlightStore,
        private storage: StorageService
    ) {
        // Store data for undo
        this.serializedHighlights = highlights.map(hl => ({
            id: hl.id,
            color: hl.color,
            type: hl.type,
            range: hl.liveRange ? serializeRange(hl.liveRange) : null
        }));
    }

    async execute(): Promise<void> {
        for (const hl of this.highlights) {
            if ('removeHighlight' in this.manager) {
                this.manager.removeHighlight(hl.id, hl.type);
            }

            this.store.remove(hl.id);

            await this.storage.saveEvent({
                type: 'highlight.removed',
                timestamp: Date.now(),
                eventId: crypto.randomUUID(),
                highlightId: hl.id
            });
        }
    }

    async undo(): Promise<void> {
        for (const data of this.serializedHighlights) {
            if (!data.range) continue;

            const range = deserializeRange(data.range);
            if (!range) continue;

            const selection = window.getSelection();
            if (!selection) continue;

            selection.removeAllRanges();
            selection.addRange(range);

            const highlightData = this.manager.createHighlight(
                selection,
                data.color,
                data.type
            );

            if (highlightData) {
                this.store.addFromData(highlightData);

                await this.storage.saveEvent({
                    type: 'highlight.created',
                    timestamp: Date.now(),
                    eventId: crypto.randomUUID(),
                    data: highlightData as any
                });
            }

            selection.removeAllRanges();
        }
    }
}
