import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalCacheIpcRepository } from './local-cache-ipc-repository';
import { MessageSchema } from '@/shared/schemas/message-schemas';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';

function makeHighlight(over: Partial<HighlightDataV2> = {}): HighlightDataV2 {
  return {
    id: 'h-1',
    text: 'sample',
    contentHash: 'hash-1',
    colorRole: 'yellow' as const,
    type: 'underscore' as const,
    ranges: [],
    createdAt: new Date(),
    url: 'https://example.com',
    ...over,
  } as HighlightDataV2;
}

describe('LocalCacheIpcRepository', () => {
  let sentMessages: Array<{ target: string; message: unknown }>;
  let bus: IMessageBus;
  let repo: LocalCacheIpcRepository;

  beforeEach(() => {
    sentMessages = [];
    bus = {
      send: vi.fn(async (target: string, message: unknown) => {
        sentMessages.push({ target, message });
        return { success: true };
      }),
      subscribe: vi.fn(() => () => {}),
      publish: vi.fn(async () => {}),
    } as unknown as IMessageBus;
    repo = new LocalCacheIpcRepository(bus);
  });

  it('add writes to local cache AND sends IPC_HIGHLIGHT_ADD to background', async () => {
    const h = makeHighlight();
    await repo.add(h);
    const all = await repo.findAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('h-1');
    expect(sentMessages).toHaveLength(1);
    const parsed = MessageSchema.parse(sentMessages[0].message);
    expect(parsed.type).toBe('IPC_HIGHLIGHT_ADD');
    expect(sentMessages[0].target).toBe('background');
  });

  it('addMany writes to local cache AND sends IPC_HIGHLIGHT_ADD_MANY', async () => {
    const hs = [makeHighlight({ id: 'a' }), makeHighlight({ id: 'b' })];
    await repo.addMany(hs);
    const all = await repo.findAll();
    expect(all.map((h) => h.id).sort()).toEqual(['a', 'b']);
    expect(sentMessages).toHaveLength(1);
    const parsed = MessageSchema.parse(sentMessages[0].message);
    expect(parsed.type).toBe('IPC_HIGHLIGHT_ADD_MANY');
  });

  it('remove deletes from local cache AND sends IPC_HIGHLIGHT_REMOVE', async () => {
    const h = makeHighlight();
    await repo.add(h);
    sentMessages.length = 0;
    await repo.remove('h-1');
    const all = await repo.findAll();
    expect(all).toHaveLength(0);
    expect(sentMessages).toHaveLength(1);
    const parsed = MessageSchema.parse(sentMessages[0].message);
    expect(parsed.type).toBe('IPC_HIGHLIGHT_REMOVE');
    expect((parsed.payload as { id: string }).id).toBe('h-1');
  });

  it('update patches local cache AND sends IPC_HIGHLIGHT_UPDATE', async () => {
    const h = makeHighlight();
    await repo.add(h);
    sentMessages.length = 0;
    await repo.update('h-1', { text: 'changed' });
    const all = await repo.findAll();
    expect(all[0].text).toBe('changed');
    expect(sentMessages).toHaveLength(1);
    const parsed = MessageSchema.parse(sentMessages[0].message);
    expect(parsed.type).toBe('IPC_HIGHLIGHT_UPDATE');
  });

  it('clear empties local cache AND sends IPC_HIGHLIGHT_CLEAR', async () => {
    await repo.add(makeHighlight({ id: 'a' }));
    await repo.add(makeHighlight({ id: 'b' }));
    sentMessages.length = 0;
    await repo.clear();
    const all = await repo.findAll();
    expect(all).toHaveLength(0);
    expect(sentMessages).toHaveLength(1);
    const parsed = MessageSchema.parse(sentMessages[0].message);
    expect(parsed.type).toBe('IPC_HIGHLIGHT_CLEAR');
  });

  it('findAll returns local cache contents (used by RepositoryFacade.initialize)', async () => {
    await repo.add(makeHighlight({ id: 'x' }));
    await repo.add(makeHighlight({ id: 'y' }));
    const all = await repo.findAll();
    expect(all.map((h) => h.id).sort()).toEqual(['x', 'y']);
  });

  it('findByUrl returns only matching highlights', async () => {
    await repo.add(makeHighlight({ id: 'a', url: 'https://a.test' }));
    await repo.add(makeHighlight({ id: 'b', url: 'https://b.test' }));
    const found = await repo.findByUrl('https://a.test');
    expect(found).toHaveLength(1);
    expect(found[0].id).toBe('a');
  });

  it('findByContentHash returns the matching highlight', async () => {
    const h = makeHighlight({ id: 'match', contentHash: 'the-hash' });
    await repo.add(h);
    const found = await repo.findByContentHash('the-hash');
    expect(found?.id).toBe('match');
  });

  it('does not throw if IPC fails (cache write already succeeded)', async () => {
    const failingBus = {
      send: vi.fn(async () => {
        throw new Error('IPC down');
      }),
      subscribe: vi.fn(() => () => {}),
      publish: vi.fn(async () => {}),
    } as unknown as IMessageBus;
    const localRepo = new LocalCacheIpcRepository(failingBus);
    await localRepo.add(makeHighlight());
    const all = await localRepo.findAll();
    expect(all).toHaveLength(1);
  });
});
