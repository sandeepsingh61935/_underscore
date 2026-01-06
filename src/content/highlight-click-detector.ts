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
   * Emits HIGHLIGHT_CLICKED event - the command pattern handles actual removal
   */
  private deleteHighlight(highlightId: string): void {
    try {
      // Emit HIGHLIGHT_CLICKED event - the command pattern will handle removal
      // NOTE: Do NOT emit HIGHLIGHT_REMOVED or manipulate repository directly
      // This creates infinite recursion with the event listeners
      this.eventBus.emit(EventName.HIGHLIGHT_CLICKED, {
        type: EventName.HIGHLIGHT_CLICKED,
        highlightId,
        timestamp: Date.now(),
      });

      this.logger.info('Highlight click emitted (Ctrl+Click)', { id: highlightId });
    } catch (error) {
      this.logger.error('Failed to emit highlight click', error as Error);
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

    const matches: HighlightDataV2[] = [];

    try {
      for (const highlight of highlights) {
        if (this.isPointInHighlight(highlight, x, y)) {
          matches.push(highlight);
        }
      }

      // If multiple matches (e.g. nested highlights like "Bluetooth" inside "Classic Bluetooth"),
      // prioritize the specific one (shortest text length).
      if (matches.length > 0) {
        matches.sort((a, b) => a.text.length - b.text.length);
        return matches[0] || null;
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
}
