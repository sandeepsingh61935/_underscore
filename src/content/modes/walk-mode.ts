/**
 * Walk Mode
 *
 * Philosophy: "True Incognito" - Zero persistence, zero trace.
 *
 * Features:
 * - Ephemeral storage (memory only)
 * - Clears on reload/close
 * - No side effects (no storage, no network)
 */

import { BaseHighlightMode } from './base-highlight-mode';
import type { HighlightData } from './highlight-mode.interface';

import { serializeRange } from '@/content/utils/range-converter';
import { generateContentHash } from '@/shared/utils/content-hash';

export class WalkMode extends BaseHighlightMode {
    get name(): 'walk' {
        return 'walk' as const;
    }

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

        if (existing) {
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

        // 1. Register with Custom Highlight API (DOM)
        const highlight = new Highlight(range);
        CSS.highlights.set(id, highlight);

        // 2. Add to internal maps
        this.highlights.set(id, highlight);
        this.data.set(id, data);

        // 3. Render
        await this.renderAndRegister(data);

        // 4. Add to Repository (Memory Only)
        // In Walk Mode, 'repository' is purely ephemeral.
        await this.repository.add(data as any);

        this.logger.info('Created highlight in Walk Mode', { id });

        return id;
    }

    async createFromData(data: HighlightData): Promise<void> {
        await this.renderAndRegister(data);
    }

    async updateHighlight(id: string, updates: Partial<HighlightData>): Promise<void> {
        const existing = this.data.get(id);
        if (!existing) return;

        const updated = { ...existing, ...updates };
        this.data.set(id, updated);

        // Update repo (Memory Only)
        await this.repository.update(id, updates as any);

        if (updates.colorRole) {
            const { injectHighlightCSS } = await import('@/content/styles/highlight-styles');
            injectHighlightCSS(updated.type, id, updates.colorRole);
        }
    }

    override async removeHighlight(id: string): Promise<void> {
        // DOM cleanup
        if (CSS.highlights.has(id)) CSS.highlights.delete(id);

        // Prefixed ID cleanup
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

    async clearAll(): Promise<void> {
        CSS.highlights.clear();
        this.highlights.clear();
        this.data.clear();
        await this.repository.clear();
        this.logger.info('Cleared all highlights (Walk Mode)');
    }

    async restore(): Promise<void> {
        // NO-OP for Walk Mode
        this.logger.info('Walk Mode: No restoration');
    }
}
