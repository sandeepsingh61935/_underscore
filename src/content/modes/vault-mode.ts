/**
 * Vault Mode
 *
 * Philosophy: "Permanent & Reliable" - Store forever, recover from anything.
 *
 * Features:
 * - Permanent storage (IndexedDB)
 * - Robust 3-Tier Re-anchoring (XPath -> Position -> Fuzzy)
 * - Server Sync (Future)
 * - Collections & Tags
 * 
 * Architectural Compliance:
 * - Implements IPersistentMode
 * - Uses VaultModeService Facade for complex persistence logic
 */

import { BaseHighlightMode } from './base-highlight-mode';
import type { HighlightData } from './highlight-mode.interface';
import type { IPersistentMode, ModeCapabilities } from './mode-interfaces';

import { serializeRange } from '@/content/utils/range-converter';
import { getVaultModeService } from '@/services/vault-mode-service';
import { generateContentHash } from '@/shared/utils/content-hash';

import type { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';
import type { IHighlightRepository } from '@/shared/repositories/i-highlight-repository';

export class VaultMode extends BaseHighlightMode implements IPersistentMode {
    private vaultService = getVaultModeService();

    get name(): 'vault' {
        return 'vault' as const;
    }

    constructor(
        repository: IHighlightRepository,
        eventBus: EventBus,
        logger: ILogger
    ) {
        super(eventBus, logger, repository);
    }

    override async onActivate(): Promise<void> {
        await super.onActivate();
        await this.restore();
    }

    readonly capabilities: ModeCapabilities = {
        persistence: 'indexeddb',
        undo: true,
        sync: true,
        collections: true,
        tags: true,
        export: true,
        ai: false,
        search: true,
        multiSelector: true,
    };

    override shouldRestore(): boolean {
        return true;
    }

    /**
     * Create highlight from existing data (e.g., Undo/Restore)
     */
    async createFromData(data: HighlightData): Promise<void> {
        // 1. Ensure live ranges exist
        if (!data.liveRanges || data.liveRanges.length === 0) {
            this.logger.warn('[VAULT] createFromData called without live ranges', data.id);
            return;
        }

        // 2. Persist 
        // Note: For Undo, we might want to "restore" deleted record vs create new.
        // But createFromData treats it as "put this back".
        // Use saveToStorage to handle metadata/selectors if present? 
        // Or re-generate selectors? Re-generating is safer for "current" DOM.

        // If data has ranges but no selectors, we might need range to gen selectors.
        const range = data.liveRanges[0]!;

        // Use saveHighlight to ensure persistence + selectors
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await this.vaultService.saveHighlight(data as any, range);

        // 3. Render
        const highlight = new Highlight(...data.liveRanges);
        CSS.highlights.set(data.id, highlight);
        this.highlights.set(data.id, highlight);
        this.data.set(data.id, data);

        // 4. Update Repository (Idempotent check)
        const alreadyExists = await this.repository.findById(data.id);
        if (!alreadyExists) {
            await this.repository.add(data as any);
        } else {
            this.logger.debug('[VAULT] Skipping duplicate repo add during create', { id: data.id });
        }
    }

    async updateHighlight(id: string, updates: Partial<HighlightData>): Promise<void> {
        // VaultModeService doesn't have partial update yet, but we can implement it or overwrite.
        // For now, get existing -> merge -> save.

        const existing = this.data.get(id);
        if (!existing) {
            this.logger.warn('[VAULT] Cannot update non-existent highlight', id);
            return;
        }

        const updated = { ...existing, ...updates };

        // Update runtime
        this.data.set(id, updated);
        await this.repository.add(updated as any); // Updates existing in repo (add mimics addFromData/upsert if logic supports it, otherwise update)
        // Correction: Repository Pattern typically separates add vs update. InMemory implementation 'add' usually overwrites or throws.
        // If 'add' throws on duplicate, we should use 'update'.
        // However, standard IRepository 'add' is often idempotent upsert in simple implementations, or strict.
        // Looking at InMemoryHighlightRepository behavior (impl inferred): Map.set(id, item) -> Upsert.
        // If specific update method exists on interface, use it.
        await this.repository.update(id, updates as any);

        // Update storage
        // Assuming ranges didn't change, we use the first live range
        const range = existing.liveRanges && existing.liveRanges[0];
        if (range) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await this.vaultService.saveHighlight(updated as any, range);
        }
    }

    override async clearAll(): Promise<void> {
        await this.vaultService.clearAll();

        for (const id of this.highlights.keys()) {
            CSS.highlights.delete(id);
        }
        this.highlights.clear();
        this.data.clear();
        await this.repository.clear(); // If facade supports it
    }

    // IPersistentMode methods

    async saveToStorage(highlight: HighlightData): Promise<void> {
        if (!highlight.liveRanges || !highlight.liveRanges.length) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await this.vaultService.saveHighlight(highlight as any, highlight.liveRanges[0]!);
    }

    async loadFromStorage(_url: string): Promise<HighlightData[]> {
        const restored = await this.vaultService.restoreHighlightsForUrl();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return restored.map(r => ({ ...r.highlight, liveRanges: r.range ? [r.range] : [] }) as any as HighlightData);
    }

    /**
     * Create a highlight in Vault Mode
     * 
     * 1. Check for duplicates
     * 2. Persist to IndexedDB (via VaultModeService) with robust selectors
     * 3. Update Runtime State (CSS.highlights, Repository)
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

        // Deduplication
        const contentHash = await generateContentHash(text);
        const existing = await this.repository.findByContentHash(contentHash);
        if (existing && existing.id) {
            this.logger.info('[VAULT] Duplicate content detected', { existingId: existing.id });
            return existing.id;
        }

        const id = this.generateId();
        const serializedRange = serializeRange(range);
        if (!serializedRange) throw new Error('Failed to serialize range');

        const data: HighlightData = {
            id,
            text,
            contentHash,
            colorRole: colorRole || 'yellow', // Default color if missing
            type: 'underscore',
            ranges: [serializedRange],
            liveRanges: [range],
            createdAt: new Date(),
        };

        if (!data.liveRanges || !data.liveRanges.length) {
            throw new Error('Cannot create highlight without live ranges');
        }
        const liveRange = data.liveRanges[0]!;

        // 1. Persist to Vault Storage (IndexedDB + Selectors)
        // This handles the "Heavy Lifting" of creating selectors and saving to DB
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await this.vaultService.saveHighlight(data as any, liveRange);

        // 2. Update Runtime API (CSS Highlights)
        const highlight = new Highlight(range);
        CSS.highlights.set(id, highlight);

        // 3. Update Internal State
        this.highlights.set(id, highlight);
        this.data.set(id, data);

        // 4. Update In-Memory Repository (for UI consistency)
        await this.repository.add(data as any);

        return id;
    }

    override async removeHighlight(id: string): Promise<void> {
        // 1. Remove from Storage
        await this.vaultService.deleteHighlight(id);

        // 2. Remove from Runtime
        const highlight = this.highlights.get(id);

        if (highlight) {
            CSS.highlights.delete(id);
            this.highlights.delete(id);
        }
        this.data.delete(id);
        await this.repository.remove(id);
    }

    async restore(_url?: string): Promise<void> {
        // Use VaultModeService to restore from IndexedDB
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const restored = await this.vaultService.restoreHighlightsForUrl();

        this.logger.info(`[VAULT] Restoring ${restored.length} highlights`);

        for (const item of restored) {
            const { highlight: storedData, range } = item;

            if (range) {
                // Register in Runtime
                const hl = new Highlight(range);
                CSS.highlights.set(storedData.id, hl);
                this.highlights.set(storedData.id, hl);

                // Construct full HighlightData with live ranges
                // We cast storedData because it is V2 (persisted) and we need runtime HighlightData
                const fullData = {
                    ...storedData,
                    liveRanges: [range]
                } as unknown as HighlightData;

                this.data.set(storedData.id, fullData);

                // Sync to Repository (Idempotent check)
                const exists = await this.repository.findById(storedData.id);
                if (!exists) {
                    await this.repository.add(fullData as any);
                } else {
                    this.logger.debug('[VAULT] Skipping duplicate restore', { id: storedData.id });
                }
            }
        }
    }

    async sync(): Promise<void> {
        await this.vaultService.syncToServer();
    }
}
