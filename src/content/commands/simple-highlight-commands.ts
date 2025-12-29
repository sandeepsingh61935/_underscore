/**
 * @file simple-highlight-commands.ts
 * @description Simplified commands for Custom Highlight API
 * 
 * These commands work with both HighlightManager (Custom API) and HighlightRenderer (legacy)
 */

import type { Command } from '@/shared/patterns/command';
import type { RepositoryFacade } from '@/shared/repositories';
import type { HighlightRenderer } from '@/content/highlight-renderer';
import type { HighlightManager, HighlightData } from '@/content/highlight-manager';
import type { ModeManager } from '@/content/modes';
import type { HighlightData as ModeHighlightData } from '@/content/modes/highlight-mode.interface';
import { StorageService } from '@/shared/services/storage-service';
import { deserializeRange, serializeRange } from '@/content/utils/range-converter';
import type { SerializedRange } from '@/shared/schemas/highlight-schema';
import { getHighlightName, injectHighlightCSS } from '@/content/styles/highlight-styles';

/**
 * Create highlight command - works with both APIs
 * FIXED: Stores serialized range so redo works even after selection is lost
 */
export class CreateHighlightCommand implements Command {
    private highlightData: ModeHighlightData | HighlightData | Highlight | null = null;
    private readonly type = 'underscore';  // Single mode only
    private serializedRange: SerializedRange | null = null;
    // Removed unused highlightId field

    constructor(
        private selection: Selection,
        private colorRole: string,  // Color role (yellow, blue, etc.)
        private manager: ModeManager | HighlightManager | HighlightRenderer,  // Accept all types
        private repositoryFacade: RepositoryFacade,
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
                const id = await (this.manager as ModeManager).createHighlight(this.selection, this.colorRole);
                this.highlightData = (this.manager as ModeManager).getHighlight(id);
            } else {
                // Legacy path
                this.highlightData = (this.manager as any).createHighlight(
                    this.selection,
                    this.colorRole,
                    this.type
                );
            }

            if (!this.highlightData) {
                throw new Error('Failed to create highlight');
            }

            // CRITICAL: Store with liveRanges for click detection!
            this.repositoryFacade.addFromData(this.highlightData as any);

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
                // Type cast for property access
                const data = this.highlightData as any;

                // Generate contentHash
                const text = range.toString();
                const { generateContentHash } = await import('@/shared/utils/content-hash');
                const contentHash = await generateContentHash(text);

                // ✅ Use mode's unified path (fixes registration!)
                await (this.manager as ModeManager).createFromData({
                    id: data.id,
                    text: data.text,
                    contentHash,
                    colorRole: this.colorRole,
                    type: 'underscore' as const,
                    ranges: [this.serializedRange],
                    liveRanges: [range],
                    createdAt: new Date()
                });
            } else {
                // Legacy path
                const data = this.highlightData as any;
                const highlightName = getHighlightName(this.type, data.id);
                const nativeHighlight = new Highlight(range);
                CSS.highlights.set(highlightName, nativeHighlight);
            }

            // CRITICAL: Re-add to store with liveRanges for click detection!
            this.repositoryFacade.addFromData({
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

        // Type assertion for accessing id
        const data = this.highlightData as any;

        // Remove highlight
        if ('removeHighlight' in this.manager) {
            this.manager.removeHighlight(data.id);
        }

        // Remove from store
        this.repositoryFacade.remove(data.id);

        // Save removal event
        await this.storage.saveEvent({
            type: 'highlight.removed',
            timestamp: Date.now(),
            eventId: crypto.randomUUID(),
            highlightId: data.id
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
        private repositoryFacade: RepositoryFacade,
        private storage: StorageService
    ) {
        // Store ALL ranges for undo (multi-range support!)
        const h = highlight as any;
        const liveRanges = h.liveRanges || [];
        this.serializedRanges = liveRanges.map((r: Range) => serializeRange(r));
    }

    async execute(): Promise<void> {
        const h = this.highlight as any;

        // Remove
        if ('removeHighlight' in this.manager) {
            this.manager.removeHighlight(h.id);
        }

        this.repositoryFacade.remove(h.id);

        // Save event
        await this.storage.saveEvent({
            type: 'highlight.removed',
            timestamp: Date.now(),
            eventId: crypto.randomUUID(),
            highlightId: h.id
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
            // Type cast for property access
            const h = this.highlight as any;

            // Generate contentHash
            const text = liveRanges.map(r => r.toString()).join('');
            const { generateContentHash } = await import('@/shared/utils/content-hash');
            const contentHash = await generateContentHash(text);

            // ✅ Use mode's unified path (fixes registration!)
            await (this.manager as ModeManager).createFromData({
                id: h.id,
                text: h.text,
                contentHash,
                colorRole: h.color || 'yellow',
                type: 'underscore' as const,
                ranges: this.serializedRanges,
                liveRanges: liveRanges,
                createdAt: new Date()
            });
        } else {
            // Legacy path
            const h = this.highlight as any;
            const highlightName = getHighlightName(h.type, h.id);
            injectHighlightCSS(h.type, h.id, h.color);
            const nativeHighlight = new Highlight(...liveRanges);
            CSS.highlights.set(highlightName, nativeHighlight);
        }

        // Re-add to store with ORIGINAL data + liveRanges for click detection!
        this.repositoryFacade.addFromData({
            ...this.highlight,
            ranges: this.serializedRanges,
            liveRanges: liveRanges  // CRITICAL for click detection!
        });

        // Save event
        const h = this.highlight as any;
        await this.storage.saveEvent({
            type: 'highlight.created',
            timestamp: Date.now(),
            eventId: crypto.randomUUID(),
            data: h
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
        type: string;  // Changed from AnnotationType
        range: SerializedRange | null;
    }> = [];

    constructor(
        private highlights: Highlight[],
        private manager: HighlightManager | HighlightRenderer,
        private repositoryFacade: RepositoryFacade,
        private storage: StorageService
    ) {
        // Store data for undo
        this.serializedHighlights = highlights.map(hl => {
            const h = hl as any;  // Type cast for property access
            return {
                id: h.id,
                color: h.color,
                type: h.type,
                range: h.liveRange ? serializeRange(h.liveRange) : null
            };
        });
    }

    async execute(): Promise<void> {
        for (const hl of this.highlights) {
            const h = hl as any;  // Type cast for property access

            if ('removeHighlight' in this.manager) {
                this.manager.removeHighlight(h.id);
            }

            this.repositoryFacade.remove(h.id);

            await this.storage.saveEvent({
                type: 'highlight.removed',
                timestamp: Date.now(),
                eventId: crypto.randomUUID(),
                highlightId: h.id
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
                'underscore' as const
            );

            if (highlightData) {
                this.repositoryFacade.addFromData(highlightData);

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
        type: string;  // Changed from AnnotationType
        range: SerializedRange | null;
    }> = [];

    constructor(
        private highlights: Highlight[],
        private manager: HighlightManager | HighlightRenderer,
        private repositoryFacade: RepositoryFacade,
        private storage: StorageService
    ) {
        // Store data for undo
        this.serializedHighlights = highlights.map(hl => {
            const h = hl as any;  // Type cast for property access
            return {
                id: h.id,
                color: h.color,
                type: h.type,
                range: h.liveRange ? serializeRange(h.liveRange) : null
            };
        });
    }

    async execute(): Promise<void> {
        for (const hl of this.highlights) {
            const h = hl as any;  // Type cast for property access

            if ('removeHighlight' in this.manager) {
                this.manager.removeHighlight(h.id);
            }

            this.repositoryFacade.remove(h.id);

            await this.storage.saveEvent({
                type: 'highlight.removed',
                timestamp: Date.now(),
                eventId: crypto.randomUUID(),
                highlightId: h.id
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
                'underscore' as const
            );

            if (highlightData) {
                this.repositoryFacade.addFromData(highlightData);

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
