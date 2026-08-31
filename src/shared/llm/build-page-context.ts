import type { HighlightExcerpt } from '@/shared/llm/highlight-excerpts';
import { normalizePageUrl } from '@/shared/utils/normalize-page-url';

export interface PageContentEntry {
  url: string;
  title: string;
  text: string;
  truncated: boolean;
}

export interface HighlightForContext {
  url: string;
  text: string;
}

export interface BuiltPageContext {
  pageTitle: string;
  pageUrl: string;
  /** Legacy full-page marked body — not used by the excerpt summarization pipeline. */
  pageContextWithMarks: string;
  pageContext: string;
  cacheMissUrls: string[];
  /** Tight excerpt windows around each highlight (attached by IPC handler). */
  highlightExcerpts?: HighlightExcerpt[];
}

/** Collapse noisy whitespace so LLM input stays focused. */
export function compressPageText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function findSpanMatchesInPageText(
  pageText: string,
  highlight: string
): Array<{ start: number; end: number }> {
  if (!highlight) return [];

  const matches: Array<{ start: number; end: number }> = [];
  let searchFrom = 0;
  while (searchFrom < pageText.length) {
    const idx = pageText.indexOf(highlight, searchFrom);
    if (idx === -1) break;
    matches.push({ start: idx, end: idx + highlight.length });
    searchFrom = idx + highlight.length;
  }
  if (matches.length > 0) return matches;

  const trimmed = highlight.trim();
  if (!trimmed) return [];

  const pattern = escapeRegExp(trimmed).replace(/\s+/g, '\\s+');
  const re = new RegExp(pattern, 'g');
  let fuzzy: RegExpExecArray | null;
  while ((fuzzy = re.exec(pageText)) !== null) {
    matches.push({ start: fuzzy.index, end: fuzzy.index + fuzzy[0].length });
  }
  return matches;
}

/**
 * Wrap every occurrence of each highlight span in `<mark>` within page text.
 * Longer spans are processed first; replacements apply right-to-left to preserve indices.
 */
export function injectMarksIntoPageText(
  pageText: string,
  highlightTexts: string[]
): string {
  const unique = [...new Set(highlightTexts.filter(Boolean))].sort(
    (a, b) => b.length - a.length
  );
  const spans: Array<{ start: number; end: number }> = [];

  for (const text of unique) {
    spans.push(...findSpanMatchesInPageText(pageText, text));
  }

  if (spans.length === 0) return pageText;

  spans.sort((a, b) => b.start - a.start);
  let result = pageText;
  for (const { start, end } of spans) {
    result = `${result.slice(0, start)}<mark>${result.slice(start, end)}</mark>${result.slice(end)}`;
  }
  return result;
}

/**
 * Build LLM page context for one or more URLs. Uses cached full-page text when
 * available; falls back to marked highlight quotes when cache misses.
 */
export function buildMarkedPageContext(
  highlights: HighlightForContext[],
  getContent: (normalizedUrl: string) => PageContentEntry | null
): BuiltPageContext {
  const byUrl = new Map<string, HighlightForContext[]>();
  for (const highlight of highlights) {
    const key = normalizePageUrl(highlight.url);
    const list = byUrl.get(key) ?? [];
    list.push(highlight);
    byUrl.set(key, list);
  }

  const markedSections: string[] = [];
  const plainSections: string[] = [];
  const cacheMissUrls: string[] = [];
  let primaryUrl = '';
  let primaryTitle = '';
  let maxHighlights = 0;

  for (const [normalizedUrl, urlHighlights] of byUrl) {
    const cached = getContent(normalizedUrl);
    const displayUrl = cached?.url ?? urlHighlights[0]?.url ?? normalizedUrl;
    const highlightTexts = [...new Set(urlHighlights.map((h) => h.text).filter(Boolean))];

    if (urlHighlights.length > maxHighlights) {
      maxHighlights = urlHighlights.length;
      primaryUrl = displayUrl;
      primaryTitle = cached?.title ?? displayUrl;
    }

    if (cached) {
      const compressed = compressPageText(cached.text);
      const marked = injectMarksIntoPageText(compressed, highlightTexts);
      const truncatedNote = cached.truncated ? ' [truncated]' : '';
      markedSections.push(
        `Page: ${cached.title} (${cached.url})${truncatedNote}\n${marked}`
      );
      plainSections.push(compressed);
    } else {
      cacheMissUrls.push(displayUrl);
      const fallback = highlightTexts.map((text) => `<mark>${text}</mark>`).join('\n\n');
      markedSections.push(
        `Page: ${displayUrl} [page content not cached — using highlights only]\n${fallback}`
      );
      plainSections.push(highlightTexts.join('\n\n'));
    }
  }

  return {
    pageTitle: primaryTitle,
    pageUrl: primaryUrl,
    pageContextWithMarks: markedSections.join('\n\n'),
    pageContext: plainSections.join('\n\n'),
    cacheMissUrls,
  };
}
