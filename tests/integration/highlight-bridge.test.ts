import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { IndexedDBHighlightRepository } from '@/background/repositories/indexed-db-highlight-repository';
import { RepositoryFacade } from '@/shared/repositories/repository-facade';
import { IpcHighlightRepository } from '@/content/repositories/ipc-highlight-repository';
import { ChromeMessageBus } from '@/shared/services/chrome-message-bus';
import { BackgroundHighlightOrchestrator } from '@/background/services/background-highlight-orchestrator';
import { LoggerFactory } from '@/shared/utils/logger';
import { MessageSchema } from '@/shared/schemas/message-schemas';
import type { EncryptedText, HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import type { HighlightEncryptor } from '@/background/services/highlight-encryptor';
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
    // Identity-style encryptor: clears plaintext and sets a no-op
    // envelope. The bridge still exercises its end-to-end path without
    // depending on KeyManager (which would need a real passphrase +
    // chrome.storage setup in this integration test).
    const noopEncryptor = {
      encrypt: async (h: HighlightDataV2) => {
        if (h.textEncrypted) return h;
        const envelope: EncryptedText = {
          ciphertext: h.text,
          iv: 'AAAA',
          keyId: h.userId ?? '',
        };
        return { ...h, text: '', textEncrypted: envelope };
      },
      decrypt: async (e: EncryptedText) => e.ciphertext,
    } as unknown as HighlightEncryptor;
    // SW side: orchestrator owns the wiring.
    new BackgroundHighlightOrchestrator(facade, noopEncryptor, swBus as any, logger).initialize();

    // The content side sends via chrome.runtime.sendMessage, which dispatches to
    // the SW's message bus. Simulate that hop.
    (globalThis as any).chrome = {
      runtime: {
        // IpcHighlightRepository uses the callback form of sendMessage, so the
        // mock must invoke the callback to deliver the response.
        sendMessage: vi.fn((msg: unknown, callback: (response: unknown) => void) => {
          const validated = MessageSchema.parse(msg);
          // Mirror the dispatch shape used by ChromeMessageBus.setupMessageListener:
          // it reads from the `handlers` map (Map<string, Set<MessageHandler>>) and
          // runs every handler, sending the first non-undefined result back.
          const handlers: Set<(payload: unknown, sender: unknown) => unknown> | undefined = (
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
                // Fire-and-forget path: send a generic success so the IpcHighlightRepository
                // doesn't hang waiting for a response.
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
