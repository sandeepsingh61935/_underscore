/**
 * @file highlight-click-detector.ts  
 * @description Click detection for Custom Highlight API
 * 
 * PROBLEM: ::highlight() pseudo-elements don't emit DOM events
 * SOLUTION: Detect clicks on underlying text and check if it's highlighted
 */

import type { RepositoryFacade } from '@/shared/repositories';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import { EventName } from '@/shared/types/events';
import type { EventBus } from '@/shared/utils/event-bus';
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
     * Ctrl+Click to delete (better UX than double-click)
     */
    private handleClick(e: MouseEvent): void {
        const highlight = this.findHighlightAtPoint(e);

        if (highlight) {
            // Check if Ctrl/Cmd key is pressed
            if (e.ctrlKey || e.metaKey) {
                this.logger.info('Ctrl+Click detected - deleting highlight', {
                    id: highlight.id
                });

                // Delete the highlight
                this.deleteHighlight(highlight.id);
            } else {
                this.logger.debug('Click on highlight (Ctrl+Click to delete)', {
                    id: highlight.id
                });
            }
        }
    }

    /**
     * Delete highlight (called on Ctrl+Click)
     * Removes from repository and emits event
     */
    private deleteHighlight(highlightId: string): void {
        try {
            // Remove from repository
            this.repositoryFacade.remove(highlightId);

            // Emit event for other listeners (storage, UI, etc.)
            this.eventBus.emit(EventName.HIGHLIGHT_REMOVED, {
                type: EventName.HIGHLIGHT_REMOVED,
                highlightId,
                timestamp: Date.now()
            });

            this.logger.info('Highlight deleted', { id: highlightId });
        } catch (error) {
            this.logger.error('Failed to delete highlight', error as Error);
        }
    }

    /**
     * Find which highlight (if any) contains the clicked point
     * Now supports multi-range highlights
     */
    private findHighlightAtPoint(e: MouseEvent): HighlightDataV2 | null {
        const highlights = this.repositoryFacade.getAll();

        try {
            for (const highlight of highlights) {
                // Check ALL liveRanges in this highlight
                const ranges = (highlight as unknown as { liveRanges: Range[] }).liveRanges || [];

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
