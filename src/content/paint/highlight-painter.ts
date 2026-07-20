/**
 * @file highlight-painter.ts
 * @description Single seam for on-page highlight visibility.
 */

import type { ColorRole } from '@/shared/schemas/highlight-schema';

export interface FirstLineEdges {
  start: DOMRect;
  end: DOMRect;
}

export interface HighlightPainter {
  paint(id: string, ranges: Range[], colorRole: ColorRole): void;
  unpaint(id: string): void;
  clear(): void;
  hitTest(x: number, y: number): string | null;
  /** First client rect (legacy); prefer getFirstLineEdges for icon placement. */
  getBoundingClientRect(id: string): DOMRect | null;
  /** First-line start/end client rects for exterior chrome placement. */
  getFirstLineEdges(id: string): FirstLineEdges | null;
}
