/**
 * @file base-highlight-mode.test.ts
 * @description BaseHighlightMode paint via HighlightPainter only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { BaseHighlightMode } from '@/content/modes/base-highlight-mode';
import type { HighlightData } from '@/content/modes/highlight-mode.interface';
import { RangeOverlayPainter } from '@/content/paint/range-overlay-painter';
import type { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';

class TestMode extends BaseHighlightMode {
  get name(): 'basic' {
    return 'basic';
  }
  async createHighlight(): Promise<string> {
    return '';
  }
  async createFromData(data: HighlightData): Promise<void> {
    await this.renderAndRegister(data);
  }
  async updateHighlight(): Promise<void> {}
  async clearAll(): Promise<void> {
    this.clearPaint();
  }
  public callRenderAndRegister(data: HighlightData): Promise<void> {
    return this.renderAndRegister(data);
  }
  public callClearPaint(): void {
    this.clearPaint();
  }
}

function stubClientRects(range: Range): void {
  range.getClientRects = () =>
    [
      {
        left: 0,
        top: 0,
        width: 20,
        height: 10,
        right: 20,
        bottom: 10,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      },
    ] as unknown as DOMRectList;
}

describe('BaseHighlightMode.renderAndRegister', () => {
  let mode: TestMode;
  let eventBus: EventBus;
  let logger: ILogger;
  let facade: RepositoryFacade;

  beforeEach(() => {
    RangeOverlayPainter.resetForTests();
    document.body.innerHTML = '<p>paint me now</p>';

    eventBus = { emit: vi.fn(), on: vi.fn(), off: vi.fn() } as unknown as EventBus;
    logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      setLevel: vi.fn(),
      getLevel: vi.fn(),
    } as unknown as ILogger;
    facade = {
      add: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
      get: vi.fn(),
      getAll: vi.fn(),
      has: vi.fn(),
      count: vi.fn(),
      findByContentHash: vi.fn(),
      findByUrl: vi.fn(),
      findOverlapping: vi.fn(),
      addMany: vi.fn(),
      initialize: vi.fn(),
      reload: vi.fn(),
      evict: vi.fn(),
    } as unknown as RepositoryFacade;

    mode = new TestMode(eventBus, logger, facade);
  });

  afterEach(() => {
    RangeOverlayPainter.resetForTests();
  });

  it('does not throw when data lacks liveRanges', async () => {
    const data: HighlightData = {
      id: 'hl-1',
      text: 'no live ranges here',
      contentHash: 'hash-1',
      colorRole: 'yellow',
      type: 'underscore',
      ranges: [],
    };

    await expect(mode.callRenderAndRegister(data)).resolves.toBeUndefined();
    expect(mode.getHighlight('hl-1')).toBeTruthy();
    expect(RangeOverlayPainter.getInstance().paintedCount).toBe(0);
  });

  it('still tracks data when liveRanges is missing', async () => {
    const data: HighlightData = {
      id: 'hl-track',
      text: 'tracked',
      contentHash: 'hash-track',
      colorRole: 'yellow',
      type: 'underscore',
      ranges: [],
    };

    await mode.callRenderAndRegister(data);
    expect(mode.getHighlight('hl-track')).toEqual(
      expect.objectContaining({ id: 'hl-track', colorRole: 'yellow' })
    );
  });

  it('removeHighlight unpaints and drops session data', async () => {
    const data: HighlightData = {
      id: 'hl-remove',
      text: 'removable',
      contentHash: 'hash-remove',
      colorRole: 'yellow',
      type: 'underscore',
      ranges: [],
    };

    await mode.callRenderAndRegister(data);
    await expect(mode.removeHighlight('hl-remove')).resolves.toBeUndefined();
    expect(mode.getHighlight('hl-remove')).toBeNull();
  });

  it('paints via HighlightPainter when liveRanges present', async () => {
    const textNode = document.createTextNode('paint me');
    document.body.appendChild(textNode);
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, 4);
    stubClientRects(range);

    const data: HighlightData = {
      id: 'hl-paint',
      text: 'paint',
      contentHash: 'hash-paint',
      colorRole: 'yellow',
      type: 'underscore',
      ranges: [],
      liveRanges: [range],
    };

    await mode.callRenderAndRegister(data);

    expect(mode.getHighlight('hl-paint')).toBeTruthy();
    expect(RangeOverlayPainter.getInstance().paintedCount).toBe(1);
    expect(document.querySelectorAll('.underscore-paint-rect').length).toBeGreaterThan(0);
  });

  it('clearPaint removes all overlays and session data', async () => {
    const textNode = document.createTextNode('clear me');
    document.body.appendChild(textNode);
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, 5);
    stubClientRects(range);

    await mode.callRenderAndRegister({
      id: 'hl-c',
      text: 'clear',
      contentHash: 'h',
      colorRole: 'blue',
      type: 'underscore',
      ranges: [],
      liveRanges: [range],
    });

    mode.callClearPaint();
    expect(mode.getAllHighlights()).toHaveLength(0);
    expect(RangeOverlayPainter.getInstance().paintedCount).toBe(0);
  });

  it('normalizes legacy hex color to yellow for paint', async () => {
    const textNode = document.createTextNode('hex');
    document.body.appendChild(textNode);
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, 3);
    stubClientRects(range);

    await mode.callRenderAndRegister({
      id: 'hl-hex',
      text: 'hex',
      contentHash: 'hx',
      colorRole: '#FFEB3B' as HighlightData['colorRole'],
      color: '#FFEB3B',
      type: 'underscore',
      ranges: [],
      liveRanges: [range],
    });

    const stored = mode.getHighlight('hl-hex');
    expect(stored?.colorRole).toBe('yellow');
    const rect = document.querySelector('.underscore-paint-rect');
    expect(rect?.getAttribute('data-highlight-id')).toBe('hl-hex');
  });
});
