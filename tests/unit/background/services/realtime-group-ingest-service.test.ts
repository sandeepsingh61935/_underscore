/**
 * @file realtime-group-ingest-service.test.ts
 * @description Task 2.3: group ingest applies mergeRow, writes straight to the
 * local repo (skipSync equivalent), skips echoes, tombstones deletes, and
 * notifies the popup.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LocalWriteEchoTracker } from '@/background/services/local-write-echo-tracker';
import { RealtimeGroupIngestService } from '@/background/services/realtime-group-ingest-service';
import type { IEventBus } from '@/shared/interfaces/i-event-bus';
import type { IGroupRepository } from '@/shared/repositories/i-group-repository';
import { EventName } from '@/shared/types/events';
import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';
import type { ILogger } from '@/shared/utils/logger';

vi.mock('@/background/services/library-change-notifier', () => ({
  notifyLibraryDataChanged: vi.fn(),
}));

import { notifyLibraryDataChanged } from '@/background/services/library-change-notifier';

const logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as unknown as ILogger;

class InMemoryGroupRepository implements IGroupRepository {
  readonly groups = new Map<string, PageGroup>();
  readonly items = new Map<string, PageGroupItem>();

  async listGroups(opts?: { includeDeleted?: boolean }): Promise<PageGroup[]> {
    return [...this.groups.values()].filter(
      (g) => opts?.includeDeleted || g.deletedAt === null
    );
  }

  async getGroup(id: string): Promise<PageGroup | null> {
    return this.groups.get(id) ?? null;
  }

  async listItems(
    groupId: string,
    opts?: { includeDeleted?: boolean }
  ): Promise<PageGroupItem[]> {
    return [...this.items.values()].filter(
      (i) => i.groupId === groupId && (opts?.includeDeleted || i.deletedAt === null)
    );
  }

  async listAllItems(): Promise<PageGroupItem[]> {
    return [...this.items.values()].filter((i) => i.deletedAt === null);
  }

  async putGroup(group: PageGroup): Promise<void> {
    this.groups.set(group.id, group);
  }

  async putItem(item: PageGroupItem): Promise<void> {
    this.items.set(item.id, item);
  }

  async purgeTombstones(): Promise<number> {
    return 0;
  }
}

function makeGroupRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'g-1',
    user_id: 'user-1',
    name: 'Work',
    color: 'blue',
    position: 'a0',
    bound_device_id: null,
    bound_device_label: null,
    bound_browser: null,
    bound_at: null,
    created_at: '2026-09-27T00:00:00.000Z',
    updated_at: '2026-09-28T00:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

function makeItemRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'i-1',
    group_id: 'g-1',
    user_id: 'user-1',
    kind: 'page',
    url_normalized: 'https://example.com/',
    hostname: null,
    include_subdomains: false,
    title: 'Example',
    favicon_url: null,
    position: 'a0',
    created_at: '2026-09-27T00:00:00.000Z',
    updated_at: '2026-09-28T00:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

function setup() {
  const handlers = new Map<string, (payload: unknown) => Promise<void>>();
  const eventBus = {
    on: vi.fn((event: string, handler: (payload: unknown) => Promise<void>) => {
      handlers.set(event, handler);
    }),
    emit: vi.fn(),
    off: vi.fn(),
  } as unknown as IEventBus;
  const repo = new InMemoryGroupRepository();
  const echoTracker = new LocalWriteEchoTracker();
  const service = new RealtimeGroupIngestService(eventBus, repo, echoTracker, logger);
  service.initialize();
  const fire = (event: string, payload: unknown): Promise<void> =>
    handlers.get(event)?.(payload) ?? Promise.resolve();
  return { repo, echoTracker, fire };
}

describe('RealtimeGroupIngestService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies a created group row and notifies the popup', async () => {
    const { repo, fire } = setup();

    await fire(EventName.REMOTE_GROUP_CREATED, makeGroupRow());

    const stored = await repo.getGroup('g-1');
    expect(stored?.name).toBe('Work');
    expect(stored?.color).toBe('blue');
    expect(notifyLibraryDataChanged).toHaveBeenCalledWith({
      source: 'realtime-group-created',
    });
  });

  it('skips rows that echo a local write', async () => {
    const { repo, echoTracker, fire } = setup();
    echoTracker.record('g-1', 'add');

    await fire(EventName.REMOTE_GROUP_CREATED, makeGroupRow());

    expect(await repo.getGroup('g-1')).toBeNull();
    expect(notifyLibraryDataChanged).not.toHaveBeenCalled();
  });

  it('skips a stale remote group when local is newer', async () => {
    const { repo, fire } = setup();
    await repo.putGroup({
      id: 'g-1',
      name: 'Local newer',
      color: 'red',
      position: 'a0',
      boundDeviceId: null,
      boundDeviceLabel: null,
      boundBrowser: null,
      boundAt: null,
      createdAt: '2026-09-27T00:00:00.000Z',
      updatedAt: '2026-09-29T00:00:00.000Z',
      deletedAt: null,
    });

    await fire(EventName.REMOTE_GROUP_UPDATED, makeGroupRow());

    expect((await repo.getGroup('g-1'))?.name).toBe('Local newer');
    expect(notifyLibraryDataChanged).not.toHaveBeenCalled();
  });

  it('tombstone wins over a concurrent live row at equal timestamps', async () => {
    const { repo, fire } = setup();
    await repo.putGroup({
      id: 'g-1',
      name: 'Local',
      color: 'red',
      position: 'a0',
      boundDeviceId: null,
      boundDeviceLabel: null,
      boundBrowser: null,
      boundAt: null,
      createdAt: '2026-09-27T00:00:00.000Z',
      updatedAt: '2026-09-28T00:00:00.000Z',
      deletedAt: null,
    });

    await fire(
      EventName.REMOTE_GROUP_UPDATED,
      makeGroupRow({ deleted_at: '2026-09-28T00:00:00.000Z' })
    );

    expect((await repo.getGroup('g-1'))?.deletedAt).toBe('2026-09-28T00:00:00.000Z');
  });

  it('tombstones a live group on delete events and notifies', async () => {
    const { repo, fire } = setup();
    await repo.putGroup({
      id: 'g-1',
      name: 'Local',
      color: 'red',
      position: 'a0',
      boundDeviceId: null,
      boundDeviceLabel: null,
      boundBrowser: null,
      boundAt: null,
      createdAt: '2026-09-27T00:00:00.000Z',
      updatedAt: '2026-09-27T00:00:00.000Z',
      deletedAt: null,
    });

    await fire(EventName.REMOTE_GROUP_DELETED, { id: 'g-1' });

    expect((await repo.getGroup('g-1'))?.deletedAt).not.toBeNull();
    expect(notifyLibraryDataChanged).toHaveBeenCalledWith({
      source: 'realtime-group-delete',
    });
  });

  it('ignores deletes for unknown groups and delete echoes', async () => {
    const { echoTracker, fire } = setup();

    await fire(EventName.REMOTE_GROUP_DELETED, { id: 'missing' });
    echoTracker.record('g-1', 'remove');
    await fire(EventName.REMOTE_GROUP_DELETED, { id: 'g-1' });

    expect(notifyLibraryDataChanged).not.toHaveBeenCalled();
  });

  it('applies item rows and resolves deletes without a group id', async () => {
    const { repo, fire } = setup();
    await repo.putGroup({
      id: 'g-1',
      name: 'G',
      color: 'grey',
      position: 'a0',
      boundDeviceId: null,
      boundDeviceLabel: null,
      boundBrowser: null,
      boundAt: null,
      createdAt: '2026-09-27T00:00:00.000Z',
      updatedAt: '2026-09-27T00:00:00.000Z',
      deletedAt: null,
    });

    await fire(EventName.REMOTE_GROUP_ITEM_CREATED, makeItemRow());
    expect((await repo.listItems('g-1'))).toHaveLength(1);

    // DELETE payload without group_id falls back to scanning groups.
    await fire(EventName.REMOTE_GROUP_ITEM_DELETED, { id: 'i-1' });
    expect((await repo.listItems('g-1'))).toHaveLength(0);
    expect(notifyLibraryDataChanged).toHaveBeenCalledWith({
      source: 'realtime-group-item-delete',
    });
  });

  it('ignores rows without an id', async () => {
    const { repo, fire } = setup();

    await fire(EventName.REMOTE_GROUP_CREATED, makeGroupRow({ id: undefined }));
    await fire(EventName.REMOTE_GROUP_ITEM_CREATED, makeItemRow({ id: undefined }));

    expect(await repo.listGroups()).toHaveLength(0);
    expect(notifyLibraryDataChanged).not.toHaveBeenCalled();
  });
});
