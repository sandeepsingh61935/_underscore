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
      update: vi.fn(),
      remove: vi.fn(),
      getAll: vi.fn(() => [makeHighlight('h-1')]),
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

  it('subscribes to all four IPC_HIGHLIGHT_* channels', () => {
    expect(subscriptions.has('IPC_HIGHLIGHT_ADD')).toBe(true);
    expect(subscriptions.has('IPC_HIGHLIGHT_UPDATE')).toBe(true);
    expect(subscriptions.has('IPC_HIGHLIGHT_REMOVE')).toBe(true);
    expect(subscriptions.has('IPC_HIGHLIGHTS_FIND_BY_URL')).toBe(true);
  });

  it('onAdd: delegates to facade.add and returns success envelope', async () => {
    const h = makeHighlight('h-2');
    const result = await subscriptions.get('IPC_HIGHLIGHT_ADD')!(h);
    expect(facade.add).toHaveBeenCalledWith(h);
    expect(result).toEqual({ success: true, data: undefined });
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

  it('onAdd: returns error envelope when facade throws', async () => {
    (facade.add as any).mockImplementation(() => { throw new Error('boom'); });
    const result = await subscriptions.get('IPC_HIGHLIGHT_ADD')!(makeHighlight('h-err'));
    expect(result).toEqual({ success: false, error: 'boom' });
  });
});
