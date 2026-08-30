/**
 * @file buildPagerItems.ts
 * @description Compact page-number list for numbered pagination (boundaries +
 * current window + ellipses). Pure helper — no React.
 */

export type PagerItem =
  | { type: 'page'; page: number }
  | { type: 'ellipsis'; key: string };

export type BuildPagerItemsOptions = {
  /** Pages shown on each side of the current page. Default 1. */
  siblingCount?: number;
  /** Pages always shown at the start and end. Default 1. */
  boundaryCount?: number;
};

/**
 * Build a compact sequence of page buttons and ellipsis gaps.
 *
 * Example (current=9, total=20, sibling=1, boundary=1):
 * `1 … 8 9 10 … 20`
 */
export function buildPagerItems(
  current: number,
  total: number,
  opts: BuildPagerItemsOptions = {},
): PagerItem[] {
  const siblingCount = Math.max(0, opts.siblingCount ?? 1);
  const boundaryCount = Math.max(0, opts.boundaryCount ?? 1);

  if (!Number.isFinite(total) || total < 1) return [];
  const last = Math.floor(total);
  const cur = Math.min(Math.max(1, Math.floor(current) || 1), last);

  const pages = new Set<number>();

  for (let i = 1; i <= Math.min(boundaryCount, last); i += 1) {
    pages.add(i);
  }
  for (let i = Math.max(last - boundaryCount + 1, 1); i <= last; i += 1) {
    pages.add(i);
  }
  for (
    let i = Math.max(cur - siblingCount, 1);
    i <= Math.min(cur + siblingCount, last);
    i += 1
  ) {
    pages.add(i);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const items: PagerItem[] = [];
  let prev = 0;

  for (const page of sorted) {
    if (prev > 0) {
      if (page - prev === 2) {
        // Single gap — show the page instead of an ellipsis.
        items.push({ type: 'page', page: prev + 1 });
      } else if (page - prev > 2) {
        items.push({ type: 'ellipsis', key: `e-${prev}-${page}` });
      }
    }
    items.push({ type: 'page', page });
    prev = page;
  }

  return items;
}

/** Clamp a requested page into `[1, total]` (total floor at 1). */
export function clampPage(page: number, total: number): number {
  const last = Math.max(1, Math.floor(total) || 1);
  if (!Number.isFinite(page)) return 1;
  return Math.min(Math.max(1, Math.floor(page)), last);
}
