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

export function buildScopeQueryRequest(input: BuildScopeQueryInput): LLMRequest {
  const { scope, excerpts, question } = input;
  return {
    systemPrompt: PROMPT_TEMPLATES.askScope(scope),
    messages: [{ role: 'user', content: formatScopeQueryUserContent(excerpts, question) }],
    maxTokens: computeScopeQueryOutputTokens(excerpts.length),
    temperature: SUMMARY_TEMPERATURE,
  };
}
