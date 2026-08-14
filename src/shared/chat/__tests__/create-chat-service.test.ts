import { describe, expect, it, vi } from 'vitest';

import { createChatCache, createChatService } from '../create-chat-service';
import { ChatService } from '../chat-service';
import { MemoryChatCache } from '../indexeddb-chat-cache';

describe('createChatCache', () => {
  it('returns a cache that implements get/set thread list methods', async () => {
    const cache = createChatCache();
    expect(cache).toBeDefined();
    await expect(cache.listThreads('u1')).resolves.toEqual([]);
  });
});

describe('createChatService', () => {
  it('returns a ChatService over the given supabase client', () => {
    const from = vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    }));
    const supabase = { from } as never;
    const service = createChatService(supabase, new MemoryChatCache());
    expect(service).toBeInstanceOf(ChatService);
  });
});
