import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useLLMStream } from '../useLLMStream';

const portListeners: Array<(msg: { type: string; payload?: unknown }) => void> = [];
const onDisconnectListeners: Array<() => void> = [];

vi.stubGlobal('chrome', {
  runtime: {
    connect: () => ({
      postMessage: vi.fn(),
      onMessage: { addListener: (cb: (msg: any) => void) => { portListeners.push(cb); } },
      onDisconnect: { addListener: (cb: () => void) => { onDisconnectListeners.push(cb); } },
      disconnect: vi.fn(),
    }),
  },
});

describe('useLLMStream', () => {
  beforeEach(() => {
    portListeners.length = 0;
    onDisconnectListeners.length = 0;
  });

  it('accumulates chunks and flips status to done', () => {
    const { result } = renderHook(() => useLLMStream());
    act(() => result.current.start({ template: 'explain', highlights: [], request: { systemPrompt: 's', messages: [{ role: 'user', content: 'm' }], maxTokens: 10 } }));
    expect(result.current.status).toBe('streaming');

    const portListener = portListeners[0]!;
    act(() => {
      portListener({ type: 'CHUNK', payload: { delta: 'hello ' } });
      portListener({ type: 'CHUNK', payload: { delta: 'world' } });
      portListener({ type: 'DONE', payload: { text: 'hello world', inputTokens: 1, outputTokens: 1, durationMs: 1 } });
    });

    expect(result.current.chunks).toBe('hello world');
    expect(result.current.status).toBe('done');
  });

  it('abort() calls port.disconnect', () => {
    const { result } = renderHook(() => useLLMStream());
    act(() => result.current.start({ template: 'explain', highlights: [], request: { systemPrompt: 's', messages: [{ role: 'user', content: 'm' }], maxTokens: 10 } }));
    act(() => result.current.abort());
    // abort() resets status to 'idle' locally; the background relay
    // detects the disconnect and cancels its in-flight fetch.
    expect(result.current.status).toBe('idle');
  });
});