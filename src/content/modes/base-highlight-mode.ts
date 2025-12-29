/**
 * Base Highlight Mode
 * 
 * Provides common functionality for all modes
 */

import type { EventBus } from '@/shared/utils/event-bus';
import { RepositoryFacade } from '@/shared/repositories';
import type { ILogger } from '@/shared/utils/logger';
import type { IHighlightMode, HighlightData } from './highlight-mode.interface';
import { getHighlightName, injectHighlightCSS, removeHighlightCSS } from '@/content/styles/highlight-styles';

export abstract class BaseHighlightMode implements IHighlightMode {
    // Internal tracking (replaces HighlightManager.highlights)
    protected highlights = new Map<string, Highlight>();
    protected data = new Map<string, HighlightData>();
    protected repository: RepositoryFacade;

    constructor(
        protected readonly eventBus: EventBus,
        protected readonly logger: ILogger,
        repository: RepositoryFacade  // ✅ Dependency Injection - shared instance
    ) {
        this.repository = repository;
    }

    abstract get name(): 'sprint' | 'vault' | 'gen';

    async onActivate(): Promise<void> {
        this.logger.info(`${this.name} mode activated`);
    }

    async onDeactivate(): Promise<void> {
        this.logger.info(`${this.name} mode deactivated`);
        // Clear all highlights
        for (const id of this.highlights.keys()) {
            await this.removeHighlight(id);
        }
    }

    /**
     * CRITICAL: Unified creation method
     * This ensures EVERY highlight goes through same path → always registers!
     */
    protected async renderAndRegister(data: HighlightData): Promise<void> {
        const highlightName = getHighlightName(data.type, data.id);

        // 1. Create native Highlight
        const nativeHighlight = new Highlight(...data.liveRanges);

        // 2. Register with CSS
        CSS.highlights.set(highlightName, nativeHighlight);

        // 3. Inject styles with colorRole (CSS variable)
        injectHighlightCSS(data.type, data.id, data.colorRole);

        // 4. Track internally (replaces HighlightManager tracking)
        this.highlights.set(data.id, nativeHighlight);
        this.data.set(data.id, data);

        this.logger.debug('Highlight rendered and registered', { id: data.id });
    }

    async removeHighlight(id: string): Promise<void> {
        const data = this.data.get(id);
        if (!data) {
            this.logger.warn('Highlight not found', { id });
            return;
        }

        const highlightName = getHighlightName(data.type, id);

        // 1. Remove from CSS
        CSS.highlights.delete(highlightName);

        // 2. Remove styles
        removeHighlightCSS(id);

        // 3. Remove from tracking
        this.highlights.delete(id);
        this.data.delete(id);

        this.logger.info('Highlight removed', { id });
    }

    getHighlight(id: string): HighlightData | null {
        return this.data.get(id) || null;
    }

    getAllHighlights(): HighlightData[] {
        return Array.from(this.data.values());
    }

    protected generateId(): string {
        return `hl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Abstract methods - mode-specific
    abstract createHighlight(selection: Selection, colorRole: string): Promise<string>;
    abstract createFromData(data: HighlightData): Promise<void>;
    abstract updateHighlight(id: string, updates: Partial<HighlightData>): Promise<void>;
    abstract restore(url: string): Promise<void>;
    abstract clearAll(): Promise<void>;
}
