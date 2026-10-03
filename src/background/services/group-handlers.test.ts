/**
 * @file group-handlers.test.ts
 * @description Contract for Task 1.5 background routing: GROUPS_LIST, GROUP_GET,
 * GROUP_MEMBERSHIP_FOR_URL, and GROUP_MUTATE dispatch over a fake bus with
 * in-memory repositories. Covers scoped basic/pro resolution, Zod payload
 * rejection, and GroupCapError serialization (code + scope + limit).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import { registerGroupHandlers } from './group-handlers';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type { IGroupRepository } from '@/shared/repositories/i-group-repository';
import { GROUP_CAPS } from '@/shared/types/page-group';
import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';
import type { ILogger } from '@/shared/utils/logger';

vi.mock('@/background/services/library-change-notifier', () => ({
  notifyLibraryDataChanged: vi.fn(),
}));

const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as ILogger;

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

  async listItems(groupId: string, opts?: { includeDeleted?: boolean }): Promise<PageGroupItem[]> {
    return [...this.items.values()]
      .filter((i) => i.groupId === groupId && (opts?.includeDeleted || i.deletedAt === null))
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

type Handler = (payload: unknown, sender?: any) => Promise<unknown>;

interface HandlerResult {
  success: boolean;
  data?: unknown;
  error?: string;
  code?: string;
  scope?: string;
  limit?: number;
}

function setup(
  isAuthenticated: boolean,
  tabGroupSyncService?: any,
  authManagerOverride?: Partial<IAuthManager>
): {
  call: (type: string, payload: unknown, sender?: any) => Promise<HandlerResult>;
  basic: InMemoryGroupRepository;
  pro: InMemoryGroupRepository;
  authManager: IAuthManager;
} {
  const handlers = new Map<string, Handler>();
  const messageBus = {
    subscribe: (type: string, handler: Handler): (() => void) => {
      handlers.set(type, handler);
      return () => undefined;
    },
  } as unknown as IMessageBus;
  const authManager = {
    isAuthenticated,
    currentUser: null,
    getAuthState: () => ({ isAuthenticated, user: null, provider: null, lastAuthTime: null }),
    ...authManagerOverride,
  } as IAuthManager;
  const basic = new InMemoryGroupRepository();
  const pro = new InMemoryGroupRepository();
  registerGroupHandlers({
    messageBus,
    authManager,
    basicGroupRepository: basic,
    proGroupRepository: pro,
    logger,
    tabGroupSyncService,
  });
  return {
    call: async (type, payload, sender) =>
      (await handlers.get(type)?.(payload, sender)) as HandlerResult,
    basic,
    pro,
    authManager,
  };
}

function seedLiveGroups(repo: InMemoryGroupRepository, count: number): void {
  for (let i = 0; i < count; i++) {
    const now = new Date().toISOString();
    repo.groups.set(`g-${i}`, {
      id: `g-${i}`,
      name: `Group ${i}`,
      color: 'grey',
      position: `a${i}`,
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

describe('registerGroupHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GROUPS_LIST returns live groups and items from the basic partition for guests', async () => {
    const { call, basic, pro } = setup(false);
    seedLiveGroups(basic, 2);
    seedLiveGroups(pro, 5);
    const response = await call('GROUPS_LIST', {});
    expect(response.success).toBe(true);
    const data = response.data as { groups: PageGroup[]; items: PageGroupItem[] };
    expect(data.groups).toHaveLength(2);
    expect(data.items).toEqual([]);
    expect(await call('GROUPS_LIST', 'malformed')).toMatchObject({
      success: false,
      code: 'INVALID_PAYLOAD',
    });
  });

  it('GROUPS_LIST reads the pro partition when signed in', async () => {
    const { call, basic, pro } = setup(true);
    seedLiveGroups(basic, 2);
    seedLiveGroups(pro, 1);
    const response = await call('GROUPS_LIST', {});
    expect(response.success).toBe(true);
    expect((response.data as { groups: PageGroup[] }).groups).toHaveLength(1);
  });

  it('GROUP_GET returns the group with items, and GROUP_NOT_FOUND for tombstones', async () => {
    const { call, basic } = setup(false);
    const now = new Date().toISOString();
    basic.groups.set('g-1', {
      id: 'g-1',
      name: 'One',
      color: 'blue',
      position: 'a0',
      boundDeviceId: null,
      boundDeviceLabel: null,
      boundBrowser: null,
      boundAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: now,
    });
    const missing = await call('GROUP_GET', { id: 'nope' });
    expect(missing).toMatchObject({ success: false, code: 'GROUP_NOT_FOUND' });
    const tombstoned = await call('GROUP_GET', { id: 'g-1' });
    expect(tombstoned).toMatchObject({ success: false, code: 'GROUP_NOT_FOUND' });
    const invalid = await call('GROUP_GET', {});
    expect(invalid).toMatchObject({ success: false, code: 'INVALID_PAYLOAD' });
  });

  it('GROUP_MUTATE createGroup round-trips and rejects invalid payloads', async () => {
    const { call } = setup(false);
    const created = await call('GROUP_MUTATE', {
      command: 'createGroup',
      name: '  Reading  ',
    });
    expect(created.success).toBe(true);
    const group = (created.data as { group: PageGroup }).group;
    expect(group.name).toBe('Reading');
    expect(group.color).toBe('grey');

    const bad = await call('GROUP_MUTATE', { command: 'createGroup', name: '' });
    // Empty name passes IPC Zod (service validates) -> GROUP_INVALID from service.
    expect(bad).toMatchObject({ success: false, code: 'GROUP_INVALID' });

    const unknown = await call('GROUP_MUTATE', { command: 'nope' });
    expect(unknown).toMatchObject({ success: false, code: 'INVALID_PAYLOAD' });
  });

  it('GROUP_MUTATE serializes GroupCapError with scope and limit', async () => {
    const { call, basic } = setup(false);
    seedLiveGroups(basic, GROUP_CAPS.groupsPerUser);
    const response = await call('GROUP_MUTATE', {
      command: 'createGroup',
      name: 'Overflow',
    });
    expect(response).toMatchObject({
      success: false,
      code: 'GROUP_CAP_EXCEEDED',
      scope: 'groups',
      limit: GROUP_CAPS.groupsPerUser,
    });
    expect(response.error).toContain(String(GROUP_CAPS.groupsPerUser));
  });

  it('GROUP_MUTATE addPage/addDomain/removeItem/restoreItem/moveItem flow', async () => {
    const { call } = setup(false);
    const created = await call('GROUP_MUTATE', { command: 'createGroup', name: 'G' });
    const groupId = (created.data as { group: PageGroup }).group.id;

    const page = await call('GROUP_MUTATE', {
      command: 'addPage',
      groupId,
      url: 'https://example.com/a',
      title: 'A',
    });
    expect(page.success).toBe(true);
    const itemId = (page.data as { item: PageGroupItem }).item.id;

    const domain = await call('GROUP_MUTATE', {
      command: 'addDomain',
      groupId,
      hostname: 'example.com',
      includeSubdomains: true,
    });
    expect(domain.success).toBe(true);

    const removed = await call('GROUP_MUTATE', {
      command: 'removeItem',
      groupId,
      itemId,
    });
    expect((removed.data as { item: PageGroupItem }).item.deletedAt).not.toBeNull();

    const restored = await call('GROUP_MUTATE', {
      command: 'restoreItem',
      groupId,
      itemId,
    });
    expect((restored.data as { item: PageGroupItem }).item.deletedAt).toBeNull();

    const moved = await call('GROUP_MUTATE', {
      command: 'moveItem',
      groupId,
      itemId,
      to: 'top',
    });
    expect(moved.success).toBe(true);
  });

  it('GROUP_MUTATE rename/recolor/moveGroup/delete/restore flow', async () => {
    const { call } = setup(false);
    const created = await call('GROUP_MUTATE', { command: 'createGroup', name: 'G' });
    const groupId = (created.data as { group: PageGroup }).group.id;

    const renamed = await call('GROUP_MUTATE', {
      command: 'renameGroup',
      id: groupId,
      name: 'Renamed',
    });
    expect((renamed.data as { group: PageGroup }).group.name).toBe('Renamed');

    const recolored = await call('GROUP_MUTATE', {
      command: 'recolorGroup',
      id: groupId,
      color: 'blue',
    });
    expect((recolored.data as { group: PageGroup }).group.color).toBe('blue');

    expect(
      (await call('GROUP_MUTATE', { command: 'moveGroup', id: groupId, to: 'top' }))
        .success
    ).toBe(true);
    expect(
      (await call('GROUP_MUTATE', { command: 'deleteGroup', id: groupId })).success
    ).toBe(true);
    const restored = await call('GROUP_MUTATE', {
      command: 'restoreGroup',
      id: groupId,
    });
    expect((restored.data as { group: PageGroup }).group.deletedAt).toBeNull();
  });

  it('GROUP_MEMBERSHIP_FOR_URL resolves explicit and via-hostname memberships', async () => {
    const { call } = setup(false);
    const a = await call('GROUP_MUTATE', { command: 'createGroup', name: 'A' });
    const b = await call('GROUP_MUTATE', { command: 'createGroup', name: 'B' });
    const idA = (a.data as { group: PageGroup }).group.id;
    const idB = (b.data as { group: PageGroup }).group.id;
    await call('GROUP_MUTATE', {
      command: 'addPage',
      groupId: idA,
      url: 'https://example.com/a',
    });
    await call('GROUP_MUTATE', {
      command: 'addDomain',
      groupId: idB,
      hostname: 'example.com',
    });

    const response = await call('GROUP_MEMBERSHIP_FOR_URL', {
      url: 'https://example.com/a',
    });
    expect(response.success).toBe(true);
    const memberships = (
      response.data as {
        memberships: Array<{ group: PageGroup; viaHostname: string | null }>;
      }
    ).memberships;
    expect(memberships).toHaveLength(2);
    expect(memberships[0]).toMatchObject({ viaHostname: null });
    expect(memberships[0]?.group.id).toBe(idA);
    expect(memberships[1]).toMatchObject({ viaHostname: 'example.com' });
    expect(memberships[1]?.group.id).toBe(idB);

    const invalid = await call('GROUP_MEMBERSHIP_FOR_URL', {});
    expect(invalid).toMatchObject({ success: false, code: 'INVALID_PAYLOAD' });
  });

  describe('GROUP_OPEN_IN_BROWSER', () => {
    it('delegates to tabGroupSyncService.openInBrowser on success', async () => {
      const openInBrowserMock = vi.fn().mockResolvedValue({
        ok: true,
        browserGroupId: 42,
        tabCount: 5,
      });
      const { call } = setup(false, { openInBrowser: openInBrowserMock });
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';

      const response = await call('GROUP_OPEN_IN_BROWSER', {
        groupId: validUuid,
        force: false,
      });

      expect(response.success).toBe(true);
      expect(response.data).toEqual({
        ok: true,
        browserGroupId: 42,
        tabCount: 5,
      });
      expect(openInBrowserMock).toHaveBeenCalledWith(validUuid, false);
    });

    it('returns needsConfirm response when tab count exceeds threshold', async () => {
      const openInBrowserMock = vi.fn().mockResolvedValue({
        ok: false,
        needsConfirm: true,
        tabCount: 20,
      });
      const { call } = setup(false, { openInBrowser: openInBrowserMock });
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';

      const response = await call('GROUP_OPEN_IN_BROWSER', {
        groupId: validUuid,
      });

      expect(response.success).toBe(true);
      expect(response.data).toEqual({
        ok: false,
        needsConfirm: true,
        tabCount: 20,
      });
      expect(openInBrowserMock).toHaveBeenCalledWith(validUuid, undefined);
    });

    it('rejects invalid payload with INVALID_PAYLOAD', async () => {
      const { call } = setup(false, { openInBrowser: vi.fn() });

      const notUuid = await call('GROUP_OPEN_IN_BROWSER', { groupId: 'not-a-uuid' });
      expect(notUuid).toMatchObject({
        success: false,
        code: 'INVALID_PAYLOAD',
      });

      const missingId = await call('GROUP_OPEN_IN_BROWSER', {});
      expect(missingId).toMatchObject({
        success: false,
        code: 'INVALID_PAYLOAD',
      });
    });

    it('returns SERVICE_UNAVAILABLE when tabGroupSyncService is absent', async () => {
      const { call } = setup(false);
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';

      const response = await call('GROUP_OPEN_IN_BROWSER', { groupId: validUuid });
      expect(response).toMatchObject({
        success: false,
        code: 'SERVICE_UNAVAILABLE',
      });
    });

    it('returns error when openInBrowser returns ok: false without needsConfirm', async () => {
      const openInBrowserMock = vi.fn().mockResolvedValue({
        ok: false,
        error: 'Group has no pages to open',
      });
      const { call } = setup(false, { openInBrowser: openInBrowserMock });
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';

      const response = await call('GROUP_OPEN_IN_BROWSER', { groupId: validUuid });
      expect(response.success).toBe(false);
      expect(response.error).toBe('Group has no pages to open');
    });

    describe('sender origin and ownership validation', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';

      it('rejects unauthorized sender origin with UNAUTHORIZED', async () => {
        const { call } = setup(false, { openInBrowser: vi.fn() });

        const fromUrl = await call(
          'GROUP_OPEN_IN_BROWSER',
          { groupId: validUuid },
          { url: 'https://malicious.com/attack' }
        );
        expect(fromUrl).toMatchObject({
          success: false,
          code: 'UNAUTHORIZED',
          error: 'Unauthorized origin',
        });

        const fromTab = await call(
          'GROUP_OPEN_IN_BROWSER',
          { groupId: validUuid },
          { tab: { url: 'https://attacker.org' } }
        );
        expect(fromTab).toMatchObject({
          success: false,
          code: 'UNAUTHORIZED',
          error: 'Unauthorized origin',
        });

        const fromOrigin = await call(
          'GROUP_OPEN_IN_BROWSER',
          { groupId: validUuid },
          { origin: 'https://evil-site.com' }
        );
        expect(fromOrigin).toMatchObject({
          success: false,
          code: 'UNAUTHORIZED',
          error: 'Unauthorized origin',
        });
      });

      it('allows authorized web app sender origins', async () => {
        const openMock = vi.fn().mockResolvedValue({ ok: true, browserGroupId: 1 });
        const { call } = setup(false, { openInBrowser: openMock });

        const fromLocalhost = await call(
          'GROUP_OPEN_IN_BROWSER',
          { groupId: validUuid },
          { url: 'http://localhost:3000/library/groups/1' }
        );
        expect(fromLocalhost.success).toBe(true);

        const fromPagesDev = await call(
          'GROUP_OPEN_IN_BROWSER',
          { groupId: validUuid },
          { origin: 'https://underscore-web.pages.dev' }
        );
        expect(fromPagesDev.success).toBe(true);
      });

      it('rejects non-owner when authenticated with FORBIDDEN', async () => {
        const openMock = vi.fn().mockResolvedValue({ ok: true });
        const { call, pro } = setup(
          true,
          { openInBrowser: openMock },
          { currentUser: { id: 'user-1', email: 'u1@example.com', displayName: 'U1' } }
        );

        // Put a group owned by user-2 in the pro repository
        await pro.putGroup({
          id: validUuid,
          name: 'Other user group',
          color: 'blue',
          position: 'a0',
          ownerId: 'user-2',
          boundDeviceId: null,
          boundDeviceLabel: null,
          boundBrowser: null,
          boundAt: null,
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
          deletedAt: null,
        });

        const response = await call('GROUP_OPEN_IN_BROWSER', { groupId: validUuid });

        expect(response).toMatchObject({
          success: false,
          code: 'FORBIDDEN',
          error: 'Access denied: not group owner',
        });
        expect(openMock).not.toHaveBeenCalled();
      });

      it('allows owner when authenticated', async () => {
        const openMock = vi.fn().mockResolvedValue({ ok: true, browserGroupId: 5 });
        const { call, pro } = setup(
          true,
          { openInBrowser: openMock },
          { currentUser: { id: 'user-1', email: 'u1@example.com', displayName: 'U1' } }
        );

        // Put a group owned by user-1 in the pro repository
        await pro.putGroup({
          id: validUuid,
          name: 'My group',
          color: 'blue',
          position: 'a0',
          ownerId: 'user-1',
          boundDeviceId: null,
          boundDeviceLabel: null,
          boundBrowser: null,
          boundAt: null,
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-09-01T00:00:00Z',
          deletedAt: null,
        });

        const response = await call('GROUP_OPEN_IN_BROWSER', { groupId: validUuid });

        expect(response.success).toBe(true);
        expect(openMock).toHaveBeenCalledWith(validUuid, undefined);
      });
    });
  });

  describe('EXTENSION_GET_BROWSER_TAB_GROUPS', () => {
    it('delegates to tabGroupSyncService.getBrowserTabGroups', async () => {
      const getMock = vi.fn().mockResolvedValue({
        ok: true,
        groups: [
          {
            id: 10,
            title: 'Project',
            color: 'blue',
            tabCount: 2,
            validUrls: ['https://example.com'],
            skippedCount: 0,
          },
        ],
      });
      const { call } = setup(false, { getBrowserTabGroups: getMock });

      const response = await call('EXTENSION_GET_BROWSER_TAB_GROUPS', {});
      expect(response.success).toBe(true);
      expect((response.data as { groups: unknown[] }).groups).toHaveLength(1);
      expect(getMock).toHaveBeenCalled();
    });

    it('returns SERVICE_UNAVAILABLE when sync service is absent', async () => {
      const { call } = setup(false, null);
      const response = await call('EXTENSION_GET_BROWSER_TAB_GROUPS', {});
      expect(response.success).toBe(false);
      expect(response.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('rejects unauthorized sender origin', async () => {
      const { call } = setup(false, { getBrowserTabGroups: vi.fn() });
      const response = await call(
        'EXTENSION_GET_BROWSER_TAB_GROUPS',
        {},
        { url: 'https://evil.com/page' }
      );
      expect(response.success).toBe(false);
      expect(response.code).toBe('UNAUTHORIZED');
    });
  });

  describe('EXTENSION_FOCUS_TAB_GROUP', () => {
    it('delegates to tabGroupSyncService.focusTabGroup', async () => {
      const focusMock = vi.fn().mockResolvedValue({ ok: true });
      const { call } = setup(false, { focusTabGroup: focusMock });

      const response = await call('EXTENSION_FOCUS_TAB_GROUP', { browserGroupId: 42 });
      expect(response.success).toBe(true);
      expect(focusMock).toHaveBeenCalledWith(42);
    });

    it('rejects invalid payload', async () => {
      const { call } = setup(false, { focusTabGroup: vi.fn() });
      const response = await call('EXTENSION_FOCUS_TAB_GROUP', { browserGroupId: 'invalid' });
      expect(response.success).toBe(false);
      expect(response.code).toBe('INVALID_PAYLOAD');
    });

    it('returns SERVICE_UNAVAILABLE when sync service is absent', async () => {
      const { call } = setup(false, null);
      const response = await call('EXTENSION_FOCUS_TAB_GROUP', { browserGroupId: 42 });
      expect(response.success).toBe(false);
      expect(response.code).toBe('SERVICE_UNAVAILABLE');
    });
  });
});
