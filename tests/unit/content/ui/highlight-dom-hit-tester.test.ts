/**
 * @file highlight-dom-hit-tester.test.ts
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HighlightDOMHitTester } from '@/content/ui/highlight-dom-hit-tester';
import type { HighlightPainter } from '@/content/paint/highlight-painter';
import type { RepositoryFacade } from '@/shared/repositories';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';

describe('HighlightDOMHitTester', () => {
  let facade: RepositoryFacade;
  let painter: HighlightPainter;

  beforeEach(() => {
    facade = {
      get: vi.fn(),
      getAll: vi.fn(),
    } as unknown as RepositoryFacade;
    painter = {
      paint: vi.fn(),
      unpaint: vi.fn(),
      clear: vi.fn(),
      hitTest: vi.fn(),
      getBoundingClientRect: vi.fn(),
      getFirstLineEdges: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when painter has no hit', () => {
    vi.mocked(painter.hitTest).mockReturnValue(null);
    const tester = new HighlightDOMHitTester(facade, painter);
    expect(tester.findHighlightAtPoint(1, 2)).toBeNull();
    expect(painter.hitTest).toHaveBeenCalledWith(1, 2);
  });

  it('loads metadata from facade when painter returns an id', () => {
    const row = {
      id: 'hl-1',
      text: 'hi',
      colorRole: 'yellow',
    } as HighlightDataV2;
    vi.mocked(painter.hitTest).mockReturnValue('hl-1');
    vi.mocked(facade.get).mockReturnValue(row);

    const tester = new HighlightDOMHitTester(facade, painter);
    expect(tester.findHighlightAtPoint(5, 5)).toBe(row);
    expect(facade.get).toHaveBeenCalledWith('hl-1');
  });
});
