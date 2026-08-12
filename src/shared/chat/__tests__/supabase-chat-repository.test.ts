import { describe, expect, it, vi } from 'vitest';

import { CHAT_QUOTAS, ChatQuotaError } from '../types';
import { SupabaseChatRepository } from '../supabase-chat-repository';

type Row = Record<string, unknown>;

function makeClient(store: {
  threads: Row[];
  messages: Row[];
}) {
  const from = vi.fn((table: string) => {
    const isThreads = table === 'chat_threads';
    const rows = () => (isThreads ? store.threads : store.messages);

    const api: Record<string, unknown> = {};
    let filters: Array<(r: Row) => boolean> = [];
    let orderKey: string | null = null;
    let orderAsc = true;
    let mode: 'select' | 'insert' | 'update' | 'delete' | 'count' = 'select';
    let insertRow: Row | null = null;
    let updatePatch: Row | null = null;
    let headCount = false;

    const applyFilters = () => rows().filter((r) => filters.every((f) => f(r)));

    api['select'] = vi.fn((_cols?: string, opts?: { count?: string; head?: boolean }) => {
      if (opts?.head && opts?.count === 'exact') {
        mode = 'count';
        headCount = true;
      } else {
        mode = mode === 'update' || mode === 'insert' ? mode : 'select';
      }
      return api;
    });
    api['eq'] = vi.fn((col: string, val: unknown) => {
      filters.push((r) => r[col] === val);
      return api;
    });
    api['order'] = vi.fn((col: string, opts?: { ascending?: boolean }) => {
      orderKey = col;
      orderAsc = opts?.ascending !== false;
      return api;
    });
    api['insert'] = vi.fn((row: Row) => {
      mode = 'insert';
      insertRow = row;
      return api;
    });
    api['update'] = vi.fn((patch: Row) => {
      mode = 'update';
      updatePatch = patch;
      return api;
    });
    api['delete'] = vi.fn(() => {
      mode = 'delete';
      return api;
    });
    api['maybeSingle'] = vi.fn(async () => {
      if (mode === 'update' && updatePatch) {
        const match = applyFilters()[0];
        if (!match) return { data: null, error: null };
        Object.assign(match, updatePatch);
        return { data: match, error: null };
      }
      const match = applyFilters()[0] ?? null;
      return { data: match, error: null };
    });
    api['single'] = vi.fn(async () => {
      if (mode === 'insert' && insertRow) {
        const list = rows();
        list.push({ ...insertRow });
        return { data: insertRow, error: null };
      }
      if (mode === 'update' && updatePatch) {
        const match = applyFilters()[0];
        if (!match) return { data: null, error: { message: 'not found' } };
        Object.assign(match, updatePatch);
        return { data: match, error: null };
      }
      const match = applyFilters()[0];
      return { data: match, error: match ? null : { message: 'not found' } };
    });

    // Thenable for select/order chains and count
    api['then'] = (
      resolve: (v: { data: Row[] | null; error: null; count?: number }) => void,
    ) => {
      if (mode === 'count' || headCount) {
        resolve({ data: null, error: null, count: applyFilters().length });
        return;
      }
      if (mode === 'delete') {
        const keep = rows().filter((r) => !filters.every((f) => f(r)));
        if (isThreads) store.threads = keep;
        else store.messages = keep;
        resolve({ data: null, error: null });
        return;
      }
      let result = applyFilters();
      if (orderKey) {
        const key = orderKey;
        result = [...result].sort((a, b) => {
          const av = String(a[key] ?? '');
          const bv = String(b[key] ?? '');
          return orderAsc ? av.localeCompare(bv) : bv.localeCompare(av);
        });
      }
      resolve({ data: result, error: null });
    };

    return api;
  });

  return { from };
}

describe('SupabaseChatRepository', () => {
  it('creates a thread and lists it by updated_at', async () => {
    const store = { threads: [] as Row[], messages: [] as Row[] };
    const repo = new SupabaseChatRepository(makeClient(store) as never);

    const created = await repo.createThread({
      userId: 'u1',
      scope: { kind: 'domain', domain: 'example.com' },
      id: 'thread-1',
    });

    expect(created.scope).toEqual({ kind: 'domain', domain: 'example.com' });
    const list = await repo.listThreads('u1');
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe('thread-1');
  });

  it('appends user message, auto-titles, and enforces message quota', async () => {
    const store = {
      threads: [
        {
          id: 't1',
          user_id: 'u1',
          title: 'New chat',
          scope_kind: 'library',
          domain: null,
          section_key: null,
          last_provider: null,
          last_model: null,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ] as Row[],
      messages: [] as Row[],
    };
    const repo = new SupabaseChatRepository(makeClient(store) as never);

    const { message: msg, thread } = await repo.appendMessage({
      userId: 'u1',
      threadId: 't1',
      role: 'user',
      content: 'What did I save about React?',
      status: 'completed',
      id: 'm1',
    });
    expect(msg.role).toBe('user');
    expect(thread.title).toMatch(/What did I save/);

    const threads = await repo.listThreads('u1');
    expect(threads[0]?.title).toMatch(/What did I save/);

    // Fill to quota
    store.messages = Array.from({ length: CHAT_QUOTAS.messagesPerThread }, (_, i) => ({
      id: `x${i}`,
      thread_id: 't1',
      user_id: 'u1',
      role: 'user',
      content: 'x',
      status: 'completed',
      provider: null,
      model: null,
      created_at: `2026-01-01T00:00:${String(i).padStart(2, '0')}.000Z`,
      updated_at: `2026-01-01T00:00:${String(i).padStart(2, '0')}.000Z`,
    }));

    await expect(
      repo.appendMessage({
        userId: 'u1',
        threadId: 't1',
        role: 'user',
        content: 'overflow',
        status: 'completed',
      }),
    ).rejects.toBeInstanceOf(ChatQuotaError);
  });

  it('finalizes a streaming assistant message', async () => {
    const store = {
      threads: [
        {
          id: 't1',
          user_id: 'u1',
          title: 'Q',
          scope_kind: 'library',
          domain: null,
          section_key: null,
          last_provider: null,
          last_model: null,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ] as Row[],
      messages: [
        {
          id: 'a1',
          thread_id: 't1',
          user_id: 'u1',
          role: 'assistant',
          content: '',
          status: 'streaming',
          provider: 'openai',
          model: null,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ] as Row[],
    };
    const repo = new SupabaseChatRepository(makeClient(store) as never);

    const { message: done, thread } = await repo.finalizeMessage('u1', 'a1', {
      content: 'Here is the answer',
      status: 'completed',
      provider: 'openai',
      model: 'gpt-4o-mini',
    });

    expect(done.status).toBe('completed');
    expect(done.content).toBe('Here is the answer');
    expect(done.model).toBe('gpt-4o-mini');
    expect(thread.id).toBe('t1');
  });

  it('rejects oversized content', async () => {
    const store = {
      threads: [
        {
          id: 't1',
          user_id: 'u1',
          title: 'New chat',
          scope_kind: 'library',
          domain: null,
          section_key: null,
          last_provider: null,
          last_model: null,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ] as Row[],
      messages: [] as Row[],
    };
    const repo = new SupabaseChatRepository(makeClient(store) as never);

    await expect(
      repo.appendMessage({
        userId: 'u1',
        threadId: 't1',
        role: 'user',
        content: 'x'.repeat(CHAT_QUOTAS.contentCharsPerMessage + 1),
        status: 'completed',
      }),
    ).rejects.toBeInstanceOf(ChatQuotaError);
  });
});
