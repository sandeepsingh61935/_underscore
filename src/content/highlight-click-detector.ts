/**
 * @file highlight-click-detector.ts
 * @description Click detection for painted highlights (overlay geometry via hit tester).
 *
 * - Plain click on highlight: open the annotation actions pill
 * - Ctrl/Cmd+click: delete (existing)
 * - Click outside highlight: nothing (the pill dismisses itself on outside pointerdown)
 */

import type { HighlightDOMHitTester } from '@/content/ui/highlight-dom-hit-tester';
import { EventName } from '@/shared/types/events';
import type { EventBus } from '@/shared/utils/event-bus';
import { LoggerFactory } from '@/shared/utils/logger';
import type { ILogger } from '@/shared/utils/logger';

/** Event: user clicked a highlight — open the annotation actions pill. */
export const HIGHLIGHT_ACTIONS_OPEN = 'highlight:actions:open';

export class HighlightClickDetector {
  private logger: ILogger;

  constructor(
    private eventBus: EventBus,
    private hitTester: HighlightDOMHitTester
  ) {
    this.logger = LoggerFactory.getLogger('HighlightClickDetector');
  }

  init(): void {
    // Capture phase so we see the click before page handlers.
    document.addEventListener('click', this.handleClick, true);
    this.logger.info('Click detector initialized');
  }

  destroy(): void {
    document.removeEventListener('click', this.handleClick, true);
  }

  private handleClick = (e: MouseEvent): void => {
    const highlight = this.hitTester.findHighlightAtPoint(e.clientX, e.clientY);
    if (!highlight) return;

    if (e.ctrlKey || e.metaKey) {
      this.logger.info('Ctrl+Click detected - deleting highlight', {
        id: highlight.id,
      });
      this.emitDelete(highlight.id);
      return;
    }

    this.logger.debug('Click on highlight - open actions pill', {
      id: highlight.id,
    });
    this.eventBus.emit(HIGHLIGHT_ACTIONS_OPEN, {
      highlightId: highlight.id,
      timestamp: Date.now(),
    });
  };

  private emitDelete(highlightId: string): void {
    try {
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
