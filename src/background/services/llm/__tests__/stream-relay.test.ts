import { describe, it, expect, vi } from 'vitest';

import { handleStreamChat } from '../stream-relay';
import type { ILLMService, LLMRequest, LLMResult } from '@/shared/interfaces/i-llm-service';

function makePort(): {
  port: { postMessage: ReturnType<typeof vi.fn>; onDisconnect: { addListener: ReturnType<typeof vi.fn> } };
  posts: Array<{ type: string; payload?: unknown }>;
  triggerDisconnect: () => void;
} {
  const posts: Array<{ type: string; payload?: unknown }> = [];
  let disconnectHandler: () => void = () => {};
  const port = {
    postMessage: vi.fn((msg: { type: string; payload?: unknown }) => { posts.push(msg); }),
    onDisconnect: { addListener: vi.fn((cb: () => void) => { disconnectHandler = cb; }) },
  };
  return { port: port as any, posts, triggerDisconnect: () => disconnectHandler() };
}

describe('handleStreamChat', () => {
  it('forwards provider chunks to the port', async () => {
    const { port, posts } = makePort();
    const provider: ILLMService = {
      providerName: 'anthropic',
      capabilities: { contextWindow: 1, supportsSystemPrompt: true, supportsStreaming: true, supportsToolUse: false },
      streamChat: async (_req, onChunk, signal) => {
        onChunk({ delta: 'A' });
        onChunk({ delta: 'B' });
        return { text: 'AB', inputTokens: 1, outputTokens: 2, durationMs: 5 };
      },
      chat: async () => ({ text: '', inputTokens: 0, outputTokens: 0, durationMs: 0 }),
      healthCheck: async () => ({ ok: true, model: 'x' }),
    };

    const req: LLMRequest = { systemPrompt: 's', messages: [{ role: 'user', content: 'm' }], maxTokens: 10 };
    await handleStreamChat(port as any, provider, req);

    expect(posts.map(p => p.type)).toEqual(['CHUNK', 'CHUNK', 'DONE']);
    const done = posts[2].payload as LLMResult;
    expect(done.text).toBe('AB');
  });

  it('aborts the in-flight stream when the port disconnects', async () => {
    const { port, triggerDisconnect } = makePort();
    let aborted = false;
    const provider: ILLMService = {
      providerName: 'ollama',
      capabilities: { contextWindow: 1, supportsSystemPrompt: true, supportsStreaming: true, supportsToolUse: false },
      streamChat: async (_req, _onChunk, signal) => {
        return new Promise<LLMResult>((resolve, reject) => {
          signal.addEventListener('abort', () => { aborted = true; reject(new DOMException('aborted', 'AbortError')); });
        });
      },
      chat: async () => ({ text: '', inputTokens: 0, outputTokens: 0, durationMs: 0 }),
      healthCheck: async () => ({ ok: true, model: 'x' }),
    };

    const req: LLMRequest = { systemPrompt: 's', messages: [{ role: 'user', content: 'm' }], maxTokens: 10 };
    const promise = handleStreamChat(port as any, provider, req);
    triggerDisconnect();
    await expect(promise).rejects.toThrow();
    expect(aborted).toBe(true);
  });
});