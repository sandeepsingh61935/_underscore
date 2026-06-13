import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import type { RepositoryFacade } from '@/shared/repositories';

export class HighlightDOMHitTester {
  constructor(private repositoryFacade: RepositoryFacade) {}

  public findHighlightAtPoint(x: number, y: number): HighlightDataV2 | null {
    const highlights = this.repositoryFacade.getAll();
    const matches: HighlightDataV2[] = [];

    for (const highlight of highlights) {
      if (this.isPointInHighlight(highlight, x, y)) {
        matches.push(highlight);
      }
    }

    if (matches.length > 0) {
      matches.sort((a, b) => a.text.length - b.text.length);
      return matches[0] || null;
    }
    return null;
  }

  private isPointInHighlight(highlight: HighlightDataV2, x: number, y: number): boolean {
    const highlightName = `underscore-${highlight.id}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nativeHighlight = (CSS as any).highlights?.get(highlightName);
    
    if (!nativeHighlight) return false;

    for (const abstractRange of nativeHighlight) {
      const range = abstractRange as Range;
      const rects = range.getClientRects();
      for (let i = 0; i < rects.length; i++) {
        const rect = rects[i];
        if (rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          return true;
        }
      }
    }
    return false;
  }
}
