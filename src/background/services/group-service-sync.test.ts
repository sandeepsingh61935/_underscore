/**
 * @file group-service-sync.test.ts
 * @description TDD contract for Task 2.2: GroupService local-first dual-write.
 * Local IDB writes land first and survive cloud failure; cloud failures are
 * enqueued in the offline queue; `group_cap_exceeded` (P0001) maps to
 * GroupCapError and is NOT enqueued; local writes are recorded in the echo
 * tracker so Realtime echoes (Task 2.3) can skip them.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IGroupRepository } from '@/shared/repositories/i-group-repository';
import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';
import type { ILogger } from '@/shared/utils/logger';

import { GroupCapError, GroupService, type GroupCloudSyncDeps } from './group-service';
import { LocalWriteEchoTracker } from './local-write-echo-tracker';

vi.mock('@/background/services/library-change-notifier', () => ({
  notifyLibraryDataChanged: vi.fn(),
}));

const logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as unknown as ILogger;

/** Minimal in-memory IGroupRepository. */
class InMemoryGroupRepository implements IGroupRepository {
  readonly groups = new Map<string, PageGroup>();
  readonly items = new Map<string, PageGroupItem>();

  async listGroups(opts?: { includeDeleted?: boolean }): Promise<PageGroup[]> {
    return [...this.groups.values()]
      .filter((g) => opts?.includeDeleted || g.deletedAt === null)
      .sort((a, b) => (a.position < b.position ? -1 : 1));
  }

  async getGroup(id: string): Promise<PageGroup | null> {
    return this.groups.get(id) ?? null;
  }

  async listItems(
    groupId: string,
    opts?: { includeDeleted?: boolean }
  ): Promise<PageGroupItem[]> {
    return [...this.items.values()]
      .filter((i) => i.groupId === groupId && (opts?.includeDeleted || i.deletedAt === null))
      .sort((a, b) => (a.position < b.position ? -1 : 1));
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

function cloudCapError(): Error {
  // Raw Postgrest error shape from the 2.1 cap triggers (SQLSTATE P0001).
  return Object.assign(new Error('group_cap_exceeded'), { code: 'P0001' });
}

async function flushCloud(): Promise<void> {
  // GroupService cloud sync is fire-and-forget (DualWriteRepository pattern);
  // yield so the promise chain settles before assertions.
  await new Promise((resolve) => setTimeout(resolve, 0));
}

let local: InMemoryGroupRepository;
let cloud: InMemoryGroupRepository;
let echoTracker: LocalWriteEchoTracker;

beforeEach(() => {
  vi.clearAllMocks();
  local = new InMemoryGroupRepository();
  cloud = new InMemoryGroupRepository();
  echoTracker = new LocalWriteEchoTracker();
});

function makeService(overrides: {
  cloudImpl?: IGroupRepository;
  isAuthenticated?: () => boolean;
  enqueueOperation?: ReturnType<typeof vi.fn>;
} = {}) {
  const enqueueOperation =
    overrides.enqueueOperation ?? vi.fn().mockResolvedValue(undefined);
  const service = new GroupService(local, logger, {
    cloudRepository: overrides.cloudImpl ?? cloud,
    isAuthenticated: overrides.isAuthenticated ?? (() => true),
    echoTracker,
    enqueueOperation:
      enqueueOperation as unknown as GroupCloudSyncDeps['enqueueOperation'],
  });
  return { service, enqueueOperation };
}

describe('GroupService dual-write', () => {
  it('writes local first, then cloud, and records the echo', async () => {
    const { service } = makeService();

    const group = await service.createGroup({ name: 'Research' });

    expect((await local.listGroups()).map((g) => g.id)).toContain(group.id);
    await flushCloud();
    expect((await cloud.listGroups()).map((g) => g.id)).toContain(group.id);
    expect(echoTracker.isEcho(group.id)).toBe(true);
  });

  it('keeps the local write and enqueues when the cloud write fails', async () => {
    const failingCloud: IGroupRepository = {
      ...cloud,
      putGroup: vi.fn().mockRejectedValue(new Error('network down')),
      putItem: vi.fn().mockRejectedValue(new Error('network down')),
      listGroups: cloud.listGroups.bind(cloud),
      getGroup: cloud.getGroup.bind(cloud),
      listItems: cloud.listItems.bind(cloud),
      listAllItems: cloud.listAllItems.bind(cloud),
      purgeTombstones: cloud.purgeTombstones.bind(cloud),
    };
    const { service, enqueueOperation } = makeService({ cloudImpl: failingCloud });

    const group = await service.createGroup({ name: 'Offline group' });

    // Local-first: the row survives the cloud failure.
    expect(await local.getGroup(group.id)).not.toBeNull();
    await flushCloud();
    expect(enqueueOperation).toHaveBeenCalledWith(
      'group',
      expect.any(String),
      group.id,
      expect.objectContaining({ id: group.id })
    );
  });

  it('maps cloud group_cap_exceeded to GroupCapError and does NOT enqueue', async () => {
    const cappedCloud: IGroupRepository = {
      ...cloud,
      putGroup: vi.fn().mockRejectedValue(cloudCapError()),
      putItem: vi.fn().mockRejectedValue(cloudCapError()),
      listGroups: cloud.listGroups.bind(cloud),
      getGroup: cloud.getGroup.bind(cloud),
      listItems: cloud.listItems.bind(cloud),
      listAllItems: cloud.listAllItems.bind(cloud),
      purgeTombstones: cloud.purgeTombstones.bind(cloud),
    };
    const { service, enqueueOperation } = makeService({ cloudImpl: cappedCloud });

    // Typed GroupCapError thrown by the cloud repo also skips the queue.
    const typedCapped: IGroupRepository = {
      ...cloud,
      putGroup: vi.fn().mockRejectedValue(new GroupCapError('groups', 200)),
      putItem: cloud.putItem.bind(cloud),
      listGroups: cloud.listGroups.bind(cloud),
      getGroup: cloud.getGroup.bind(cloud),
      listItems: cloud.listItems.bind(cloud),
      listAllItems: cloud.listAllItems.bind(cloud),
      purgeTombstones: cloud.purgeTombstones.bind(cloud),
    };
    const second = makeService({ cloudImpl: typedCapped });

    const first = await service.createGroup({ name: 'Capped raw' });
    expect(await local.getGroup(first.id)).not.toBeNull();
    const secondGroup = await second.service.createGroup({ name: 'Capped typed' });
    expect(await local.getGroup(secondGroup.id)).not.toBeNull();

    await flushCloud();
    expect(enqueueOperation).not.toHaveBeenCalled();
    expect(second.enqueueOperation).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('skips cloud sync entirely when unauthenticated', async () => {
    const cloudSpy: IGroupRepository = {
      ...cloud,
      putGroup: vi.fn().mockResolvedValue(undefined),
      putItem: vi.fn().mockResolvedValue(undefined),
      listGroups: cloud.listGroups.bind(cloud),
      getGroup: cloud.getGroup.bind(cloud),
      listItems: cloud.listItems.bind(cloud),
      listAllItems: cloud.listAllItems.bind(cloud),
      purgeTombstones: cloud.purgeTombstones.bind(cloud),
    };
    const { service, enqueueOperation } = makeService({
      cloudImpl: cloudSpy,
      isAuthenticated: () => false,
    });

    const group = await service.createGroup({ name: 'Guest group' });

    expect(await local.getGroup(group.id)).not.toBeNull();
    await flushCloud();
    expect(cloudSpy.putGroup).not.toHaveBeenCalled();
    expect(enqueueOperation).not.toHaveBeenCalled();
    expect(echoTracker.isEcho(group.id)).toBe(false);
  });

  it('dual-writes item adds and tombstones', async () => {
    const { service, enqueueOperation } = makeService();

    const group = await service.createGroup({ name: 'Items' });
    const item = await service.addPage(group.id, { url: 'https://example.com/a' });
    await flushCloud();
    expect((await cloud.listItems(group.id)).map((i) => i.id)).toContain(item.id);

    await service.removeItem(group.id, item.id);
    await flushCloud();
    const cloudItems = await cloud.listItems(group.id, { includeDeleted: true });
    expect(cloudItems.find((i) => i.id === item.id)?.deletedAt).not.toBeNull();
    expect(enqueueOperation).not.toHaveBeenCalled();
  });
});
