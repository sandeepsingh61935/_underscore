/**
 * @file cloud-hydration-groups.test.ts
 * @description Task 2.3: Page Groups side of CloudHydrationService — backfill,
 * incremental pull against the groups cursor (tombstones included), mergeRow
 * conflict resolution, and signed-out skip.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import { CloudHydrationService } from '@/background/services/cloud-hydration-service';
import type { LibrarySyncCursor } from '@/background/services/library-sync-cursor';
import type { IHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import type { IGroupRepository } from '@/shared/repositories/i-group-repository';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';
import type { ILogger } from '@/shared/interfaces/i-logger';

vi.mock('@/background/services/library-change-notifier', () => ({
  notifyLibraryDataChanged: vi.fn(),
}));

const logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as unknown as ILogger;

function makeGroup(id: string, updatedAt: string, deletedAt: string | null = null): PageGroup {
  return {
    id,
    name: `Group ${id}`,
    color: 'blue',
    position: 'a0',
    boundDeviceId: null,
    boundDeviceLabel: null,
    boundBrowser: null,
    boundAt: null,
    createdAt: '2026-09-27T00:00:00.000Z',
    updatedAt,
    deletedAt,
  };
}

function makeItem(
  id: string,
  groupId: string,
  updatedAt: string,
  deletedAt: string | null = null
): PageGroupItem {
  return {
    id,
    groupId,
    kind: 'page',
    urlNormalized: `https://${id}.example.com/`,
    title: null,
    faviconUrl: null,
    position: 'a0',
    createdAt: '2026-09-27T00:00:00.000Z',
    updatedAt,
    deletedAt,
  };
}

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

function makeAuthManager(authenticated: boolean): IAuthManager {
  return {
    isAuthenticated: authenticated,
    currentUser: authenticated ? { id: 'user-1', email: 'u@x.com' } : null,
  } as unknown as IAuthManager;
}

describe('CloudHydrationService groups hydration', () => {
  let proGroups: InMemoryGroupRepository;
  let cloudGroups: PageGroup[];
  let cloudItems: PageGroupItem[];
  let findChangedGroupsSince: ReturnType<typeof vi.fn>;
  let findChangedItemsSince: ReturnType<typeof vi.fn>;
  let groupCursor: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };
  let highlightCursor: LibrarySyncCursor;
  let service: CloudHydrationService;

  function build(authenticated: boolean): void {
    proGroups = new InMemoryGroupRepository();
    cloudGroups = [];
    cloudItems = [];
    findChangedGroupsSince = vi.fn(async () => [...cloudGroups]);
    findChangedItemsSince = vi.fn(async () => [...cloudItems]);
    groupCursor = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
    };
    highlightCursor = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    };

    const highlightRepository = {
      findAll: vi.fn().mockResolvedValue([]),
    } as unknown as IHighlightRepository;
    const cloudRepository = {
      findChangedSince: vi.fn().mockResolvedValue([]),
      findDeletedIdsSince: vi.fn().mockResolvedValue([]),
    } as never;
    const facade = {
      reload: vi.fn().mockResolvedValue(undefined),
      count: vi.fn().mockReturnValue(0),
    } as unknown as RepositoryFacade;

    service = new CloudHydrationService(
      makeAuthManager(authenticated),
      highlightRepository,
      cloudRepository,
      facade,
      highlightCursor,
      logger,
      undefined,
      undefined,
      {
        proGroupRepository: proGroups,
        cloudGroupRepository: {
          findChangedGroupsSince: findChangedGroupsSince as (
            since: Date | null
          ) => Promise<PageGroup[]>,
          findChangedItemsSince: findChangedItemsSince as (
            since: Date | null
          ) => Promise<PageGroupItem[]>,
        },
        groupSyncCursor: groupCursor as never,
      }
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    build(true);
  });

  it('backfills cloud-only groups and items and advances the groups cursor', async () => {
    cloudGroups = [makeGroup('g-1', '2026-09-28T01:00:00.000Z')];
    cloudItems = [makeItem('i-1', 'g-1', '2026-09-28T02:00:00.000Z')];

    const result = await service.hydrate();

    expect(result.groups).toMatchObject({ backfilled: 2, updated: 0, failed: 0 });
    expect(await proGroups.getGroup('g-1')).not.toBeNull();
    expect(await proGroups.listItems('g-1')).toHaveLength(1);
    expect(groupCursor.set).toHaveBeenCalledWith(
      new Date('2026-09-28T02:00:00.000Z')
    );
  });

  it('pulls incrementally with updated_at >= cursor', async () => {
    groupCursor.get.mockResolvedValue(new Date('2026-09-28T00:00:00.000Z'));

    await service.hydrate();

    expect(findChangedGroupsSince).toHaveBeenCalledWith(
      new Date('2026-09-28T00:00:00.000Z')
    );
    expect(findChangedItemsSince).toHaveBeenCalledWith(
      new Date('2026-09-28T00:00:00.000Z')
    );
  });

  it('applies tombstones from the incremental pull as deletes', async () => {
    proGroups.groups.set('g-1', makeGroup('g-1', '2026-09-27T00:00:00.000Z'));
    proGroups.items.set('i-1', makeItem('i-1', 'g-1', '2026-09-27T00:00:00.000Z'));
    cloudGroups = [makeGroup('g-1', '2026-09-28T01:00:00.000Z', '2026-09-28T01:00:00.000Z')];
    cloudItems = [makeItem('i-1', 'g-1', '2026-09-28T01:00:00.000Z', '2026-09-28T01:00:00.000Z')];

    const result = await service.hydrate();

    expect(result.groups).toMatchObject({ deleted: 2 });
    expect((await proGroups.getGroup('g-1'))?.deletedAt).not.toBeNull();
    expect(await proGroups.listItems('g-1')).toHaveLength(0);
  });

  it('skips remote rows when the local copy is newer', async () => {
    proGroups.groups.set('g-1', makeGroup('g-1', '2026-09-29T00:00:00.000Z'));
    cloudGroups = [makeGroup('g-1', '2026-09-28T00:00:00.000Z')];

    const result = await service.hydrate();

    expect(result.groups).toMatchObject({ skipped: 1, updated: 0 });
    expect((await proGroups.getGroup('g-1'))?.updatedAt).toBe('2026-09-29T00:00:00.000Z');
  });

  it('skips groups hydration when signed out', async () => {
    build(false);

    const result = await service.hydrate();

    expect(result.groups).toBeUndefined();
    expect(findChangedGroupsSince).not.toHaveBeenCalled();
    expect(findChangedItemsSince).not.toHaveBeenCalled();
  });

  it('reports group failure without failing highlight hydration', async () => {
    findChangedGroupsSince.mockRejectedValue(new Error('cloud down'));

    const result = await service.hydrate();

    expect(result.error).toBeUndefined();
    expect(result.groups).toMatchObject({ failed: 1 });
  });
});
