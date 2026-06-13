/**
 * @file highlight-click-detector.ts
 * @description Click detection for Custom Highlight API
 *
 * PROBLEM: ::highlight() pseudo-elements don't emit DOM events
 * SOLUTION: Detect clicks on underlying text and check if it's highlighted
 */

import { EventName } from '@/shared/types/events';
import type { EventBus } from '@/shared/utils/event-bus';
import { LoggerFactory } from '@/shared/utils/logger';
import type { ILogger } from '@/shared/utils/logger';
import type { HighlightDOMHitTester } from '@/content/ui/highlight-dom-hit-tester';

export class HighlightClickDetector {
  private logger: ILogger;

  constructor(
    private eventBus: EventBus,
    private hitTester: HighlightDOMHitTester
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
    const highlight = this.hitTester.findHighlightAtPoint(e.clientX, e.clientY);

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


}
