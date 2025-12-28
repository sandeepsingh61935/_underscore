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

import { EventBus } from '@/shared/utils/event-bus';
import { EventName, createEvent } from '@/shared/types/events';
import { LoggerFactory } from '@/shared/utils/logger';
import type { ILogger } from '@/shared/utils/logger';
import { serializeRange } from '@/shared/utils/range-serializer';
import type { SerializedRange } from '@/shared/utils/range-serializer';
import { getHighlightName, injectHighlightCSS, removeHighlightCSS } from './styles/highlight-styles';

/**
 * Highlight data structure (no DOM element needed!)
 * liveRange is ephemeral - used for click detection but not serialized
 */
export interface HighlightData {
    id: string;
    text: string;
    color: string;
    type: 'underscore';  // Single mode only
    range: SerializedRange;
    createdAt: Date;
    liveRange?: Range;  // CRITICAL: For click detection!
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
     * Create a highlight from selection (underscore mode only)
     * 
     * @param selection - User's text selection
     * @param color - Highlight color
     * @returns HighlightData or null if failed
     */
    createHighlight(
        selection: Selection,
        color: string
    ): HighlightData | null {
        const type = 'underscore';  // Single mode only

        if (!selection.rangeCount) {
            this.logger.warn('No selection range');
            return null;
        }

        const range = selection.getRangeAt(0);
        const text = selection.toString().trim();

        if (!text) {
            this.logger.warn('Empty selection');
            return null;
        }

        // Clone range to avoid mutation issues
        const liveRange = range.cloneRange();

        // Serialize for storage
        const serializedRange = serializeRange(range);
        if (!serializedRange) {
            this.logger.error('Failed to serialize range');
            return null;
        }

        // Generate unique ID
        const id = this.generateId();

        // Inject CSS for this specific highlight
        injectHighlightCSS(type, id, color);

        // Create native Highlight object
        const highlight = new Highlight(liveRange);

        // Get the unique CSS highlight name
        const highlightName = getHighlightName(type, id);

        // Set in CSS.highlights registry
        CSS.highlights.set(highlightName, highlight);

        // Store for management
        this.highlights.set(id, highlight);
        this.ranges.set(id, liveRange);

        // Create highlight data
        const highlightData: HighlightData = {
            id,
            text,
            color,
            type,
            range: serializedRange,
            createdAt: new Date(),
            liveRange: liveRange  // CRITICAL: For click detection!
        };

        // Emit event
        this.eventBus.emit(EventName.HIGHLIGHT_CREATED, createEvent({
            type: EventName.HIGHLIGHT_CREATED,
            highlight: {
                id,
                text,
                color,
            },
            range: serializedRange,
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
    removeHighlight(id: string): void {
        const type = 'underscore';  // Single mode only

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

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return `hl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
