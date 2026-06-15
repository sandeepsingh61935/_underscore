import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { IndexedDBHighlightRepository } from '@/background/repositories/indexed-db-highlight-repository';
import { RepositoryFacade } from '@/shared/repositories/repository-facade';
import { IpcHighlightRepository } from '@/content/repositories/ipc-highlight-repository';
import { ChromeMessageBus } from '@/shared/services/chrome-message-bus';
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

    // The SW side subscribes to IPC_HIGHLIGHT_* via the message bus.
    swBus = new ChromeMessageBus(logger) as unknown as IMessageBus;
    // Foregrounded for the orchestrator (which is added in Task 6):
    //   swBus.subscribe('IPC_HIGHLIGHT_ADD',  async (p) => { facade.add(p); return { success: true }; });
    //   swBus.subscribe('IPC_HIGHLIGHT_UPDATE', async ({id, updates}) => { facade.update(id, updates); ... });
    //   swBus.subscribe('IPC_HIGHLIGHT_REMOVE', async ({id}) => { facade.remove(id); ... });
    //   swBus.subscribe('IPC_HIGHLIGHTS_FIND_BY_URL', async ({url}) => ({ success: true, data: facade.getAll().filter(h => h.url === url) }));
    //
    // For this RED test we wire the SW-side handler inline so the test exercises the
    // full path; the orchestrator extraction happens in Task 6.
    swBus.subscribe('IPC_HIGHLIGHT_ADD', async (p: HighlightDataV2) => {
      facade.add(p);
      return { success: true, data: undefined };
    });

    // The content side sends via chrome.runtime.sendMessage, which dispatches to
    // the SW's message bus. Simulate that hop.
    (globalThis as any).chrome = {
      runtime: {
        // IpcHighlightRepository uses the callback form of sendMessage, so the
        // mock must invoke the callback to deliver the response.
        sendMessage: vi.fn((msg: unknown, callback: (response: unknown) => void) => {
          const validated = MessageSchema.parse(msg);
          const handler = (swBus as any).listeners?.get(validated.type);
          if (!handler) {
            callback({ success: false, error: `No handler for ${validated.type}` });
            return;
          }
          Promise.resolve(handler(validated.payload, { id: 'extension' } as any))
            .then((result) => callback(result))
            .catch((err) => callback({ success: false, error: String(err) }));
        }),
        lastError: undefined,
      },
    };

    contentRepo = new IpcHighlightRepository();
  });

  it('content.add reaches the SW facade and extension-origin IDB', async () => {
    const h = makeHighlight('h-bridge-1');
    await contentRepo.add(h);
    // Yield for the async add to land in the IDB put.
    await new Promise((r) => setTimeout(r, 10));
    expect(facade.has(h.id)).toBe(true);
    expect(await idbRepo.findById(h.id)).not.toBeNull();
  });
});
