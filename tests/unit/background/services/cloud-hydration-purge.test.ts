/**
 * @file cloud-hydration-purge.test.ts
 * @description Task 2.4: every groups hydration ends with a best-effort
 * `purgeTombstones(now - 30d)` on the local Pro store and on the cloud
 * repository (client fallback). Purge failures are contained and never fail
 * hydration.
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

const DAY_MS = 24 * 60 * 60 * 1000;

function makeGroup(id: string, deletedAt: string | null = null): PageGroup {
  const now = new Date().toISOString();
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
    updatedAt: now,
    deletedAt,
  };
}

class RecordingGroupRepository implements IGroupRepository {
  readonly groups = new Map<string, PageGroup>();
  readonly purgeCutoffs: Date[] = [];

  async listGroups(): Promise<PageGroup[]> {
    return [...this.groups.values()];
  }

  async getGroup(id: string): Promise<PageGroup | null> {
    return this.groups.get(id) ?? null;
  }

  async listItems(): Promise<PageGroupItem[]> {
    return [];
  }

  async listAllItems(): Promise<PageGroupItem[]> {
    return [];
  }

  async putGroup(group: PageGroup): Promise<void> {
    this.groups.set(group.id, group);
  }

  async putItem(): Promise<void> {
    // Items are irrelevant to this wiring test.
  }

  async purgeTombstones(olderThan: Date): Promise<number> {
    this.purgeCutoffs.push(olderThan);
    let purged = 0;
    for (const [id, group] of this.groups) {
      if (group.deletedAt !== null && Date.parse(group.deletedAt) < olderThan.getTime()) {
        this.groups.delete(id);
        purged += 1;
      }
    }
    return purged;
  }
}

function thirtyDaysAgoIso(): string {
  return new Date(Date.now() - 31 * DAY_MS).toISOString();
}

describe('CloudHydrationService group tombstone purge (Task 2.4)', () => {
  let proGroups: RecordingGroupRepository;
  let cloudPurge: ReturnType<typeof vi.fn>;
  let groupCursor: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };
  let service: CloudHydrationService;

  function build(opts?: { cloudPurgeFailure?: boolean; omitCloudPurge?: boolean }): void {
    proGroups = new RecordingGroupRepository();
    cloudPurge = opts?.cloudPurgeFailure
      ? vi.fn().mockRejectedValue(new Error('cloud purge denied'))
      : vi.fn().mockResolvedValue(0);
    groupCursor = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
    };
    const cloudGroupRepository: {
      findChangedGroupsSince: () => Promise<PageGroup[]>;
      findChangedItemsSince: () => Promise<PageGroupItem[]>;
      purgeTombstones?: (olderThan: Date) => Promise<number>;
    } = {
      findChangedGroupsSince: async () => [],
      findChangedItemsSince: async () => [],
    };
    if (!opts?.omitCloudPurge) {
      cloudGroupRepository.purgeTombstones = cloudPurge as unknown as (
        olderThan: Date
      ) => Promise<number>;
    }
    service = new CloudHydrationService(
      {
        isAuthenticated: true,
        currentUser: { id: 'user-1', email: 'u@x.com' },
      } as unknown as IAuthManager,
      { findAll: vi.fn().mockResolvedValue([]) } as unknown as IHighlightRepository,
      {
        findChangedSince: vi.fn().mockResolvedValue([]),
        findDeletedIdsSince: vi.fn().mockResolvedValue([]),
      } as never,
      {
        reload: vi.fn().mockResolvedValue(undefined),
        count: vi.fn().mockReturnValue(0),
      } as unknown as RepositoryFacade,
      {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(undefined),
      } as LibrarySyncCursor,
      logger,
      undefined,
      undefined,
      {
        proGroupRepository: proGroups,
        cloudGroupRepository,
        groupSyncCursor: groupCursor as never,
      }
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    build();
  });

  it('purges local and cloud expired tombstones with a now-30d cutoff', async () => {
    proGroups.groups.set('g-old', makeGroup('g-old', thirtyDaysAgoIso()));
    proGroups.groups.set('g-live', makeGroup('g-live', null));

    const result = await service.hydrate();

    expect(result.error).toBeUndefined();
    expect(proGroups.purgeCutoffs).toHaveLength(1);
    expect(cloudPurge).toHaveBeenCalledTimes(1);
    const expected = Date.now() - 30 * DAY_MS;
    const localCutoff = proGroups.purgeCutoffs[0] as Date;
    expect(Math.abs(localCutoff.getTime() - expected)).toBeLessThan(60_000);
    const cloudCutoff = cloudPurge.mock.calls[0]?.[0] as Date;
    expect(Math.abs(cloudCutoff.getTime() - expected)).toBeLessThan(60_000);
    // Expired tombstone gone locally, live row retained.
    expect(proGroups.groups.has('g-old')).toBe(false);
    expect(proGroups.groups.has('g-live')).toBe(true);
  });

  it('contains a cloud purge failure without failing hydration', async () => {
    build({ cloudPurgeFailure: true });

    const result = await service.hydrate();

    expect(result.error).toBeUndefined();
    expect(cloudPurge).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      '[CloudHydration] Cloud group tombstone purge failed',
      expect.objectContaining({ error: 'cloud purge denied' })
    );
  });

  it('hydrates fine when the cloud repository exposes no purge (structural optional)', async () => {
    build({ omitCloudPurge: true });

    const result = await service.hydrate();

    expect(result.error).toBeUndefined();
    expect(result.groups).toBeDefined();
    expect(proGroups.purgeCutoffs).toHaveLength(1);
  });
});
