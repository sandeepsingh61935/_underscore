import type { HighlightExcerpt } from '@/shared/llm/highlight-excerpts';
import type { PromptHighlight } from '@/shared/llm/prompts';
import { buildFallbackExcerpts } from '@/shared/llm/summarization-fallback';

export interface PrepareExcerptsResult {
  excerpts: HighlightExcerpt[];
  cacheNote: string | null;
  errorNote: string | null;
}

export type FetchPageContextFn = (
  highlights: Array<{ id?: string; url: string; text: string }>,
) => Promise<
  | { success: true; data: { highlightExcerpts?: HighlightExcerpt[]; cacheMissUrls: string[] } }
  | { success: false; error: string }
>;

export async function prepareHighlightExcerpts(
  highlights: PromptHighlight[],
  fetchPageContext: FetchPageContextFn,
): Promise<PrepareExcerptsResult> {
  const pageCtxResult = await fetchPageContext(
    highlights.map(h => ({ id: h.id, url: h.url, text: h.text })),
  );

  const excerpts = pageCtxResult.success && pageCtxResult.data.highlightExcerpts?.length
    ? pageCtxResult.data.highlightExcerpts
    : buildFallbackExcerpts(highlights).excerpts;

  let cacheNote: string | null = null;
  let errorNote: string | null = null;

  if (!pageCtxResult.success) {
    errorNote = pageCtxResult.error;
  } else if (pageCtxResult.data.cacheMissUrls.length > 0) {
    cacheNote = `Page cache miss for ${pageCtxResult.data.cacheMissUrls.length} URL(s) — using highlight quotes only for those pages.`;
  }

  return { excerpts, cacheNote, errorNote };
}
