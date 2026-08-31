import { describe, it, expect, vi, beforeEach } from 'vitest';

import { RealtimeHighlightIngestService } from '@/background/services/realtime-highlight-ingest-service';
import { LocalWriteEchoTracker } from '@/background/services/local-write-echo-tracker';
import { EventName } from '@/shared/types/events';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';

vi.mock('@/background/services/library-change-notifier', () => ({
  notifyLibraryDataChanged: vi.fn(),
}));

const USER_ID = '11111111-1111-4111-8111-111111111111';

function makeRow(id: string): Record<string, unknown> {
  return {
    id,
    user_id: USER_ID,
    url: 'https://example.com',
    text: 'remote text',
    color_role: 'yellow',
    content_hash: 'a'.repeat(64),
    created_at: '2024-06-01T00:00:00.000Z',
    updated_at: '2024-06-03T00:00:00.000Z',
  };
}

describe('RealtimeHighlightIngestService', () => {
  let handlers: Map<string, (payload: unknown) => void>;
  let localStore: HighlightDataV2[];
  let repo: {
    add: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    exists: ReturnType<typeof vi.fn>;
  };
  let facade: { reload: ReturnType<typeof vi.fn> };
  let service: RealtimeHighlightIngestService;

  beforeEach(() => {
    handlers = new Map();
    localStore = [];

    const eventBus = {
      on: vi.fn((event: string, handler: (payload: unknown) => void) => {
        handlers.set(event, handler);
      }),
    };

    repo = {
      add: vi.fn(async (h: HighlightDataV2) => {
        localStore.push(h);
      }),
      update: vi.fn(async (id: string, updates: Partial<HighlightDataV2>) => {
        const index = localStore.findIndex((h) => h.id === id);
        if (index >= 0) {
          localStore[index] = { ...localStore[index]!, ...updates };
        }
      }),
      remove: vi.fn(async (id: string) => {
        localStore = localStore.filter((h) => h.id !== id);
      }),
      findById: vi.fn(async (id: string) => localStore.find((h) => h.id === id) ?? null),
      exists: vi.fn(async (id: string) => localStore.some((h) => h.id === id)),
    };

    facade = {
      reload: vi.fn().mockResolvedValue(undefined),
    };

    service = new RealtimeHighlightIngestService(
      eventBus as never,
      repo as never,
      facade as never,
      new LocalWriteEchoTracker(),
      {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      } as never
    );

    service.initialize();
  });

  it('applies remote inserts to local storage', async () => {
    const id = '22222222-2222-4222-8222-222222222222';
    await handlers.get(EventName.REMOTE_HIGHLIGHT_CREATED)!(makeRow(id));

    expect(repo.add).toHaveBeenCalledWith(expect.objectContaining({ id }), {
      skipSync: true,
    });
    expect(facade.reload).toHaveBeenCalled();
  });

  it('skips echoes from this device', async () => {
    const id = '22222222-2222-4222-8222-222222222222';
    const tracker = new LocalWriteEchoTracker();
    tracker.record(id, 'add');

    const echoService = new RealtimeHighlightIngestService(
      {
        on: (event: string, handler: (payload: unknown) => void) =>
          handlers.set(event, handler),
      } as never,
      repo as never,
      facade as never,
      tracker,
      { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } as never
    );
    echoService.initialize();

    await handlers.get(EventName.REMOTE_HIGHLIGHT_CREATED)!(makeRow(id));

    expect(repo.add).not.toHaveBeenCalled();
  });
});
