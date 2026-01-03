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
          id: highlight.id,
        });

        // Delete the highlight
        this.deleteHighlight(highlight.id);
      } else {
        this.logger.debug('Click on highlight (Ctrl+Click to delete)', {
          id: highlight.id,
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
        timestamp: Date.now(),
      });

      this.logger.info('Highlight deleted', { id: highlightId });
    } catch (error) {
      this.logger.error('Failed to delete highlight', error as Error);
    }
  }

  /**
   * Find which highlight (if any) contains the clicked point
   * Uses CSS.highlights API to access live ranges
   */
  private findHighlightAtPoint(e: MouseEvent): HighlightDataV2 | null {
    const highlights = this.repositoryFacade.getAll();
    const x = e.clientX;
    const y = e.clientY;

    try {
      for (const highlight of highlights) {
        if (this.isPointInHighlight(highlight, x, y)) {
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
    const highlightName = `underscore-${highlight.id}`;
    const nativeHighlight = CSS.highlights.get(highlightName);

    if (!nativeHighlight) {
      return false;
    }

    // Check if point is within any range of this highlight
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
          return true;
        }
      }
    }
    return false;

  }
