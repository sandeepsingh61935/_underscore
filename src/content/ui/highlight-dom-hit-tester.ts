/**
 * Hit-test highlights using the same geometry as the HighlightPainter.
 * Facade supplies metadata; painter owns live Range geometry.
 */

import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import type { RepositoryFacade } from '@/shared/repositories';
import type { HighlightPainter } from '@/content/paint/highlight-painter';
import { getHighlightPainter } from '@/content/paint/range-overlay-painter';

export class HighlightDOMHitTester {
  constructor(
    private repositoryFacade: RepositoryFacade,
    private painter: HighlightPainter = getHighlightPainter()
  ) {}

  public findHighlightAtPoint(x: number, y: number): HighlightDataV2 | null {
    const id = this.painter.hitTest(x, y);
    if (!id) return null;
    return this.repositoryFacade.get(id) ?? null;
  }
}
