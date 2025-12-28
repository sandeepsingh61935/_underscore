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
import type { ModeManager } from '@/content/modes';
import type { HighlightData as ModeHighlightData } from '@/content/modes/highlight-mode.interface';
import { StorageService } from '@/shared/services/storage-service';
import { deserializeRange, serializeRange, type SerializedRange } from '@/shared/utils/range-serializer';
import { getHighlightName, injectHighlightCSS } from '@/content/styles/highlight-styles';

/**
 * Create highlight command - works with both APIs
 * FIXED: Stores serialized range so redo works even after selection is lost
 */
export class CreateHighlightCommand implements Command {
    private highlightData: ModeHighlightData | HighlightData | Highlight | null = null;
    private readonly type = 'underscore';  // Single mode only
    private serializedRange: SerializedRange | null = null;
    private highlightId: string | null = null;

    constructor(
        private selection: Selection,
        private colorRole: string,  // ✅ Semantic token
        private manager: ModeManager | HighlightManager | HighlightRenderer,  // Accept all types
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
            // Check if manager is ModeManager
            if ('createHighlight' in this.manager && 'getCurrentMode' in this.manager) {
                // ModeManager path - use unified creation
                const id = await (this.manager as ModeManager).createHighlight(this.selection, this.color);
                this.highlightId = id;
                this.highlightData = (this.manager as ModeManager).getHighlight(id);
            } else {
                // Legacy path
                this.highlightData = (this.manager as any).createHighlight(
                    this.selection,
                    this.color,
                    this.type
                );
            }

            if (!this.highlightData) {
                throw new Error('Failed to create highlight');
            }

            // CRITICAL: Store with liveRanges for click detection!
            this.store.addFromData({
                ...this.highlightData,
                liveRanges: this.highlightData.liveRanges  // Ensure liveRanges are included
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

            // Check if manager is ModeManager
            if ('createFromData' in this.manager) {
                // ✅ Use mode's unified path (fixes registration!)
                await (this.manager as ModeManager).createFromData({
                    id: this.highlightData.id,
                    text: this.highlightData.text,
                    color: this.color,
                    type: 'underscore',
                    ranges: [this.serializedRange],
                    liveRanges: [range],
                    createdAt: new Date()
                });
            } else {
                // Legacy path
                const highlightName = getHighlightName(this.type, this.highlightData.id);
                const nativeHighlight = new Highlight(range);
                CSS.highlights.set(highlightName, nativeHighlight);
            }

            // CRITICAL: Re-add to store with liveRanges for click detection!
            this.store.addFromData({
                ...this.highlightData,
                liveRanges: [range]  // CRITICAL for click detection!
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
    private serializedRanges: SerializedRange[] = [];

    constructor(
        private highlight: Highlight,
        private manager: ModeManager | HighlightManager | HighlightRenderer,  // Accept all types
        private store: HighlightStore,
        private storage: StorageService
    ) {
        // Store ALL ranges for undo (multi-range support!)
        const liveRanges = highlight.liveRanges || [];
        this.serializedRanges = liveRanges.map(r => serializeRange(r));
    }

    async execute(): Promise<void> {
        // Remove
        if ('removeHighlight' in this.manager) {
            this.manager.removeHighlight(this.highlight.id);
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
        if (this.serializedRanges.length === 0) return;

        // Recreate ALL ranges from serialized data
        const liveRanges: Range[] = [];
        for (const sr of this.serializedRanges) {
            const range = deserializeRange(sr);
            if (range) {
                liveRanges.push(range);
            }
        }

        if (liveRanges.length === 0) return;

        // Check if manager is ModeManager
        if ('createFromData' in this.manager) {
            // ✅ Use mode's unified path (fixes registration!)
            await (this.manager as ModeManager).createFromData({
                id: this.highlight.id,
                text: this.highlight.text,
                color: this.highlight.color,
                type: 'underscore',
                ranges: this.serializedRanges,
                liveRanges: liveRanges,
                createdAt: new Date()
            });
        } else {
            // Legacy path
            const highlightName = getHighlightName(this.highlight.type, this.highlight.id);
            injectHighlightCSS(this.highlight.type, this.highlight.id, this.highlight.color);
            const nativeHighlight = new Highlight(...liveRanges);
            CSS.highlights.set(highlightName, nativeHighlight);
        }

        // Re-add to store with ORIGINAL data + liveRanges for click detection!
        this.store.addFromData({
            ...this.highlight,
            ranges: this.serializedRanges,
            liveRanges: liveRanges  // CRITICAL for click detection!
        });

        // Save event
        await this.storage.saveEvent({
            type: 'highlight.created',
            timestamp: Date.now(),
            eventId: crypto.randomUUID(),
            highlightId: this.highlight.id
        });
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
