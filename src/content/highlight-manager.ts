/**
 * @file highlight-manager.ts
 * @description Custom Highlight API-based highlight manager
 *
 * Replaces Shadow DOM approach with native CSS Custom Highlights.
 * Key benefits:
 * - Zero DOM modification
 * - Native cross-block support
 * - Better performance
 */

import {
  getHighlightName,
  injectGlobalHighlightStyles,
} from './styles/highlight-styles';

import { serializeRange } from '@/content/utils/range-converter';
import type { SerializedRange } from '@/shared/schemas/highlight-schema';
import { EventName, createEvent } from '@/shared/types/events';
import type { EventBus } from '@/shared/utils/event-bus';
import { LoggerFactory } from '@/shared/utils/logger';
import type { ILogger } from '@/shared/utils/logger';

export interface HighlightData {
  id: string;
  text: string;
  color: string;
  type: 'underscore';
  ranges: SerializedRange[];
  createdAt: Date;
  liveRanges?: Range[];
}

export class HighlightManager {
  private readonly logger: ILogger;
  private readonly eventBus: EventBus;

  // Map of highlight id → Range (for undo/redo and tracking)
  private readonly ranges: Map<string, Range[]> = new Map();

  constructor(eventBus: EventBus) {
    this.logger = LoggerFactory.getLogger('HighlightManager');
    this.eventBus = eventBus;

    this.logger.info('HighlightManager initialized (Custom Highlight API)');
    injectGlobalHighlightStyles();
  }

  static isSupported(): boolean {
    return 'highlights' in CSS;
  }

  createHighlight(
    selection: Selection,
    color: string
  ): HighlightData | null {
    if (selection.rangeCount === 0) {
      this.logger.warn('No range in selection');
      return null;
    }

    const range = selection.getRangeAt(0);
    const text = range.toString().trim();

    if (!text) {
      this.logger.warn('Empty text selection');
      return null;
    }

    const id = `hl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const highlightName = getHighlightName('underscore', color);

    const serializedRange = serializeRange(range);
    if (!serializedRange) {
      this.logger.error('Failed to serialize range');
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let semanticHighlight = (CSS as any).highlights.get(highlightName);
    if (!semanticHighlight) {
      semanticHighlight = new Highlight();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (CSS as any).highlights.set(highlightName, semanticHighlight);
    }
    semanticHighlight.add(range);

    this.ranges.set(id, [range]);

    const highlightData: HighlightData = {
      id,
      text,
      color,
      type: 'underscore',
      ranges: [serializedRange],
      createdAt: new Date(),
      liveRanges: [range],
    };

    this.eventBus.emit(
      EventName.HIGHLIGHT_CREATED,
      createEvent({
        type: EventName.HIGHLIGHT_CREATED,
        highlight: {
          id,
          text,
          color,
          type: 'underscore',
          createdAt: new Date(),
          ranges: [serializedRange],
        },
      })
    );

    this.logger.info('Highlight created', { id, type: 'underscore', textLength: text.length });
    return highlightData;
  }

  removeHighlight(id: string, _type: 'underscore' = 'underscore'): void {
    const ranges = this.ranges.get(id);
    if (!ranges) {
      this.logger.warn('Highlight not found', { id });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const highlights = (CSS as any).highlights;
    for (const semanticHighlight of highlights.values()) {
      for (const range of ranges) {
        if (semanticHighlight.has(range)) {
          semanticHighlight.delete(range);
        }
      }
    }

    this.ranges.delete(id);
    this.logger.info('Highlight removed', { id });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerHighlight(id: string, _nativeHighlight: any, range: Range): void {
    this.ranges.set(id, [range]);
    this.logger.debug('Highlight registered', { id });
  }

  clearAll(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (CSS as any).highlights.clear();
    this.ranges.clear();
    this.logger.info('All highlights cleared');
  }

  getHighlightCount(): number {
    return this.ranges.size;
  }

  hasHighlight(id: string): boolean {
    return this.ranges.has(id);
  }
}
