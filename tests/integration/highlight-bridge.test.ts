import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { IndexedDBHighlightRepository } from '@/background/repositories/indexed-db-highlight-repository';
import { RepositoryFacade } from '@/shared/repositories/repository-facade';
import { IpcHighlightRepository } from '@/content/repositories/ipc-highlight-repository';
import { ChromeMessageBus } from '@/shared/services/chrome-message-bus';
import { BackgroundHighlightOrchestrator } from '@/background/services/background-highlight-orchestrator';
import { LoggerFactory } from '@/shared/utils/logger';
import { MessageSchema } from '@/shared/schemas/message-schemas';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';

const logger = LoggerFactory.getLogger('IntegrationTest');

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

describe('Highlight bridge: content -> IPC -> SW -> IDB roundtrip', () => {
  let idbRepo: IndexedDBHighlightRepository;
  let facade: RepositoryFacade;
  let contentRepo: IpcHighlightRepository;
  let swBus: IMessageBus;

  beforeEach(async () => {
    idbRepo = new IndexedDBHighlightRepository(logger);
    facade = new RepositoryFacade(idbRepo);
    await facade.initialize();

    swBus = new ChromeMessageBus(logger) as unknown as IMessageBus;
    new BackgroundHighlightOrchestrator(facade, swBus as never, logger).initialize();

    (globalThis as any).chrome = {
      runtime: {
        onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
        sendMessage: vi.fn((msg: unknown, callback: (response: unknown) => void) => {
          const validated = MessageSchema.parse(msg);
          const handlers:
            Set<(payload: unknown, sender: unknown) => unknown> | undefined = (
            swBus as any
          ).handlers?.get(validated.type);
          const handler = handlers ? Array.from(handlers)[0] : undefined;
          if (!handler) {
            callback({ success: false, error: `No handler for ${validated.type}` });
            return;
          }
          Promise.resolve(handler(validated.payload, { id: 'extension' }))
            .then((result) => {
              if (result === undefined) {
                callback({ success: true, data: undefined });
              } else {
                callback(result);
              }
            })
            .catch((err) => callback({ success: false, error: String(err) }));
        }),
        lastError: undefined,
      },
    };

    const contentBus = new ChromeMessageBus(logger) as unknown as IMessageBus;
    contentRepo = new IpcHighlightRepository(contentBus);
  });

  it('content.add reaches the SW facade and extension-origin IDB with plaintext', async () => {
    const h = makeHighlight('h-bridge-1');
    await contentRepo.add(h);
    await new Promise((r) => setTimeout(r, 10));
    expect(facade.has(h.id)).toBe(true);
    const stored = await idbRepo.findById(h.id);
    expect(stored).not.toBeNull();
    expect(stored?.text).toBe('sample');
  });
});
