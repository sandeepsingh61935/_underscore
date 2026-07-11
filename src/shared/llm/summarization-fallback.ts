import { buildHighlightExcerpts } from '@/shared/llm/highlight-excerpts';
import type { PromptContext } from '@/shared/llm/prompts';

export function buildFallbackExcerpts(
  highlights: PromptContext['highlights'],
): ReturnType<typeof buildHighlightExcerpts> {
  return buildHighlightExcerpts(
    highlights.map(h => ({ id: h.id, url: h.url, text: h.text })),
    () => null,
  );
}
