import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BackgroundHighlightOrchestrator } from './background-highlight-orchestrator';
import { LoggerFactory } from '@/shared/utils/logger';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';

const logger = LoggerFactory.getLogger('Test');

function makeHighlight(id: string): HighlightDataV2 {
  return {
    id,
    text: 'sample',
    contentHash: `hash-${id}`,
    colorRole: 'yellow' as const,
    type: 'underscore' as const,
    ranges: [],
    createdAt: new Date(),
    url: 'https://example.com',
  } as unknown as HighlightDataV2;
}

describe('BackgroundHighlightOrchestrator', () => {
  let facade: RepositoryFacade;
  let subscriptions: Map<string, (payload: any) => Promise<any>>;
  let orchestrator: BackgroundHighlightOrchestrator;

  beforeEach(() => {
    facade = {
      add: vi.fn(),
      addMany: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      getAll: vi.fn(() => [makeHighlight('h-1')]),
      findByContentHash: vi.fn((hash: string) => {
        if (hash === 'hash-h-1') return makeHighlight('h-1');
        return undefined;
      }),
    } as unknown as RepositoryFacade;

    subscriptions = new Map();
    const messageBus = {
      subscribe: vi.fn((type: string, handler: any) => {
        subscriptions.set(type, handler);
      }),
    };

    orchestrator = new BackgroundHighlightOrchestrator(facade, messageBus as any, logger);
    orchestrator.initialize();
  });

  it('subscribes to all IPC_HIGHLIGHT_* channels', () => {
    expect(subscriptions.has('IPC_HIGHLIGHT_ADD')).toBe(true);
    expect(subscriptions.has('IPC_HIGHLIGHT_ADD_MANY')).toBe(true);
    expect(subscriptions.has('IPC_HIGHLIGHT_UPDATE')).toBe(true);
    expect(subscriptions.has('IPC_HIGHLIGHT_REMOVE')).toBe(true);
    expect(subscriptions.has('IPC_HIGHLIGHTS_FIND_BY_URL')).toBe(true);
    expect(subscriptions.has('IPC_HIGHLIGHT_FIND_BY_CONTENT_HASH')).toBe(true);
  });

  it('onAdd: delegates to facade.add and returns success envelope', async () => {
    const h = makeHighlight('h-2');
    const result = await subscriptions.get('IPC_HIGHLIGHT_ADD')!(h);
    expect(facade.add).toHaveBeenCalledWith(h);
    expect(result).toEqual({ success: true, data: undefined });
  });

  it('onAddMany: delegates to facade.addMany (single call, not a loop) and returns success envelope', async () => {
    const highlights = [makeHighlight('h-bulk-1'), makeHighlight('h-bulk-2')];
    const result = await subscriptions.get('IPC_HIGHLIGHT_ADD_MANY')!({ highlights });
    expect(facade.addMany).toHaveBeenCalledTimes(1);
    expect(facade.addMany).toHaveBeenCalledWith(highlights);
    expect(facade.add).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, data: undefined });
  });

  it('onAddMany: returns error envelope when facade throws', async () => {
    (facade.addMany as any).mockImplementation(() => { throw new Error('boom-batch'); });
    const result = await subscriptions.get('IPC_HIGHLIGHT_ADD_MANY')!({ highlights: [makeHighlight('h-err')] });
    expect(result).toEqual({ success: false, error: 'boom-batch' });
  });

  it('onUpdate: delegates to facade.update', async () => {
    await subscriptions.get('IPC_HIGHLIGHT_UPDATE')!({ id: 'h-3', updates: { text: 'new' } });
    expect(facade.update).toHaveBeenCalledWith('h-3', { text: 'new' });
  });

  it('onRemove: delegates to facade.remove', async () => {
    await subscriptions.get('IPC_HIGHLIGHT_REMOVE')!({ id: 'h-4' });
    expect(facade.remove).toHaveBeenCalledWith('h-4');
  });

  it('onFindByUrl: returns facade.getAll() filtered by url', async () => {
    const result = await subscriptions.get('IPC_HIGHLIGHTS_FIND_BY_URL')!({ url: 'https://example.com' });
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('onFindByContentHash: returns facade.findByContentHash(hash)', async () => {
    const result = await subscriptions.get('IPC_HIGHLIGHT_FIND_BY_CONTENT_HASH')!({ hash: 'hash-h-1' });
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.id).toBe('h-1');

    const notFoundResult = await subscriptions.get('IPC_HIGHLIGHT_FIND_BY_CONTENT_HASH')!({ hash: 'non-existent' });
    expect(notFoundResult.success).toBe(true);
    expect(notFoundResult.data).toBeNull();
  });

  it('onAdd: returns error envelope when facade throws', async () => {
    (facade.add as any).mockImplementation(() => { throw new Error('boom'); });
    const result = await subscriptions.get('IPC_HIGHLIGHT_ADD')!(makeHighlight('h-err'));
    expect(result).toEqual({ success: false, error: 'boom' });
  });
});
