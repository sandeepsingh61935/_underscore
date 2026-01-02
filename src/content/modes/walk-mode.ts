/**
 * Walk Mode
 *
 * Philosophy: "True Incognito" - Zero persistence, zero trace.
 *
 * Features:
 * - Ephemeral storage (memory only)
 * - Clears on reload/close
 * - No side effects (no storage, no network)
 * 
 * Architectural Compliance:
 * - Implements IBasicMode only (Interface Segregation Principle)
 * - Encapsulates mode-specific logic (Single Responsibility Principle)
 * - No restore() method needed (not IPersistentMode)
 * 
 * @see docs/05-quality-framework/03-architecture-principles.md#interface-segregation
 */

import { BaseHighlightMode } from './base-highlight-mode';
import type { HighlightData } from './highlight-mode.interface';
import type { IBasicMode, ModeCapabilities } from './mode-interfaces';

import { serializeRange } from '@/content/utils/range-converter';
import type { IHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import type { HighlightCreatedEvent, HighlightRemovedEvent } from '@/shared/types/events';
import { generateContentHash } from '@/shared/utils/content-hash';
import type { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';

export class WalkMode extends BaseHighlightMode implements IBasicMode {
    get name(): 'walk' {
        return 'walk' as const;
    }

    constructor(
        repository: IHighlightRepository,
        eventBus: EventBus,
        logger: ILogger // [OK] Injected
    ) {
        super(eventBus, logger, repository);
    }

    readonly capabilities: ModeCapabilities = {
        persistence: 'none',
        undo: false,
        sync: false,
        collections: false,
        tags: false,
        export: false,
        ai: false,
        search: false,
        multiSelector: false,
    };

    /**
     * Creates a new highlight in Walk Mode (ephemeral, memory-only)
     * 
     * @param selection - The browser Selection object containing the text to highlight
     * @param colorRole - The color role to apply (e.g., 'yellow', 'blue', 'green')
     * @returns Promise resolving to the unique highlight ID
     * 
     * @throws {Error} If selection has no ranges
     * @throws {Error} If selected text is empty
     * @throws {Error} If range serialization fails
     * 
     * @remarks
     * - Deduplicates via content hash (returns existing ID if duplicate)
     * - Stores ONLY in memory (no persistence)
     * - Registers with CSS Custom Highlight API
     * - Adds to in-memory repository
     * - Data is lost on page reload/close
     * 
     * @example
     * ```typescript
     * const selection = window.getSelection();
     * const id = await walkMode.createHighlight(selection, 'yellow');
     * console.log('Created ephemeral highlight:', id);
     * ```
     */
    async createHighlight(selection: Selection, colorRole: string): Promise<string> {
        if (selection.rangeCount === 0) {
            throw new Error('No range in selection');
        }

        const range = selection.getRangeAt(0);
        const text = range.toString().trim();

        if (!text) {
            throw new Error('Empty text selection');
        }

        // Deduplication check (In-memory only)
        const contentHash = await generateContentHash(text);
        // Logic note: BaseHighlightMode's repo is the InMemory one.
        // In Walk Mode, we trust the repo is empty on start and not persisted.
        const existing = await this.repository.findByContentHash(contentHash);

        if (existing && existing.id) {
            this.logger.info('Duplicate content detected (Walk Mode)', {
                existingId: existing.id,
            });
            return existing.id;
        }

        const id = this.generateId();
        const serializedRange = serializeRange(range);

        if (!serializedRange) {
            throw new Error('Failed to serialize range');
        }

        const data: HighlightData = {
            id,
            text,
            contentHash,
            colorRole,
            type: 'underscore',
            ranges: [serializedRange],
            liveRanges: [range],
            createdAt: new Date(),
        };

        // FIXED: renderAndRegister() handles CSS.highlights registration
        // Removed duplicate: CSS.highlights.set(id, highlight)
        // Removed duplicate: this.highlights.set(id, highlight)  
        // Removed duplicate: this.data.set(id, data)

        // 1. Render and register with CSS Custom Highlight API
        await this.renderAndRegister(data);

        // 2. Add to Repository (Memory Only)
        // In Walk Mode, 'repository' is purely ephemeral.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await this.repository.add(data as any);

        this.logger.info('Created highlight in Walk Mode', { id });

        return id;
    }

    /**
     * Creates a highlight from existing HighlightData (internal use)
     * 
     * @param data - Complete HighlightData object
     * @returns Promise that resolves when highlight is rendered
     * 
     * @remarks
     * Used internally for undo/redo operations
     * Does NOT persist data (Walk Mode is ephemeral)
     */
    async createFromData(data: HighlightData): Promise<void> {
        await this.renderAndRegister(data);
    }

    /**
     * Updates an existing highlight's properties
     * 
     * @param id - The highlight ID to update
     * @param updates - Partial HighlightData with fields to update
     * @returns Promise that resolves when update is complete
     * 
     * @remarks
     * - Updates in-memory data only (no persistence)
     * - If colorRole changes, re-injects CSS
     * - Updates repository (memory-only)
     * - Silently returns if highlight doesn't exist
     * 
     * @example
     * ```typescript
     * await walkMode.updateHighlight('abc123', { colorRole: 'blue' });
     * ```
     */
    async updateHighlight(id: string, updates: Partial<HighlightData>): Promise<void> {
        const existing = this.data.get(id);
        if (!existing) return;

        const updated = { ...existing, ...updates };
        this.data.set(id, updated);


        // Update repo (Memory Only)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await this.repository.update(id, updates as any);

        if (updates.colorRole) {
            const { injectHighlightCSS } = await import('@/content/styles/highlight-styles');
            injectHighlightCSS(updated.type, id, updates.colorRole);
        }
    }

    /**
     * Removes a highlight from Walk Mode (ephemeral deletion)
     * 
     * @param id - The highlight ID to remove
     * @returns Promise that resolves when removal is complete
     * 
     * @remarks
     * Cleanup steps:
     * 1. Remove from CSS Custom Highlight API
     * 2. Remove prefixed highlight name variant
     * 3. Clear from internal maps (highlights, data)
     * 4. Remove from in-memory repository
     * 
     * No persistence cleanup needed (Walk Mode doesn't persist)
     * 
     * @example
     * ```typescript
     * await walkMode.removeHighlight('abc123');
     * ```
     */
    override async removeHighlight(id: string): Promise<void> {
        // FIXED: Only prefixed key needed after removing double-registration
        const { getHighlightName } = await import('@/content/styles/highlight-styles');
        const highlightName = getHighlightName('underscore', id);
        if (CSS.highlights.has(highlightName)) CSS.highlights.delete(highlightName);

        // Internal map cleanup
        this.highlights.delete(id);
        this.data.delete(id);

        // Repo cleanup
        await this.repository.remove(id);

        this.logger.info('Removed highlight (Walk Mode)', { id });
    }

    /**
     * Clears ALL highlights from Walk Mode
     * 
     * @returns Promise that resolves when all highlights are cleared
     * 
     * @remarks
     * Complete cleanup:
     * - Clears CSS.highlights (all DOM highlights)
     * - Clears internal highlight maps
     * - Clears internal data maps
     * - Clears in-memory repository
     * 
     * This is a destructive operation with no undo (ephemeral mode)
     * 
     * @example
     * ```typescript
     * await walkMode.clearAll();
     * console.log('All ephemeral highlights cleared');
     * ```
     */
    async clearAll(): Promise<void> {
        CSS.highlights.clear();
        this.highlights.clear();
        this.data.clear();
        await this.repository.clear();
        this.logger.info('Cleared all highlights (Walk Mode)');
    }

    /**
     * Event Handler: Highlight Created
     * Walk Mode: NO-OP (no persistence)
     */
    override async onHighlightCreated(_event: HighlightCreatedEvent): Promise<void> {
        this.logger.debug('Walk Mode: Highlight created (ephemeral, no persistence)');
        // NO-OP - Walk Mode doesn't persist
    }

    /**
     * Event Handler: Highlight Removed
     * Walk Mode: NO-OP (no persistence)
     */
    override async onHighlightRemoved(_event: HighlightRemovedEvent): Promise<void> {
        this.logger.debug('Walk Mode: Highlight removed (ephemeral)');
        // NO-OP - Walk Mode doesn't persist
    }

    /**
     * Restoration Control
     * Walk Mode: Never restores (ephemeral by design)
     */
    override shouldRestore(): boolean {
        return false;
    }

    /**
     * Deletion Configuration
     * Walk Mode: Simple, no confirmation (ephemeral)
     */
    override getDeletionConfig(): import('./highlight-mode.interface').DeletionConfig {
        return {
            showDeleteIcon: true,
            requireConfirmation: false,  // Ephemeral, no need to confirm
            allowUndo: true,
            iconType: 'remove'  // Less aggressive icon for ephemeral mode
        };
    }
}
