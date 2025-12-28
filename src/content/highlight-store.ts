/**
 * @file highlight-store.ts
 * @description In-memory storage for highlights in Sprint Mode
 */

import { EventBus } from '@/shared/utils/event-bus';
import { EventName } from '@/shared/types/events';
import { LoggerFactory } from '@/shared/utils/logger';
import type { ILogger } from '@/shared/utils/logger';
import type { SerializedRange } from '@/shared/utils/range-serializer';

/**
 * Highlight data structure
 * UPDATED: Now supports multiple ranges per highlight (for range subtraction)
 */
export interface Highlight {
    id: string;
    text: string;
    color: string;
    type: 'underscore';  // Single mode only
    ranges: SerializedRange[];  // Multiple ranges!
    liveRanges?: Range[];        // Multiple live ranges for click detection
}

/**
 * In-memory storage for highlights (Sprint Mode - ephemeral)
 * 
 * Features:
 * - Map-based storage (fast lookups)
 * - Event-driven updates
 * - CRUD operations
 * 
 * @example
 * ```typescript
 * const store = new HighlightStore(eventBus);
 * 
 * // Highlights are added/removed via events
 * eventBus.emit(EventName.HIGHLIGHT_CREATED, { highlight: {...} });
 * 
 * // Query
 * const all = store.getAll();
 * const count = store.count();
 * ```
 */
export class HighlightStore {
    private highlights = new Map<string, Highlight>();
    private logger: ILogger;

    constructor(private readonly eventBus: EventBus) {
        this.logger = LoggerFactory.getLogger('HighlightStore');
        this.setupEventListeners();
    }

    /**
     * Set up event listeners
     */
    private setupEventListeners(): void {
        // Listen for highlight removal
        this.eventBus.on(
            EventName.HIGHLIGHT_REMOVED,
            (event: any) => { // TODO: Define proper event type for HIGHLIGHT_REMOVED
                this.remove(event.highlightId);
            }
        );

        this.logger.info('HighlightStore event listeners registered');
    }

    /**
     * Add highlight to store
     * Handles both old and new formats
     */
    add(highlight: Highlight | any): void {
        // Normalize to multi-range format (backward compatibility)
        const normalized: Highlight = {
            id: highlight.id,
            text: highlight.text,
            color: highlight.color,
            type: highlight.type || 'underscore',
            ranges: highlight.ranges || (highlight.range ? [highlight.range] : []),
            liveRanges: highlight.liveRanges || (highlight.liveRange ? [highlight.liveRange] : [])
        };

        this.highlights.set(normalized.id, normalized);

        this.logger.debug('Added highlight', {
            id: normalized.id,
            rangeCount: normalized.ranges.length,
            liveRangeCount: normalized.liveRanges?.length || 0
        });

        // Emit event
        this.eventBus.emit(EventName.HIGHLIGHT_CREATED, null);
    }

    /**
     * Add highlight from data (for restoration/commands)
     * Supports both old (single range) and new (multi-range) formats
     */
    addFromData(data: {
        id: string;
        text: string;
        color: string;
        type: 'underscore';
        // Backward compatibility: support old format
        range?: SerializedRange;
        liveRange?: Range;
        // New format: multi-range
        ranges?: SerializedRange[];
        liveRanges?: Range[];
    }): void {
        // Normalize to multi-range format
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
     * Remove highlight by ID
     */
    remove(id: string): boolean {
        const existed = this.highlights.delete(id);

        if (existed) {
            this.logger.debug('Highlight removed', { id, count: this.count() });
        } else {
            this.logger.warn('Attempted to remove non-existent highlight', { id });
        }

        return existed;
    }

    /**
     * Get highlight by ID
     */
    get(id: string): Highlight | undefined {
        return this.highlights.get(id);
    }

    /**
     * Get all highlights
     */
    getAll(): Highlight[] {
        return Array.from(this.highlights.values());
    }

    /**
     * Get highlight count
     */
    count(): number {
        return this.highlights.size;
    }

    /**
     * Clear all highlights
     */
    clear(): void {
        const count = this.count();
        this.highlights.clear();

        this.logger.info('All highlights cleared', { clearedCount: count });

        // Emit cleared event
        this.eventBus.emit(EventName.HIGHLIGHTS_CLEARED, {
            type: EventName.HIGHLIGHTS_CLEARED,
            count,
            timestamp: new Date(),
        });
    }

    /**
     * Check if highlight exists
     */
    has(id: string): boolean {
        return this.highlights.has(id);
    }

    /**
     * Get highlights for a specific color
     */
    getByColor(color: string): Highlight[] {
        return this.getAll().filter(h => h.color === color);
    }
}
