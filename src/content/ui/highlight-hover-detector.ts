/**
 * Highlight Hover Detector
 *
 * Purpose: Detects when user hovers over highlights to show/hide delete icon
 * Performance: Throttled mousemove (50ms) for smooth 20 FPS detection
 */

import type { RepositoryFacade } from '@/shared/repositories';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import type { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';
import type { HighlightDOMHitTester } from '@/content/ui/highlight-dom-hit-tester';

export class HighlightHoverDetector {
  private currentHoveredId: string | null = null;
  private throttleTimeout: number | null = null;
  private isEnabled = true;

  constructor(
    private repositoryFacade: RepositoryFacade,
    private eventBus: EventBus,
    private logger: ILogger,
    private hitTester: HighlightDOMHitTester
  ) { }

  /**
   * Initialize hover detection
   */
  init(): void {
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('scroll', this.handleScroll, { passive: true });
    this.logger.info('Hover detector initialized');
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('scroll', this.handleScroll);
    if (this.throttleTimeout) {
      clearTimeout(this.throttleTimeout);
    }
  }

  /**
   * Enable/disable hover detection
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled && this.currentHoveredId) {
      // End current hover
      this.eventBus.emit('highlight:hover:end', {
        highlightId: this.currentHoveredId,
        timestamp: Date.now(),
      });
      this.currentHoveredId = null;
    }
  }

  /**
   * Throttled mousemove handler (50ms = 20 FPS)
   */
  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.isEnabled) return;

    if (this.throttleTimeout) return;

    this.throttleTimeout = window.setTimeout(() => {
      this.throttleTimeout = null;
      this.logger.debug('[HOVER] Mouse move detected', { x: e.clientX, y: e.clientY });
      this.detectHover(e.clientX, e.clientY);
    }, 50); // 50ms throttle for smooth performance
  };

  /**
   * Handle scroll - update icon positions
   */
  private handleScroll = (): void => {
    if (this.currentHoveredId) {
      // Re-emit hover event to update icon position
      const highlight = this.repositoryFacade.get(this.currentHoveredId);
      if (highlight) {
        const boundingRect = this.getHighlightBoundingRect(highlight);
        if (boundingRect) {
          this.eventBus.emit('highlight:hover:start', {
            highlightId: this.currentHoveredId,
            boundingRect,
            timestamp: Date.now(),
          });
        }
      }
    }
  };

  /**
   * Detect which highlight is being hovered
   */
  private detectHover(x: number, y: number): void {
    const highlight = this.hitTester.findHighlightAtPoint(x, y);

    // Check if hover state changed
    if (highlight?.id !== this.currentHoveredId) {
      // End previous hover
      if (this.currentHoveredId) {
        this.eventBus.emit('highlight:hover:end', {
          highlightId: this.currentHoveredId,
          timestamp: Date.now(),
        });
      }

      // Start new hover
      if (highlight) {
        const boundingRect = this.getHighlightBoundingRect(highlight);
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



  /**
   * Get bounding rect for highlight (for icon positioning)
   * Returns rect of first line for multi-line highlights
   */
  private getHighlightBoundingRect(highlight: HighlightDataV2): DOMRect | null {
    const highlightName = `underscore-${highlight.id}`;
    const nativeHighlight = CSS.highlights.get(highlightName);

    if (!nativeHighlight) return null;

    // Get first range from the highlight
    for (const abstractRange of nativeHighlight) {
      const range = abstractRange as Range;
      const rects = range.getClientRects();
      if (rects.length > 0) {
        return rects[0] || null;
      }
    }

    return null;
  }
}
