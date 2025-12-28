/**
 * @file highlight-click-detector.ts  
 * @description Click detection for Custom Highlight API
 * 
 * PROBLEM: ::highlight() pseudo-elements don't emit DOM events
 * SOLUTION: Detect clicks on underlying text and check if it's highlighted
 */

import { EventBus } from '@/shared/utils/event-bus';
import { EventName } from '@/shared/types/events';
import { RepositoryFacade } from '@/shared/repositories';
import type { Highlight } from './highlight-store';
import { LoggerFactory } from '@/shared/utils/logger';
import type { ILogger } from '@/shared/utils/logger';

export class HighlightClickDetector {
    private logger: ILogger;

    constructor(
        private repositoryFacade: RepositoryFacade,
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

    /**
     * Handle click event
     */
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

    /**
     * Find which highlight (if any) contains the clicked point
     * Now supports multi-range highlights
     */
    private findHighlightAtPoint(e: MouseEvent): Highlight | null {
        const highlights = this.repositoryFacade.getAll();

        try {
            for (const highlight of highlights) {
                // Check ALL liveRanges in this highlight
                const ranges = highlight.liveRanges || [];

                for (const liveRange of ranges) {
                    const rects = liveRange.getClientRects();

                    for (let i = 0; i < rects.length; i++) {
                        const rect = rects[i];
                        if (rect &&
                            e.clientX >= rect.left &&
                            e.clientX <= rect.right &&
                            e.clientY >= rect.top &&
                            e.clientY <= rect.bottom
                        ) {
                            // Found it! Return the entire highlight
                            return highlight;
                        }
                    }
                }
            }
        } catch (error) {
            this.logger.warn('Error finding highlight at point', error as Error);
        }

        return null;
    }
}
