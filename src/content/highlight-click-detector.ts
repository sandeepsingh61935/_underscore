/**
 * @file highlight-click-detector.ts  
 * @description Click detection for Custom Highlight API
 * 
 * PROBLEM: ::highlight() pseudo-elements don't emit DOM events
 * SOLUTION: Detect clicks on underlying text and check if it's highlighted
 */

import { EventBus } from '@/shared/utils/event-bus';
import { EventName } from '@/shared/types/events';
import { HighlightStore } from './highlight-store';
import type { Highlight } from './highlight-store';
import { LoggerFactory } from '@/shared/utils/logger';

export class HighlightClickDetector {
    private logger = LoggerFactory.getLogger('ClickDetector');
    private lastClickTime = 0;
    private lastClickedId: string | null = null;

    constructor(
        private store: HighlightStore,
        private eventBus: EventBus
    ) { }

    init(): void {
        document.addEventListener('click', (e) => {
            this.handleClick(e);
        });

        this.logger.info('Click detector initialized');
    }

    private handleClick(e: MouseEvent): void {
        console.log('[ClickDetector] Click at', { x: e.clientX, y: e.clientY });

        const highlight = this.findHighlightAtPoint(e);

        console.log('[ClickDetector] Found highlight?', !!highlight, highlight?.id);

        if (highlight) {
            const now = Date.now();
            const timeSinceLastClick = now - this.lastClickTime;

            console.log('[ClickDetector] Timing:', {
                timeSince: timeSinceLastClick,
                lastId: this.lastClickedId,
                currentId: highlight.id,
                willBeDoubleClick: timeSinceLastClick < 500 && highlight.id === this.lastClickedId
            });

            // Check for double-click (within 500ms on same highlight)
            if (timeSinceLastClick < 500 && highlight.id === this.lastClickedId) {
                console.log('[ClickDetector] DOUBLE-CLICK!  Emitting delete event');
                this.logger.info('Double-click on highlight detected', { id: highlight.id });

                // Emit event to delete this highlight
                this.eventBus.emit(EventName.HIGHLIGHT_CLICKED, {
                    highlightId: highlight.id,
                    timestamp: now
                });

                // Reset
                this.lastClickTime = 0;
                this.lastClickedId = null;
            } else {
                // First click - store for potential double-click
                this.lastClickTime = now;
                this.lastClickedId = highlight.id;

                console.log('[ClickDetector] First click - waiting for second');
                this.logger.debug('Single click on highlight', { id: highlight.id });
            }
        } else {
            // Clicked outside highlights - reset
            this.lastClickTime = 0;
            this.lastClickedId = null;
        }
    }

    private findHighlightAtPoint(e: MouseEvent): Highlight | null {
        const highlights = this.store.getAll();

        console.log('[ClickDetector] Searching for highlight at point', {
            totalHighlights: highlights.length,
            highlightsWithRanges: highlights.filter(h => h.liveRange).length
        });

        // Check each highlight's range
        for (const hl of highlights) {
            if (hl.liveRange) {
                const contains = this.rangeContainsPoint(hl.liveRange, e);
                console.log('[ClickDetector] Checking highlight', {
                    id: hl.id,
                    hasLiveRange: true,
                    contains
                });

                if (contains) {
                    return hl;
                }
            } else {
                console.log('[ClickDetector] Highlight missing liveRange', {
                    id: hl.id
                });
            }
        }

        return null;
    }

    private rangeContainsPoint(range: Range, e: MouseEvent): boolean {
        try {
            // Use visual rectangles instead of DOM boundary comparison
            // This handles nested elements, multi-line highlights, etc.
            const rects = range.getClientRects();

            console.log('[ClickDetector] Checking click against range rects', {
                clickX: e.clientX,
                clickY: e.clientY,
                rectCount: rects.length
            });

            // Check if click point is inside ANY rectangle
            for (let i = 0; i < rects.length; i++) {
                const rect = rects[i];

                const isInside = (
                    e.clientX >= rect.left &&
                    e.clientX <= rect.right &&
                    e.clientY >= rect.top &&
                    e.clientY <= rect.bottom
                );

                if (isInside) {
                    console.log('[ClickDetector] ✅ Click is inside rect', i);
                    return true;
                }
            }

            console.log('[ClickDetector] Click not inside any rect');
            return false;
        } catch (error) {
            this.logger.warn('Error checking range contains point', error as Error);
            return false;
        }
    }
}
