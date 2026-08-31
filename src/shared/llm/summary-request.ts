import type { LLMRequest } from '@/shared/interfaces/i-llm-service';
import type { HighlightExcerpt } from '@/shared/llm/highlight-excerpts';
import { formatExcerptsForPrompt } from '@/shared/llm/highlight-excerpts';
import { PROMPT_TEMPLATES, type PromptContext } from '@/shared/llm/prompts';
import {
  computeDomainOutputTokens,
  computeSectionOutputTokens,
} from '@/shared/llm/summarization-tokens';

/** Low temperature keeps summaries faithful to source material. */
export const SUMMARY_TEMPERATURE = 0.35;

export interface SectionDigest {
  sectionKey: string;
  summary: string;
  highlightCount: number;
}

/**
 * Formats excerpt windows for the LLM (no full-page body).
 */
export function formatExcerptUserContent(excerpts: HighlightExcerpt[]): string {
  return [
    '## Highlight excerpts (each numbered item must appear in the summary)',
    formatExcerptsForPrompt(excerpts),
  ].join('\n');
}

export function buildExcerptSummaryRequest(
  ctx: PromptContext,
  excerpts: HighlightExcerpt[]
): LLMRequest {
  const count = excerpts.length;
  const length = ctx.length ?? 'medium';
  return {
    systemPrompt: PROMPT_TEMPLATES.summarizeExcerpts(ctx),
    messages: [{ role: 'user', content: formatExcerptUserContent(excerpts) }],
    maxTokens: computeSectionOutputTokens(count, length),
    temperature: SUMMARY_TEMPERATURE,
  };
}

export function buildReduceDomainRequest(
  domain: string,
  sectionDigests: SectionDigest[],
  totalHighlights: number
): LLMRequest {
  const body = sectionDigests
    .map((d) => `### ${d.sectionKey} (${d.highlightCount} highlights)\n${d.summary}`)
    .join('\n\n');

  return {
    systemPrompt: PROMPT_TEMPLATES.reduceDomainSynthesis(
      domain,
      totalHighlights,
      sectionDigests.length
    ),
    messages: [
      {
        role: 'user',
        content: [
          '## Section summaries',
          body,
          '',
          'Synthesize cross-section themes, connections, and any tensions. Use clear prose with short headings if helpful.',
        ].join('\n'),
      },
    ],
    maxTokens: computeDomainOutputTokens(totalHighlights, sectionDigests.length),
    temperature: SUMMARY_TEMPERATURE,
  };
}

/** @deprecated Use buildExcerptSummaryRequest — kept for tests migrating off full-page body. */
export function buildSummaryRequest(ctx: PromptContext): LLMRequest {
  const excerpts: HighlightExcerpt[] = ctx.highlights.map((h) => ({
    id: h.id,
    url: h.url,
    highlightText: h.text,
    pageTitle: ctx.pageTitle,
    excerpt: `<mark>${h.text}</mark>`,
  }));
  return buildExcerptSummaryRequest(ctx, excerpts);
}
