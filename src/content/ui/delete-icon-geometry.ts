/**
 * Pure geometry helpers for delete-icon pin chrome.
 * Keeps click-to-pin reliable when the icon sits outside the wash.
 */

export const DELETE_ICON_VISUAL_PX = 24;
export const DELETE_ICON_HIT_PX = 32;
export const DELETE_ICON_GAP_PX = 6;
/** Extra pad around icon box treated as non-dismiss (bridge to icon). */
export const DELETE_ICON_SAFE_PAD_PX = 12;

export type RectLike = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width?: number;
  height?: number;
};

/**
 * True if (x,y) is inside any icon rect expanded by safe pad (viewport coords).
 */
export function isPointNearDeleteIcon(
  x: number,
  y: number,
  iconRects: readonly RectLike[],
  padPx: number = DELETE_ICON_SAFE_PAD_PX,
): boolean {
  for (const r of iconRects) {
    if (
      x >= r.left - padPx &&
      x <= r.right + padPx &&
      y >= r.top - padPx &&
      y <= r.bottom + padPx
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Collect viewport bounding rects for live delete-icon elements.
 */
export function collectDeleteIconRects(
  root: ParentNode = typeof document !== 'undefined' ? document : (null as unknown as ParentNode),
): DOMRect[] {
  if (!root || typeof (root as Document).querySelectorAll !== 'function') {
    return [];
  }
  const nodes = (root as Document | Element).querySelectorAll('.underscore-delete-icon');
  const out: DOMRect[] = [];
  nodes.forEach((el) => {
    out.push((el as HTMLElement).getBoundingClientRect());
  });
  return out;
}
