/**
 * Highlight Hover Detector
 *
 * Detects hover over painted highlights for delete-icon chrome.
 * Geometry comes from HighlightPainter (same truth as hit-test / paint).
 */

import type { RepositoryFacade } from '@/shared/repositories';
import type { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';
import type { HighlightDOMHitTester } from '@/content/ui/highlight-dom-hit-tester';
import type { HighlightPainter } from '@/content/paint/highlight-painter';
import { getHighlightPainter } from '@/content/paint/range-overlay-painter';

export class HighlightHoverDetector {
  private currentHoveredId: string | null = null;
  private throttleTimeout: number | null = null;
  private isEnabled = true;

  constructor(
    private repositoryFacade: RepositoryFacade,
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
    const highlight = this.repositoryFacade.get(this.currentHoveredId);
    if (!highlight) return;
    const boundingRect = this.painter.getBoundingClientRect(this.currentHoveredId);
    if (boundingRect) {
      this.eventBus.emit('highlight:hover:start', {
        highlightId: this.currentHoveredId,
        boundingRect,
        timestamp: Date.now(),
      });
    }
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
        const boundingRect = this.painter.getBoundingClientRect(highlight.id);
        if (boundingRect) {
          this.eventBus.emit('highlight:hover:start', {
            highlightId: highlight.id,
            boundingRect,
            timestamp: Date.now(),
          });
        }
      }

      this.currentHoveredId = highlight?.id || null;
    }
  }
}
