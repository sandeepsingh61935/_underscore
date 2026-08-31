/**
 * Highlight Hover Detector
 *
 * Detects hover over painted highlights for delete-icon chrome.
 * Geometry comes from HighlightPainter (first-line edges for exterior icon).
 */

import type { HighlightPainter } from '@/content/paint/highlight-painter';
import { getHighlightPainter } from '@/content/paint/range-overlay-painter';
import type { HighlightDOMHitTester } from '@/content/ui/highlight-dom-hit-tester';
import type { RepositoryFacade } from '@/shared/repositories';
import type { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';

export class HighlightHoverDetector {
  private currentHoveredId: string | null = null;
  private throttleTimeout: number | null = null;
  private isEnabled = true;

  constructor(
    _repositoryFacade: RepositoryFacade,
    private eventBus: EventBus,
    private logger: ILogger,
    private hitTester: HighlightDOMHitTester,
    private painter: HighlightPainter = getHighlightPainter()
  ) {}

  init(): void {
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('scroll', this.handleScroll, { passive: true });
    this.logger.info('Hover detector initialized');
  }

  destroy(): void {
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('scroll', this.handleScroll);
    if (this.throttleTimeout) {
      clearTimeout(this.throttleTimeout);
    }
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled && this.currentHoveredId) {
      this.eventBus.emit('highlight:hover:end', {
        highlightId: this.currentHoveredId,
        timestamp: Date.now(),
      });
      this.currentHoveredId = null;
    }
  }

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.isEnabled) return;
    if (this.throttleTimeout) return;

    this.throttleTimeout = window.setTimeout(() => {
      this.throttleTimeout = null;
      this.logger.debug('[HOVER] Mouse move detected', { x: e.clientX, y: e.clientY });
      this.detectHover(e.clientX, e.clientY);
    }, 50);
  };

  private handleScroll = (): void => {
    if (!this.currentHoveredId) return;
    this.emitHoverStart(this.currentHoveredId);
  };

  private detectHover(x: number, y: number): void {
    const highlight = this.hitTester.findHighlightAtPoint(x, y);

    if (highlight?.id !== this.currentHoveredId) {
      if (this.currentHoveredId) {
        this.eventBus.emit('highlight:hover:end', {
          highlightId: this.currentHoveredId,
          timestamp: Date.now(),
        });
      }

      if (highlight) {
        this.emitHoverStart(highlight.id);
      }

      this.currentHoveredId = highlight?.id || null;
    }
  }

  private emitHoverStart(highlightId: string): void {
    const edges = this.painter.getFirstLineEdges(highlightId);
    if (!edges) return;

    // boundingRect = first-line end (icon anchor); startRect carried for exterior flip.
    this.eventBus.emit('highlight:hover:start', {
      highlightId,
      boundingRect: edges.end,
      firstLineStart: edges.start,
      firstLineEnd: edges.end,
      timestamp: Date.now(),
    });
  }
}
