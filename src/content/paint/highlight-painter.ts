/**
 * @file highlight-painter.ts
 * @description Single seam for on-page highlight visibility.
 *
 * Modes own persistence and session data; they never touch CSS.highlights or
 * overlay DOM directly. One implementation (RangeOverlayPainter) paints today.
 */

import type { ColorRole } from '@/shared/schemas/highlight-schema';

export interface HighlightPainter {
  /** Paint (or replace) visible highlight for id from live Ranges. */
  paint(id: string, ranges: Range[], colorRole: ColorRole): void;

  /** Remove paint for one id. */
  unpaint(id: string): void;

  /** Remove all paint. */
  clear(): void;

  /**
   * Hit-test against painted geometry.
   * @returns highlight id under (x,y) in client coords, or null
   */
  hitTest(x: number, y: number): string | null;

  /** First client rect for UI chrome (delete icon). Null if not painted. */
  getBoundingClientRect(id: string): DOMRect | null;
}
