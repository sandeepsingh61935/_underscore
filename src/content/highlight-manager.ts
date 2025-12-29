/**
 * @file highlight-manager.ts
 * @description Custom Highlight API-based highlight manager
 * 
 * Replaces Shadow DOM approach with native CSS Custom Highlights.
 * Key benefits:
 * - Zero DOM modification
 * - Native cross-block support
 * - Better performance
 */

import { getHighlightName, injectHighlightCSS, removeHighlightCSS } from './styles/highlight-styles';

import { serializeRange } from '@/content/utils/range-converter';
import type { SerializedRange } from '@/shared/schemas/highlight-schema';
import { EventName, createEvent } from '@/shared/types/events';
import type { EventBus } from '@/shared/utils/event-bus';
import { LoggerFactory } from '@/shared/utils/logger';
import type { ILogger } from '@/shared/utils/logger';


/**
 * Highlight data structure (no DOM element needed!)
 * UPDATED: Now supports multiple ranges per highlight
 */
export interface HighlightData {
    id: string;
    text: string;
    color: string;
    type: 'underscore';  // Single mode only
    ranges: SerializedRange[];   // Multiple ranges!
    createdAt: Date;
    liveRanges?: Range[];         // Multiple live ranges for click detection
}

/**
 * Extended with live Range for CSS.highlights
 */
export interface HighlightWithLiveRange extends HighlightData {
    liveRange: Range;
}

/**
 * Manages CSS Custom Highlights
 * 
 * Uses the native CSS Custom Highlight API:
 * - CSS.highlights.set(name, Highlight)
 * - Styled via ::highlight(name) pseudo-element
 */
export class HighlightManager {
    private readonly logger: ILogger;
    private readonly eventBus: EventBus;

    // Map of highlight id → Highlight object
    private readonly highlights: Map<string, Highlight> = new Map();

    // Map of highlight id → Range (for undo/redo)
    private readonly ranges: Map<string, Range> = new Map();

    constructor(eventBus: EventBus) {
        this.logger = LoggerFactory.getLogger('HighlightManager');
        this.eventBus = eventBus;

        this.logger.info('HighlightManager initialized (Custom Highlight API)');
    }

    /**
     * Check if Custom Highlight API is supported
     */
    static isSupported(): boolean {
        return 'highlights' in CSS;
    }

    /**
     * Create a new highlight from selection
     * Now supports creating with multiple ranges
     */
    createHighlight(
        selection: Selection,
        color: string,
        type: 'underscore' = 'underscore'
    ): HighlightData | null {
        if (selection.rangeCount === 0) {
            this.logger.warn('No range in selection');
            return null;
        }

        // For now, take first range (we'll add multi-selection support later)
        const range = selection.getRangeAt(0);
        const text = range.toString().trim();

        if (!text) {
            this.logger.warn('Empty text selection');
            return null;
        }

        // Generate unique ID
        const id = `hl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const highlightName = getHighlightName(type, id);

        // Serialize range for storage
        const serializedRange = serializeRange(range);
        if (!serializedRange) {
            this.logger.error('Failed to serialize range');
            return null;
        }

        // Create native Highlight with the range
        const nativeHighlight = new Highlight(range);
        CSS.highlights.set(highlightName, nativeHighlight);

        // Inject CSS for this specific highlight
        injectHighlightCSS(type, id, color);

        const highlightData: HighlightData = {
            id,
            text,
            color,
            type,
            ranges: [serializedRange],      // Array format
            createdAt: new Date(),
            liveRanges: [range]              // Array format - CRITICAL for click detection!
        };

        // Emit event
        this.eventBus.emit(EventName.HIGHLIGHT_CREATED, createEvent({
            type: EventName.HIGHLIGHT_CREATED,
            highlight: {
                id,
                text,
                color,
                type,
                createdAt: new Date(),
                ranges: [serializedRange],
            },
        }));

        this.logger.info('Highlight created', {
            id,
            type,
            textLength: text.length,
        });

        return highlightData;
    }

    /**
     * Remove a highlight by ID (underscore mode only)
     */
    removeHighlight(id: string, type: 'underscore' = 'underscore'): void {
        const highlight = this.highlights.get(id);
        if (!highlight) {
            this.logger.warn('Highlight not found', { id });
            return;
        }

        // Remove from CSS.highlights
        const highlightName = getHighlightName(type, id);
        CSS.highlights.delete(highlightName);

        // Remove CSS
        removeHighlightCSS(id);

        // Remove from internal maps
        this.highlights.delete(id);
        this.ranges.delete(id);

        this.logger.info('Highlight removed', { id });
    }

    /**
     * Register an externally-created highlight (e.g., from range subtraction)
     * This ensures HighlightManager tracks it for future removal
     */
    registerHighlight(id: string, nativeHighlight: Highlight, range: Range): void {
        this.highlights.set(id, nativeHighlight);
        this.ranges.set(id, range);
        this.logger.debug('Highlight registered', { id });
    }

    /**
     * Clear all highlights
     */
    clearAll(): void {
        // Clear all CSS highlights
        CSS.highlights.clear();

        // Clear internal maps
        this.highlights.clear();
        this.ranges.clear();

        this.logger.info('All highlights cleared');
    }

    /**
     * Get highlight count
     */
    getHighlightCount(): number {
        return this.highlights.size;
    }

    /**
     * Check if a highlight exists
     */
    hasHighlight(id: string): boolean {
        return this.highlights.has(id);
    }
}
