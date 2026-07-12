import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BackgroundHighlightOrchestrator } from './background-highlight-orchestrator';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';

function makeHighlight(id: string): HighlightDataV2 {
  return {
    id,
    text: `text-${id}`,
    url: 'https://example.com/page',
    contentHash: 'a'.repeat(64),
    colorRole: 'yellow',
    type: 'underscore',
    ranges: [],
    createdAt: new Date(),
  };
}

describe('BackgroundHighlightOrchestrator', () => {
  let facade: RepositoryFacade;
  let messageBus: { subscribe: ReturnType<typeof vi.fn> };
  let orchestrator: BackgroundHighlightOrchestrator;
  const subscriptions = new Map<string, (payload: unknown) => Promise<unknown>>();

  beforeEach(() => {
    subscriptions.clear();
    facade = {
      add: vi.fn(),
      addMany: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      get: vi.fn(),
      getAll: vi.fn(() => []),
      findByContentHash: vi.fn(),
    } as unknown as RepositoryFacade;

    messageBus = {
      subscribe: vi.fn((channel: string, handler: (payload: unknown) => Promise<unknown>) => {
        subscriptions.set(channel, handler);
      }),
    };

    orchestrator = new BackgroundHighlightOrchestrator(
      facade,
      messageBus as never,
      { info: vi.fn(), debug: vi.fn(), error: vi.fn(), warn: vi.fn() } as never,
    );
    orchestrator.initialize();
  });

  it('subscribes to highlight IPC channels', () => {
    expect(subscriptions.has('IPC_HIGHLIGHT_ADD')).toBe(true);
    expect(subscriptions.has('IPC_HIGHLIGHT_GET')).toBe(true);
    expect(subscriptions.has('IPC_HIGHLIGHT_DECRYPT_TEXT')).toBe(false);
  });

  it('onAdd: persists highlight plaintext as-is', async () => {
    const h = makeHighlight('h-1');
    const result = await subscriptions.get('IPC_HIGHLIGHT_ADD')!(h);
    expect(result).toEqual({ success: true, data: undefined });
    expect(facade.add).toHaveBeenCalledWith(h);
  });

  it('onGetHighlight: returns stored record with plaintext text', async () => {
    const stored = makeHighlight('h-2');
    (facade.get as ReturnType<typeof vi.fn>).mockReturnValue(stored);
    const result = await subscriptions.get('IPC_HIGHLIGHT_GET')!({ id: 'h-2' });
    expect(result).toEqual({ success: true, data: stored });
  });

  it('enrichWithPlaintext: returns summaries unchanged', async () => {
    const summaries = [{ id: 'h-3', text: 'hello' }];
    const result = await orchestrator.enrichWithPlaintext(summaries);
    expect(result).toEqual(summaries);
  });
});
