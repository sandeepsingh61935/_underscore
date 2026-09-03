import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RestorationCoordinator } from '@/content/services/restoration-coordinator';
import type { HighlightDataV2, SerializedRange } from '@/shared/schemas/highlight-schema';
import type { ILogger } from '@/shared/utils/logger';

function makeHighlight(overrides: Partial<HighlightDataV2> = {}): HighlightDataV2 {
  return {
    id: 'hl-1',
    text: 'sample text',
    contentHash: 'a'.repeat(64),
    colorRole: 'yellow',
    type: 'underscore',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    url: 'https://example.com/article',
    ranges: [
      {
        xpath: '/html/body/p',
        startOffset: 0,
        endOffset: 11,
        text: 'sample text',
        textBefore: '',
        textAfter: '',
        selector: {
          type: 'TextQuoteSelector',
          exact: 'sample text',
        },
      },
    ],
    ...overrides,
  };
}

describe('RestorationCoordinator', () => {
  let mockLogger: ILogger;
  let mockRenderAndRegister: (hl: HighlightDataV2 & { liveRanges?: Range[] }) => Promise<void>;
  let mockDeserializeRange: (sr: SerializedRange) => Range | null;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      setLevel: vi.fn(),
      getLevel: vi.fn(),
    } as unknown as ILogger;

    mockRenderAndRegister = vi.fn().mockResolvedValue(undefined);
    mockDeserializeRange = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('classifies highlights with resolvable ranges as anchored', async () => {
    const fakeRange = {} as Range;
    mockDeserializeRange = vi.fn().mockReturnValue(fakeRange);

    const coordinator = new RestorationCoordinator({
      logger: mockLogger,
      deserializeRange: mockDeserializeRange,
      renderAndRegister: mockRenderAndRegister,
      url: 'https://example.com/article',
    });

    const highlight = makeHighlight({ id: 'hl-anchored' });
    const report = await coordinator.restorePageHighlights([highlight]);

    expect(report.totalCount).toBe(1);
    expect(report.anchoredIds).toEqual(['hl-anchored']);
    expect(report.unanchoredIds).toEqual([]);
    expect(mockRenderAndRegister).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'hl-anchored', liveRanges: [fakeRange] })
    );
  });

  it('classifies highlights that fail matching as unanchored without throwing errors', async () => {
    mockDeserializeRange = vi.fn().mockReturnValue(null);

    const coordinator = new RestorationCoordinator({
      logger: mockLogger,
      deserializeRange: mockDeserializeRange,
      renderAndRegister: mockRenderAndRegister,
      url: 'https://example.com/article',
    });

    const highlight = makeHighlight({ id: 'hl-unanchored', text: 'deleted text' });
    const report = await coordinator.restorePageHighlights([highlight]);

    expect(report.totalCount).toBe(1);
    expect(report.anchoredIds).toEqual([]);
    expect(report.unanchoredIds).toEqual(['hl-unanchored']);
    expect(mockRenderAndRegister).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('handles a mix of anchored and unanchored highlights', async () => {
    const fakeRange = {} as Range;
    mockDeserializeRange = vi.fn().mockImplementation((sr: SerializedRange) => {
      return sr.text === 'present text' ? fakeRange : null;
    });

    const coordinator = new RestorationCoordinator({
      logger: mockLogger,
      deserializeRange: mockDeserializeRange,
      renderAndRegister: mockRenderAndRegister,
      url: 'https://example.com/article',
    });

    const hl1 = makeHighlight({
      id: 'hl-1',
      text: 'present text',
      ranges: [
        {
          xpath: '/p[1]',
          startOffset: 0,
          endOffset: 12,
          text: 'present text',
          textBefore: '',
          textAfter: '',
        },
      ],
    });
    const hl2 = makeHighlight({
      id: 'hl-2',
      text: 'missing text',
      ranges: [
        {
          xpath: '/p[2]',
          startOffset: 0,
          endOffset: 12,
          text: 'missing text',
          textBefore: '',
          textAfter: '',
        },
      ],
    });

    const report = await coordinator.restorePageHighlights([hl1, hl2]);

    expect(report.totalCount).toBe(2);
    expect(report.anchoredIds).toEqual(['hl-1']);
    expect(report.unanchoredIds).toEqual(['hl-2']);
    expect(coordinator.getReport()).toEqual(report);
  });

  describe('reanchorHighlight', () => {
    it('recomputes range, preserves metadata, paints highlight, and updates restoration status', async () => {
      const mockSerializeRange = vi.fn().mockReturnValue({
        xpath: '/html/body/div[1]/p',
        startOffset: 5,
        endOffset: 20,
        text: 'new revised text',
        textBefore: 'prefix ',
        textAfter: ' suffix',
        selector: {
          type: 'TextQuoteSelector',
          exact: 'new revised text',
          prefix: 'prefix ',
          suffix: ' suffix',
        },
      });
      const mockUpdate = vi.fn().mockResolvedValue(undefined);

      const coordinator = new RestorationCoordinator({
        logger: mockLogger,
        deserializeRange: mockDeserializeRange,
        renderAndRegister: mockRenderAndRegister,
        serializeRange: mockSerializeRange,
        onUpdateHighlight: mockUpdate,
        url: 'https://example.com/article',
      });

      const initialHighlight = makeHighlight({
        id: 'hl-drifted',
        text: 'old deleted text',
        metadata: {
          source: 'user',
          tags: ['research', 'ai'],
          notes: 'important note here',
        },
        createdAt: new Date('2026-02-01T12:00:00Z'),
      });

      // Initially mark as unanchored
      coordinator.markUnanchored('hl-drifted');
      expect(coordinator.isUnanchored('hl-drifted')).toBe(true);

      const fakeNewRange = {
        collapsed: false,
        toString: () => 'new revised text',
      } as unknown as Range;

      const updated = await coordinator.reanchorHighlight(initialHighlight, fakeNewRange);

      // Verify metadata preservation
      expect(updated.id).toBe('hl-drifted');
      expect(updated.createdAt).toEqual(new Date('2026-02-01T12:00:00Z'));
      expect(updated.metadata?.tags).toEqual(['research', 'ai']);
      expect(updated.metadata?.notes).toBe('important note here');
      expect(updated.colorRole).toBe('yellow');

      // Verify updated content & range
      expect(updated.text).toBe('new revised text');
      expect(updated.ranges).toHaveLength(1);
      expect(updated.ranges[0]?.selector?.exact).toBe('new revised text');
      expect(updated.ranges[0]?.selector?.prefix).toBe('prefix ');

      // Verify rendered in DOM
      expect(mockRenderAndRegister).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'hl-drifted',
          liveRanges: [fakeNewRange],
        })
      );

      // Verify persistence was notified
      expect(mockUpdate).toHaveBeenCalledWith(
        'hl-drifted',
        expect.objectContaining({
          text: 'new revised text',
          ranges: expect.any(Array),
        })
      );

      // Verify status is now anchored
      expect(coordinator.isUnanchored('hl-drifted')).toBe(false);
      expect(coordinator.getReport().anchoredIds).toContain('hl-drifted');
      expect(coordinator.getReport().unanchoredIds).not.toContain('hl-drifted');
    });

    it('throws error when range is invalid or collapsed', async () => {
      const coordinator = new RestorationCoordinator({
        logger: mockLogger,
        url: 'https://example.com/article',
      });

      const highlight = makeHighlight({ id: 'hl-1' });
      const collapsedRange = {
        collapsed: true,
        toString: () => '',
      } as unknown as Range;

      await expect(
        coordinator.reanchorHighlight(highlight, collapsedRange)
      ).rejects.toThrow('Cannot re-anchor to an empty or collapsed range');
    });
  });
});
