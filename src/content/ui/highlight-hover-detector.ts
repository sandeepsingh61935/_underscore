/**
 * Highlight Hover Detector
 * 
 * Purpose: Detects when user hovers over highlights to show/hide delete icon
 * Performance: Throttled mousemove (50ms) for smooth 20 FPS detection
 */

import type { RepositoryFacade } from '@/shared/repositories';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import type { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';

export class HighlightHoverDetector {
    private currentHoveredId: string | null = null;
    private throttleTimeout: number | null = null;
    private isEnabled = true;

    constructor(
        private repositoryFacade: RepositoryFacade,
        private eventBus: EventBus,
        private logger: ILogger
    ) { }

    /**
     * Initialize hover detection
     */
    init(): void {
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('scroll', this.handleScroll, { passive: true });
        this.logger.info('Hover detector initialized');
    }

    /**
     * Clean up event listeners
     */
    destroy(): void {
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('scroll', this.handleScroll);
        if (this.throttleTimeout) {
            clearTimeout(this.throttleTimeout);
        }
    }

    /**
     * Enable/disable hover detection
     */
    setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
        if (!enabled && this.currentHoveredId) {
            // End current hover
            this.eventBus.emit('highlight:hover:end', {
                highlightId: this.currentHoveredId,
                timestamp: Date.now()
            });
            this.currentHoveredId = null;
        }
    }

    /**
     * Throttled mousemove handler (50ms = 20 FPS)
     */
    private handleMouseMove = (e: MouseEvent): void => {
        if (!this.isEnabled) return;

        if (this.throttleTimeout) return;

        this.throttleTimeout = window.setTimeout(() => {
            this.throttleTimeout = null;
            console.log('[HOVER] Mouse move detected', { x: e.clientX, y: e.clientY });
            this.detectHover(e.clientX, e.clientY);
        }, 50); // 50ms throttle for smooth performance
    };

    /**
     * Handle scroll - update icon positions
     */
    private handleScroll = (): void => {
        if (this.currentHoveredId) {
            // Re-emit hover event to update icon position
            const highlight = this.repositoryFacade.get(this.currentHoveredId);
            if (highlight) {
                const boundingRect = this.getHighlightBoundingRect(highlight);
                if (boundingRect) {
                    this.eventBus.emit('highlight:hover:start', {
                        highlightId: this.currentHoveredId,
                        boundingRect,
                        timestamp: Date.now()
                    });
                }
            }
        }
    };

    /**
     * Detect which highlight is being hovered
     */
    private detectHover(x: number, y: number): void {
        const highlight = this.findHighlightAtPoint(x, y);

        // Check if hover state changed
        if (highlight?.id !== this.currentHoveredId) {
            // End previous hover
            if (this.currentHoveredId) {
                this.eventBus.emit('highlight:hover:end', {
                    highlightId: this.currentHoveredId,
                    timestamp: Date.now()
                });
            }

            // Start new hover
            if (highlight) {
                const boundingRect = this.getHighlightBoundingRect(highlight);
                if (boundingRect) {
                    this.eventBus.emit('highlight:hover:start', {
                        highlightId: highlight.id,
                        boundingRect,
                        timestamp: Date.now()
                    });
                }
            }

            this.currentHoveredId = highlight?.id || null;
        }
    }

    /**
     * Find highlight at point (reuses logic from HighlightClickDetector)
     */
    /**
     * Find highlight at point (reuses logic from HighlightClickDetector)
     */
    private findHighlightAtPoint(x: number, y: number): HighlightDataV2 | null {
        // Get highlights from repository facade (cache)
        const highlights = this.repositoryFacade.getAll();

        if (highlights.length === 0) {
            // If no highlights, clear any existing hover state and return
            if (this.currentHoveredId) {
                this.detectHover(x, y); // Will allow hover end
            }
            return null;
        }

        this.logger.debug('[HOVER] Checking highlights at point', {
            x, y,
            highlightCount: highlights.length
        });

        try {
            // Find highlight under the cursor
            for (const highlight of highlights) {
                if (this.isPointInHighlight(highlight, x, y)) {
                    this.logger.debug('[HOVER] Found highlight at point', { id: highlight.id });
                    return highlight;
                }
            }
        } catch (error) {
            this.logger.warn('Error finding highlight at point', error as Error);
        }

        return null;
    }

    /**
     * Check if a point is inside a highlight's bounding boxes
     */
    private isPointInHighlight(highlight: HighlightDataV2, x: number, y: number): boolean {
        // Note: We need real DOM ranges for this, which we can get from CSS.highlights
        const highlightName = `underscore-${highlight.id}`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nativeHighlight = (CSS as any).highlights.get(highlightName);

        if (!nativeHighlight) {
            this.logger.warn('[HOVER] No CSS highlight found for ID', { id: highlight.id });
            return false;
        }

        // Check all ranges in the native highlight
        for (const abstractRange of nativeHighlight) {
            const range = abstractRange as Range;
            const rects = range.getClientRects();
            for (let i = 0; i < rects.length; i++) {
                const rect = rects[i];
                if (
                    rect &&
                    x >= rect.left &&
                    x <= rect.right &&
                    y >= rect.top &&
                    y <= rect.bottom
                ) {
                    // console.log('[HOVER-DEBUG] HIT! Point inside rect');
                    return true;
                }
            }
        }
        return false;
    }



    /**
     * Get bounding rect for highlight (for icon positioning)
     * Returns rect of first line for multi-line highlights
     */
    private getHighlightBoundingRect(highlight: HighlightDataV2): DOMRect | null {
        const highlightName = `underscore-${highlight.id}`;
        const nativeHighlight = CSS.highlights.get(highlightName);

        if (!nativeHighlight) return null;

        // Get first range from the highlight
        for (const abstractRange of nativeHighlight) {
            const range = abstractRange as Range;
            const rects = range.getClientRects();
            if (rects.length > 0) {
                return rects[0] || null;
            }
        }

        return null;
    }
}
