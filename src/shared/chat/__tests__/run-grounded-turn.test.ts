import { describe, expect, it, vi } from 'vitest';

import type { HighlightExcerpt } from '@/shared/llm/highlight-excerpts';
import type { ILlmRuntime } from '@/shared/llm/runtime';

import { ChatService } from '../chat-service';
import { runGroundedTurn } from '../run-grounded-turn';
import type { IChatRepository } from '../i-chat-repository';
import type { ChatMessage, ChatThread, MessageWriteResult } from '../types';

const excerpts: HighlightExcerpt[] = [
  {
    id: 'h1',
    url: 'https://example.com',
    highlightText: 'note',
    pageTitle: 'Example',
    excerpt: '…note…',
  },
];

function thr(): ChatThread {
  return {
    id: 't1',
    userId: 'u1',
    title: 'hi',
    scope: { kind: 'library' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function msg(p: Partial<ChatMessage> & Pick<ChatMessage, 'id' | 'role' | 'content' | 'status'>): ChatMessage {
  return {
    threadId: 't1',
    userId: 'u1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...p,
  };
}

function write(m: ChatMessage, t: ChatThread = thr()): MessageWriteResult {
  return { message: m, thread: t };
}

describe('runGroundedTurn', () => {
  it('begin → stream chunks → finalize completed', async () => {
    const t = thr();
    const userMsg = msg({ id: 'u', role: 'user', content: 'hi', status: 'completed' });
    const asst = msg({
      id: 'a',
      role: 'assistant',
      content: '',
      status: 'streaming',
    });
    const done = msg({
      id: 'a',
      role: 'assistant',
      content: 'answer',
      status: 'completed',
    });

    const repo: IChatRepository = {
      listThreads: vi.fn(),
      getThread: vi.fn(),
      findThreadByScope: vi.fn().mockResolvedValue(null),
      clearMessages: vi.fn().mockResolvedValue(undefined),
      createThread: vi.fn().mockResolvedValue(t),
      updateThread: vi.fn(),
      deleteThread: vi.fn(),
      countThreads: vi.fn(),
      listMessages: vi.fn(),
      appendMessage: vi
        .fn()
        .mockResolvedValueOnce(write(userMsg, t))
        .mockResolvedValueOnce(write(asst, t)),
      finalizeMessage: vi.fn().mockResolvedValue(write(done, t)),
      countMessages: vi.fn().mockResolvedValue(0),
    };

    const runtime: ILlmRuntime = {
      streamChat: vi.fn(async (_args, onEvent) => {
        onEvent({ type: 'CHUNK', payload: { delta: 'ans' } });
        onEvent({ type: 'CHUNK', payload: { delta: 'wer' } });
        onEvent({ type: 'DONE', payload: {} as never });
      }),
    };

    const chunks: string[] = [];
    const service = new ChatService(repo);
    const result = await runGroundedTurn({
      service,
      runtime,
      userId: 'u1',
      threadId: null,
      scope: { kind: 'library' },
      question: 'hi',
      history: [],
      excerpts,
      provider: 'openai',
      signal: new AbortController().signal,
      onChunk: (text) => chunks.push(text),
    });

    expect(result.outcome).toBe('completed');
    expect(result.content).toBe('answer');
    expect(chunks).toEqual(['ans', 'answer']);
    expect(repo.finalizeMessage).toHaveBeenCalledWith(
      'u1',
      'a',
      expect.objectContaining({ status: 'completed', content: 'answer' }),
    );
  });

  it('finalizes cancelled when signal aborts during stream', async () => {
    const t = thr();
    const userMsg = msg({ id: 'u', role: 'user', content: 'hi', status: 'completed' });
    const asst = msg({
      id: 'a',
      role: 'assistant',
      content: '',
      status: 'streaming',
    });
    const cancelled = msg({
      id: 'a',
      role: 'assistant',
      content: 'partial',
      status: 'cancelled',
    });

    const repo: IChatRepository = {
      listThreads: vi.fn(),
      getThread: vi.fn().mockResolvedValue(t),
      findThreadByScope: vi.fn().mockResolvedValue(null),
      clearMessages: vi.fn().mockResolvedValue(undefined),
      createThread: vi.fn().mockResolvedValue(t),
      updateThread: vi.fn(),
      deleteThread: vi.fn(),
      countThreads: vi.fn(),
      listMessages: vi.fn(),
      appendMessage: vi
        .fn()
        .mockResolvedValueOnce(write(userMsg, t))
        .mockResolvedValueOnce(write(asst, t)),
      finalizeMessage: vi.fn().mockResolvedValue(write(cancelled, t)),
      countMessages: vi.fn().mockResolvedValue(0),
    };

    const controller = new AbortController();
    const runtime: ILlmRuntime = {
      streamChat: vi.fn(async (_args, onEvent, signal) => {
        onEvent({ type: 'CHUNK', payload: { delta: 'partial' } });
        controller.abort();
        if (signal.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
      }),
    };

    const service = new ChatService(repo);
    const result = await runGroundedTurn({
      service,
      runtime,
      userId: 'u1',
      threadId: 't1',
      scope: { kind: 'library' },
      question: 'hi',
      history: [],
      excerpts,
      provider: 'openai',
      signal: controller.signal,
    });

    expect(result.outcome).toBe('cancelled');
    expect(repo.finalizeMessage).toHaveBeenCalledWith(
      'u1',
      'a',
      expect.objectContaining({ status: 'cancelled', content: 'partial' }),
    );
  });
});
