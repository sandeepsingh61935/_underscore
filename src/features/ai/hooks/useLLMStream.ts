import { useCallback, useRef, useState } from 'react';

import { useLlmRuntime } from '@/features/ai/runtime/LlmRuntimeContext';
import type { LlmStreamArgs } from '@/shared/llm/runtime';

export type StreamStatus = 'idle' | 'streaming' | 'done' | 'error';

export type StreamStartArgs = LlmStreamArgs;

export function useLLMStream(): {
  chunks: string;
  status: StreamStatus;
  error: string | null;
  start: (args: StreamStartArgs) => void;
  abort: () => void;
} {
  const runtime = useLlmRuntime();
  const abortRef = useRef<AbortController | null>(null);
  const [chunks, setChunks] = useState('');
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(
    (args: StreamStartArgs) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setChunks('');
      setError(null);
      setStatus('streaming');

      void runtime
        .streamChat(
          { request: args.request, provider: args.provider },
          (event) => {
            if (event.type === 'CHUNK' && event.payload.delta) {
              setChunks((c) => c + event.payload.delta);
            } else if (event.type === 'DONE') {
              setStatus('done');
            } else if (event.type === 'ERROR') {
              setStatus('error');
              setError(event.payload.message ?? 'unknown');
            }
          },
          controller.signal,
        )
        .catch((err: Error) => {
          if (controller.signal.aborted) return;
          setStatus('error');
          setError(err.message ?? 'unknown');
        });
    },
    [runtime],
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus('idle');
  }, []);

  return { chunks, status, error, start, abort };
}
