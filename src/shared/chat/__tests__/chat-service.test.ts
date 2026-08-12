import { describe, expect, it, vi } from 'vitest';

import { ChatService } from '../chat-service';
import type { IChatRepository } from '../i-chat-repository';
import type { ChatMessage, ChatThread } from '../types';

function thread(overrides: Partial<ChatThread> = {}): ChatThread {
  return {
    id: 't1',
    userId: 'u1',
    title: 'New chat',
    scope: { kind: 'library' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function message(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'm1',
    threadId: 't1',
    userId: 'u1',
    role: 'user',
    content: 'hello',
    status: 'completed',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('ChatService', () => {
  it('creates a thread, user message, and streaming assistant stub', async () => {
    const created = thread({ title: 'hello there' });
    const userMsg = message({ id: 'user-1', content: 'hello there' });
    const assistantMsg = message({
      id: 'asst-1',
      role: 'assistant',
      content: '',
      status: 'streaming',
    });

    const repo: IChatRepository = {
      listThreads: vi.fn(),
      getThread: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValue(created),
      createThread: vi.fn().mockResolvedValue(created),
      updateThread: vi.fn(),
      deleteThread: vi.fn(),
      countThreads: vi.fn(),
      listMessages: vi.fn(),
      appendMessage: vi
        .fn()
        .mockResolvedValueOnce(userMsg)
        .mockResolvedValueOnce(assistantMsg),
      finalizeMessage: vi.fn(),
      countMessages: vi.fn().mockResolvedValue(0),
    };

    // beginTurn with null threadId → create path; getThread after user append
    (repo.getThread as ReturnType<typeof vi.fn>).mockResolvedValue(created);

    const service = new ChatService(repo);
    const result = await service.beginTurn({
      userId: 'u1',
      threadId: null,
      scope: { kind: 'library' },
      question: 'hello there',
      provider: 'openai',
    });

    expect(repo.createThread).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', scope: { kind: 'library' } }),
    );
    expect(repo.appendMessage).toHaveBeenCalledTimes(2);
    expect(repo.appendMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ role: 'user', content: 'hello there', status: 'completed' }),
    );
    expect(repo.appendMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ role: 'assistant', status: 'streaming', content: '' }),
    );
    expect(result.userMessage.id).toBe('user-1');
    expect(result.assistantMessage.status).toBe('streaming');
  });

  it('finalizes the assistant message with content and status', async () => {
    const finalized = message({
      id: 'asst-1',
      role: 'assistant',
      content: 'done',
      status: 'completed',
    });
    const repo: IChatRepository = {
      listThreads: vi.fn(),
      getThread: vi.fn(),
      createThread: vi.fn(),
      updateThread: vi.fn(),
      deleteThread: vi.fn(),
      countThreads: vi.fn(),
      listMessages: vi.fn(),
      appendMessage: vi.fn(),
      finalizeMessage: vi.fn().mockResolvedValue(finalized),
      countMessages: vi.fn(),
    };

    const service = new ChatService(repo);
    const result = await service.finalizeTurn({
      userId: 'u1',
      assistantMessageId: 'asst-1',
      content: 'done',
      status: 'completed',
      provider: 'openai',
    });

    expect(repo.finalizeMessage).toHaveBeenCalledWith('u1', 'asst-1', {
      content: 'done',
      status: 'completed',
      provider: 'openai',
      model: undefined,
    });
    expect(result.status).toBe('completed');
  });

  it('reuses an existing thread when threadId is provided', async () => {
    const existing = thread({ id: 'existing' });
    const repo: IChatRepository = {
      listThreads: vi.fn(),
      getThread: vi.fn().mockResolvedValue(existing),
      createThread: vi.fn(),
      updateThread: vi.fn(),
      deleteThread: vi.fn(),
      countThreads: vi.fn(),
      listMessages: vi.fn(),
      appendMessage: vi
        .fn()
        .mockResolvedValueOnce(message({ content: 'q' }))
        .mockResolvedValueOnce(
          message({ id: 'a', role: 'assistant', content: '', status: 'streaming' }),
        ),
      finalizeMessage: vi.fn(),
      countMessages: vi.fn().mockResolvedValue(0),
    };

    const service = new ChatService(repo);
    await service.beginTurn({
      userId: 'u1',
      threadId: 'existing',
      scope: { kind: 'domain', domain: 'example.com' },
      question: 'q',
    });

    expect(repo.createThread).not.toHaveBeenCalled();
    expect(repo.getThread).toHaveBeenCalledWith('u1', 'existing');
  });
});
