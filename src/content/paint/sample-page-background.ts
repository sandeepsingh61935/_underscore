/**
 * @file sample-page-background.ts
 * @description Walk ancestors from a Range to find a non-transparent background.
 */

/**
 * Return computed backgroundColor of the first non-transparent ancestor
 * of the range's common ancestor, or light paper fallback.
 */
export function sampleBackgroundNearRange(range: Range): string {
  let node: Node | null = range.commonAncestorContainer;
  if (node && node.nodeType === Node.TEXT_NODE) {
    node = node.parentElement;
  }

  let el = node as Element | null;
  while (el && el !== document.documentElement) {
    try {
      const bg = window.getComputedStyle(el).backgroundColor;
      if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
        const alphaMatch = bg.match(/rgba?\([^)]+,\s*([\d.]+)\s*\)/);
        if (alphaMatch && parseFloat(alphaMatch[1]!) <= 0.01) {
          el = el.parentElement;
          continue;
        }
        return bg;
      }
    } catch {
      // ignore
    }
    el = el?.parentElement ?? null;
  }

  try {
    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
    if (bodyBg && bodyBg !== 'transparent' && bodyBg !== 'rgba(0, 0, 0, 0)') {
      return bodyBg;
    }
  } catch {
    // ignore
  }

  return 'rgb(255, 255, 255)';
}
