/**
 * @file group-handlers-sync.test.ts
 * @description Task 2.3 carry-over from the 2.2 review: GroupCloudSyncDeps
 * wired through registerGroupHandlers so IPC mutations dual-write to cloud
 * (echo recorded, failures enqueued, guests local-only).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import { registerGroupHandlers } from '@/background/services/group-handlers';
import {
  GroupCapError,
  type GroupCloudSyncDeps,
} from '@/background/services/group-service';
import { LocalWriteEchoTracker } from '@/background/services/local-write-echo-tracker';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type { IGroupRepository } from '@/shared/repositories/i-group-repository';
import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';
import type { ILogger } from '@/shared/utils/logger';

vi.mock('@/background/services/library-change-notifier', () => ({
  notifyLibraryDataChanged: vi.fn(),
}));

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
    return [...this.groups.values()]
      .filter((g) => opts?.includeDeleted || g.deletedAt === null)
      .sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0));
  }

  async getGroup(id: string): Promise<PageGroup | null> {
    return this.groups.get(id) ?? null;
  }

  async listItems(
    groupId: string,
    opts?: { includeDeleted?: boolean }
  ): Promise<PageGroupItem[]> {
    return [...this.items.values()]
      .filter(
        (i) => i.groupId === groupId && (opts?.includeDeleted || i.deletedAt === null)
      )
      .sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0));
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

type Handler = (payload: unknown) => Promise<any>;

function setup(isAuthenticated: boolean): {
  mutate: (payload: unknown) => Promise<any>;
  cloud: { putGroup: ReturnType<typeof vi.fn>; putItem: ReturnType<typeof vi.fn> };
  echoTracker: LocalWriteEchoTracker;
  enqueueOperation: ReturnType<typeof vi.fn>;
  pro: InMemoryGroupRepository;
} {
  const handlers = new Map<string, Handler>();
  const messageBus = {
    subscribe: (type: string, handler: Handler): (() => void) => {
      handlers.set(type, handler);
      return () => undefined;
    },
  } as unknown as IMessageBus;
  const authManager = { isAuthenticated } as IAuthManager;
  const basic = new InMemoryGroupRepository();
  const pro = new InMemoryGroupRepository();
  const cloud = {
    putGroup: vi.fn().mockResolvedValue(undefined),
    putItem: vi.fn().mockResolvedValue(undefined),
  };
  const echoTracker = new LocalWriteEchoTracker();
  const enqueueOperation = vi.fn();

  const sync: GroupCloudSyncDeps = {
    cloudRepository: cloud as unknown as IGroupRepository,
    isAuthenticated: () => isAuthenticated,
    echoTracker,
    enqueueOperation,
  };

  registerGroupHandlers({
    messageBus,
    authManager,
    basicGroupRepository: basic,
    proGroupRepository: pro,
    logger,
    sync,
  });

  return {
    mutate: (payload) => handlers.get('GROUP_MUTATE')!(payload),
    cloud,
    echoTracker,
    enqueueOperation,
    pro,
  };
}

describe('registerGroupHandlers cloud sync wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dual-writes an IPC createGroup to cloud and records the echo', async () => {
    const { mutate, cloud, echoTracker } = setup(true);

    const result = await mutate({ command: 'createGroup', name: 'Work', color: 'blue' });

    expect(result.success).toBe(true);
    const id = result.data.group.id as string;
    await vi.waitFor(() => expect(cloud.putGroup).toHaveBeenCalled());
    expect(cloud.putGroup).toHaveBeenCalledWith(
      expect.objectContaining({ id, name: 'Work' })
    );
    expect(echoTracker.isEcho(id)).toBe(true);
  });

  it('enqueues when the cloud write fails', async () => {
    const { mutate, cloud, enqueueOperation } = setup(true);
    cloud.putGroup.mockRejectedValue(new Error('boom'));

    const result = await mutate({ command: 'createGroup', name: 'Work', color: 'blue' });

    expect(result.success).toBe(true);
    const id = result.data.group.id as string;
    await vi.waitFor(() => expect(enqueueOperation).toHaveBeenCalled());
    expect(enqueueOperation).toHaveBeenCalledWith(
      'group',
      'add',
      id,
      expect.objectContaining({ id })
    );
  });

  it('skips the queue on cloud cap failures', async () => {
    const { mutate, cloud, enqueueOperation } = setup(true);
    cloud.putGroup.mockRejectedValue(new GroupCapError('groups', 200));

    await mutate({ command: 'createGroup', name: 'Work', color: 'blue' });

    await vi.waitFor(() => expect(logger.warn).toHaveBeenCalled());
    expect(enqueueOperation).not.toHaveBeenCalled();
  });

  it('stays local-only for guests', async () => {
    const { mutate, cloud, echoTracker, enqueueOperation, pro } = setup(false);

    const result = await mutate({ command: 'createGroup', name: 'Guest', color: 'grey' });

    expect(result.success).toBe(true);
    expect(cloud.putGroup).not.toHaveBeenCalled();
    expect(enqueueOperation).not.toHaveBeenCalled();
    expect(echoTracker.isEcho(result.data.group.id)).toBe(false);
    // Guest writes land in the basic partition, not pro.
    expect(pro.groups.size).toBe(0);
  });

  it('dual-writes item mutations as group_item entities', async () => {
    const { mutate, cloud, enqueueOperation } = setup(true);
    cloud.putItem.mockRejectedValue(new Error('offline'));

    const created = await mutate({ command: 'createGroup', name: 'Work', color: 'blue' });
    const groupId = created.data.group.id as string;
    await vi.waitFor(() => expect(cloud.putGroup).toHaveBeenCalled());

    const added = await mutate({
      command: 'addPage',
      groupId,
      url: 'https://example.com/article',
    });

    expect(added.success).toBe(true);
    await vi.waitFor(() =>
      expect(enqueueOperation).toHaveBeenCalledWith(
        'group_item',
        'add',
        added.data.item.id,
        expect.objectContaining({ groupId })
      )
    );
  });
});
