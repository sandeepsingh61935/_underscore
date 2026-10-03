/**
 * @file tab-group-sync-service.test.ts
 * @description Unit tests for TabGroupSyncService (Phase 3 Task 3.3).
 */

import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import type { DeviceIdService } from '@/background/services/device-id-service';
import { GroupService } from '@/background/services/group-service';
import {
  TabGroupBindingStore,
  type StorageAreaLike,
} from '@/background/services/tab-group-binding-store';
import {
  TabGroupSyncService,
  type TabGroupsApiLike,
  type TabsApiLike,
} from '@/background/services/tab-group-sync-service';
import type { LocalWriteEchoTracker } from '@/background/services/local-write-echo-tracker';
import type { OfflineQueueService } from '@/background/services/offline-queue-service';
import type { IEventBus } from '@/shared/interfaces/i-event-bus';
import { EventName } from '@/shared/types/events';
import type { IGroupRepository } from '@/shared/repositories/i-group-repository';
import type {
  GroupColor,
  PageGroup,
  PageGroupItem,
  TabGroupBinding,
} from '@/shared/types/page-group';
import type { ILogger } from '@/shared/utils/logger';

class MockEventBus implements IEventBus {
  private handlers = new Map<string, Array<(data: any) => void | Promise<void>>>();

  on<T = unknown>(event: string, handler: (data: T) => void | Promise<void>): () => void {
    const list = this.handlers.get(event) ?? [];
    list.push(handler as any);
    this.handlers.set(event, list);
    return () => this.off(event, handler);
  }

  off<T = unknown>(event: string, handler: (data: T) => void | Promise<void>): void {
    const list = this.handlers.get(event) ?? [];
    const idx = list.indexOf(handler as any);
    if (idx !== -1) list.splice(idx, 1);
  }

  emit<T = unknown>(event: string, data: T): void {
    const list = this.handlers.get(event) ?? [];
    for (const h of list) {
      void h(data);
    }
  }

  once<T = unknown>(event: string, handler: (data: T) => void | Promise<void>): void {
    const unbind = this.on(event, async (data) => {
      unbind();
      await handler(data as T);
    });
  }

  clear(event?: string): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }

  async emitAsync(event: string, data: any): Promise<void> {
    const list = this.handlers.get(event) ?? [];
    for (const h of list) {
      await h(data);
    }
  }
}

// Helper for event listeners in mocks
function createMockListener<T extends (...args: any[]) => any>() {
  const listeners: T[] = [];
  return {
    addListener: vi.fn((cb: T) => {
      listeners.push(cb);
    }),
    removeListener: vi.fn((cb: T) => {
      const idx = listeners.indexOf(cb);
      if (idx !== -1) listeners.splice(idx, 1);
    }),
    emit: async (...args: Parameters<T>) => {
      for (const listener of [...listeners]) {
        await listener(...args);
      }
    },
    count: () => listeners.length,
  };
}

class InMemoryGroupRepository implements IGroupRepository {
  private groups = new Map<string, PageGroup>();
  private items = new Map<string, PageGroupItem>();

  async listGroups(opts?: { includeDeleted?: boolean }): Promise<PageGroup[]> {
    const all = Array.from(this.groups.values());
    return opts?.includeDeleted ? all : all.filter((g) => g.deletedAt === null);
  }

  async getGroup(id: string): Promise<PageGroup | null> {
    return this.groups.get(id) ?? null;
  }

  async listItems(
    groupId: string,
    opts?: { includeDeleted?: boolean }
  ): Promise<PageGroupItem[]> {
    const all = Array.from(this.items.values()).filter(
      (item) => item.groupId === groupId
    );
    return opts?.includeDeleted ? all : all.filter((i) => i.deletedAt === null);
  }

  async listAllItems(): Promise<PageGroupItem[]> {
    return Array.from(this.items.values()).filter((i) => i.deletedAt === null);
  }

  async putGroup(group: PageGroup): Promise<void> {
    this.groups.set(group.id, { ...group });
  }

  async putItem(item: PageGroupItem): Promise<void> {
    this.items.set(item.id, { ...item });
  }

  async clearGroups(): Promise<void> {
    this.groups.clear();
    this.items.clear();
  }

  async purgeTombstones(): Promise<number> {
    return 0;
  }
}

describe('TabGroupSyncService', () => {
  const CURRENT_DEVICE_ID = 'test-device-uuid-123';

  // Mock Storage Area
  let storageMap: Map<string, unknown>;
  let mockStorage: StorageAreaLike;

  // Mock Repositories
  let basicGroups: InMemoryGroupRepository;
  let proGroups: InMemoryGroupRepository;
  let bindingStore: TabGroupBindingStore;

  // Mock DeviceIdService
  let mockDeviceIdService: DeviceIdService;

  // Mock Logger
  let mockLogger: ILogger;

  // Mock AuthManager
  let mockAuthManager: IAuthManager;

  // Mock Browser Tabs API
  let mockTabsApi: TabsApiLike & {
    _tabs: Map<number, any>;
    onCreated: ReturnType<typeof createMockListener>;
    onUpdated: ReturnType<typeof createMockListener>;
    onRemoved: ReturnType<typeof createMockListener>;
    onAttached: ReturnType<typeof createMockListener>;
    onDetached: ReturnType<typeof createMockListener>;
  };

  // Mock Browser TabGroups API
  let mockTabGroupsApi: TabGroupsApiLike & {
    _groups: Map<number, any>;
    onCreated: ReturnType<typeof createMockListener>;
    onUpdated: ReturnType<typeof createMockListener>;
    onRemoved: ReturnType<typeof createMockListener>;
    onMoved: ReturnType<typeof createMockListener>;
  };

  let hasPermissionsMock: Mock<() => Promise<boolean>>;
  let service: TabGroupSyncService;

  beforeEach(() => {
    vi.useFakeTimers();

    storageMap = new Map<string, unknown>([
      ['groups_browser_sync_enabled', true],
      ['groups_auto_sync_new_tab_groups', true],
    ]);

    mockStorage = {
      get: vi.fn(async (keys: string | string[]) => {
        const keyList = Array.isArray(keys) ? keys : [keys];
        const res: Record<string, unknown> = {};
        for (const k of keyList) {
          if (storageMap.has(k)) {
            res[k] = storageMap.get(k);
          }
        }
        return res;
      }),
      set: vi.fn(async (items: Record<string, unknown>) => {
        for (const [k, v] of Object.entries(items)) {
          storageMap.set(k, v);
        }
      }),
      remove: vi.fn(async (keys: string | string[]) => {
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const k of keyList) {
          storageMap.delete(k);
        }
      }),
    };

    basicGroups = new InMemoryGroupRepository();
    proGroups = new InMemoryGroupRepository();
    bindingStore = new TabGroupBindingStore(mockStorage);

    mockDeviceIdService = {
      getDeviceId: vi.fn(async () => CURRENT_DEVICE_ID),
    } as unknown as DeviceIdService;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as ILogger;

    mockAuthManager = {
      isAuthenticated: false,
      currentUser: null,
      initialize: vi.fn(),
      onAuthStateChanged: vi.fn(),
    } as unknown as IAuthManager;

    const groupsMap = new Map<number, any>();
    mockTabGroupsApi = {
      _groups: groupsMap,
      query: vi.fn(async () => Array.from(groupsMap.values())),
      get: vi.fn(async (groupId: number) => groupsMap.get(groupId)),
      update: vi.fn(
        async (
          groupId: number,
          props: { title?: string; color?: GroupColor }
        ) => {
          const group = groupsMap.get(groupId) ?? { id: groupId };
          if (props.title !== undefined) group.title = props.title;
          if (props.color !== undefined) group.color = props.color;
          groupsMap.set(groupId, group);
          return group;
        }
      ),
      onCreated: createMockListener(),
      onUpdated: createMockListener(),
      onRemoved: createMockListener(),
      onMoved: createMockListener(),
    };

    const tabsMap = new Map<number, any>();
    mockTabsApi = {
      _tabs: tabsMap,
      query: vi.fn(async (info: { groupId?: number }) => {
        const list = Array.from(tabsMap.values());
        if (info.groupId !== undefined) {
          return list.filter((t) => t.groupId === info.groupId);
        }
        return list;
      }),
      get: vi.fn(async (tabId: number) => tabsMap.get(tabId)),
      ungroup: vi.fn(async (tabIds: number | number[]) => {
        const ids = Array.isArray(tabIds) ? tabIds : [tabIds];
        for (const id of ids) {
          const tab = tabsMap.get(id);
          if (tab) {
            tab.groupId = -1;
          }
        }
      }),
      remove: vi.fn(async (tabIds: number | number[]) => {
        const ids = Array.isArray(tabIds) ? tabIds : [tabIds];
        for (const id of ids) {
          tabsMap.delete(id);
        }
      }),
      create: vi.fn(async (props: { url?: string; windowId?: number; active?: boolean }) => {
        const id = tabsMap.size + 1;
        const tab = {
          id,
          url: props.url,
          windowId: props.windowId ?? 1,
          groupId: -1,
          active: props.active ?? false,
        };
        tabsMap.set(id, tab);
        return tab;
      }),
      group: vi.fn(async (options: { tabIds: number | number[]; createProperties?: { windowId?: number } }) => {
        const id = groupsMap.size + 1;
        const ids = Array.isArray(options.tabIds) ? options.tabIds : [options.tabIds];
        for (const tabId of ids) {
          const tab = tabsMap.get(tabId);
          if (tab) {
            tab.groupId = id;
          }
        }
        const createdGroup = {
          id,
          windowId: options.createProperties?.windowId ?? 1,
          title: '',
          color: 'grey' as GroupColor,
        };
        groupsMap.set(id, createdGroup);
        // Simulate browser emitting tabGroups.onCreated asynchronously (macrotask)
        setTimeout(() => {
          mockTabGroupsApi.onCreated.emit(createdGroup);
        }, 0);
        return id;
      }),
      onCreated: createMockListener(),
      onUpdated: createMockListener(),
      onRemoved: createMockListener(),
      onAttached: createMockListener(),
      onDetached: createMockListener(),
    };

    hasPermissionsMock = vi.fn(async () => true);

    (globalThis as any).browser = {
      ...(globalThis as any).browser,
      tabGroups: {
        query: vi.fn(async () => Array.from(groupsMap.values())),
        update: vi.fn(async () => ({})),
      },
      tabs: {
        ...(globalThis as any).browser?.tabs,
        group: vi.fn(async () => 1),
      },
    };

    service = new TabGroupSyncService({
      authManager: mockAuthManager,
      basicGroups,
      proGroups,
      bindingStore,
      deviceIdService: mockDeviceIdService,
      logger: mockLogger,
      tabsApi: mockTabsApi,
      tabGroupsApi: mockTabGroupsApi,
      storage: mockStorage,
      hasPermissionsCheck: hasPermissionsMock,
      batchDelayMs: 500,
    });

    service.registerTopLevelListeners();
  });

  afterEach(() => {
    service.dispose();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('1. Browser to App: Tab joins linked group', () => {
    it('adds page item to app group when syncable tab joins linked group', async () => {
      // Setup existing app group and binding
      const groupService = new GroupService(basicGroups, mockLogger);
      const appGroup = await groupService.createGroup({
        name: 'Research',
        color: 'blue',
      });

      const browserGroupId = 10;
      mockTabGroupsApi._groups.set(browserGroupId, {
        id: browserGroupId,
        title: 'Research',
        color: 'blue',
        windowId: 1,
      });

      await bindingStore.save({
        appGroupId: appGroup.id,
        browserGroupId,
        windowId: 1,
        title: 'Research',
        color: 'blue',
        urls: [],
        lastSeenAt: new Date().toISOString(),
      });

      // Browser event: new tab added to browser tab group 10
      const newTab = {
        id: 101,
        groupId: browserGroupId,
        windowId: 1,
        url: 'https://example.com/article',
        title: 'Important Article',
        favIconUrl: 'https://example.com/favicon.ico',
        incognito: false,
      };
      mockTabsApi._tabs.set(101, newTab);

      // Trigger tabs.onUpdated
      mockTabsApi.onUpdated.emit(101, { groupId: browserGroupId }, newTab);

      // Advance 500ms debounce batch window
      await vi.advanceTimersByTimeAsync(500);

      // Verify app group now has the page item
      const items = await basicGroups.listItems(appGroup.id);
      expect(items).toHaveLength(1);
      expect(items[0]?.kind).toBe('page');
      if (items[0]?.kind === 'page') {
        expect(items[0].urlNormalized).toBe('https://example.com/article');
        expect(items[0].title).toBe('Important Article');
      }

      // Verify binding urls updated
      const updatedBinding = await bindingStore.getByBrowserGroupId(browserGroupId);
      expect(updatedBinding?.urls).toContain('https://example.com/article');
    });

    it('ignores non-syncable tabs (incognito, chrome://, file://)', async () => {
      const groupService = new GroupService(basicGroups, mockLogger);
      const appGroup = await groupService.createGroup({
        name: 'Internal',
        color: 'grey',
      });

      const browserGroupId = 11;
      await bindingStore.save({
        appGroupId: appGroup.id,
        browserGroupId,
        windowId: 1,
        title: 'Internal',
        color: 'grey',
        urls: [],
        lastSeenAt: new Date().toISOString(),
      });

      // Chrome internal page
      const chromeTab = {
        id: 102,
        groupId: browserGroupId,
        url: 'chrome://extensions',
        title: 'Extensions',
        incognito: false,
      };
      mockTabsApi._tabs.set(102, chromeTab);
      mockTabsApi.onUpdated.emit(102, { groupId: browserGroupId }, chromeTab);

      // Incognito page
      const incognitoTab = {
        id: 103,
        groupId: browserGroupId,
        url: 'https://secret.com',
        title: 'Secret',
        incognito: true,
      };
      mockTabsApi._tabs.set(103, incognitoTab);
      mockTabsApi.onUpdated.emit(103, { groupId: browserGroupId }, incognitoTab);

      await vi.advanceTimersByTimeAsync(500);

      const items = await basicGroups.listItems(appGroup.id);
      expect(items).toHaveLength(0);
    });
  });

  describe('2. Browser to App: Tab ungrouped without closing', () => {
    it('removes item from app group when tab is ungrouped', async () => {
      const groupService = new GroupService(basicGroups, mockLogger);
      const appGroup = await groupService.createGroup({
        name: 'Dev',
        color: 'red',
      });
      const pageItem = await groupService.addPage(appGroup.id, {
        url: 'https://github.com/project',
        title: 'GitHub Repo',
      });

      const browserGroupId = 20;
      await bindingStore.save({
        appGroupId: appGroup.id,
        browserGroupId,
        windowId: 1,
        title: 'Dev',
        color: 'red',
        urls: ['https://github.com/project'],
        lastSeenAt: new Date().toISOString(),
      });

      // Seed tab cache with tab in group 20
      const tab = {
        id: 201,
        groupId: browserGroupId,
        windowId: 1,
        url: 'https://github.com/project',
        incognito: false,
      };
      service.seedTabCache({
        tabId: 201,
        groupId: browserGroupId,
        windowId: 1,
        url: 'https://github.com/project',
      });
      mockTabsApi._tabs.set(201, tab);

      // User ungroups the tab (dragged out or ungrouped; tab is still open!)
      tab.groupId = -1;
      mockTabsApi.onUpdated.emit(201, { groupId: -1 }, tab);

      // Advance debounce batch window
      await vi.advanceTimersByTimeAsync(500);

      // Page item should now be tombstoned / removed
      const liveItems = await basicGroups.listItems(appGroup.id, {
        includeDeleted: false,
      });
      expect(liveItems).toHaveLength(0);

      const allItems = await basicGroups.listItems(appGroup.id, {
        includeDeleted: true,
      });
      expect(allItems.find((i) => i.id === pageItem.id)?.deletedAt).not.toBeNull();
    });
  });

  describe('3. Browser to App: Tab closed keeps item; all closed marks group closed', () => {
    it('keeps item in app group when a single tab closes, while other tabs remain', async () => {
      const groupService = new GroupService(basicGroups, mockLogger);
      const appGroup = await groupService.createGroup({
        name: 'MultiTab',
        color: 'green',
      });
      await groupService.addPage(appGroup.id, {
        url: 'https://example.com/tab1',
        title: 'Tab 1',
      });
      await groupService.addPage(appGroup.id, {
        url: 'https://example.com/tab2',
        title: 'Tab 2',
      });

      const browserGroupId = 30;
      await bindingStore.save({
        appGroupId: appGroup.id,
        browserGroupId,
        windowId: 1,
        title: 'MultiTab',
        color: 'green',
        urls: ['https://example.com/tab1', 'https://example.com/tab2'],
        lastSeenAt: new Date().toISOString(),
      });

      // Tab 1 and Tab 2 in browser
      mockTabsApi._tabs.set(301, {
        id: 301,
        groupId: browserGroupId,
        url: 'https://example.com/tab1',
        incognito: false,
      });
      mockTabsApi._tabs.set(302, {
        id: 302,
        groupId: browserGroupId,
        url: 'https://example.com/tab2',
        incognito: false,
      });

      service.seedTabCache({
        tabId: 301,
        groupId: browserGroupId,
        url: 'https://example.com/tab1',
      });
      service.seedTabCache({
        tabId: 302,
        groupId: browserGroupId,
        url: 'https://example.com/tab2',
      });

      // Close Tab 1: removed from browser
      mockTabsApi._tabs.delete(301);
      mockTabsApi.onRemoved.emit(301, { windowId: 1, isWindowClosing: false });

      await vi.advanceTimersByTimeAsync(500);

      // App group items MUST STILL BE INTACT! (Tab 1 kept in app group per spec)
      const liveItems = await basicGroups.listItems(appGroup.id);
      expect(liveItems).toHaveLength(2);

      // Group is still bound because Tab 2 is still open
      const binding = await bindingStore.getByAppGroupId(appGroup.id);
      expect(binding).not.toBeNull();
      expect(binding?.urls).toEqual(['https://example.com/tab2']);
    });

    it('marks app group closed and removes binding when all tabs in group are closed', async () => {
      const groupService = new GroupService(basicGroups, mockLogger);
      const appGroup = await groupService.createGroup({
        name: 'ClosingGroup',
        color: 'pink',
      });
      // Mark as bound to this device initially
      await basicGroups.putGroup({
        ...appGroup,
        boundDeviceId: CURRENT_DEVICE_ID,
        boundBrowser: 'chrome',
        boundAt: new Date().toISOString(),
      });

      await groupService.addPage(appGroup.id, {
        url: 'https://example.com/only-tab',
      });

      const browserGroupId = 35;
      await bindingStore.save({
        appGroupId: appGroup.id,
        browserGroupId,
        windowId: 1,
        title: 'ClosingGroup',
        color: 'pink',
        urls: ['https://example.com/only-tab'],
        lastSeenAt: new Date().toISOString(),
      });

      mockTabsApi._tabs.set(351, {
        id: 351,
        groupId: browserGroupId,
        url: 'https://example.com/only-tab',
        incognito: false,
      });
      service.seedTabCache({
        tabId: 351,
        groupId: browserGroupId,
        url: 'https://example.com/only-tab',
      });

      // Close the only tab in the group
      mockTabsApi._tabs.delete(351);
      mockTabsApi.onRemoved.emit(351, { windowId: 1, isWindowClosing: false });

      await vi.advanceTimersByTimeAsync(500);

      // App group should now have bound device/browser cleared to null (marked closed), but preserve boundAt
      const updatedGroup = await basicGroups.getGroup(appGroup.id);
      expect(updatedGroup?.boundDeviceId).toBeNull();
      expect(updatedGroup?.boundBrowser).toBeNull();
      expect(updatedGroup?.boundAt).not.toBeNull();

      // Binding must be removed from binding store
      const binding = await bindingStore.getByAppGroupId(appGroup.id);
      expect(binding).toBeNull();

      // But items are KEPT!
      const items = await basicGroups.listItems(appGroup.id);
      expect(items).toHaveLength(1);
    });
  });

  describe('4. Browser to App: Title or color updated in browser', () => {
    it('renames and recolors app group when tab group is updated', async () => {
      const groupService = new GroupService(basicGroups, mockLogger);
      const appGroup = await groupService.createGroup({
        name: 'Old Title',
        color: 'grey',
      });

      const browserGroupId = 40;
      await bindingStore.save({
        appGroupId: appGroup.id,
        browserGroupId,
        windowId: 1,
        title: 'Old Title',
        color: 'grey',
        urls: [],
        lastSeenAt: new Date().toISOString(),
      });

      // Browser event: group title and color changed
      await mockTabGroupsApi.onUpdated.emit({
        id: browserGroupId,
        title: 'New Title',
        color: 'orange',
      });

      // Check app group was renamed and recolored
      const updatedAppGroup = await basicGroups.getGroup(appGroup.id);
      expect(updatedAppGroup?.name).toBe('New Title');
      expect(updatedAppGroup?.color).toBe('orange');

      // Check binding updated
      const updatedBinding = await bindingStore.getByBrowserGroupId(browserGroupId);
      expect(updatedBinding?.title).toBe('New Title');
      expect(updatedBinding?.color).toBe('orange');
    });
  });

  describe('5. Browser to App: New browser group created with autoSync', () => {
    it('automatically creates app group and binding when new tab group is created in browser', async () => {
      const newBrowserGroupId = 50;

      // Group created with an initial tab
      mockTabsApi._tabs.set(501, {
        id: 501,
        groupId: newBrowserGroupId,
        url: 'https://auto-sync.com',
        title: 'Auto Sync Page',
        incognito: false,
      });

      await mockTabGroupsApi.onCreated.emit({
        id: newBrowserGroupId,
        title: 'Auto Group',
        color: 'purple',
        windowId: 1,
      });

      // App group was created
      const groups = await basicGroups.listGroups();
      expect(groups).toHaveLength(1);
      const created = groups[0]!;
      expect(created.name).toBe('Auto Group');
      expect(created.color).toBe('purple');
      expect(created.boundDeviceId).toBe(CURRENT_DEVICE_ID);

      // Binding was saved
      const binding = await bindingStore.getByBrowserGroupId(newBrowserGroupId);
      expect(binding).not.toBeNull();
      expect(binding?.appGroupId).toBe(created.id);
      expect(binding?.title).toBe('Auto Group');
      expect(binding?.color).toBe('purple');
      expect(binding?.urls).toContain('https://auto-sync.com/');

      // Initial tab added to group items
      const items = await basicGroups.listItems(created.id);
      expect(items).toHaveLength(1);
      if (items[0]?.kind === 'page') {
        expect(items[0].urlNormalized).toBe('https://auto-sync.com/');
      }
    });

    it('does not auto-sync when groups_auto_sync_new_tab_groups setting is false', async () => {
      storageMap.set('groups_auto_sync_new_tab_groups', false);

      await mockTabGroupsApi.onCreated.emit({
        id: 51,
        title: 'Manual Only',
        color: 'yellow',
      });

      const groups = await basicGroups.listGroups();
      expect(groups).toHaveLength(0);

      const binding = await bindingStore.getByBrowserGroupId(51);
      expect(binding).toBeNull();
    });
  });

  describe('6. Remote to Browser: Rename and recolor with echo suppression', () => {
    it('applies remote rename and recolor to browser tab group and suppresses echo', async () => {
      const browserGroupId = 60;
      const appGroupId = 'remote-sync-group-1';

      mockTabGroupsApi._groups.set(browserGroupId, {
        id: browserGroupId,
        title: 'Local Name',
        color: 'blue',
      });

      await bindingStore.save({
        appGroupId,
        browserGroupId,
        windowId: 1,
        title: 'Local Name',
        color: 'blue',
        urls: [],
        lastSeenAt: new Date().toISOString(),
      });

      const remoteGroup: PageGroup = {
        id: appGroupId,
        name: 'Remote Name',
        color: 'red',
        position: 'a0',
        boundDeviceId: CURRENT_DEVICE_ID, // Bound to THIS device
        boundDeviceLabel: 'This Device',
        boundBrowser: 'chrome',
        boundAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };

      await service.handleRemoteGroupUpdated(remoteGroup);

      // Verify tabGroups.update was called
      expect(mockTabGroupsApi.update).toHaveBeenCalledWith(browserGroupId, {
        title: 'Remote Name',
        color: 'red',
      });

      // Browser then fires onUpdated for that change
      // Echo suppression should swallow this event and NOT call renameGroup/recolorGroup back
      const renameSpy = vi.spyOn(service.getGroupService(), 'renameGroup');
      mockTabGroupsApi.onUpdated.emit({
        id: browserGroupId,
        title: 'Remote Name',
        color: 'red',
      });

      expect(renameSpy).not.toHaveBeenCalled();
    });
  });

  describe('7. Remote to Browser: Remote item removal ungroups tab and never closes it', () => {
    it('ungroups matching tab via tabs.ungroup and never calls tabs.remove', async () => {
      const browserGroupId = 70;
      const appGroupId = 'remote-item-group';

      const group: PageGroup = {
        id: appGroupId,
        name: 'Work',
        color: 'cyan',
        position: 'a0',
        boundDeviceId: CURRENT_DEVICE_ID,
        boundDeviceLabel: null,
        boundBrowser: 'chrome',
        boundAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      await basicGroups.putGroup(group);

      const tab701 = {
        id: 701,
        groupId: browserGroupId,
        url: 'https://example.com/remove-me',
        incognito: false,
      };
      const tab702 = {
        id: 702,
        groupId: browserGroupId,
        url: 'https://example.com/keep-me',
        incognito: false,
      };
      mockTabsApi._tabs.set(701, tab701);
      mockTabsApi._tabs.set(702, tab702);

      await bindingStore.save({
        appGroupId,
        browserGroupId,
        windowId: 1,
        title: 'Work',
        color: 'cyan',
        urls: ['https://example.com/remove-me', 'https://example.com/keep-me'],
        lastSeenAt: new Date().toISOString(),
      });

      // Remote item removed
      await service.handleRemoteItemRemoved(appGroupId, {
        urlNormalized: 'https://example.com/remove-me',
      });

      // Verify tabs.ungroup was called for tab 701
      expect(mockTabsApi.ungroup).toHaveBeenCalledWith(701);
      // tabs.remove MUST NEVER be called!
      expect(mockTabsApi.remove).not.toHaveBeenCalled();

      // Tab should still exist in browser tabs (just ungrouped, groupId -1)
      expect(mockTabsApi._tabs.get(701)).toBeDefined();
      expect(mockTabsApi._tabs.get(701)?.groupId).toBe(-1);
    });
  });

  describe('8. Remote to Browser: Remote link takeover removes local binding', () => {
    it('removes local binding when boundDeviceId changes to another device', async () => {
      const browserGroupId = 80;
      const appGroupId = 'takeover-group';

      await bindingStore.save({
        appGroupId,
        browserGroupId,
        windowId: 1,
        title: 'Shared Group',
        color: 'blue',
        urls: [],
        lastSeenAt: new Date().toISOString(),
      });

      // Remote update indicates another device took over the group
      const remoteGroup: PageGroup = {
        id: appGroupId,
        name: 'Shared Group',
        color: 'blue',
        position: 'a0',
        boundDeviceId: 'other-machine-uuid-999', // Different device!
        boundDeviceLabel: 'MacBook Pro',
        boundBrowser: 'chrome',
        boundAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };

      await service.handleRemoteGroupUpdated(remoteGroup);

      // Local binding should be removed
      const binding = await bindingStore.getByAppGroupId(appGroupId);
      expect(binding).toBeNull();

      // Browser tab group is NOT touched / deleted
      expect(mockTabsApi.remove).not.toHaveBeenCalled();
    });
  });

  describe('9. Startup & Rebind reconciliation', () => {
    it('re-associates matching groups and marks unmatched bindings closed', async () => {
      // Binding 1: Matches candidate in browser
      const group1: PageGroup = {
        id: 'group-1',
        name: 'Matching Group',
        color: 'blue',
        position: 'a0',
        boundDeviceId: CURRENT_DEVICE_ID,
        boundDeviceLabel: null,
        boundBrowser: 'chrome',
        boundAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      await basicGroups.putGroup(group1);

      const binding1: TabGroupBinding = {
        appGroupId: 'group-1',
        browserGroupId: 100, // Old browserGroupId before restart
        windowId: 1,
        title: 'Matching Group',
        color: 'blue',
        urls: ['https://example.com/doc1', 'https://example.com/doc2'],
        lastSeenAt: new Date().toISOString(),
      };
      await bindingStore.save(binding1);

      // Binding 2: Group that user closed while browser was off
      const group2: PageGroup = {
        id: 'group-2',
        name: 'Lost Group',
        color: 'red',
        position: 'a1',
        boundDeviceId: CURRENT_DEVICE_ID,
        boundDeviceLabel: null,
        boundBrowser: 'chrome',
        boundAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      await basicGroups.putGroup(group2);

      const binding2: TabGroupBinding = {
        appGroupId: 'group-2',
        browserGroupId: 200,
        windowId: 1,
        title: 'Lost Group',
        color: 'red',
        urls: ['https://lost.com'],
        lastSeenAt: new Date().toISOString(),
      };
      await bindingStore.save(binding2);

      // Browser restarted: New browser group ID 999 with title "Matching Group", same URLs
      mockTabGroupsApi._groups.set(999, {
        id: 999,
        windowId: 2,
        title: 'Matching Group',
        color: 'blue',
      });
      mockTabsApi._tabs.set(9901, {
        id: 9901,
        groupId: 999,
        windowId: 2,
        url: 'https://example.com/doc1',
        incognito: false,
      });
      mockTabsApi._tabs.set(9902, {
        id: 9902,
        groupId: 999,
        windowId: 2,
        url: 'https://example.com/doc2',
        incognito: false,
      });

      // Run startup reconciliation
      await service.reconcileOnStartup();

      // Binding 1 should now be updated to browserGroupId 999
      const updatedBinding1 = await bindingStore.getByAppGroupId('group-1');
      expect(updatedBinding1).not.toBeNull();
      expect(updatedBinding1?.browserGroupId).toBe(999);
      expect(updatedBinding1?.windowId).toBe(2);

      // Binding 2 (unmatched) should be removed and group marked closed
      const updatedBinding2 = await bindingStore.getByAppGroupId('group-2');
      expect(updatedBinding2).toBeNull();

      const updatedGroup2 = await basicGroups.getGroup('group-2');
      expect(updatedGroup2?.boundDeviceId).toBeNull();
      expect(updatedGroup2?.boundBrowser).toBeNull();
    });
  });

  describe('10. Title and Favicon Backfill', () => {
    it('backfills title and favicon on tab update when app item was missing them', async () => {
      const groupService = new GroupService(basicGroups, mockLogger);
      const appGroup = await groupService.createGroup({
        name: 'Backfill Test',
        color: 'yellow',
      });

      // Item created without title / favicon
      const item = await groupService.addPage(appGroup.id, {
        url: 'https://example.com/page-to-backfill',
        title: null,
        faviconUrl: null,
      });

      const browserGroupId = 90;
      await bindingStore.save({
        appGroupId: appGroup.id,
        browserGroupId,
        windowId: 1,
        title: 'Backfill Test',
        color: 'yellow',
        urls: ['https://example.com/page-to-backfill'],
        lastSeenAt: new Date().toISOString(),
      });

      // Tab updates with title and favicon
      const updatedTab = {
        id: 901,
        groupId: browserGroupId,
        url: 'https://example.com/page-to-backfill',
        title: 'Resolved Page Title',
        favIconUrl: 'https://example.com/favicon.png',
        incognito: false,
      };

      await service.checkAndBackfillTitleFavicon(updatedTab);

      // Verify item was updated
      const items = await basicGroups.listItems(appGroup.id);
      const updatedItem = items.find((i) => i.id === item.id);
      expect(updatedItem).toBeDefined();
      if (updatedItem?.kind === 'page') {
        expect(updatedItem.title).toBe('Resolved Page Title');
        expect(updatedItem.faviconUrl).toBe('https://example.com/favicon.png');
      }
    });
  });

  describe('11. Guard Checks', () => {
    it('returns immediately and performs no actions if permission check fails', async () => {
      hasPermissionsMock.mockResolvedValue(false);

      await mockTabGroupsApi.onCreated.emit({
        id: 99,
        title: 'Perm Group',
        color: 'blue',
      });

      const groups = await basicGroups.listGroups();
      expect(groups).toHaveLength(0);
      expect(await bindingStore.getByBrowserGroupId(99)).toBeNull();
    });

    it('returns immediately if groups_browser_sync_enabled setting is false', async () => {
      storageMap.set('groups_browser_sync_enabled', false);

      await mockTabGroupsApi.onCreated.emit({
        id: 100,
        title: 'Disabled Setting Group',
        color: 'blue',
      });

      const groups = await basicGroups.listGroups();
      expect(groups).toHaveLength(0);
      expect(await bindingStore.getByBrowserGroupId(100)).toBeNull();
    });
  });

  describe('12. Code Review Hardening & Regression Tests', () => {
    it('dual-writes to cloudGroups and echoTracker when authenticated, and queues on failure', async () => {
      const mockCloudGroups = new InMemoryGroupRepository();
      const mockEchoTracker = {
        record: vi.fn(),
        isEcho: vi.fn(),
      } as unknown as LocalWriteEchoTracker;
      const mockOfflineQueue = {
        enqueue: vi.fn(async () => {}),
      } as unknown as OfflineQueueService;

      const authenticatedAuthManager = {
        isAuthenticated: true,
        currentUser: { id: 'u1' } as any,
        initialize: vi.fn(),
        onAuthStateChanged: vi.fn(),
      } as unknown as IAuthManager;

      const cloudSyncService = new TabGroupSyncService({
        authManager: authenticatedAuthManager,
        basicGroups,
        proGroups,
        bindingStore,
        deviceIdService: mockDeviceIdService,
        logger: mockLogger,
        tabsApi: mockTabsApi,
        tabGroupsApi: mockTabGroupsApi,
        storage: mockStorage,
        hasPermissionsCheck: hasPermissionsMock,
        batchDelayMs: 500,
        cloudGroups: mockCloudGroups,
        echoTracker: mockEchoTracker,
        offlineQueue: mockOfflineQueue,
      });

      // 1. handleTabGroupCreated should write to proGroups AND cloudGroups
      await cloudSyncService.handleTabGroupCreated({
        id: 77,
        title: 'Cloud Work',
        color: 'blue',
      });

      const proCreated = await proGroups.listGroups();
      expect(proCreated).toHaveLength(1);
      const createdId = proCreated[0]!.id;
      expect(proCreated[0]!.boundDeviceId).toBe(CURRENT_DEVICE_ID);

      const cloudCreated = await mockCloudGroups.getGroup(createdId);
      expect(cloudCreated).not.toBeNull();
      expect(cloudCreated?.boundDeviceId).toBe(CURRENT_DEVICE_ID);
      expect(mockEchoTracker.record).toHaveBeenCalledWith(createdId, 'update');

      // 2. Failure path: cloud write throws -> offlineQueue.enqueue called
      vi.spyOn(mockCloudGroups, 'putGroup').mockRejectedValueOnce(
        new Error('Network error')
      );

      await cloudSyncService.markGroupClosed(createdId);

      expect(mockOfflineQueue.enqueue).toHaveBeenCalledWith(
        'update',
        createdId,
        expect.objectContaining({
          id: createdId,
          boundDeviceId: null,
        }),
        'group'
      );

      cloudSyncService.dispose();
    });

    it('scans bound groups to resolve groupId when REMOTE_GROUP_ITEM_DELETED lacks groupId', async () => {
      const mockEventBus = new MockEventBus();

      const eventBusService = new TabGroupSyncService({
        authManager: mockAuthManager,
        basicGroups,
        proGroups,
        bindingStore,
        deviceIdService: mockDeviceIdService,
        logger: mockLogger,
        tabsApi: mockTabsApi,
        tabGroupsApi: mockTabGroupsApi,
        storage: mockStorage,
        hasPermissionsCheck: hasPermissionsMock,
        batchDelayMs: 500,
        eventBus: mockEventBus,
      });
      eventBusService.registerTopLevelListeners();

      const groupService = new GroupService(basicGroups, mockLogger);
      const group = await groupService.createGroup({
        name: 'Bound Group',
        color: 'red',
      });
      await basicGroups.putGroup({
        ...group,
        boundDeviceId: CURRENT_DEVICE_ID,
      });
      const item = await groupService.addPage(group.id, {
        url: 'https://example.com/to-be-deleted',
        title: 'To Be Deleted',
      });

      const browserGroupId = 88;
      await bindingStore.save({
        appGroupId: group.id,
        browserGroupId,
        windowId: 1,
        title: 'Bound Group',
        color: 'red',
        urls: ['https://example.com/to-be-deleted'],
        lastSeenAt: new Date().toISOString(),
      });

      mockTabsApi._tabs.set(8801, {
        id: 8801,
        groupId: browserGroupId,
        url: 'https://example.com/to-be-deleted',
        incognito: false,
      });

      // Emit REMOTE_GROUP_ITEM_DELETED without groupId (as Supabase Realtime emits)
      await mockEventBus.emitAsync(EventName.REMOTE_GROUP_ITEM_DELETED, {
        id: item.id,
      });

      expect(mockTabsApi.ungroup).toHaveBeenCalledWith(8801);

      eventBusService.dispose();
    });

    it('enforces 5-second TTL on recently closed URLs', async () => {
      const groupService = new GroupService(basicGroups, mockLogger);
      const group = await groupService.createGroup({
        name: 'TTL Test',
        color: 'blue',
      });
      await groupService.addPage(group.id, {
        url: 'https://example.com/ttl-page',
        title: 'TTL Page',
      });

      const browserGroupId = 65;
      await bindingStore.save({
        appGroupId: group.id,
        browserGroupId,
        windowId: 1,
        title: 'TTL Test',
        color: 'blue',
        urls: ['https://example.com/ttl-page'],
        lastSeenAt: new Date().toISOString(),
      });

      service.seedTabCache({
        tabId: 6501,
        groupId: browserGroupId,
        url: 'https://example.com/ttl-page',
      });

      // Tab is removed from browser
      await service.handleTabRemoved(6501);

      // Fast forward time past 5s TTL
      vi.advanceTimersByTime(6000);

      // Tab list in browser group is empty
      mockTabsApi._tabs.clear();

      // Trigger sync
      await service.processGroupSync(browserGroupId);

      // Since TTL expired (>5s), the tab removal is treated as ungrouped/left, NOT closed
      const items = await basicGroups.listItems(group.id, { includeDeleted: false });
      expect(items).toHaveLength(0);
    });

    it('does not trigger sync across all bound groups when closing an ungrouped tab', async () => {
      const scheduleSpy = vi.spyOn(service, 'scheduleGroupSync');

      await bindingStore.save({
        appGroupId: 'g1',
        browserGroupId: 11,
        windowId: 1,
        title: 'G1',
        color: 'blue',
        urls: [],
        lastSeenAt: new Date().toISOString(),
      });
      await bindingStore.save({
        appGroupId: 'g2',
        browserGroupId: 22,
        windowId: 1,
        title: 'G2',
        color: 'red',
        urls: [],
        lastSeenAt: new Date().toISOString(),
      });

      // Tab is cached as ungrouped (groupId: -1)
      service.seedTabCache({
        tabId: 9991,
        groupId: -1,
        url: 'https://example.com/ungrouped',
      });

      await service.handleTabRemoved(9991);

      // Should return early and NOT schedule any sync
      expect(scheduleSpy).not.toHaveBeenCalled();
    });

    it('cleans up suppressedTabUngroups if tabs.ungroup fails', async () => {
      const groupService = new GroupService(basicGroups, mockLogger);
      const group = await groupService.createGroup({
        name: 'Fail Ungroup',
        color: 'green',
      });
      await basicGroups.putGroup({
        ...group,
        boundDeviceId: CURRENT_DEVICE_ID,
      });
      const item = await groupService.addPage(group.id, {
        url: 'https://example.com/fail-ungroup',
        title: 'Fail',
      });

      const browserGroupId = 44;
      await bindingStore.save({
        appGroupId: group.id,
        browserGroupId,
        windowId: 1,
        title: 'Fail Ungroup',
        color: 'green',
        urls: ['https://example.com/fail-ungroup'],
        lastSeenAt: new Date().toISOString(),
      });

      mockTabsApi._tabs.set(4401, {
        id: 4401,
        groupId: browserGroupId,
        url: 'https://example.com/fail-ungroup',
        incognito: false,
      });

      // Force tabs.ungroup to fail
      (mockTabsApi.ungroup as Mock).mockRejectedValueOnce(
        new Error('Ungroup failed')
      );

      await service.handleRemoteItemRemoved(group.id, item);

      expect(mockTabsApi.ungroup).toHaveBeenCalledWith(4401);

      // Seed tab cache with previous group so tab update detects transition
      service.seedTabCache({
        tabId: 4401,
        groupId: browserGroupId,
        url: 'https://example.com/fail-ungroup',
      });

      // Now if the user later ungroups the tab manually, it should NOT be suppressed
      const scheduleSpy = vi.spyOn(service, 'scheduleGroupSync');
      await service.handleTabUpdated(4401, { groupId: -1 }, {
        id: 4401,
        groupId: -1,
        url: 'https://example.com/fail-ungroup',
      });

      // Because suppressedTabUngroups was cleaned up on error, handleTabUpdated processes
      // the change and schedules sync for browserGroupId 44 (the previous group)
      expect(scheduleSpy).toHaveBeenCalledWith(browserGroupId);
    });
  });

  describe('13. openInBrowser (Phase 3 Task 3.4)', () => {
    it('opens page items only, groups tabs, updates title and color, sets bound_* fields to this device, and saves binding', async () => {
      const groupId = '11111111-1111-4111-a111-111111111111';
      const group: PageGroup = {
        id: groupId,
        name: 'Reading List',
        color: 'blue',
        position: 'a0',
        boundDeviceId: null,
        boundDeviceLabel: null,
        boundBrowser: null,
        boundAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      await basicGroups.putGroup(group);

      const page1: PageGroupItem = {
        id: 'p-1',
        groupId,
        kind: 'page',
        urlNormalized: 'https://example.com/one',
        title: 'Page One',
        faviconUrl: 'https://example.com/favicon.ico',
        position: 'a0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      const page2: PageGroupItem = {
        id: 'p-2',
        groupId,
        kind: 'page',
        urlNormalized: 'https://example.com/two',
        title: 'Page Two',
        faviconUrl: null,
        position: 'a1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      const domainRule: PageGroupItem = {
        id: 'd-1',
        groupId,
        kind: 'domain',
        hostname: 'example.com',
        includeSubdomains: false,
        position: 'a2',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      await basicGroups.putItem(page1);
      await basicGroups.putItem(page2);
      await basicGroups.putItem(domainRule);

      const res = await service.openInBrowser(groupId);

      expect(res).toEqual({
        ok: true,
        browserGroupId: expect.any(Number),
        tabCount: 2,
      });

      // Verify created tabs: only page1 and page2, never domainRule
      expect(mockTabsApi.create).toHaveBeenCalledTimes(2);
      expect(mockTabsApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://example.com/one',
          active: false,
        })
      );
      expect(mockTabsApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://example.com/two',
          active: false,
        })
      );

      // Verify grouped tabs
      expect(mockTabsApi.group).toHaveBeenCalledWith(
        expect.objectContaining({
          tabIds: expect.arrayContaining([1, 2]),
        })
      );

      // Verify title and color update
      expect(mockTabGroupsApi.update).toHaveBeenCalledWith(res.browserGroupId, {
        title: 'Reading List',
        color: 'blue',
      });

      // Verify group updated in repo
      const updated = await basicGroups.getGroup(groupId);
      expect(updated).not.toBeNull();
      expect(updated?.boundDeviceId).toBe(CURRENT_DEVICE_ID);
      expect(updated?.boundBrowser).toBe('chrome');
      expect(updated?.boundAt).toBeTruthy();

      // Verify binding in store
      const binding = await bindingStore.getByAppGroupId(groupId);
      expect(binding).not.toBeNull();
      expect(binding?.browserGroupId).toBe(res.browserGroupId);
      expect(binding?.title).toBe('Reading List');
      expect(binding?.color).toBe('blue');
      expect(binding?.urls).toEqual([
        'https://example.com/one',
        'https://example.com/two',
      ]);

      // Verify no duplicate app group was created from tabGroups.onCreated echo
      const allGroups = await basicGroups.listGroups();
      expect(allGroups).toHaveLength(1);
      expect(allGroups[0]?.id).toBe(groupId);
    });

    it('does not create duplicate app group when tabGroups.onCreated fires during openInBrowser', async () => {
      const groupId = '11111111-1111-4111-a111-111111111112';
      const group: PageGroup = {
        id: groupId,
        name: 'Echo Test Group',
        color: 'pink',
        position: 'a0',
        boundDeviceId: null,
        boundDeviceLabel: null,
        boundBrowser: null,
        boundAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      await basicGroups.putGroup(group);

      await basicGroups.putItem({
        id: 'p-echo-1',
        groupId,
        kind: 'page',
        urlNormalized: 'https://example.com/echo',
        title: 'Echo Page',
        faviconUrl: null,
        position: 'a0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      });

      const res = await service.openInBrowser(groupId);
      expect(res.ok).toBe(true);

      // Verify only the original app group exists, not an "Untitled Group" created by onCreated
      const groups = await basicGroups.listGroups();
      expect(groups).toHaveLength(1);
      expect(groups[0]?.name).toBe('Echo Test Group');
    });

    it('returns error when group is not found', async () => {
      const res = await service.openInBrowser(
        '00000000-0000-4000-8000-000000000000'
      );
      expect(res).toEqual({
        ok: false,
        error: 'Group not found',
      });
    });

    it('returns error when group has no page items to open', async () => {
      const groupId = '22222222-2222-4222-a222-222222222222';
      const group: PageGroup = {
        id: groupId,
        name: 'Domain Only',
        color: 'red',
        position: 'a0',
        boundDeviceId: null,
        boundDeviceLabel: null,
        boundBrowser: null,
        boundAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      await basicGroups.putGroup(group);

      const domainRule: PageGroupItem = {
        id: 'd-1',
        groupId,
        kind: 'domain',
        hostname: 'github.com',
        includeSubdomains: true,
        position: 'a0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      await basicGroups.putItem(domainRule);

      const res = await service.openInBrowser(groupId);
      expect(res).toEqual({
        ok: false,
        error: 'Group has no pages to open',
      });
    });

    it('returns needsConfirm: true and tabCount when > 15 tabs and force: false', async () => {
      const groupId = '33333333-3333-4333-a333-333333333333';
      const group: PageGroup = {
        id: groupId,
        name: 'Huge Group',
        color: 'green',
        position: 'a0',
        boundDeviceId: null,
        boundDeviceLabel: null,
        boundBrowser: null,
        boundAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      await basicGroups.putGroup(group);

      for (let i = 1; i <= 16; i++) {
        await basicGroups.putItem({
          id: `p-${i}`,
          groupId,
          kind: 'page',
          urlNormalized: `https://example.com/page-${i}`,
          title: `Page ${i}`,
          faviconUrl: null,
          position: `a${i}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        });
      }

      const res = await service.openInBrowser(groupId, false);
      expect(res).toEqual({
        ok: false,
        needsConfirm: true,
        tabCount: 16,
      });
      expect(mockTabsApi.create).not.toHaveBeenCalled();
    });

    it('opens > 15 tabs when force: true', async () => {
      const groupId = '44444444-4444-4444-a444-444444444444';
      const group: PageGroup = {
        id: groupId,
        name: 'Huge Group Force',
        color: 'yellow',
        position: 'a0',
        boundDeviceId: null,
        boundDeviceLabel: null,
        boundBrowser: null,
        boundAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      };
      await basicGroups.putGroup(group);

      for (let i = 1; i <= 16; i++) {
        await basicGroups.putItem({
          id: `p-${i}`,
          groupId,
          kind: 'page',
          urlNormalized: `https://example.com/page-${i}`,
          title: `Page ${i}`,
          faviconUrl: null,
          position: `a${i}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        });
      }

      const res = await service.openInBrowser(groupId, true);
      expect(res.ok).toBe(true);
      expect(res.tabCount).toBe(16);
      expect(mockTabsApi.create).toHaveBeenCalledTimes(16);
      expect(mockTabsApi.group).toHaveBeenCalled();
    });

    it('link takeover: replaces any existing binding and sets boundDeviceId to this device', async () => {
      const groupId = '55555555-5555-4555-a555-555555555555';
      const group: PageGroup = {
        id: groupId,
        name: 'Takeover Group',
        color: 'pink',
        position: 'a0',
        boundDeviceId: 'previous-remote-device',
        boundDeviceLabel: 'Old Laptop',
        boundBrowser: 'firefox',
        boundAt: '2026-09-01T00:00:00.000Z',
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-01T00:00:00.000Z',
        deletedAt: null,
      };
      await basicGroups.putGroup(group);

      // Pre-existing local binding from earlier
      await bindingStore.save({
        appGroupId: groupId,
        browserGroupId: 999,
        windowId: 1,
        title: 'Takeover Group',
        color: 'pink',
        urls: ['https://example.com/old'],
        lastSeenAt: '2026-09-01T00:00:00.000Z',
      });

      await basicGroups.putItem({
        id: 'p-takeover',
        groupId,
        kind: 'page',
        urlNormalized: 'https://example.com/takeover',
        title: 'Takeover Page',
        faviconUrl: null,
        position: 'a0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      });

      const res = await service.openInBrowser(groupId);
      expect(res.ok).toBe(true);

      const updated = await basicGroups.getGroup(groupId);
      expect(updated?.boundDeviceId).toBe(CURRENT_DEVICE_ID);
      expect(updated?.boundDeviceLabel).toBe('this device');

      const binding = await bindingStore.getByAppGroupId(groupId);
      expect(binding?.browserGroupId).toBe(res.browserGroupId);
      expect(binding?.browserGroupId).not.toBe(999);
    });

    it('returns error when tab group API is not available', async () => {
      const groupId = '66666666-6666-4666-a666-666666666666';
      const originalGroup = mockTabsApi.group;
      delete (mockTabsApi as any).group;

      const res = await service.openInBrowser(groupId);
      expect(res.ok).toBe(false);
      expect(res.error).toMatch(/tab group api/i);

      mockTabsApi.group = originalGroup;
    });
  });
});
