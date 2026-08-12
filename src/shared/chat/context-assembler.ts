/**
 * Multi-turn grounded context for chat (ADR-028 §7).
 *
 * - System / grounding rebuilt from live excerpts each send.
 * - Messages: last K user/assistant pairs (2K messages) + the new user turn.
 * - Live excerpts ride on the *latest* user message so askScope rules
 *   ("excerpts in the user message") still hold.
 */

import type { LLMMessage, LLMRequest } from '@/shared/interfaces/i-llm-service';
import type { HighlightExcerpt } from '@/shared/llm/highlight-excerpts';
import { PROMPT_TEMPLATES, type ScopeQueryContext } from '@/shared/llm/prompts';
import { formatExcerptUserContent } from '@/shared/llm/summary-request';
import { computeScopeQueryOutputTokens } from '@/shared/llm/summarization-tokens';
import { SUMMARY_TEMPERATURE } from '@/shared/llm/summary-request';

import { CHAT_QUOTAS, type ChatMessage } from './types';

export interface AssembleChatRequestInput {
  scope: ScopeQueryContext;
  excerpts: HighlightExcerpt[];
  /** Prior messages in chronological order (oldest first). */
  history: readonly ChatMessage[];
  /** New user question. */
  question: string;
  /** Pair window K (default 10 → 20 messages). */
  pairWindow?: number;
}

/**
 * Select completed user/assistant messages for the model window.
 * Skips streaming/failed/cancelled and empty assistant shells.
 */
export function selectContextMessages(
  history: readonly ChatMessage[],
  pairWindow: number = CHAT_QUOTAS.contextPairWindow,
): LLMMessage[] {
  const eligible = history.filter((m) => {
    if (m.status !== 'completed') return false;
    if (m.role === 'assistant' && !m.content.trim()) return false;
    return m.role === 'user' || m.role === 'assistant';
  });

  // Keep only full user→assistant pairs so failed/cancelled turns do not
  // leave unpaired user questions in the model window.
  const pairs: ChatMessage[] = [];
  for (let i = 0; i < eligible.length; i++) {
    const cur = eligible[i]!;
    const next = eligible[i + 1];
    if (cur.role === 'user' && next?.role === 'assistant') {
      pairs.push(cur, next);
      i += 1;
    }
  }

  const maxMessages = pairWindow * 2;
  const windowed =
    pairs.length > maxMessages ? pairs.slice(-maxMessages) : pairs;

  return windowed.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

function groundedUserContent(excerpts: HighlightExcerpt[], question: string): string {
  return [formatExcerptUserContent(excerpts), '', '## Question', question.trim()].join('\n');
}

/**
 * Build an LLMRequest with multi-turn history and live excerpts on the new user turn.
 * Stored history keeps plain user questions (not re-grounded dumps) for compact context.
 */
export function assembleChatRequest(input: AssembleChatRequestInput): LLMRequest {
  const pairWindow = input.pairWindow ?? CHAT_QUOTAS.contextPairWindow;
  const question = input.question.trim();
  if (!question) {
    throw new Error('assembleChatRequest requires a non-empty question');
  }

  const prior = selectContextMessages(input.history, pairWindow);
  // Drop a trailing user message that matches this question (already persisted).
  const withoutDup =
    prior.length > 0 &&
    prior[prior.length - 1]?.role === 'user' &&
    prior[prior.length - 1]?.content.trim() === question
      ? prior.slice(0, -1)
      : prior;

  const messages: LLMMessage[] = [
    ...withoutDup,
    { role: 'user', content: groundedUserContent(input.excerpts, question) },
  ];

  return {
    systemPrompt: PROMPT_TEMPLATES.askScope(input.scope),
    messages,
    maxTokens: computeScopeQueryOutputTokens(input.excerpts.length),
    temperature: SUMMARY_TEMPERATURE,
  };
}
