/**
 * @file highlight-commands.ts
 * @description Command implementations for highlight operations with undo/redo
 */

import type { Command } from '@/shared/patterns/command';
import type { Highlight, HighlightStore } from '@/content/highlight-store';
import type { HighlightRenderer, HighlightWithRange } from '@/content/highlight-renderer';
import { StorageService } from '@/shared/services/storage-service';
import type { AnyHighlightEvent } from '@/shared/types/storage';
import { deserializeRange, type SerializedRange } from '@/shared/utils/range-serializer';

/**
 * Create highlight command
 * Execute: Creates highlight, stores it, saves event
 * Undo: Removes highlight, saves removal event
 * 
 * CRITICAL: Stores SerializedRange so redo can recreate visual highlight
 */
export class CreateHighlightCommand implements Command {
    private serializedRange: SerializedRange;

    constructor(
        private highlight: HighlightWithRange,
        private renderer: HighlightRenderer,
        private store: HighlightStore,
        private storage: StorageService
    ) {
        // Store range for redo
        this.serializedRange = highlight.range;
    }

    async execute(): Promise<void> {
        // Check if this is a redo (element was removed by undo)
        if (!document.contains(this.highlight.element)) {
            // REDO: Recreate visual highlight using stored range
            const range = deserializeRange(this.serializedRange);

            if (range) {
                // Create selection from deserialized range
                const selection = window.getSelection();
                if (selection) {
                    selection.removeAllRanges();
                    selection.addRange(range);

                    // Recreate the highlight visually
                    const newHighlight = this.renderer.createHighlight(selection, this.highlight.color);
                    this.store.add(newHighlight);

                    // Update our reference
                    this.highlight = newHighlight;

                    selection.removeAllRanges();
                }
            } else {
                // Range couldn't be deserialized (content changed)
                // Just add to store - will restore on page reload if possible
                this.store.add(this.highlight);
            }
        } else {
            // Initial execution - element already exists
            this.store.add(this.highlight);
        }

        // Save event for persistence
        const event: AnyHighlightEvent = {
            type: 'highlight.created',
            timestamp: Date.now(),
            eventId: crypto.randomUUID(),
            data: this.highlight
        };

        await this.storage.saveEvent(event);
    }

    async undo(): Promise<void> {
        // Remove from DOM and store
        this.renderer.removeHighlight(this.highlight.id);
        this.store.remove(this.highlight.id);

        // Save removal event
        const event: AnyHighlightEvent = {
            type: 'highlight.removed',
            timestamp: Date.now(),
            eventId: crypto.randomUUID(),
            highlightId: this.highlight.id
        };

        await this.storage.saveEvent(event);
    }
}

/**
 * Remove highlight command
 * Execute: Removes highlight, saves removal event
 * Undo: Recreates highlight visually, saves creation event
 */
export class RemoveHighlightCommand implements Command {
    private serializedRange: SerializedRange;

    constructor(
        private highlight: HighlightWithRange,
        private renderer: HighlightRenderer,
        private store: HighlightStore,
        private storage: StorageService
    ) {
        // Store range for undo
        this.serializedRange = highlight.range;
    }

    async execute(): Promise<void> {
        // Remove
        this.renderer.removeHighlight(this.highlight.id);
        this.store.remove(this.highlight.id);

        // Save event
        const event: AnyHighlightEvent = {
            type: 'highlight.removed',
            timestamp: Date.now(),
            eventId: crypto.randomUUID(),
            highlightId: this.highlight.id
        };

        await this.storage.saveEvent(event);
    }

    async undo(): Promise<void> {
        // Recreate visual highlight using stored range
        const range = deserializeRange(this.serializedRange);

        if (range) {
            const selection = window.getSelection();
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(range);

                // Recreate the highlight visually
                const newHighlight = this.renderer.createHighlight(selection, this.highlight.color);
                this.store.add(newHighlight);

                // Update our reference
                this.highlight = newHighlight;

                selection.removeAllRanges();
            }
        } else {
            // Fallback - just add to store
            this.store.add(this.highlight);
        }

        // Save creation event
        const event: AnyHighlightEvent = {
            type: 'highlight.created',
            timestamp: Date.now(),
            eventId: crypto.randomUUID(),
            data: this.highlight
        };

        await this.storage.saveEvent(event);
    }
}

/**
 * Clear all highlights command
 * Execute: Removes all highlights, clears storage
 * Undo: Recreates all highlights
 */
export class ClearAllCommand implements Command {
    private highlights: HighlightWithRange[];

    constructor(
        highlightsSnapshot: HighlightWithRange[],
        private renderer: HighlightRenderer,
        private store: HighlightStore,
        private storage: StorageService
    ) {
        // Snapshot current state for undo
        this.highlights = [...highlightsSnapshot];
    }

    async execute(): Promise<void> {
        // Remove all from DOM and store
        this.renderer.clearAll();
        this.store.clear();

        // Clear storage
        await this.storage.clear();
    }

    async undo(): Promise<void> {
        // Recreate all highlights
        for (const highlight of this.highlights) {
            this.store.add(highlight);

            const event: AnyHighlightEvent = {
                type: 'highlight.created',
                timestamp: Date.now(),
                eventId: crypto.randomUUID(),
                data: highlight
            };

            await this.storage.saveEvent(event);
        }
    }
}

/**
 * Clear selection command
 * Execute: Removes highlights in selection
 * Undo: Recreates highlights in selection
 */
export class ClearSelectionCommand implements Command {
    constructor(
        private highlightsInSelection: HighlightWithRange[],
        private renderer: HighlightRenderer,
        private store: HighlightStore,
        private storage: StorageService
    ) { }

    async execute(): Promise<void> {
        for (const highlight of this.highlightsInSelection) {
            this.renderer.removeHighlight(highlight.id);
            this.store.remove(highlight.id);

            const event: AnyHighlightEvent = {
                type: 'highlight.removed',
                timestamp: Date.now(),
                eventId: crypto.randomUUID(),
                highlightId: highlight.id
            };

            await this.storage.saveEvent(event);
        }
    }

    async undo(): Promise<void> {
        for (const highlight of this.highlightsInSelection) {
            this.store.add(highlight);

            const event: AnyHighlightEvent = {
                type: 'highlight.created',
                timestamp: Date.now(),
                eventId: crypto.randomUUID(),
                data: highlight
            };

            await this.storage.saveEvent(event);
        }
    }
}
