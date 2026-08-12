import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';

import { LlmRuntimeProvider } from '@/features/ai/runtime/LlmRuntimeContext';
import type { ILlmRuntime } from '@/shared/llm/runtime';
import { useLLMStream } from '../useLLMStream';

describe('useLLMStream', () => {
  let onEvent: ((e: unknown) => void) | null = null;
  let abortSignal: AbortSignal | null = null;

  const runtime: ILlmRuntime = {
    streamChat: (_args, emit, signal) =>
      new Promise<void>((resolve) => {
        onEvent = (e: unknown) => {
          emit(e as Parameters<typeof emit>[0]);
          const t = (e as { type: string }).type;
          if (t === 'DONE' || t === 'ERROR') resolve();
        };
        abortSignal = signal;
        signal.addEventListener('abort', () => resolve(), { once: true });
      }),
  };

  beforeEach(() => {
    onEvent = null;
    abortSignal = null;
  });

  function wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      LlmRuntimeProvider,
      { runtime, children },
    );
  }

  it('accumulates chunks and flips status to done', async () => {
    const { result } = renderHook(() => useLLMStream(), { wrapper });
    act(() => {
      result.current.start({
        template: 'explain',
        highlights: [],
        request: {
          systemPrompt: 's',
          messages: [{ role: 'user', content: 'm' }],
          maxTokens: 10,
        },
      });
    });
    expect(result.current.status).toBe('streaming');

    await act(async () => {
      onEvent?.({ type: 'CHUNK', payload: { delta: 'hello ' } });
      onEvent?.({ type: 'CHUNK', payload: { delta: 'world' } });
      onEvent?.({
        type: 'DONE',
        payload: { text: 'hello world', inputTokens: 1, outputTokens: 1, durationMs: 1 },
      });
    });

    expect(result.current.chunks).toBe('hello world');
    expect(result.current.status).toBe('done');
  });

  it('abort() resets status to idle', () => {
    const { result } = renderHook(() => useLLMStream(), { wrapper });
    act(() => {
      result.current.start({
        template: 'explain',
        highlights: [],
        request: {
          systemPrompt: 's',
          messages: [{ role: 'user', content: 'm' }],
          maxTokens: 10,
        },
      });
    });
    act(() => result.current.abort());
    expect(result.current.status).toBe('idle');
    expect(abortSignal?.aborted).toBe(true);
  });
});
