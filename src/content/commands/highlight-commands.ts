/**
 * @file highlight-commands.ts
 * @description Command implementations for highlight operations with undo/redo
 */

import type { Command } from '@/shared/patterns/command';
import type { RepositoryFacade } from '@/shared/repositories';
import type { HighlightRenderer, HighlightWithRange } from '@/content/highlight-renderer';
import { StorageService } from '@/shared/services/storage-service';
import type { AnyHighlightEvent } from '@/shared/types/storage';
import { deserializeRange } from '@/content/utils/range-converter';
import type { SerializedRange } from '@/shared/schemas/highlight-schema';
import { toStorageFormat } from '@/content/highlight-type-bridge';

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
        private repositoryFacade: RepositoryFacade,
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

                    // Recreate the highlight visually with original type
                    const newHighlight = this.renderer.createHighlight(
                        selection,
                        this.highlight.color,
                        this.highlight.type  // Preserve annotation type!
                    );
                    // Convert to storage format
                    if (newHighlight) {
                        await this.repositoryFacade.add(await toStorageFormat(newHighlight as HighlightWithRange));
                        this.highlight = newHighlight as HighlightWithRange;
                    }

                    selection.removeAllRanges();
                }
            } else {
                // Range couldn't be deserialized (content changed)
                // Just add to store - will restore on page reload if possible
                await this.repositoryFacade.add(await toStorageFormat(this.highlight));
            }
        } else {
            // Initial execution - element already exists
            await this.repositoryFacade.add(await toStorageFormat(this.highlight));
        }

        // Save event for persistence
        const event: AnyHighlightEvent = {
            type: 'highlight.created',
            timestamp: Date.now(),
            eventId: crypto.randomUUID(),
            data: await toStorageFormat(this.highlight as HighlightWithRange)
        };

        await this.storage.saveEvent(event);
    }

    async undo(): Promise<void> {
        // Remove from DOM and store
        this.renderer.removeHighlight(this.highlight.id);
        this.repositoryFacade.remove(this.highlight.id);

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
        private repositoryFacade: RepositoryFacade,
        private storage: StorageService
    ) {
        // Store range for undo
        this.serializedRange = highlight.range;
    }

    async execute(): Promise<void> {
        // Remove
        this.renderer.removeHighlight(this.highlight.id);
        this.repositoryFacade.remove(this.highlight.id);

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
                // Recreate the highlight visually with original type
                const newHighlight = this.renderer.createHighlight(
                    selection,
                    this.highlight.color,
                    this.highlight.type  // Preserve annotation type!
                );
                if (newHighlight) {
                    await this.repositoryFacade.add(await toStorageFormat(newHighlight as HighlightWithRange));

                    // Update our reference
                    this.highlight = newHighlight as HighlightWithRange;
                }

                selection.removeAllRanges();
            }
        } else {
            // Fallback - just add to store
            await this.repositoryFacade.add(await toStorageFormat(this.highlight));
        }

        // Save creation event
        const event: AnyHighlightEvent = {
            type: 'highlight.created',
            timestamp: Date.now(),
            eventId: crypto.randomUUID(),
            data: await toStorageFormat(this.highlight as HighlightWithRange)
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
        private repositoryFacade: RepositoryFacade,
        private storage: StorageService
    ) {
        // Snapshot current state for undo
        this.highlights = [...highlightsSnapshot];
    }

    async execute(): Promise<void> {
        // Remove all from DOM and store
        this.renderer.clearAll();
        this.repositoryFacade.clear();

        // Clear storage
        await this.storage.clear();
    }

    async undo(): Promise<void> {
        // Recreate all highlights
        for (const highlight of this.highlights) {
            await this.repositoryFacade.add(await toStorageFormat(highlight));

            const event: AnyHighlightEvent = {
                type: 'highlight.created',
                timestamp: Date.now(),
                eventId: crypto.randomUUID(),
                data: await toStorageFormat(highlight)
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
        private repositoryFacade: RepositoryFacade,
        private storage: StorageService
    ) { }

    async execute(): Promise<void> {
        for (const highlight of this.highlightsInSelection) {
            this.renderer.removeHighlight(highlight.id);
            this.repositoryFacade.remove(highlight.id);

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
            await this.repositoryFacade.add(await toStorageFormat(highlight));

            const event: AnyHighlightEvent = {
                type: 'highlight.created',
                timestamp: Date.now(),
                eventId: crypto.randomUUID(),
                data: await toStorageFormat(highlight)
            };

            await this.storage.saveEvent(event);
        }
    }
}
