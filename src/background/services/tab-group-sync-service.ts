/**
 * @file tab-group-sync-service.ts
 * @description Bidirectional synchronization between browser tab groups and app groups (Phase 3, ADR-032 §5-7).
 *
 * Responsibilities:
 * - Top-level listener registration for tab and tabGroup events
 * - Guard checks (kill switch, permissions, user settings)
 * - 500ms debounce/batch window per browser group
 * - Browser to App mirroring:
 *   - Tab joins linked group -> addPage
 *   - Tab ungroups / moves without closing -> removeItem
 *   - Tab closes -> keep item in app group; mark closed when 0 tabs remain
 *   - Title / color changes -> renameGroup / recolorGroup
 *   - New browser group created -> auto-create app group & bind if setting enabled
 * - Remote to Browser mirroring:
 *   - Remote group update -> rename / recolor tab group with echo suppression
 *   - Remote item removal -> tabs.ungroup (never tabs.remove!)
 *   - Remote link takeover -> unlink local binding
 * - Echo suppression for applied browser mutations
 * - Startup reconciliation & rebind heuristic
 * - Title and favicon backfill on tab update
 */

import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import type { DeviceIdService } from '@/background/services/device-id-service';
import { GroupService } from '@/background/services/group-service';
import { notifyLibraryDataChanged } from '@/background/services/library-change-notifier';
import type { LocalWriteEchoTracker } from '@/background/services/local-write-echo-tracker';
import type { OfflineQueueService } from '@/background/services/offline-queue-service';
import type {
  ITabGroupBindingStore,
  StorageAreaLike,
} from '@/background/services/tab-group-binding-store';
import { GROUPS_BROWSER_SYNC_ENABLED } from '@/shared/constants/groups-flags';
import type { IEventBus } from '@/shared/interfaces/i-event-bus';
import {
  hasTabGroupPermissions,
  isTabGroupApiAvailable,
  onTabGroupPermissionsRemoved,
} from '@/shared/permissions/ensure-tab-group-permissions';
import type { IGroupRepository } from '@/shared/repositories/i-group-repository';
import type {
  BrowserTabGroupSummary,
  GroupOpenInBrowserResponse,
} from '@/shared/schemas/message-schemas';
import { EventName } from '@/shared/types/events';
import {
  GROUP_COLORS,
  type GroupColor,
  type LiveBrowserGroupCandidate,
  type PageGroup,
  type PageGroupItem,
} from '@/shared/types/page-group';
import type { ILogger } from '@/shared/utils/logger';
import { normalizePageUrl } from '@/shared/utils/normalize-page-url';
import {
  transformGroupRow,
  type SupabaseGroupRow,
} from '@/shared/utils/supabase-group-row';
import { isSyncableTabUrl } from '@/shared/utils/syncable-url';
import { rebind } from '@/shared/utils/tab-group-rebind';
import { browser } from 'wxt/browser';

export interface TabsApiLike {
  query(queryInfo: {
    groupId?: number;
    windowId?: number;
    active?: boolean;
    currentWindow?: boolean;
    [key: string]: unknown;
  }): Promise<Array<any>>;
  get?(tabId: number): Promise<any>;
  ungroup(tabIds: number | number[]): Promise<void>;
  remove?(tabIds: number | number[]): Promise<void>;
  create?(createProperties: {
    url?: string;
    windowId?: number;
    active?: boolean;
    [key: string]: unknown;
  }): Promise<any>;
  update?(
    tabId: number,
    updateProperties: { active?: boolean; [key: string]: unknown }
  ): Promise<any>;
  group?(options: {
    tabIds: number | number[];
    groupId?: number;
    createProperties?: { windowId?: number };
  }): Promise<number>;
  onCreated?: {
    addListener(callback: (tab: any) => void): void;
    removeListener?(callback: (tab: any) => void): void;
  };
  onUpdated?: {
    addListener(
      callback: (tabId: number, changeInfo: any, tab: any) => void
    ): void;
    removeListener?(
      callback: (tabId: number, changeInfo: any, tab: any) => void
    ): void;
  };
  onRemoved?: {
    addListener(
      callback: (tabId: number, removeInfo: any) => void
    ): void;
    removeListener?(
      callback: (tabId: number, removeInfo: any) => void
    ): void;
  };
  onAttached?: {
    addListener(
      callback: (tabId: number, attachInfo: any) => void
    ): void;
    removeListener?(
      callback: (tabId: number, attachInfo: any) => void
    ): void;
  };
  onDetached?: {
    addListener(
      callback: (tabId: number, detachInfo: any) => void
    ): void;
    removeListener?(
      callback: (tabId: number, detachInfo: any) => void
    ): void;
  };
}

export interface TabGroupsApiLike {
  query(queryInfo: {
    windowId?: number;
    title?: string;
    color?: string;
    [key: string]: unknown;
  }): Promise<Array<any>>;
  get?(groupId: number): Promise<any>;
  update(
    groupId: number,
    updateProperties: { title?: string; color?: any; collapsed?: boolean }
  ): Promise<any>;
  onCreated?: {
    addListener(callback: (group: any) => void): void;
    removeListener?(callback: (group: any) => void): void;
  };
  onUpdated?: {
    addListener(callback: (group: any) => void): void;
    removeListener?(callback: (group: any) => void): void;
  };
  onRemoved?: {
    addListener(callback: (group: any) => void): void;
    removeListener?(callback: (group: any) => void): void;
  };
  onMoved?: {
    addListener(callback: (group: any) => void): void;
    removeListener?(callback: (group: any) => void): void;
  };
}

export interface TabGroupSyncServiceOptions {
  groupServiceFactory?: (isAuthenticated: boolean) => GroupService;
  tabsApi?: TabsApiLike;
  tabGroupsApi?: TabGroupsApiLike;
  storage?: StorageAreaLike;
  hasPermissionsCheck?: () => Promise<boolean>;
  batchDelayMs?: number;
  eventBus?: IEventBus;
  cloudGroups?: IGroupRepository;
  echoTracker?: LocalWriteEchoTracker;
  offlineQueue?: OfflineQueueService;
}

export interface TabGroupSyncServiceDeps extends TabGroupSyncServiceOptions {
  authManager: IAuthManager;
  basicGroups: IGroupRepository;
  proGroups: IGroupRepository;
  bindingStore: ITabGroupBindingStore;
  deviceIdService: DeviceIdService;
  logger: ILogger;
}

interface CachedTabState {
  tabId: number;
  groupId: number;
  windowId?: number;
  url?: string;
  title?: string;
  favIconUrl?: string;
  incognito?: boolean;
}

function nowIso(): string {
  return new Date().toISOString();
}

function detectBrowser(): 'chrome' | 'firefox' | 'edge' {
  if (typeof navigator !== 'undefined' && /Edg\//.test(navigator.userAgent)) {
    return 'edge';
  }
  if (typeof navigator !== 'undefined' && /Firefox\//.test(navigator.userAgent)) {
    return 'firefox';
  }
  return 'chrome';
}

function resolveDefaultTabsApi(): TabsApiLike | undefined {
  if (typeof browser !== 'undefined' && (browser as any)?.tabs) {
    return (browser as any).tabs;
  }
  const chromeObj = (globalThis as any)?.chrome;
  if (typeof chromeObj !== 'undefined' && chromeObj?.tabs) {
    return chromeObj.tabs;
  }
  return undefined;
}

function resolveDefaultTabGroupsApi(): TabGroupsApiLike | undefined {
  if (typeof browser !== 'undefined' && (browser as any)?.tabGroups) {
    return (browser as any).tabGroups;
  }
  const chromeObj = (globalThis as any)?.chrome;
  if (typeof chromeObj !== 'undefined' && chromeObj?.tabGroups) {
    return chromeObj.tabGroups;
  }
  return undefined;
}

export class TabGroupSyncService {
  private readonly authManager: IAuthManager;
  private readonly basicGroups: IGroupRepository;
  private readonly proGroups: IGroupRepository;
  private readonly bindingStore: ITabGroupBindingStore;
  private readonly deviceIdService: DeviceIdService;
  private readonly logger: ILogger;
  private readonly groupServiceFactory?: (isAuthenticated: boolean) => GroupService;
  private readonly tabsApi: TabsApiLike;
  private readonly tabGroupsApi: TabGroupsApiLike;
  private readonly storage?: StorageAreaLike;
  private readonly hasPermissionsCheck?: () => Promise<boolean>;
  private readonly batchDelayMs: number;
  private readonly eventBus?: IEventBus;
  private readonly cloudGroups?: IGroupRepository;
  private readonly echoTracker?: LocalWriteEchoTracker;
  private readonly offlineQueue?: OfflineQueueService;

  private readonly batchTimers = new Map<number, ReturnJSOrNodeTimeout>();
  private readonly tabCache = new Map<number, CachedTabState>();
  private readonly recentlyClosedUrls = new Map<string, number>();

  // Echo suppression trackers
  private readonly suppressedGroupUpdates = new Map<
    number,
    { title?: string; color?: GroupColor; timestamp: number }
  >();
  private readonly suppressedTabUngroups = new Set<number>();
  private readonly suppressedGroupCreations = new Set<number>();

  // Cleanup references
  private permissionsRemovedCleanup?: () => void;
  private isListenersRegistered = false;

  constructor(deps: TabGroupSyncServiceDeps);
  constructor(
    authManager: IAuthManager,
    basicGroups: IGroupRepository,
    proGroups: IGroupRepository,
    bindingStore: ITabGroupBindingStore,
    deviceIdService: DeviceIdService,
    logger: ILogger,
    groupServiceFactoryOrOptions?:
      | ((isAuthenticated: boolean) => GroupService)
      | TabGroupSyncServiceOptions,
    tabsApi?: TabsApiLike,
    tabGroupsApi?: TabGroupsApiLike
  );
  constructor(
    authManagerOrDeps: IAuthManager | TabGroupSyncServiceDeps,
    basicGroups?: IGroupRepository,
    proGroups?: IGroupRepository,
    bindingStore?: ITabGroupBindingStore,
    deviceIdService?: DeviceIdService,
    logger?: ILogger,
    groupServiceFactoryOrOptions?:
      | ((isAuthenticated: boolean) => GroupService)
      | TabGroupSyncServiceOptions,
    tabsApi?: TabsApiLike,
    tabGroupsApi?: TabGroupsApiLike
  ) {
    if ('authManager' in (authManagerOrDeps as any)) {
      const deps = authManagerOrDeps as TabGroupSyncServiceDeps;
      this.authManager = deps.authManager;
      this.basicGroups = deps.basicGroups;
      this.proGroups = deps.proGroups;
      this.bindingStore = deps.bindingStore;
      this.deviceIdService = deps.deviceIdService;
      this.logger = deps.logger;
      this.groupServiceFactory = deps.groupServiceFactory;
      this.tabsApi = deps.tabsApi ?? resolveDefaultTabsApi()!;
      this.tabGroupsApi = deps.tabGroupsApi ?? resolveDefaultTabGroupsApi()!;
      this.storage = deps.storage;
      this.hasPermissionsCheck = deps.hasPermissionsCheck;
      this.batchDelayMs = deps.batchDelayMs ?? 500;
      this.eventBus = deps.eventBus;
      this.cloudGroups = deps.cloudGroups;
      this.echoTracker = deps.echoTracker;
      this.offlineQueue = deps.offlineQueue;
    } else {
      this.authManager = authManagerOrDeps as IAuthManager;
      this.basicGroups = basicGroups!;
      this.proGroups = proGroups!;
      this.bindingStore = bindingStore!;
      this.deviceIdService = deviceIdService!;
      this.logger = logger!;
      let resolvedBatchDelay = 500;
      if (typeof groupServiceFactoryOrOptions === 'function') {
        this.groupServiceFactory = groupServiceFactoryOrOptions;
      } else if (
        groupServiceFactoryOrOptions &&
        typeof groupServiceFactoryOrOptions === 'object'
      ) {
        this.groupServiceFactory = groupServiceFactoryOrOptions.groupServiceFactory;
        this.storage = groupServiceFactoryOrOptions.storage;
        this.hasPermissionsCheck = groupServiceFactoryOrOptions.hasPermissionsCheck;
        resolvedBatchDelay = groupServiceFactoryOrOptions.batchDelayMs ?? 500;
        this.eventBus = groupServiceFactoryOrOptions.eventBus;
        this.cloudGroups = groupServiceFactoryOrOptions.cloudGroups;
        this.echoTracker = groupServiceFactoryOrOptions.echoTracker;
        this.offlineQueue = groupServiceFactoryOrOptions.offlineQueue;
      }
      this.tabsApi = tabsApi ?? resolveDefaultTabsApi()!;
      this.tabGroupsApi = tabGroupsApi ?? resolveDefaultTabGroupsApi()!;
      this.batchDelayMs = resolvedBatchDelay;
    }
  }

  // ==================== Public Listener Registration ====================

  registerTopLevelListeners(): void {
    if (this.isListenersRegistered) {
      return;
    }

    const tabGroups = this.tabGroupsApi;
    const tabs = this.tabsApi;

    if (tabGroups?.onCreated?.addListener) {
      tabGroups.onCreated.addListener(this.boundHandleTabGroupCreated);
    }
    if (tabGroups?.onUpdated?.addListener) {
      tabGroups.onUpdated.addListener(this.boundHandleTabGroupUpdated);
    }
    if (tabGroups?.onRemoved?.addListener) {
      tabGroups.onRemoved.addListener(this.boundHandleTabGroupRemoved);
    }
    if (tabGroups?.onMoved?.addListener) {
      tabGroups.onMoved.addListener(this.boundHandleTabGroupMoved);
    }

    if (tabs?.onUpdated?.addListener) {
      tabs.onUpdated.addListener(this.boundHandleTabUpdated);
    }
    if (tabs?.onRemoved?.addListener) {
      tabs.onRemoved.addListener(this.boundHandleTabRemoved);
    }
    if (tabs?.onAttached?.addListener) {
      tabs.onAttached.addListener(this.boundHandleTabAttached);
    }
    if (tabs?.onDetached?.addListener) {
      tabs.onDetached.addListener(this.boundHandleTabDetached);
    }

    this.permissionsRemovedCleanup = onTabGroupPermissionsRemoved(() => {
      void this.handlePermissionsRemoved();
    });

    if (this.eventBus) {
      this.eventBus.on(EventName.REMOTE_GROUP_UPDATED, async (payload) => {
        try {
          const row = payload as SupabaseGroupRow;
          if (row?.id) {
            const group = transformGroupRow(row);
            await this.handleRemoteGroupUpdated(group);
          }
        } catch (err) {
          this.logger.error(
            '[TabGroupSyncService] Error handling REMOTE_GROUP_UPDATED',
            err as Error
          );
        }
      });

      this.eventBus.on(EventName.REMOTE_GROUP_ITEM_DELETED, async (payload) => {
        try {
          const p = payload as { id?: string; groupId?: string };
          if (!p?.id) return;

          let targetGroupId = p.groupId;
          if (!targetGroupId) {
            // Postgres DELETE payloads and soft-delete UPDATEs only emit the item ID;
            // scan bound groups to find which one contains this item
            const bindings = await this.bindingStore.getAll();
            const repo = this.getActiveGroupRepository();
            for (const b of bindings) {
              const items = await repo.listItems(b.appGroupId, {
                includeDeleted: true,
              });
              if (items.some((i) => i.id === p.id)) {
                targetGroupId = b.appGroupId;
                break;
              }
            }
          }

          if (targetGroupId) {
            await this.handleRemoteItemRemoved(targetGroupId, p.id);
          }
        } catch (err) {
          this.logger.error(
            '[TabGroupSyncService] Error handling REMOTE_GROUP_ITEM_DELETED',
            err as Error
          );
        }
      });
    }

    this.isListenersRegistered = true;
    this.logger.info('[TabGroupSyncService] Top-level listeners registered');
  }

  unregisterTopLevelListeners(): void {
    if (!this.isListenersRegistered) {
      return;
    }

    const tabGroups = this.tabGroupsApi;
    const tabs = this.tabsApi;

    try {
      tabGroups?.onCreated?.removeListener?.(this.boundHandleTabGroupCreated);
      tabGroups?.onUpdated?.removeListener?.(this.boundHandleTabGroupUpdated);
      tabGroups?.onRemoved?.removeListener?.(this.boundHandleTabGroupRemoved);
      tabGroups?.onMoved?.removeListener?.(this.boundHandleTabGroupMoved);

      tabs?.onUpdated?.removeListener?.(this.boundHandleTabUpdated);
      tabs?.onRemoved?.removeListener?.(this.boundHandleTabRemoved);
      tabs?.onAttached?.removeListener?.(this.boundHandleTabAttached);
      tabs?.onDetached?.removeListener?.(this.boundHandleTabDetached);

      this.permissionsRemovedCleanup?.();
    } catch {
      // Ignore unregister errors during teardown
    }

    this.isListenersRegistered = false;
  }

  // Bound handler instances for exact add/remove listener identity
  private readonly boundHandleTabGroupCreated = async (group: any) => {
    try {
      await this.handleTabGroupCreated(group);
    } catch (err) {
      this.logger.error(
        '[TabGroupSyncService] Unhandled error in handleTabGroupCreated',
        err as Error
      );
    }
  };
  private readonly boundHandleTabGroupUpdated = async (group: any) => {
    try {
      await this.handleTabGroupUpdated(group);
    } catch (err) {
      this.logger.error(
        '[TabGroupSyncService] Unhandled error in handleTabGroupUpdated',
        err as Error
      );
    }
  };
  private readonly boundHandleTabGroupRemoved = async (group: any) => {
    try {
      await this.handleTabGroupRemoved(group);
    } catch (err) {
      this.logger.error(
        '[TabGroupSyncService] Unhandled error in handleTabGroupRemoved',
        err as Error
      );
    }
  };
  private readonly boundHandleTabGroupMoved = async (group: any) => {
    try {
      await this.handleTabGroupMoved(group);
    } catch (err) {
      this.logger.error(
        '[TabGroupSyncService] Unhandled error in handleTabGroupMoved',
        err as Error
      );
    }
  };
  private readonly boundHandleTabUpdated = async (
    tabId: number,
    changeInfo: any,
    tab: any
  ) => {
    try {
      await this.handleTabUpdated(tabId, changeInfo, tab);
    } catch (err) {
      this.logger.error(
        '[TabGroupSyncService] Unhandled error in handleTabUpdated',
        err as Error
      );
    }
  };
  private readonly boundHandleTabRemoved = async (
    tabId: number,
    removeInfo: any
  ) => {
    try {
      await this.handleTabRemoved(tabId, removeInfo);
    } catch (err) {
      this.logger.error(
        '[TabGroupSyncService] Unhandled error in handleTabRemoved',
        err as Error
      );
    }
  };
  private readonly boundHandleTabAttached = async (
    tabId: number,
    attachInfo: any
  ) => {
    try {
      await this.handleTabAttached(tabId, attachInfo);
    } catch (err) {
      this.logger.error(
        '[TabGroupSyncService] Unhandled error in handleTabAttached',
        err as Error
      );
    }
  };
  private readonly boundHandleTabDetached = async (
    tabId: number,
    detachInfo: any
  ) => {
    try {
      await this.handleTabDetached(tabId, detachInfo);
    } catch (err) {
      this.logger.error(
        '[TabGroupSyncService] Unhandled error in handleTabDetached',
        err as Error
      );
    }
  };

  // ==================== Guards ====================

  async checkGuards(): Promise<boolean> {
    if (!GROUPS_BROWSER_SYNC_ENABLED) {
      this.logger.debug(
        '[TabGroupSyncService] Sync skipped: GROUPS_BROWSER_SYNC_ENABLED is false'
      );
      return false;
    }

    const hasPerms = this.hasPermissionsCheck
      ? await this.hasPermissionsCheck()
      : await hasTabGroupPermissions();
    if (!hasPerms) {
      this.logger.debug(
        '[TabGroupSyncService] Sync skipped: Tab group permissions not granted'
      );
      return false;
    }

    const isEnabled = await this.isSettingEnabled('groups_browser_sync_enabled');
    if (!isEnabled) {
      this.logger.debug(
        '[TabGroupSyncService] Sync skipped: groups_browser_sync_enabled is false'
      );
      return false;
    }

    return true;
  }

  private resolveStorage(): StorageAreaLike | null {
    if (this.storage) {
      return this.storage;
    }
    const g = globalThis as {
      chrome?: { storage?: { local?: StorageAreaLike } };
      browser?: { storage?: { local?: StorageAreaLike } };
    };
    if (g.chrome?.storage?.local) {
      return g.chrome.storage.local;
    }
    if (g.browser?.storage?.local) {
      return g.browser.storage.local;
    }
    return null;
  }

  private async isSettingEnabled(key: string): Promise<boolean> {
    try {
      const storage = this.resolveStorage();
      if (!storage) return false;
      const result = await storage.get(key);
      return Boolean(result?.[key]);
    } catch (err) {
      this.logger.warn('[TabGroupSyncService] Failed to read setting', { key, err });
      return false;
    }
  }

  private async isAutoSyncNewGroupsEnabled(): Promise<boolean> {
    try {
      const storage = this.resolveStorage();
      if (!storage) return true;
      const result = await storage.get('groups_auto_sync_new_tab_groups');
      const val = result?.['groups_auto_sync_new_tab_groups'];
      return val !== false; // default true
    } catch {
      return true;
    }
  }

  // ==================== Internal Repos & Services ====================

  getActiveGroupRepository(): IGroupRepository {
    return this.authManager.isAuthenticated ? this.proGroups : this.basicGroups;
  }

  getGroupService(): GroupService {
    if (this.groupServiceFactory) {
      return this.groupServiceFactory(this.authManager.isAuthenticated);
    }
    return new GroupService(this.getActiveGroupRepository(), this.logger);
  }

  // ==================== Batching & Queue ====================

  scheduleGroupSync(browserGroupId: number): void {
    const existing = this.batchTimers.get(browserGroupId);
    if (existing) {
      clearTimeout(existing as any);
    }

    const timer = setTimeout(async () => {
      this.batchTimers.delete(browserGroupId);
      await this.processGroupSync(browserGroupId);
    }, this.batchDelayMs);

    this.batchTimers.set(browserGroupId, timer as any);
  }

  async flushBatches(): Promise<void> {
    const groupIds = Array.from(this.batchTimers.keys());
    for (const id of groupIds) {
      const timer = this.batchTimers.get(id);
      if (timer) {
        clearTimeout(timer as any);
        this.batchTimers.delete(id);
      }
      await this.processGroupSync(id);
    }
  }

  // ==================== Browser -> App Handlers ====================

  async handleTabGroupCreated(group: {
    id: number;
    title?: string;
    color?: GroupColor;
    windowId?: number;
  }): Promise<void> {
    if (this.suppressedGroupCreations.has(group.id)) {
      this.suppressedGroupCreations.delete(group.id);
      return;
    }

    if (!(await this.checkGuards())) return;

    const autoSync = await this.isAutoSyncNewGroupsEnabled();
    if (!autoSync) {
      this.logger.debug(
        '[TabGroupSyncService] groups_auto_sync_new_tab_groups is disabled, skipping group creation'
      );
      return;
    }

    const existing = await this.bindingStore.getByBrowserGroupId(group.id);
    if (existing) {
      return;
    }

    const currentDeviceId = await this.deviceIdService.getDeviceId();
    const groupService = this.getGroupService();

    const name =
      group.title && group.title.trim().length > 0
        ? group.title.trim()
        : 'Untitled Group';
    const color: GroupColor =
      group.color && (GROUP_COLORS as readonly string[]).includes(group.color)
        ? group.color
        : 'grey';

    const created = await groupService.createGroup({ name, color });

    const now = nowIso();
    const boundGroup: PageGroup = {
      ...created,
      boundDeviceId: currentDeviceId,
      boundBrowser: detectBrowser(),
      boundAt: now,
      updatedAt: now,
    };
    await this.persistGroup(boundGroup);

    // Query any tabs already inside this newly created group
    let tabs: any[] = [];
    try {
      tabs = await this.tabsApi.query({ groupId: group.id });
    } catch (err) {
      this.logger.warn(
        '[TabGroupSyncService] Failed to query tabs for new group',
        { err, groupId: group.id }
      );
    }

    const urls: string[] = [];
    for (const tab of tabs) {
      if (tab.id) {
        this.tabCache.set(tab.id, {
          tabId: tab.id,
          groupId: group.id,
          windowId: tab.windowId,
          url: tab.url,
          title: tab.title,
          favIconUrl: tab.favIconUrl,
          incognito: tab.incognito,
        });
      }

      if (tab.url && isSyncableTabUrl(tab.url, tab.incognito)) {
        const norm = normalizePageUrl(tab.url);
        urls.push(norm);
        try {
          await groupService.addPage(boundGroup.id, {
            url: tab.url,
            title: tab.title ?? null,
            faviconUrl: tab.favIconUrl ?? null,
          });
        } catch (err) {
          this.logger.warn(
            '[TabGroupSyncService] Failed to add initial page to new group',
            { err, url: tab.url }
          );
        }
      }
    }

    await this.bindingStore.save({
      appGroupId: boundGroup.id,
      browserGroupId: group.id,
      windowId: group.windowId ?? tabs[0]?.windowId ?? 0,
      title: boundGroup.name,
      color: boundGroup.color,
      urls: Array.from(new Set(urls)),
      lastSeenAt: now,
    });

    this.logger.info(
      '[TabGroupSyncService] Created app group and binding for new browser group',
      { appGroupId: boundGroup.id, browserGroupId: group.id }
    );
  }

  async handleTabGroupUpdated(group: {
    id: number;
    title?: string;
    color?: GroupColor;
  }): Promise<void> {
    if (!(await this.checkGuards())) return;

    if (this.isGroupUpdateSuppressed(group.id, group.title, group.color)) {
      this.logger.debug(
        '[TabGroupSyncService] Suppressing echo for tabGroup onUpdated',
        { groupId: group.id }
      );
      return;
    }

    const binding = await this.bindingStore.getByBrowserGroupId(group.id);
    if (!binding) return;

    const groupService = this.getGroupService();
    let updatedTitle = binding.title;
    let updatedColor = binding.color;

    if (
      group.title !== undefined &&
      group.title.trim().length > 0 &&
      group.title.trim() !== binding.title
    ) {
      await groupService.renameGroup(binding.appGroupId, group.title.trim());
      updatedTitle = group.title.trim();
    }

    if (
      group.color !== undefined &&
      (GROUP_COLORS as readonly string[]).includes(group.color) &&
      group.color !== binding.color
    ) {
      await groupService.recolorGroup(binding.appGroupId, group.color);
      updatedColor = group.color;
    }

    if (updatedTitle !== binding.title || updatedColor !== binding.color) {
      binding.title = updatedTitle;
      binding.color = updatedColor;
      binding.lastSeenAt = nowIso();
      await this.bindingStore.save(binding);
    }
  }

  async handleTabGroupRemoved(group: { id: number }): Promise<void> {
    if (!(await this.checkGuards())) return;

    const binding = await this.bindingStore.getByBrowserGroupId(group.id);
    if (!binding) return;

    this.logger.info(
      '[TabGroupSyncService] Browser tab group removed, marking closed',
      { browserGroupId: group.id, appGroupId: binding.appGroupId }
    );
    await this.markGroupClosed(binding.appGroupId);
  }

  async handleTabGroupMoved(group: { id: number; windowId?: number }): Promise<void> {
    if (!(await this.checkGuards())) return;

    const binding = await this.bindingStore.getByBrowserGroupId(group.id);
    if (
      binding &&
      group.windowId !== undefined &&
      binding.windowId !== group.windowId
    ) {
      binding.windowId = group.windowId;
      binding.lastSeenAt = nowIso();
      await this.bindingStore.save(binding);
    }
  }

  async handleTabUpdated(
    tabId: number,
    changeInfo: {
      url?: string;
      title?: string;
      favIconUrl?: string;
      groupId?: number;
      status?: string;
    },
    tab?: any
  ): Promise<void> {
    if (!(await this.checkGuards())) return;

    // Check echo suppression for tabs.ungroup
    if (this.isTabUngroupSuppressed(tabId)) {
      this.logger.debug(
        '[TabGroupSyncService] Suppressing echo for tab ungrouping',
        { tabId }
      );
      if (tab) {
        this.tabCache.set(tabId, {
          tabId,
          groupId: tab.groupId ?? -1,
          windowId: tab.windowId,
          url: tab.url,
          title: tab.title,
          favIconUrl: tab.favIconUrl,
          incognito: tab.incognito,
        });
      }
      return;
    }

    const currentTab = tab ?? (await this.tabsApi.get?.(tabId));
    const prev = this.tabCache.get(tabId);
    const newGroupId =
      currentTab?.groupId ?? changeInfo?.groupId ?? prev?.groupId ?? -1;

    // Update tab cache
    if (currentTab) {
      this.tabCache.set(tabId, {
        tabId,
        groupId: newGroupId,
        windowId: currentTab.windowId,
        url: currentTab.url,
        title: currentTab.title,
        favIconUrl: currentTab.favIconUrl,
        incognito: currentTab.incognito,
      });
    }

    // Title / Favicon backfill check
    if (currentTab?.url && (currentTab.title || currentTab.favIconUrl)) {
      void this.checkAndBackfillTitleFavicon(currentTab);
    }

    // Detect group changes
    if (prev && prev.groupId !== newGroupId) {
      if (prev.groupId > 0) {
        // Tab left prev.groupId without closing!
        this.scheduleGroupSync(prev.groupId);
      }
      if (newGroupId > 0) {
        // Tab joined newGroupId
        this.scheduleGroupSync(newGroupId);
      }
    } else if (newGroupId > 0) {
      // Tab remained in group, but url or state may have updated
      if (!prev || prev.url !== currentTab?.url) {
        this.scheduleGroupSync(newGroupId);
      }
    }
  }

  async handleTabRemoved(
    tabId: number,
    _removeInfo?: { windowId?: number; isWindowClosing?: boolean }
  ): Promise<void> {
    if (!(await this.checkGuards())) return;

    const cached = this.tabCache.get(tabId);
    this.tabCache.delete(tabId);

    // If tab was cached and known to be ungrouped, closing it must not trigger sync
    if (cached && cached.groupId <= 0) {
      return;
    }

    let targetBrowserGroupId: number | null = null;
    if (cached && cached.groupId > 0) {
      targetBrowserGroupId = cached.groupId;
      if (cached.url) {
        this.recordRecentlyClosedUrl(cached.url);
      }
    }

    if (targetBrowserGroupId !== null) {
      this.scheduleGroupSync(targetBrowserGroupId);
    } else {
      // If not in cache, check all bindings to detect group closures or lost tabs
      const bindings = await this.bindingStore.getAll();
      for (const binding of bindings) {
        this.scheduleGroupSync(binding.browserGroupId);
      }
    }
  }

  async handleTabAttached(
    tabId: number,
    attachInfo?: { newWindowId?: number }
  ): Promise<void> {
    if (!(await this.checkGuards())) return;

    const cached = this.tabCache.get(tabId);
    if (cached && attachInfo?.newWindowId !== undefined) {
      cached.windowId = attachInfo.newWindowId;
    }
    if (cached && cached.groupId > 0) {
      this.scheduleGroupSync(cached.groupId);
    }
  }

  async handleTabDetached(
    tabId: number,
    _detachInfo?: { oldWindowId?: number }
  ): Promise<void> {
    if (!(await this.checkGuards())) return;

    const cached = this.tabCache.get(tabId);
    if (cached && cached.groupId > 0) {
      this.scheduleGroupSync(cached.groupId);
    }
  }

  // ==================== Diff & Sync Processing ====================

  async processGroupSync(browserGroupId: number): Promise<void> {
    if (!(await this.checkGuards())) return;

    const binding = await this.bindingStore.getByBrowserGroupId(browserGroupId);
    if (!binding) {
      return;
    }

    const appGroupId = binding.appGroupId;
    let liveTabs: any[] = [];
    try {
      liveTabs = await this.tabsApi.query({ groupId: browserGroupId });
    } catch (err) {
      this.logger.warn(
        '[TabGroupSyncService] Failed to query tabs for browserGroupId',
        { browserGroupId, err }
      );
      return;
    }

    // Update tab cache for all queried live tabs
    for (const tab of liveTabs) {
      if (tab.id) {
        this.tabCache.set(tab.id, {
          tabId: tab.id,
          groupId: browserGroupId,
          windowId: tab.windowId,
          url: tab.url,
          title: tab.title,
          favIconUrl: tab.favIconUrl,
          incognito: tab.incognito,
        });
      }
    }

    const groupService = this.getGroupService();
    const repo = this.getActiveGroupRepository();

    const syncableLiveTabs = liveTabs.filter(
      (t) => t.url && isSyncableTabUrl(t.url, t.incognito)
    );
    const currentNormalizedUrls = new Set(
      syncableLiveTabs.map((t) => normalizePageUrl(t.url))
    );
    const previousNormalizedUrls = new Set(binding.urls ?? []);

    // 1. Tab joins a linked group: addPage
    for (const tab of syncableLiveTabs) {
      const norm = normalizePageUrl(tab.url);
      if (!previousNormalizedUrls.has(norm)) {
        try {
          await groupService.addPage(appGroupId, {
            url: tab.url,
            title: tab.title ?? null,
            faviconUrl: tab.favIconUrl ?? null,
          });
        } catch (err) {
          this.logger.warn(
            '[TabGroupSyncService] Failed to add page to group',
            { err, url: tab.url, appGroupId }
          );
        }
      }
    }

    // 2. Tab leaves a linked group without closing: removeItem
    const appItems = await repo.listItems(appGroupId, { includeDeleted: false });
    for (const oldNormUrl of previousNormalizedUrls) {
      if (!currentNormalizedUrls.has(oldNormUrl)) {
        if (this.isRecentlyClosedUrl(oldNormUrl)) {
          // Tab closed! Keep item in app group per spec
        } else {
          // Tab left without closing (ungrouped or moved to another group)
          const matchingItem = appItems.find(
            (item) =>
              item.kind === 'page' &&
              normalizePageUrl(item.urlNormalized) === oldNormUrl
          );
          if (matchingItem) {
            try {
              await groupService.removeItem(appGroupId, matchingItem.id);
            } catch (err) {
              this.logger.warn(
                '[TabGroupSyncService] Failed to remove ungrouped item',
                { err, itemId: matchingItem.id, appGroupId }
              );
            }
          }
        }
      }
    }

    // 3. If 0 tabs remain in the browser group, mark it closed
    if (liveTabs.length === 0) {
      this.logger.info(
        '[TabGroupSyncService] All tabs closed in group, marking closed',
        { appGroupId, browserGroupId }
      );
      await this.markGroupClosed(appGroupId);
      return;
    }

    // 4. Update binding urls & lastSeenAt
    binding.urls = Array.from(currentNormalizedUrls);
    binding.lastSeenAt = nowIso();
    await this.bindingStore.save(binding);
  }

  // ==================== Remote -> Browser Handlers ====================

  async handleRemoteGroupUpdated(group: PageGroup): Promise<void> {
    if (!(await this.checkGuards())) return;

    const currentDeviceId = await this.deviceIdService.getDeviceId();
    const binding = await this.bindingStore.getByAppGroupId(group.id);
    if (!binding) return;

    if (group.boundDeviceId !== currentDeviceId) {
      // Link was taken over by another device!
      this.logger.info(
        '[TabGroupSyncService] Remote link takeover detected, removing local binding',
        { appGroupId: group.id, newBoundDeviceId: group.boundDeviceId }
      );
      await this.bindingStore.removeByAppGroupId(group.id);
      return;
    }

    // Group is bound to this device: check for rename or recolor
    const titleChanged = group.name !== binding.title;
    const colorChanged = group.color !== binding.color;

    if (titleChanged || colorChanged) {
      this.suppressGroupUpdate(binding.browserGroupId, group.name, group.color);
      try {
        await this.tabGroupsApi.update(binding.browserGroupId, {
          title: group.name,
          color: group.color,
        });
      } catch (err) {
        this.logger.warn(
          '[TabGroupSyncService] Failed to update browser tab group on remote change',
          { err, browserGroupId: binding.browserGroupId }
        );
      }

      binding.title = group.name;
      binding.color = group.color;
      binding.lastSeenAt = nowIso();
      await this.bindingStore.save(binding);
    }
  }

  readonly onRemoteGroupUpdated = this.handleRemoteGroupUpdated.bind(this);

  async handleRemoteItemRemoved(
    groupId: string,
    itemOrUrl: PageGroupItem | { urlNormalized: string } | string
  ): Promise<void> {
    if (!(await this.checkGuards())) return;

    const currentDeviceId = await this.deviceIdService.getDeviceId();
    const binding = await this.bindingStore.getByAppGroupId(groupId);
    if (!binding) return;

    const repo = this.getActiveGroupRepository();
    const group = await repo.getGroup(groupId);
    if (!group || group.boundDeviceId !== currentDeviceId) {
      return;
    }

    let targetUrl: string | null = null;
    if (typeof itemOrUrl === 'string') {
      if (itemOrUrl.includes('/') || itemOrUrl.includes('.')) {
        targetUrl = normalizePageUrl(itemOrUrl);
      } else {
        const items = await repo.listItems(groupId, { includeDeleted: true });
        const found = items.find((i) => i.id === itemOrUrl);
        if (found && found.kind === 'page') {
          targetUrl = normalizePageUrl(found.urlNormalized);
        }
      }
    } else if (itemOrUrl && typeof (itemOrUrl as any).urlNormalized === 'string') {
      targetUrl = normalizePageUrl((itemOrUrl as any).urlNormalized);
    }

    if (!targetUrl) return;

    let liveTabs: any[] = [];
    try {
      liveTabs = await this.tabsApi.query({ groupId: binding.browserGroupId });
    } catch (err) {
      this.logger.warn(
        '[TabGroupSyncService] Failed to query tabs for remote item removal',
        { err, browserGroupId: binding.browserGroupId }
      );
      return;
    }

    const matchingTab = liveTabs.find(
      (t) => t.url && normalizePageUrl(t.url) === targetUrl
    );
    if (matchingTab && matchingTab.id !== undefined) {
      this.suppressTabUngroup(matchingTab.id);
      try {
        await this.tabsApi.ungroup(matchingTab.id);
      } catch (err) {
        this.suppressedTabUngroups.delete(matchingTab.id);
        this.logger.warn(
          '[TabGroupSyncService] Failed to ungroup tab on remote item remove',
          { err, tabId: matchingTab.id }
        );
      }

      binding.urls = binding.urls.filter((u) => u !== targetUrl);
      binding.lastSeenAt = nowIso();
      await this.bindingStore.save(binding);
    }
  }

  readonly onRemoteItemRemoved = this.handleRemoteItemRemoved.bind(this);

  // ==================== Startup & Rebind ====================

  async reconcileOnStartup(): Promise<void> {
    if (!(await this.checkGuards())) return;

    this.logger.info('[TabGroupSyncService] Reconciling tab groups on startup...');
    const bindings = await this.bindingStore.getAll();
    if (bindings.length === 0) {
      this.logger.debug(
        '[TabGroupSyncService] No bindings found on startup'
      );
      return;
    }

    let allBrowserGroups: any[] = [];
    let allTabs: any[] = [];
    try {
      allBrowserGroups = await this.tabGroupsApi.query({});
      allTabs = await this.tabsApi.query({});
    } catch (err) {
      this.logger.warn(
        '[TabGroupSyncService] Failed to query browser groups/tabs for startup rebind',
        { err }
      );
      return;
    }

    // Populate tab cache
    for (const tab of allTabs) {
      if (tab.id) {
        this.tabCache.set(tab.id, {
          tabId: tab.id,
          groupId: tab.groupId ?? -1,
          windowId: tab.windowId,
          url: tab.url,
          title: tab.title,
          favIconUrl: tab.favIconUrl,
          incognito: tab.incognito,
        });
      }
    }

    const tabsByGroupId = new Map<number, any[]>();
    for (const tab of allTabs) {
      if (tab.groupId && tab.groupId > 0) {
        const list = tabsByGroupId.get(tab.groupId) ?? [];
        list.push(tab);
        tabsByGroupId.set(tab.groupId, list);
      }
    }

    const candidates: LiveBrowserGroupCandidate[] = allBrowserGroups.map(
      (bg) => {
        const groupTabs = tabsByGroupId.get(bg.id) ?? [];
        const urls = groupTabs
          .filter((t) => t.url && isSyncableTabUrl(t.url, t.incognito))
          .map((t) => normalizePageUrl(t.url))
          .filter(Boolean);
        return {
          browserGroupId: bg.id,
          windowId: bg.windowId ?? 0,
          title: bg.title ?? '',
          color: bg.color ?? 'grey',
          urls,
        };
      }
    );

    const { matches, unmatchedBindings } = rebind(bindings, candidates);
    const now = nowIso();
    const repo = this.getActiveGroupRepository();
    const groupService = this.getGroupService();

    // Reconcile matches
    for (const match of matches) {
      const { binding, candidate } = match;
      binding.browserGroupId = candidate.browserGroupId;
      binding.windowId = candidate.windowId;
      binding.title = candidate.title;
      binding.color = candidate.color;
      binding.urls = candidate.urls;
      binding.lastSeenAt = now;
      await this.bindingStore.save(binding);

      try {
        const items = await repo.listItems(binding.appGroupId, {
          includeDeleted: false,
        });
        const knownUrls = new Set(
          items
            .filter((i) => i.kind === 'page')
            .map((i) => normalizePageUrl(i.urlNormalized))
        );
        const liveGroupTabs = tabsByGroupId.get(candidate.browserGroupId) ?? [];
        for (const tab of liveGroupTabs) {
          if (tab.url && isSyncableTabUrl(tab.url, tab.incognito)) {
            const norm = normalizePageUrl(tab.url);
            if (!knownUrls.has(norm)) {
              await groupService.addPage(binding.appGroupId, {
                url: tab.url,
                title: tab.title ?? null,
                faviconUrl: tab.favIconUrl ?? null,
              });
              knownUrls.add(norm);
            }
          }
        }
      } catch (err) {
        this.logger.warn(
          '[TabGroupSyncService] Error reconciling membership for matched group',
          { err, appGroupId: binding.appGroupId }
        );
      }
    }

    // Unmatched bindings: mark closed and remove binding
    for (const unmatched of unmatchedBindings) {
      this.logger.info(
        '[TabGroupSyncService] Unmatched binding on startup, marking closed',
        { appGroupId: unmatched.appGroupId }
      );
      await this.markGroupClosed(unmatched.appGroupId);
    }
  }

  // ==================== Title / Favicon Backfill ====================

  async checkAndBackfillTitleFavicon(tab: {
    url?: string;
    title?: string;
    favIconUrl?: string;
    incognito?: boolean;
  }): Promise<void> {
    if (!tab.url || !isSyncableTabUrl(tab.url, tab.incognito)) return;

    const hasTitle = Boolean(tab.title && tab.title.trim().length > 0);
    const hasFavicon = Boolean(
      tab.favIconUrl && /^https?:\/\//i.test(tab.favIconUrl)
    );
    if (!hasTitle && !hasFavicon) return;

    const normUrl = normalizePageUrl(tab.url);
    const bindings = await this.bindingStore.getAll();
    if (bindings.length === 0) return;

    const repo = this.getActiveGroupRepository();
    for (const binding of bindings) {
      const items = await repo.listItems(binding.appGroupId, {
        includeDeleted: false,
      });
      for (const item of items) {
        if (
          item.kind === 'page' &&
          normalizePageUrl(item.urlNormalized) === normUrl
        ) {
          let needsUpdate = false;
          let nextTitle = item.title;
          let nextFavicon = item.faviconUrl;

          if (!item.title && hasTitle) {
            nextTitle = tab.title!.trim();
            needsUpdate = true;
          }
          if (!item.faviconUrl && hasFavicon) {
            nextFavicon = tab.favIconUrl!;
            needsUpdate = true;
          }

          if (needsUpdate) {
            const updatedItem: PageGroupItem = {
              ...item,
              title: nextTitle,
              faviconUrl: nextFavicon,
              updatedAt: nowIso(),
            };
            await repo.putItem(updatedItem);
            notifyLibraryDataChanged({ source: 'tab-group-backfill' });
            this.logger.debug(
              '[TabGroupSyncService] Backfilled title/favicon for item',
              { itemId: item.id, title: nextTitle, faviconUrl: nextFavicon }
            );
          }
        }
      }
    }
  }

  // ==================== Group Closure & Cleanup ====================

  private async persistGroup(group: PageGroup): Promise<void> {
    const repo = this.getActiveGroupRepository();
    await repo.putGroup(group);

    if (this.authManager.isAuthenticated && this.cloudGroups) {
      if (this.echoTracker) {
        this.echoTracker.record(group.id, 'update');
      }
      try {
        await this.cloudGroups.putGroup(group);
      } catch (err) {
        this.logger.error(
          '[TabGroupSyncService] Cloud write failed for persistGroup; queueing for retry',
          err as Error,
          { id: group.id }
        );
        if (this.offlineQueue) {
          try {
            await this.offlineQueue.enqueue('update', group.id, group, 'group');
          } catch (enqueueErr) {
            this.logger.error(
              '[TabGroupSyncService] Failed to enqueue group operation to offline queue',
              enqueueErr as Error,
              { id: group.id }
            );
          }
        }
      }
    }
  }

  async markGroupClosed(appGroupId: string): Promise<void> {
    try {
      const repo = this.getActiveGroupRepository();
      const group = await repo.getGroup(appGroupId);
      if (group) {
        const updated: PageGroup = {
          ...group,
          boundDeviceId: null,
          boundDeviceLabel: null,
          boundBrowser: null,
          boundAt: group.boundAt ?? null,
          updatedAt: nowIso(),
        };
        await this.persistGroup(updated);
        notifyLibraryDataChanged({ source: 'tab-group-closed' });
      }
    } catch (err) {
      this.logger.warn(
        '[TabGroupSyncService] Failed to mark group closed in repo',
        { appGroupId, err }
      );
    }

    try {
      await this.bindingStore.removeByAppGroupId(appGroupId);
    } catch (err) {
      this.logger.warn(
        '[TabGroupSyncService] Failed to remove binding by appGroupId',
        { appGroupId, err }
      );
    }
  }

  private async handlePermissionsRemoved(): Promise<void> {
    this.logger.warn(
      '[TabGroupSyncService] Tab group permissions removed; clearing bindings'
    );
    try {
      const bindings = await this.bindingStore.getAll();
      for (const b of bindings) {
        await this.markGroupClosed(b.appGroupId);
      }
    } catch (err) {
      this.logger.warn(
        '[TabGroupSyncService] Error handling permissions removed',
        { err }
      );
    }
  }

  // ==================== Recently Closed Tabs Helpers ====================

  private recordRecentlyClosedUrl(url: string): void {
    const now = Date.now();
    for (const [key, ts] of this.recentlyClosedUrls.entries()) {
      if (now - ts > 10000) {
        this.recentlyClosedUrls.delete(key);
      }
    }
    const norm = normalizePageUrl(url);
    this.recentlyClosedUrls.set(norm, now);
  }

  private isRecentlyClosedUrl(normUrl: string): boolean {
    const timestamp = this.recentlyClosedUrls.get(normUrl);
    if (!timestamp) return false;
    if (Date.now() - timestamp > 5000) {
      this.recentlyClosedUrls.delete(normUrl);
      return false;
    }
    this.recentlyClosedUrls.delete(normUrl);
    return true;
  }

  // ==================== Echo Suppression Helpers ====================

  private suppressGroupUpdate(
    browserGroupId: number,
    title?: string,
    color?: GroupColor
  ): void {
    this.suppressedGroupUpdates.set(browserGroupId, {
      title,
      color,
      timestamp: Date.now(),
    });
  }

  private isGroupUpdateSuppressed(
    browserGroupId: number,
    title?: string,
    color?: GroupColor
  ): boolean {
    const suppressed = this.suppressedGroupUpdates.get(browserGroupId);
    if (!suppressed) return false;

    if (Date.now() - suppressed.timestamp > 5000) {
      this.suppressedGroupUpdates.delete(browserGroupId);
      return false;
    }

    if (
      title !== undefined &&
      suppressed.title !== undefined &&
      title !== suppressed.title
    ) {
      return false;
    }
    if (
      color !== undefined &&
      suppressed.color !== undefined &&
      color !== suppressed.color
    ) {
      return false;
    }

    this.suppressedGroupUpdates.delete(browserGroupId);
    return true;
  }

  private suppressTabUngroup(tabId: number): void {
    this.suppressedTabUngroups.add(tabId);
  }

  private isTabUngroupSuppressed(tabId: number): boolean {
    if (this.suppressedTabUngroups.has(tabId)) {
      this.suppressedTabUngroups.delete(tabId);
      return true;
    }
    return false;
  }

  // ==================== Open in Browser ====================

  async openInBrowser(
    groupId: string,
    force = false
  ): Promise<GroupOpenInBrowserResponse> {
    if (!GROUPS_BROWSER_SYNC_ENABLED) {
      return { ok: false, error: 'Browser tab group sync is disabled' };
    }

    const hasPerms = this.hasPermissionsCheck
      ? await this.hasPermissionsCheck()
      : await hasTabGroupPermissions();
    if (!hasPerms) {
      return { ok: false, error: 'Tab group permissions not granted' };
    }

    const isAvailable =
      isTabGroupApiAvailable() ||
      (typeof this.tabsApi?.group === 'function' &&
        typeof (this.tabGroupsApi as any)?.update === 'function');
    if (!isAvailable) {
      return { ok: false, error: 'Tab group API is not available' };
    }

    const repo = this.getActiveGroupRepository();
    const group = await repo.getGroup(groupId);
    if (!group || group.deletedAt !== null) {
      return { ok: false, error: 'Group not found' };
    }

    const items = await repo.listItems(groupId, { includeDeleted: false });
    type PageItem = Extract<PageGroupItem, { kind: 'page' }>;
    const pages = items.filter(
      (item): item is PageItem =>
        item.kind === 'page' &&
        item.deletedAt === null &&
        Boolean(item.urlNormalized)
    );

    if (pages.length === 0) {
      return { ok: false, error: 'Group has no pages to open' };
    }

    if (pages.length > 15 && !force) {
      return { ok: false, needsConfirm: true, tabCount: pages.length };
    }

    let targetWindowId: number | undefined;
    try {
      const activeTabs = await this.tabsApi.query({
        active: true,
        currentWindow: true,
      });
      if (activeTabs.length > 0 && activeTabs[0]?.windowId !== undefined) {
        targetWindowId = activeTabs[0].windowId;
      }
    } catch (err) {
      this.logger.warn(
        '[TabGroupSyncService] Failed to query active tab for window',
        { err }
      );
    }

    const tabIds: number[] = [];
    for (const page of pages) {
      let tab: any;
      if (typeof this.tabsApi?.create === 'function') {
        tab = await this.tabsApi.create({
          url: page.urlNormalized,
          windowId: targetWindowId,
          active: false,
        });
      } else if (typeof (browser as any)?.tabs?.create === 'function') {
        tab = await (browser as any).tabs.create({
          url: page.urlNormalized,
          windowId: targetWindowId,
          active: false,
        });
      } else if (
        typeof (globalThis as any)?.chrome?.tabs?.create === 'function'
      ) {
        tab = await (globalThis as any).chrome.tabs.create({
          url: page.urlNormalized,
          windowId: targetWindowId,
          active: false,
        });
      }

      if (tab?.id !== undefined) {
        tabIds.push(tab.id);
        if (targetWindowId === undefined && tab.windowId !== undefined) {
          targetWindowId = tab.windowId;
        }
        this.tabCache.set(tab.id, {
          tabId: tab.id,
          groupId: -1,
          windowId: tab.windowId ?? targetWindowId,
          url: page.urlNormalized,
          title: page.title ?? undefined,
          favIconUrl: page.faviconUrl ?? undefined,
          incognito: false,
        });
      }
    }

    if (tabIds.length === 0) {
      return { ok: false, error: 'Failed to create browser tabs' };
    }

    let browserGroupId: number;
    const groupOptions = {
      tabIds,
      createProperties:
        targetWindowId !== undefined ? { windowId: targetWindowId } : undefined,
    };

    if (typeof this.tabsApi?.group === 'function') {
      browserGroupId = await this.tabsApi.group(groupOptions);
    } else if (typeof (browser as any)?.tabs?.group === 'function') {
      browserGroupId = await (browser as any).tabs.group(groupOptions);
    } else if (typeof (globalThis as any)?.chrome?.tabs?.group === 'function') {
      browserGroupId = await (globalThis as any).chrome.tabs.group(groupOptions);
    } else {
      return { ok: false, error: 'tabs.group API is not available' };
    }

    this.suppressedGroupCreations.add(browserGroupId);
    setTimeout(() => {
      this.suppressedGroupCreations.delete(browserGroupId);
    }, 5000);

    this.suppressGroupUpdate(browserGroupId, group.name, group.color);
    try {
      await this.tabGroupsApi.update(browserGroupId, {
        title: group.name,
        color: group.color,
      });
    } catch (err) {
      this.logger.warn(
        '[TabGroupSyncService] Failed to update browser group title/color',
        { err, browserGroupId }
      );
    }

    for (const tabId of tabIds) {
      const cached = this.tabCache.get(tabId);
      if (cached) {
        cached.groupId = browserGroupId;
      }
    }

    const now = nowIso();
    const currentDeviceId = await this.deviceIdService.getDeviceId();
    const currentDeviceLabel =
      typeof this.deviceIdService.getDeviceLabel === 'function'
        ? await this.deviceIdService.getDeviceLabel()
        : 'this device';

    const updatedGroup: PageGroup = {
      ...group,
      boundDeviceId: currentDeviceId,
      boundBrowser: detectBrowser(),
      boundDeviceLabel: currentDeviceLabel,
      boundAt: now,
      updatedAt: now,
    };

    await this.persistGroup(updatedGroup);

    await this.bindingStore.save({
      appGroupId: group.id,
      browserGroupId,
      windowId: targetWindowId ?? 0,
      title: group.name,
      color: group.color,
      urls: pages.map((p) => p.urlNormalized),
      lastSeenAt: now,
    });

    notifyLibraryDataChanged({ source: 'tab-group-open-in-browser' });

    return {
      ok: true,
      browserGroupId,
      tabCount: pages.length,
    };
  }

  // ==================== Focus Tab Group ====================

  async focusTabGroup(browserGroupId: number): Promise<{ ok: boolean; error?: string }> {
    try {
      let tabs: any[] = [];
      if (typeof this.tabsApi?.query === 'function') {
        tabs = await this.tabsApi.query({ groupId: browserGroupId });
      } else if (typeof (browser as any)?.tabs?.query === 'function') {
        tabs = await (browser as any).tabs.query({ groupId: browserGroupId });
      } else if (typeof (globalThis as any)?.chrome?.tabs?.query === 'function') {
        tabs = await (globalThis as any).chrome.tabs.query({ groupId: browserGroupId });
      }

      if (tabs.length === 0) {
        return { ok: false, error: 'No tabs found in group' };
      }

      const firstTab = tabs[0];
      const windowId = firstTab.windowId;

      if (windowId !== undefined) {
        if (typeof (browser as any)?.windows?.update === 'function') {
          await (browser as any).windows.update(windowId, { focused: true });
        } else if (typeof (globalThis as any)?.chrome?.windows?.update === 'function') {
          await (globalThis as any).chrome.windows.update(windowId, { focused: true });
        }
      }

      if (firstTab.id !== undefined) {
        if (typeof this.tabsApi?.update === 'function') {
          await this.tabsApi.update(firstTab.id, { active: true });
        } else if (typeof (browser as any)?.tabs?.update === 'function') {
          await (browser as any).tabs.update(firstTab.id, { active: true });
        } else if (typeof (globalThis as any)?.chrome?.tabs?.update === 'function') {
          await (globalThis as any).chrome.tabs.update(firstTab.id, { active: true });
        }
      }

      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to focus tab group',
      };
    }
  }

  // ==================== Query Browser Tab Groups ====================

  async getBrowserTabGroups(): Promise<{
    ok: boolean;
    groups?: BrowserTabGroupSummary[];
    error?: string;
  }> {
    if (!GROUPS_BROWSER_SYNC_ENABLED) {
      return { ok: false, error: 'Browser tab group sync is disabled' };
    }

    const hasPerms = this.hasPermissionsCheck
      ? await this.hasPermissionsCheck()
      : await hasTabGroupPermissions();
    if (!hasPerms) {
      return { ok: false, error: 'Tab group permissions not granted' };
    }

    let groups: any[] = [];
    try {
      if (typeof this.tabGroupsApi?.query === 'function') {
        groups = await this.tabGroupsApi.query({});
      } else if (typeof (browser as any)?.tabGroups?.query === 'function') {
        groups = await (browser as any).tabGroups.query({});
      } else if (typeof (globalThis as any)?.chrome?.tabGroups?.query === 'function') {
        groups = await (globalThis as any).chrome.tabGroups.query({});
      }
    } catch (err) {
      return { ok: false, error: 'Failed to query browser tab groups' };
    }

    const result: BrowserTabGroupSummary[] = [];
    for (const group of groups) {
      let tabs: any[] = [];
      try {
        if (typeof this.tabsApi?.query === 'function') {
          tabs = await this.tabsApi.query({ groupId: group.id });
        } else if (typeof (browser as any)?.tabs?.query === 'function') {
          tabs = await (browser as any).tabs.query({ groupId: group.id });
        } else if (typeof (globalThis as any)?.chrome?.tabs?.query === 'function') {
          tabs = await (globalThis as any).chrome.tabs.query({ groupId: group.id });
        }
      } catch {
        tabs = [];
      }

      const validUrls: string[] = [];
      let skippedCount = 0;
      for (const t of tabs) {
        if (t.url && isSyncableTabUrl(t.url, t.incognito)) {
          validUrls.push(t.url);
        } else {
          skippedCount++;
        }
      }

      const color: GroupColor = (GROUP_COLORS as readonly string[]).includes(group.color)
        ? (group.color as GroupColor)
        : 'grey';

      result.push({
        id: group.id,
        title: (group.title || '').trim() || 'Untitled Group',
        color,
        tabCount: tabs.length,
        validUrls,
        skippedCount,
      });
    }

    return { ok: true, groups: result };
  }

  // ==================== Group Deletion with Live Tabs ====================

  async handleDeleteGroup(
    groupId: string,
    closeTabs = false
  ): Promise<void> {
    const binding = await this.bindingStore.getByAppGroupId(groupId);
    if (!binding) return;

    try {
      let tabs: any[] = [];
      if (typeof this.tabsApi?.query === 'function') {
        tabs = await this.tabsApi.query({ groupId: binding.browserGroupId });
      } else if (typeof (browser as any)?.tabs?.query === 'function') {
        tabs = await (browser as any).tabs.query({ groupId: binding.browserGroupId });
      } else if (typeof (globalThis as any)?.chrome?.tabs?.query === 'function') {
        tabs = await (globalThis as any).chrome.tabs.query({ groupId: binding.browserGroupId });
      }

      const tabIds = tabs
        .map((t) => t.id)
        .filter((id): id is number => typeof id === 'number');

      if (tabIds.length > 0) {
        if (closeTabs) {
          if (typeof this.tabsApi?.remove === 'function') {
            await this.tabsApi.remove(tabIds);
          } else if (typeof (browser as any)?.tabs?.remove === 'function') {
            await (browser as any).tabs.remove(tabIds);
          } else if (typeof (globalThis as any)?.chrome?.tabs?.remove === 'function') {
            await (globalThis as any).chrome.tabs.remove(tabIds);
          }
        } else {
          for (const tabId of tabIds) {
            this.suppressTabUngroup(tabId);
          }
          if (typeof this.tabsApi?.ungroup === 'function') {
            await this.tabsApi.ungroup(tabIds);
          } else if (typeof (browser as any)?.tabs?.ungroup === 'function') {
            await (browser as any).tabs.ungroup(tabIds);
          } else if (typeof (globalThis as any)?.chrome?.tabs?.ungroup === 'function') {
            await (globalThis as any).chrome.tabs.ungroup(tabIds);
          }
        }
      }
    } catch (err) {
      this.logger.warn('[TabGroupSyncService] Error handling deleteGroup tabs', {
        groupId,
        closeTabs,
        err,
      });
    }

    try {
      await this.bindingStore.removeByAppGroupId(groupId);
    } catch (err) {
      this.logger.warn('[TabGroupSyncService] Failed to remove binding on deleteGroup', {
        groupId,
        err,
      });
    }
  }

  // ==================== Import Browser Tab Groups ====================

  async importBrowserTabGroups(
    browserGroupIds?: number[]
  ): Promise<{ importedCount: number }> {
    let groups: any[] = [];
    try {
      if (typeof this.tabGroupsApi?.query === 'function') {
        groups = await this.tabGroupsApi.query({});
      } else if (typeof (browser as any)?.tabGroups?.query === 'function') {
        groups = await (browser as any).tabGroups.query({});
      } else if (typeof (globalThis as any)?.chrome?.tabGroups?.query === 'function') {
        groups = await (globalThis as any).chrome.tabGroups.query({});
      }
    } catch (err) {
      this.logger.warn('[TabGroupSyncService] Failed to query tab groups for import', { err });
      return { importedCount: 0 };
    }

    const targets = browserGroupIds
      ? groups.filter((g) => browserGroupIds.includes(g.id))
      : groups;

    let importedCount = 0;
    const currentDeviceId = await this.deviceIdService.getDeviceId();
    const currentDeviceLabel =
      typeof this.deviceIdService.getDeviceLabel === 'function'
        ? await this.deviceIdService.getDeviceLabel()
        : 'this device';

    for (const target of targets) {
      try {
        const existing = await this.bindingStore.getByBrowserGroupId(target.id);
        if (existing) continue;

        let tabs: any[] = [];
        if (typeof this.tabsApi?.query === 'function') {
          tabs = await this.tabsApi.query({ groupId: target.id });
        } else if (typeof (browser as any)?.tabs?.query === 'function') {
          tabs = await (browser as any).tabs.query({ groupId: target.id });
        } else if (typeof (globalThis as any)?.chrome?.tabs?.query === 'function') {
          tabs = await (globalThis as any).chrome.tabs.query({ groupId: target.id });
        }

        const syncableTabs = tabs.filter(
          (t) => t.url && isSyncableTabUrl(t.url, t.incognito)
        );

        const groupService = this.getGroupService();

        const name = (target.title || '').trim() || 'Untitled Group';
        const color: GroupColor = (GROUP_COLORS as readonly string[]).includes(target.color)
          ? (target.color as GroupColor)
          : 'grey';

        const newGroup = await groupService.createGroup({ name, color });

        for (const tab of syncableTabs) {
          await groupService.addPage(newGroup.id, {
            url: tab.url,
            title: tab.title ?? null,
            faviconUrl: tab.favIconUrl ?? null,
          });
        }

        const now = nowIso();
        await this.bindingStore.save({
          appGroupId: newGroup.id,
          browserGroupId: target.id,
          windowId: target.windowId ?? 0,
          title: newGroup.name,
          color: newGroup.color,
          urls: syncableTabs.map((t) => t.url),
          lastSeenAt: now,
        });

        const updatedGroup: PageGroup = {
          ...newGroup,
          boundDeviceId: currentDeviceId,
          boundDeviceLabel: currentDeviceLabel,
          boundBrowser: detectBrowser(),
          boundAt: now,
          updatedAt: now,
        };
        await this.persistGroup(updatedGroup);

        importedCount++;
      } catch (err) {
        this.logger.warn('[TabGroupSyncService] Failed to import tab group', {
          targetId: target.id,
          err,
        });
      }
    }

    if (importedCount > 0) {
      notifyLibraryDataChanged({ source: 'tab-group-import' });
    }

    return { importedCount };
  }

  // ==================== Disable Sync ====================

  async disableSync(): Promise<void> {
    try {
      const bindings = await this.bindingStore.getAll();
      for (const b of bindings) {
        await this.bindingStore.removeByAppGroupId(b.appGroupId);
      }

      const repo = this.getActiveGroupRepository();
      const groups = await repo.listGroups();
      const currentDeviceId = await this.deviceIdService.getDeviceId();

      for (const group of groups) {
        if (
          group.boundDeviceId === currentDeviceId ||
          group.boundDeviceLabel === 'this device'
        ) {
          const updated: PageGroup = {
            ...group,
            boundDeviceId: null,
            boundDeviceLabel: null,
            boundBrowser: null,
            boundAt: null,
            updatedAt: nowIso(),
          };
          await this.persistGroup(updated);
        }
      }

      notifyLibraryDataChanged({ source: 'tab-group-disable-sync' });
    } catch (err) {
      this.logger.warn('[TabGroupSyncService] Error during disableSync', { err });
    }
  }

  // ==================== Teardown / Testing ====================

  dispose(): void {
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer as any);
    }
    this.batchTimers.clear();
    this.unregisterTopLevelListeners();
  }

  seedTabCache(tab: CachedTabState): void {
    this.tabCache.set(tab.tabId, tab);
  }
}

type ReturnJSOrNodeTimeout = ReturnType<typeof setTimeout>;
