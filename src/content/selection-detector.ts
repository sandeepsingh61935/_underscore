/**
 * @file selection-detector.ts
 * @description Detects user text selections via double-click or keyboard shortcuts
 */

import type { SelectionCreatedEvent } from '@/shared/types/events';
import { EventName, createEvent } from '@/shared/types/events';
import type { EventBus } from '@/shared/utils/event-bus';
import { LoggerFactory } from '@/shared/utils/logger';
import type { ILogger } from '@/shared/utils/logger';

/**
 * Detects user text selections and emits events
 *
 * Supports:
 * - Double-click detection (300ms window)
 * - Keyboard shortcut (Ctrl+U)
 *
 * @example
 * ```typescript
 * const detector = new SelectionDetector(eventBus);
 * detector.init();
 *
 * // Listen for selections
 * eventBus.on(EventName.SELECTION_CREATED, (event) => {
 *   console.log('Selection:', event.selection.toString());
 * });
 * ```
 */
export class SelectionDetector {
  private logger: ILogger;
  private initialized = false;

  constructor(private readonly eventBus: EventBus) {
    this.logger = LoggerFactory.getLogger('SelectionDetector');
  }

  /**
   * Initialize selection detection listeners
   */
  init(): void {
    if (this.initialized) {
      this.logger.warn('SelectionDetector already initialized');
      return;
    }

    // Double-click detection (native)
    document.addEventListener('dblclick', this.handleDoubleClick);

    // Click-within-selection detection (for phrases/paragraphs)
    document.addEventListener('click', this.handleClick);

    // Keyboard shortcut (Ctrl+U)
    document.addEventListener('keydown', this.handleKeyDown);

    this.initialized = true;
    this.logger.info('SelectionDetector initialized');
  }

  /**
   * Clean up event listeners
   */
  destroy(): void {
    document.removeEventListener('dblclick', this.handleDoubleClick);
    document.removeEventListener('click', this.handleClick);
    document.removeEventListener('keydown', this.handleKeyDown);

    this.initialized = false;
    this.logger.info('SelectionDetector destroyed');
  }

  /**
   * Handle click for selection confirmation
   * If user has text selected and clicks within it, trigger highlight
   */
  private handleClick = (event: MouseEvent): void => {
    // Ignore clicks that are part of a double-click (detail >= 2)
    // Double-clicks are handled by handleDoubleClick
    if (event.detail >= 2) {
      return;
    }

    const selection = window.getSelection();

    if (!this.isValidSelection(selection)) {
      return;
    }

    // Check if click is within the selected range
    const range = selection.getRangeAt(0);
    const clickedNode = event.target as Node;

    // Check if clicked element is within the selection range
    if (this.isClickWithinRange(clickedNode, range)) {
      this.logger.debug('Click within selection detected');
      this.checkAndEmitSelection();
    }
  };

  /**
   * Check if clicked node is within the selection range
   */
  private isClickWithinRange(clickedNode: Node, range: Range): boolean {
    try {
      const testRange = document.createRange();
      testRange.selectNode(clickedNode);

      // Check if ranges intersect
      return (
        range.compareBoundaryPoints(Range.START_TO_END, testRange) >= 0 &&
        range.compareBoundaryPoints(Range.END_TO_START, testRange) <= 0
      );
    } catch {
      return false;
    }
  }

  /**
   * Handle native double-click event
   */
  private handleDoubleClick = (): void => {
    this.logger.debug('Double-click detected (native)');
    this.checkAndEmitSelection();
  };

  /**
   * Handle keyboard shortcut (Ctrl+U)
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    // Ctrl+U (or Cmd+U on Mac)
    const isShortcut =
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === 'u' &&
      !event.shiftKey;

    if (isShortcut) {
      event.preventDefault(); // Prevent default browser behavior
      this.logger.debug('Keyboard shortcut detected (Ctrl+U)');
      this.checkAndEmitSelection();
    }
  };

  /**
   * Check if there's a valid selection and emit event
   */
  private checkAndEmitSelection(): void {
    const selection = window.getSelection();

    if (!this.isValidSelection(selection)) {
      this.logger.debug('Invalid or empty selection, ignoring');
      return;
    }

    const text = selection.toString().trim();
    this.logger.info('Valid selection detected', {
      text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
      length: text.length,
    });

    // Emit selection event
    const event: SelectionCreatedEvent = createEvent({
      type: EventName.SELECTION_CREATED,
      selection: selection!,
    });

    this.eventBus.emit(EventName.SELECTION_CREATED, event);
  }

  /**
   * Validate if selection is usable for highlighting
   */
  private isValidSelection(selection: Selection | null): selection is Selection {
    if (!selection) {
      return false;
    }

    // Check if selection is collapsed (just a cursor, no text)
    if (selection.isCollapsed) {
      return false;
    }

    // Check if there's actual text content
    const text = selection.toString().trim();
    if (text.length === 0) {
      return false;
    }

    // Check if we have a valid range
    if (selection.rangeCount === 0) {
      return false;
    }

    return true;
  }

  /**
   * Get current selection (for testing)
   */
  getCurrentSelection(): Selection | null {
    return window.getSelection();
  }

  /**
   * Check if detector is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}
