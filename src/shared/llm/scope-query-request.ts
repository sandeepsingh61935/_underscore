/**
 * One-shot grounded ask request (MCP / legacy).
 * Same prompt + user content shape as empty-history assembleChatRequest
 * Kept for MCP one-shot grounded questions.
 */

import type { HighlightExcerpt } from '@/shared/llm/highlight-excerpts';
import { formatExcerptUserContent } from '@/shared/llm/summary-request';
import { PROMPT_TEMPLATES, type ScopeQueryContext } from '@/shared/llm/prompts';
import { computeScopeQueryOutputTokens } from '@/shared/llm/summarization-tokens';
import { SUMMARY_TEMPERATURE } from '@/shared/llm/summary-request';

import type { LLMRequest } from '@/shared/interfaces/i-llm-service';

export interface BuildScopeQueryInput {
  scope: ScopeQueryContext;
  excerpts: HighlightExcerpt[];
  question: string;
}

export function formatScopeQueryUserContent(excerpts: HighlightExcerpt[], question: string): string {
  return [
    formatExcerptUserContent(excerpts),
    '',
    '## Question',
    question.trim(),
  ].join('\n');
}

/**
 * One-shot LLMRequest: equivalent to assembleChatRequest with empty history.
 * Do not fork prompt policy here — keep in lockstep with context-assembler.
 */
export function buildScopeQueryRequest(input: BuildScopeQueryInput): LLMRequest {
  const question = input.question.trim();
  if (!question) {
    throw new Error('buildScopeQueryRequest requires a non-empty question');
  }
  return {
    systemPrompt: PROMPT_TEMPLATES.askScope(input.scope),
    messages: [
      { role: 'user', content: formatScopeQueryUserContent(input.excerpts, question) },
    ],
    maxTokens: computeScopeQueryOutputTokens(input.excerpts.length),
    temperature: SUMMARY_TEMPERATURE,
  };
}
