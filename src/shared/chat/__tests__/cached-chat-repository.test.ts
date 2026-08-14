import { describe, expect, it, vi } from 'vitest';

import { CachedChatRepository } from '../cached-chat-repository';
import { MemoryChatCache } from '../indexeddb-chat-cache';
import type { IChatRepository } from '../i-chat-repository';
import type { ChatThread } from '../types';

function thread(id: string): ChatThread {
  return {
    id,
    userId: 'u1',
    title: `Thread ${id}`,
    scope: { kind: 'library' },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  };
}

describe('CachedChatRepository', () => {
  it('write-through puts threads into the cache', async () => {
    const remote: IChatRepository = {
      listThreads: vi.fn().mockResolvedValue([thread('t1')]),
      getThread: vi.fn(),
      findThreadByScope: vi.fn().mockResolvedValue(null),
      clearMessages: vi.fn().mockResolvedValue(undefined),
      createThread: vi.fn().mockResolvedValue(thread('t2')),
      updateThread: vi.fn(),
      deleteThread: vi.fn().mockResolvedValue(undefined),
      countThreads: vi.fn(),
      listMessages: vi.fn().mockResolvedValue([]),
      appendMessage: vi.fn(),
      finalizeMessage: vi.fn(),
      countMessages: vi.fn(),
    };
    const cache = new MemoryChatCache();
    const repo = new CachedChatRepository(remote, cache);

    await repo.listThreads('u1');
    expect(await cache.listThreads('u1')).toHaveLength(1);

    await repo.createThread({ userId: 'u1', scope: { kind: 'library' }, id: 't2' });
    expect((await cache.listThreads('u1')).some((t) => t.id === 't2')).toBe(true);
  });

  it('falls back to cache when remote list fails', async () => {
    const cache = new MemoryChatCache();
    await cache.putThread(thread('cached'));

    const remote: IChatRepository = {
      listThreads: vi.fn().mockRejectedValue(new Error('network')),
      getThread: vi.fn(),
      findThreadByScope: vi.fn().mockResolvedValue(null),
      clearMessages: vi.fn().mockResolvedValue(undefined),
      createThread: vi.fn(),
      updateThread: vi.fn(),
      deleteThread: vi.fn(),
      countThreads: vi.fn(),
      listMessages: vi.fn(),
      appendMessage: vi.fn(),
      finalizeMessage: vi.fn(),
      countMessages: vi.fn(),
    };

    const repo = new CachedChatRepository(remote, cache);
    const list = await repo.listThreads('u1');
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe('cached');
  });
});
