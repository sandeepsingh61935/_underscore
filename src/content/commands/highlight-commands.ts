/**
 * @file highlight-commands.ts
 * @description Command implementations for highlight operations with undo/redo
 */

import type { Command } from '@/shared/patterns/command';
import type { Highlight, HighlightStore } from '@/content/highlight-store';
import type { HighlightRenderer } from '@/content/highlight-renderer';
import { StorageService } from '@/shared/services/storage-service';
import type { AnyHighlightEvent } from '@/shared/types/storage';

/**
 * Create highlight command
 * Execute: Creates highlight, stores it, saves event
 * Undo: Removes highlight, saves removal event
 * 
 * CRITICAL: Stores full highlight data so redo works correctly
 */
export class CreateHighlightCommand implements Command {
    constructor(
        private highlight: Highlight,
        private renderer: HighlightRenderer,
        private store: HighlightStore,
        private storage: StorageService
    ) { }

    async execute(): Promise<void> {
        // Add to store (visual element already exists from initial creation)
        // On REDO: Element was removed by undo, need to recreate visually
        if (!document.contains(this.highlight.element)) {
            // Element was removed - this is a redo
            // We need to recreate the visual highlight, but we lost the Range
            // For now, just add to store - element will be restored on page reload
            // TODO: Store range in command for full redo support
            this.store.add(this.highlight);
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
 * Undo: Recreates highlight, saves creation event
 */
export class RemoveHighlightCommand implements Command {
    constructor(
        private highlight: Highlight,
        private renderer: HighlightRenderer,
        private store: HighlightStore,
        private storage: StorageService
    ) { }

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
        // Recreate - add back to store (renderer recreates on load)
        this.store.add(this.highlight);

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
    private highlights: Highlight[];

    constructor(
        highlightsSnapshot: Highlight[],
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
        private highlightsInSelection: Highlight[],
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
