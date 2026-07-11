import type { HighlightExcerpt } from '@/shared/llm/highlight-excerpts';
import type { PromptContext } from '@/shared/llm/prompts';
import { buildExcerptSummaryRequest } from '@/shared/llm/summary-request';

import type { LLMRequest, LLMResult, ProviderName } from '@/shared/interfaces/i-llm-service';

export type ChatFn = (
  request: LLMRequest,
  provider?: ProviderName,
) => Promise<{ success: true; data: LLMResult } | { success: false; error: string }>;

/** One batched excerpt call per section — no per-highlight map step. */
export async function summarizeSectionText(
  ctx: PromptContext,
  excerpts: HighlightExcerpt[],
  chat: ChatFn,
  provider?: ProviderName,
): Promise<string> {
  if (excerpts.length === 0) throw new Error('No highlights to summarize');

  const response = await chat(buildExcerptSummaryRequest(ctx, excerpts), provider);
  if (!response.success) throw new Error(response.error);
  return response.data.text.trim();
}
