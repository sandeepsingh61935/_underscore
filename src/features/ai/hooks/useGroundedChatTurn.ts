/**
 * Hook wrapper around runGroundedTurn — one busy phase, one abort path.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { useLlmRuntime } from '@/features/ai/runtime/LlmRuntimeContext';
import {
  runGroundedTurn,
  type BeginTurnResult,
  type ChatMessage,
  type ChatScope,
  type ChatService,
  type MessageWriteResult,
} from '@/shared/chat';
import type { HighlightExcerpt } from '@/shared/llm/highlight-excerpts';
import type { ProviderName } from '@/shared/interfaces/i-llm-service';

export type GroundedTurnPhase = 'idle' | 'running';

export function useGroundedChatTurn(opts: {
  userId: string | null | undefined;
  service: ChatService | null;
  activeThreadId: string | null;
  messages: ChatMessage[];
  onTurnStarted: (turn: BeginTurnResult) => void;
  onStreamText: (assistantId: string, content: string) => void;
  onTurnFinished: (result: MessageWriteResult) => void;
}): {
  phase: GroundedTurnPhase;
  busy: boolean;
  error: string | null;
  streamText: string;
  inflightAssistantId: string | null;
  clearError: () => void;
  send: (input: {
    question: string;
    scope: ChatScope;
    excerpts: HighlightExcerpt[];
    provider: ProviderName;
    model?: string;
  }) => Promise<void>;
  abort: () => void;
} {
  const runtime = useLlmRuntime();
  const [phase, setPhase] = useState<GroundedTurnPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [streamText, setStreamText] = useState('');
  const [inflightAssistantId, setInflightAssistantId] = useState<string | null>(
    null,
  );

  const runningRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const assistantIdRef = useRef<string | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const clearError = useCallback(() => setError(null), []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const send = useCallback(
    async (input: {
      question: string;
      scope: ChatScope;
      excerpts: HighlightExcerpt[];
      provider: ProviderName;
      model?: string;
    }) => {
      const { userId, service, activeThreadId, messages } = optsRef.current;
      if (!userId || !service) {
        setError('Sign in required to save chat history.');
        return;
      }
      if (runningRef.current) return;

      runningRef.current = true;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setPhase('running');
      setError(null);
      setStreamText('');
      setInflightAssistantId(null);
      assistantIdRef.current = null;

      const history = messages.filter((m) => m.status === 'completed');

      try {
        const result = await runGroundedTurn({
          service,
          runtime,
          userId,
          threadId: activeThreadId,
          scope: input.scope,
          question: input.question,
          history,
          excerpts: input.excerpts,
          provider: input.provider,
          model: input.model,
          signal: controller.signal,
          onTurnStarted: (turn) => {
            assistantIdRef.current = turn.assistantMessage.id;
            setInflightAssistantId(turn.assistantMessage.id);
            optsRef.current.onTurnStarted(turn);
          },
          onChunk: (text) => {
            setStreamText(text);
            const id = assistantIdRef.current;
            if (id) optsRef.current.onStreamText(id, text);
          },
        });

        optsRef.current.onTurnFinished({
          message: result.turn.assistantMessage,
          thread: result.thread,
        });

        if (result.outcome === 'failed' && result.errorMessage) {
          setError(result.errorMessage);
        }
      } catch (err) {
        setError((err as Error).message || 'Could not complete chat turn');
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        assistantIdRef.current = null;
        setInflightAssistantId(null);
        runningRef.current = false;
        setPhase('idle');
      }
    },
    [runtime],
  );

  return {
    phase,
    busy: phase === 'running',
    error,
    streamText,
    inflightAssistantId,
    clearError,
    send,
    abort,
  };
}
