/**
 * @file highlight-click-detector.ts
 * @description Click detection for painted highlights (overlay geometry via hit tester).
 *
 * - Plain click on highlight: toggle delete-icon pin
 * - Ctrl/Cmd+click: delete (existing)
 * - Click outside highlight (and not on delete icon): dismiss pin
 */

import { EventName } from '@/shared/types/events';
import type { EventBus } from '@/shared/utils/event-bus';
import { LoggerFactory } from '@/shared/utils/logger';
import type { ILogger } from '@/shared/utils/logger';
import type { HighlightDOMHitTester } from '@/content/ui/highlight-dom-hit-tester';

/** Event: user toggled delete-icon pin on a highlight. */
export const HIGHLIGHT_DELETE_ICON_TOGGLE = 'highlight:delete-icon:toggle';
/** Event: user clicked outside — dismiss pinned delete icon. */
export const HIGHLIGHT_DELETE_ICON_DISMISS = 'highlight:delete-icon:dismiss';

export class HighlightClickDetector {
  private logger: ILogger;

  constructor(
    private eventBus: EventBus,
    private hitTester: HighlightDOMHitTester
  ) {
    this.logger = LoggerFactory.getLogger('HighlightClickDetector');
  }

  init(): void {
    // Capture phase so we see the click before page handlers; icon uses stopPropagation.
    document.addEventListener('click', this.handleClick, true);
    this.logger.info('Click detector initialized');
  }

  destroy(): void {
    document.removeEventListener('click', this.handleClick, true);
  }

  private handleClick = (e: MouseEvent): void => {
    const target = e.target as Element | null;
    if (target?.closest?.('.underscore-delete-icon')) {
      // Icon handles its own click (delete). Do not toggle/dismiss here.
      return;
    }

    const highlight = this.hitTester.findHighlightAtPoint(e.clientX, e.clientY);

    if (highlight) {
      if (e.ctrlKey || e.metaKey) {
        this.logger.info('Ctrl+Click detected - deleting highlight', {
          id: highlight.id,
        });
        this.emitDelete(highlight.id);
        return;
      }

      this.logger.debug('Click on highlight - toggle delete icon pin', {
        id: highlight.id,
      });
      this.eventBus.emit(HIGHLIGHT_DELETE_ICON_TOGGLE, {
        highlightId: highlight.id,
        timestamp: Date.now(),
      });
      return;
    }

    this.eventBus.emit(HIGHLIGHT_DELETE_ICON_DISMISS, {
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
