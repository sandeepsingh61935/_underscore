import {
  compressPageText,
  findSpanMatchesInPageText,
} from '@/shared/llm/build-page-context';
import type { PageContentEntry } from '@/shared/llm/build-page-context';
import { normalizePageUrl } from '@/shared/utils/normalize-page-url';

export interface HighlightExcerptInput {
  id?: string;
  url: string;
  text: string;
}

export interface HighlightExcerpt {
  id: string;
  url: string;
  highlightText: string;
  pageTitle: string;
  /** Local window around the highlight with <mark> tags. */
  excerpt: string;
}

/** Characters of surrounding context on each side of a highlight span. */
export const EXCERPT_RADIUS_CHARS = 400;

export function extractExcerptWindow(
  pageText: string,
  highlight: string,
  radius = EXCERPT_RADIUS_CHARS
): string {
  const trimmed = highlight.trim();
  if (!trimmed) return '';

  const matches = findSpanMatchesInPageText(pageText, trimmed);
  const match = matches[0];
  if (!match) return `<mark>${trimmed}</mark>`;

  const start = Math.max(0, match.start - radius);
  const end = Math.min(pageText.length, match.end + radius);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < pageText.length ? '…' : '';
  const before = pageText.slice(start, match.start);
  const marked = pageText.slice(match.start, match.end);
  const after = pageText.slice(match.end, end);
  return `${prefix}${before}<mark>${marked}</mark>${after}${suffix}`;
}

export function buildHighlightExcerpts(
  highlights: HighlightExcerptInput[],
  getContent: (normalizedUrl: string) => PageContentEntry | null
): { excerpts: HighlightExcerpt[]; cacheMissUrls: string[] } {
  const cacheMissUrls: string[] = [];
  const excerpts: HighlightExcerpt[] = [];

  for (const [index, highlight] of highlights.entries()) {
    const normalizedUrl = normalizePageUrl(highlight.url);
    const cached = getContent(normalizedUrl);
    const id = highlight.id ?? `hl-${index}`;
    const text = highlight.text.trim();
    if (!text) continue;

    if (cached) {
      const compressed = compressPageText(cached.text);
      excerpts.push({
        id,
        url: cached.url,
        highlightText: text,
        pageTitle: cached.title,
        excerpt: extractExcerptWindow(compressed, text),
      });
    } else {
      if (!cacheMissUrls.includes(highlight.url)) cacheMissUrls.push(highlight.url);
      excerpts.push({
        id,
        url: highlight.url,
        highlightText: text,
        pageTitle: highlight.url,
        excerpt: `<mark>${text}</mark>`,
      });
    }
  }

  return { excerpts, cacheMissUrls };
}

export function formatExcerptsForPrompt(excerpts: HighlightExcerpt[]): string {
  return excerpts
    .map((ex, i) => {
      const header = `[${i + 1}] ${ex.pageTitle} (${ex.url})`;
      return `${header}\nHighlight: "${ex.highlightText.replace(/"/g, '\\"')}"\nContext: ${ex.excerpt}`;
    })
    .join('\n\n');
}
