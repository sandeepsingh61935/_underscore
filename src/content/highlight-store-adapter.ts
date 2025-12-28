/**
 * @file highlight-store-adapter.ts
 * @description Adapter: HighlightStore interface → Repository implementation
 * 
 * Enables gradual migration from HighlightStore to Repository pattern
 * without breaking existing code. Implements old interface, delegates to new.
 */

import type { IHighlightRepository } from '@/shared/repositories';
import { RepositoryFactory } from '@/shared/repositories';
import type { HighlightDataV2 } from '@/shared/schemas';
import { generateContentHash } from '@/shared/utils/content-hash';
import { EventBus } from '@/shared/utils/event-bus';
import { EventName } from '@/shared/types/events';
import { LoggerFactory } from '@/shared/utils/logger';
import type { ILogger } from '@/shared/utils/logger';
import type { SerializedRange } from '@/shared/utils/range-serializer';

/**
 * Old Highlight format (HighlightStore)
 * Kept for backward compatibility during migration
 */
export interface Highlight {
    id: string;
    text: string;
    color: string;
    type: 'underscore';
    ranges: SerializedRange[];
    liveRanges?: Range[];
}

/**
 * Adapter: Old HighlightStore → New Repository
 * 
 * Allows existing code to work unchanged while using new Repository
 * Will be removed after full migration
 */
export class HighlightStoreAdapter {
    private repository: IHighlightRepository;
    private logger: ILogger;

    constructor(private readonly eventBus: EventBus) {
        this.repository = RepositoryFactory.getHighlightRepository();
        this.logger = LoggerFactory.getLogger('HighlightStoreAdapter');
        this.setupEventListeners();
    }

    /**
     * Set up event listeners (same as old HighlightStore)
     */
    private setupEventListeners(): void {
        this.eventBus.on(
            EventName.HIGHLIGHT_REMOVED,
            async (event: any) => {
                await this.remove(event.highlightId);
            }
        );

        this.logger.info('Adapter event listeners registered');
    }

    /**
     * Add highlight (old interface)
     * Converts to V2 format and delegates to repository
     */
    add(highlight: Highlight | any): void {
        // Convert to V2 asynchronously
        this.convertAndAdd(highlight).catch(error => {
            this.logger.error('Failed to add highlight via adapter', error);
        });
    }

    /**
     * Convert old format to V2 and add to repository
     */
    private async convertAndAdd(old: Highlight | any): Promise<void> {
        const normalized: Highlight = {
            id: old.id,
            text: old.text,
            color: old.color,
            type: old.type || 'underscore',
            ranges: old.ranges || (old.range ? [old.range] : []),
            liveRanges: old.liveRanges || (old.liveRange ? [old.liveRange] : [])
        };

        // Generate content hash
        const contentHash = await generateContentHash(normalized.text);

        // Infer color role from hex color
        const colorRole = this.inferColorRole(normalized.color);

        // Convert to V2
        const v2: HighlightDataV2 = {
            version: 2,
            id: normalized.id,
            text: normalized.text,
            contentHash,
            colorRole,
            color: normalized.color,  // Keep for backward compat
            type: normalized.type,
            ranges: normalized.ranges,
            createdAt: new Date(),
            metadata: {
                source: 'user'
            }
        };

        // Add to repository
        await this.repository.add(v2);

        this.logger.debug('Converted and added highlight', {
            id: v2.id,
            colorRole: v2.colorRole
        });

        // Emit event (same as old store)
        this.eventBus.emit(EventName.HIGHLIGHT_CREATED, null);
    }

    /**
     * Add from data (old interface)
     */
    addFromData(data: {
        id: string;
        text: string;
        color: string;
        type: 'underscore';
        range?: SerializedRange;
        liveRange?: Range;
        ranges?: SerializedRange[];
        liveRanges?: Range[];
    }): void {
        const ranges = data.ranges || (data.range ? [data.range] : []);
        const liveRanges = data.liveRanges || (data.liveRange ? [data.liveRange] : []);

        const highlight: Highlight = {
            id: data.id,
            text: data.text,
            color: data.color,
            type: data.type,
            ranges,
            liveRanges
        };

        this.add(highlight);
    }

    /**
     * Remove highlight (old interface)
     */
    async remove(id: string): Promise<void> {
        await this.repository.remove(id);
        this.logger.debug('Removed highlight via adapter', { id });
    }

    /**
     * Get highlight by ID (old interface)
     * Converts V2 back to old format
     */
    async get(id: string): Promise<Highlight | undefined> {
        const v2 = await this.repository.findById(id);
        if (!v2) return undefined;

        return this.convertToOld(v2);
    }

    /**
     * Get all highlights (old interface)
     */
    async getAll(): Promise<Highlight[]> {
        const allV2 = await this.repository.findAll();
        return allV2.map(v2 => this.convertToOld(v2));
    }

    /**
     * Count highlights (old interface)
     */
    count(): number {
        return this.repository.count();
    }

    /**
     * Check if highlight exists (old interface)
     */
    has(id: string): boolean {
        return this.repository.exists(id);
    }

    /**
     * Clear all highlights (old interface)
     */
    async clear(): Promise<void> {
        await this.repository.clear();
        this.logger.warn('Cleared all highlights via adapter');
    }

    /**
     * Find overlapping highlights (old interface)
     */
    async findOverlappingHighlights(range: Range): Promise<Highlight[]> {
        const overlapping = await this.repository.findOverlapping(range);
        return overlapping.map(v2 => this.convertToOld(v2));
    }

    // ============================================
    // Helper Methods
    // ============================================

    /**
     * Convert V2 to old format
     */
    private convertToOld(v2: HighlightDataV2): Highlight {
        return {
            id: v2.id,
            text: v2.text,
            color: v2.color || this.getHexFromRole(v2.colorRole),
            type: v2.type,
            ranges: v2.ranges,
            liveRanges: []  // Will be populated by caller if needed
        };
    }

    /**
     * Infer color role from hex color
     */
    private inferColorRole(hexColor: string): string {
        const map: Record<string, string> = {
            '#FFEB3B': 'yellow',
            '#FFB74D': 'orange',
            '#64B5F6': 'blue',
            '#81C784': 'green',
            '#BA68C8': 'purple',
            '#F06292': 'pink',
            '#4DB6AC': 'teal'
        };

        return map[hexColor.toUpperCase()] || 'yellow';
    }

    /**
     * Get hex color from role (for backward conversion)
     */
    private getHexFromRole(role: string): string {
        const map: Record<string, string> = {
            'yellow': '#FFEB3B',
            'orange': '#FFB74D',
            'blue': '#64B5F6',
            'green': '#81C784',
            'purple': '#BA68C8',
            'pink': '#F06292',
            'teal': '#4DB6AC'
        };

        return map[role] || '#FFEB3B';
    }
}
