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
import type { ILogger } from '@/shared/utils/logger';

export class HighlightClickDetector {
    private logger: ILogger;

    constructor(
        private store: HighlightStore,
        private eventBus: EventBus
    ) {
        this.logger = LoggerFactory.getLogger('HighlightClickDetector');
    }

    init(): void {
        document.addEventListener('click', (e) => {
            this.handleClick(e);
        });

        this.logger.info('Click detector initialized');
    }

    private handleClick(e: MouseEvent): void {
        const highlight = this.findHighlightAtPoint(e);

        if (highlight) {
            this.logger.info('Click on highlight - deleting', { id: highlight.id });

            // Emit event to delete this highlight (SINGLE CLICK!)
            this.eventBus.emit(EventName.HIGHLIGHT_CLICKED, {
                highlightId: highlight.id,
                timestamp: Date.now()
            });
        }
    }

    private findHighlightAtPoint(e: MouseEvent): Highlight | null {
        const highlights = this.store.getAll();

        // Check each highlight's range
        for (const hl of highlights) {
            if (hl.liveRange && this.rangeContainsPoint(hl.liveRange, e)) {
                return hl;
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
