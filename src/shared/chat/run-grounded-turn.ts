/**
 * Single-turn orchestrator: begin → stream → finalize (ADR-028 §6 + ADR-027).
 * UI must not re-implement status-transition machines.
 */

import type { ProviderName } from '@/shared/interfaces/i-llm-service';
import type { HighlightExcerpt } from '@/shared/llm/highlight-excerpts';
import type { ILlmRuntime } from '@/shared/llm/runtime';

import { assembleChatRequest } from './context-assembler';
import { scopeKindForPrompt, scopeLabel } from './chat-scope';
import type { ChatService, BeginTurnResult } from './chat-service';
import type { ChatMessage, ChatScope, ChatThread } from './types';

export type TurnOutcome = 'completed' | 'failed' | 'cancelled';

export interface RunGroundedTurnInput {
  service: ChatService;
  runtime: ILlmRuntime;
  userId: string;
  threadId: string | null;
  scope: ChatScope;
  question: string;
  /** Completed messages only (prior turns). */
  history: readonly ChatMessage[];
  excerpts: HighlightExcerpt[];
  provider: ProviderName;
  model?: string;
  signal: AbortSignal;
  onTurnStarted?: (turn: BeginTurnResult) => void;
  onChunk?: (textSoFar: string) => void;
}

export interface RunGroundedTurnResult {
  outcome: TurnOutcome;
  content: string;
  turn: BeginTurnResult;
  thread: ChatThread;
  errorMessage?: string;
}

export async function runGroundedTurn(
  input: RunGroundedTurnInput,
): Promise<RunGroundedTurnResult> {
  const question = input.question.trim();
  if (!question) throw new Error('Question is required');

  const turn = await input.service.beginTurn({
    userId: input.userId,
    threadId: input.threadId,
    scope: input.scope,
    question,
    provider: input.provider,
    model: input.model,
  });
  input.onTurnStarted?.(turn);

  let content = '';
  let outcome: TurnOutcome = 'completed';
  let errorMessage: string | undefined;

  const request = assembleChatRequest({
    scope: {
      scopeLabel: scopeLabel(input.scope),
      scopeKind: scopeKindForPrompt(input.scope),
      highlightCount: input.excerpts.length,
    },
    excerpts: input.excerpts,
    history: input.history,
    question,
  });

  try {
    await input.runtime.streamChat(
      { request, provider: input.provider },
      (event) => {
        if (event.type === 'CHUNK' && event.payload.delta) {
          content += event.payload.delta;
          input.onChunk?.(content);
        } else if (event.type === 'ERROR') {
          outcome = 'failed';
          errorMessage = event.payload.message ?? 'unknown';
        } else if (event.type === 'DONE') {
          outcome = 'completed';
        }
      },
      input.signal,
    );
  } catch (err) {
    if (input.signal.aborted) {
      outcome = 'cancelled';
    } else {
      outcome = 'failed';
      errorMessage = (err as Error).message || 'Stream failed';
    }
  }

  if (input.signal.aborted) {
    outcome = 'cancelled';
  }

  const write = await input.service.finalizeTurn({
    userId: input.userId,
    assistantMessageId: turn.assistantMessage.id,
    content,
    status: outcome,
    provider: input.provider,
    model: input.model,
  });

  return {
    outcome,
    content,
    turn: {
      ...turn,
      thread: write.thread,
      assistantMessage: write.message,
    },
    thread: write.thread,
    errorMessage,
  };
}
