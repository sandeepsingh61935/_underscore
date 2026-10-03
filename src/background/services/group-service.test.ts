/**
 * @file group-service.test.ts
 * @description TDD contract for Task 1.4: GroupService caps, dedupe, revive,
 * validation, ordering, and popup refresh pings (local-only, in-memory repo).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  GroupCapError,
  GroupNotFoundError,
  GroupService,
  GroupValidationError,
} from './group-service';
import type { IGroupRepository } from '@/shared/repositories/i-group-repository';
import { GROUP_CAPS } from '@/shared/types/page-group';
import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';
import type { ILogger } from '@/shared/utils/logger';

vi.mock('@/background/services/library-change-notifier', () => ({
  notifyLibraryDataChanged: vi.fn(),
}));

import { notifyLibraryDataChanged } from '@/background/services/library-change-notifier';

const notifyMock = vi.mocked(notifyLibraryDataChanged);

const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as ILogger;

/** Minimal in-memory IGroupRepository: position-ordered, soft-delete aware. */
class InMemoryGroupRepository implements IGroupRepository {
  readonly groups = new Map<string, PageGroup>();
  readonly items = new Map<string, PageGroupItem>();

  async listGroups(opts?: { includeDeleted?: boolean }): Promise<PageGroup[]> {
    const rows = [...this.groups.values()].filter(
      (g) => opts?.includeDeleted || g.deletedAt === null
    );
    return rows.sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0));
  }

  async getGroup(id: string): Promise<PageGroup | null> {
    return this.groups.get(id) ?? null;
  }

  async listItems(groupId: string, opts?: { includeDeleted?: boolean }): Promise<PageGroupItem[]> {
    return [...this.items.values()]
      .filter((i) => i.groupId === groupId && (opts?.includeDeleted || i.deletedAt === null))
      .sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0));
  }

  async listAllItems(): Promise<PageGroupItem[]> {
    return [...this.items.values()]
      .filter((i) => i.deletedAt === null)
      .sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0));
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

let repo: InMemoryGroupRepository;
let service: GroupService;

beforeEach(() => {
  repo = new InMemoryGroupRepository();
  service = new GroupService(repo, logger);
  notifyMock.mockClear();
});

function seedGroups(count: number): void {
  const now = new Date().toISOString();
  for (let n = 0; n < count; n++) {
    const id = `g-${n}`;
    repo.groups.set(id, {
      id,
      name: `Group ${n}`,
      color: 'grey',
      position: `p${String(n).padStart(6, '0')}`,
      boundDeviceId: null,
      boundDeviceLabel: null,
      boundBrowser: null,
      boundAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }
}

function seedPageItems(groupId: string, count: number, live = true): void {
  const now = new Date().toISOString();
  for (let n = 0; n < count; n++) {
    const id = `i-${groupId}-${n}`;
    repo.items.set(id, {
      id,
      kind: 'page' as const,
      groupId,
      position: `p${String(n).padStart(6, '0')}`,
      urlNormalized: `https://example.com/page-${n}`,
      title: null,
      faviconUrl: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: live ? null : now,
    });
  }
}

describe('GroupService groups', () => {
  it('createGroup trims the name, defaults to grey, and notifies', async () => {
    const group = await service.createGroup({ name: '  Reading  ' });
    expect(group.name).toBe('Reading');
    expect(group.color).toBe('grey');
    expect(group.position).toBeTruthy();
    expect(group.createdAt).toBeTruthy();
    expect(group.deletedAt).toBeNull();
    expect(notifyMock).toHaveBeenCalledTimes(1);
  });

  it('createGroup rejects blank/overlong names and unknown colors', async () => {
    await expect(service.createGroup({ name: '   ' })).rejects.toBeInstanceOf(
      GroupValidationError
    );
    await expect(service.createGroup({ name: 'x'.repeat(81) })).rejects.toBeInstanceOf(
      GroupValidationError
    );
    await expect(
      service.createGroup({ name: 'ok', color: 'magenta' as never })
    ).rejects.toBeInstanceOf(GroupValidationError);
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it('createGroup enforces the 200 groups cap with GroupCapError', async () => {
    seedGroups(GROUP_CAPS.groupsPerUser);
    await expect(service.createGroup({ name: 'one-more' })).rejects.toMatchObject({
      name: 'GroupCapError',
      code: 'GROUP_CAP_EXCEEDED',
    });
    await expect(service.createGroup({ name: 'one-more' })).rejects.toBeInstanceOf(GroupCapError);
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it('renameGroup/recolorGroup update updatedAt and notify; no-op on same value', async () => {
    const group = await service.createGroup({ name: 'A', color: 'blue' });
    notifyMock.mockClear();
    const renamed = await service.renameGroup(group.id, 'B');
    expect(renamed.name).toBe('B');
    expect(Date.parse(renamed.updatedAt)).toBeGreaterThanOrEqual(Date.parse(group.updatedAt));
    const recolored = await service.recolorGroup(group.id, 'red');
    expect(recolored.color).toBe('red');
    expect(notifyMock).toHaveBeenCalledTimes(2);
    await service.renameGroup(group.id, 'B');
    expect(notifyMock).toHaveBeenCalledTimes(2);
  });

  it('renameGroup on a tombstoned group throws GroupNotFoundError', async () => {
    const group = await service.createGroup({ name: 'A' });
    await service.deleteGroup(group.id);
    await expect(service.renameGroup(group.id, 'B')).rejects.toBeInstanceOf(GroupNotFoundError);
  });

  it('deleteGroup tombstones and restoreGroup revives; delete is idempotent', async () => {
    const group = await service.createGroup({ name: 'A' });
    notifyMock.mockClear();
    const deleted = await service.deleteGroup(group.id);
    expect(deleted.deletedAt).not.toBeNull();
    const again = await service.deleteGroup(group.id);
    expect(again.deletedAt).toBe(deleted.deletedAt);
    expect(notifyMock).toHaveBeenCalledTimes(1);
    const restored = await service.restoreGroup(group.id);
    expect(restored.deletedAt).toBeNull();
    expect(notifyMock).toHaveBeenCalledTimes(2);
    const liveAgain = await service.restoreGroup(group.id);
    expect(liveAgain.deletedAt).toBeNull();
    expect(notifyMock).toHaveBeenCalledTimes(2);
  });

  it('restoreGroup at the cap throws GroupCapError', async () => {
    const group = await service.createGroup({ name: 'A' });
    await service.deleteGroup(group.id);
    seedGroups(GROUP_CAPS.groupsPerUser);
    await expect(service.restoreGroup(group.id)).rejects.toBeInstanceOf(GroupCapError);
  });

  it('moveGroup reorders top/up/down and no-ops at boundaries', async () => {
    const a = await service.createGroup({ name: 'a' });
    const b = await service.createGroup({ name: 'b' });
    const c = await service.createGroup({ name: 'c' });
    notifyMock.mockClear();

    const moved = await service.moveGroup(c.id, 'top');
    expect((await repo.listGroups()).map((g) => g.id)).toEqual([c.id, a.id, b.id]);
    expect(moved.id).toBe(c.id);
    expect(notifyMock).toHaveBeenCalledTimes(1);

    await service.moveGroup(a.id, 'down');
    expect((await repo.listGroups()).map((g) => g.id)).toEqual([c.id, b.id, a.id]);

    await service.moveGroup(b.id, 'up');
    expect((await repo.listGroups()).map((g) => g.id)).toEqual([b.id, c.id, a.id]);

    // Boundary no-ops: no write, no notify.
    const calls = notifyMock.mock.calls.length;
    await service.moveGroup(b.id, 'up');
    await service.moveGroup(b.id, 'top');
    await service.moveGroup(a.id, 'down');
    expect(notifyMock.mock.calls.length).toBe(calls);

    await expect(service.moveGroup('missing', 'up')).rejects.toBeInstanceOf(GroupNotFoundError);
  });
});

describe('GroupService items', () => {
  it('addPage normalizes URLs and rejects non-http(s)', async () => {
    const group = await service.createGroup({ name: 'A' });
    const item = await service.addPage(group.id, {
      url: 'https://example.com/page?utm_source=x#frag',
      title: 'T',
      faviconUrl: 'https://example.com/icon.png',
    });
    expect(item).toMatchObject({
      kind: 'page',
      urlNormalized: 'https://example.com/page',
      title: 'T',
    });
    expect(notifyMock).toHaveBeenCalled();

    for (const bad of ['chrome://newtab', 'about:blank', 'file:///tmp/x', 'ftp://x/y', '']) {
      await expect(service.addPage(group.id, { url: bad })).rejects.toBeInstanceOf(
        GroupValidationError
      );
    }
    await expect(
      service.addPage(group.id, { url: 'https://example.com/x', faviconUrl: 'data:image/png;x' })
    ).rejects.toBeInstanceOf(GroupValidationError);
  });

  it('addPage dedupes live (kind,key) and revives tombstones', async () => {
    const group = await service.createGroup({ name: 'A' });
    notifyMock.mockClear();
    const first = await service.addPage(group.id, { url: 'https://example.com/p?b=2&a=1' });
    const dup = await service.addPage(group.id, { url: 'https://example.com/p?a=1&b=2' });
    expect(dup.id).toBe(first.id);
    expect(notifyMock).toHaveBeenCalledTimes(1);

    await service.removeItem(group.id, first.id);
    const revived = await service.addPage(group.id, {
      url: 'https://example.com/p?a=1&b=2',
      title: 'Fresh',
    });
    expect(revived.id).toBe(first.id);
    expect(revived.deletedAt).toBeNull();
    expect(revived).toMatchObject({ kind: 'page', title: 'Fresh' });
  });

  it('addPage enforces the 500 page-item cap; domains do not count', async () => {
    const group = await service.createGroup({ name: 'A' });
    seedPageItems(group.id, GROUP_CAPS.itemsPerGroup);
    await expect(service.addPage(group.id, { url: 'https://example.com/extra' })).rejects.toBeInstanceOf(
      GroupCapError
    );
    const domain = await service.addDomain(group.id, { hostname: 'example.org' });
    expect(domain.kind).toBe('domain');
    await service.addDomain(group.id, { hostname: 'a.com' });
    await service.addDomain(group.id, { hostname: 'b.com' });
    await expect(service.addPage(group.id, { url: 'https://example.com/still-capped' })).rejects.toBeInstanceOf(
      GroupCapError
    );
  });

  it('addDomain normalizes hostnames and dedupes on hostname', async () => {
    const group = await service.createGroup({ name: 'A' });
    const first = await service.addDomain(group.id, { hostname: 'Example.COM.' });
    expect(first.kind).toBe('domain');
    if (first.kind === 'domain') {
      expect(first.hostname).toBe('example.com');
      expect(first.includeSubdomains).toBe(false);
    }
    notifyMock.mockClear();
    const dup = await service.addDomain(group.id, {
      hostname: 'example.com',
      includeSubdomains: true,
    });
    expect(dup.id).toBe(first.id);
    expect(notifyMock).not.toHaveBeenCalled();
    await expect(service.addDomain(group.id, { hostname: 'not a host' })).rejects.toBeInstanceOf(
      GroupValidationError
    );
  });

  it('removeItem/restoreItem round-trip; page restore at cap throws', async () => {
    const group = await service.createGroup({ name: 'A' });
    const item = await service.addPage(group.id, { url: 'https://example.com/p' });
    notifyMock.mockClear();
    const removed = await service.removeItem(group.id, item.id);
    expect(removed.deletedAt).not.toBeNull();
    expect(await repo.listItems(group.id)).toEqual([]);
    const restored = await service.restoreItem(group.id, item.id);
    expect(restored.deletedAt).toBeNull();
    expect(notifyMock).toHaveBeenCalledTimes(2);

    await service.removeItem(group.id, item.id);
    seedPageItems(group.id, GROUP_CAPS.itemsPerGroup);
    await expect(service.restoreItem(group.id, item.id)).rejects.toBeInstanceOf(GroupCapError);
  });

  it('moveItem reorders top/up/down and no-ops at boundaries', async () => {
    const group = await service.createGroup({ name: 'A' });
    const a = await service.addPage(group.id, { url: 'https://example.com/a' });
    const b = await service.addPage(group.id, { url: 'https://example.com/b' });
    const c = await service.addPage(group.id, { url: 'https://example.com/c' });
    notifyMock.mockClear();

    await service.moveItem(group.id, c.id, 'top');
    expect((await repo.listItems(group.id)).map((i) => i.id)).toEqual([c.id, a.id, b.id]);
    expect(notifyMock).toHaveBeenCalledTimes(1);

    await service.moveItem(group.id, a.id, 'down');
    expect((await repo.listItems(group.id)).map((i) => i.id)).toEqual([c.id, b.id, a.id]);

    await service.moveItem(group.id, b.id, 'up');
    expect((await repo.listItems(group.id)).map((i) => i.id)).toEqual([b.id, c.id, a.id]);

    const calls = notifyMock.mock.calls.length;
    await service.moveItem(group.id, b.id, 'up');
    await service.moveItem(group.id, a.id, 'down');
    expect(notifyMock.mock.calls.length).toBe(calls);
    await expect(service.moveItem(group.id, 'missing', 'up')).rejects.toBeInstanceOf(
      GroupNotFoundError
    );
  });
});
