/**
 * @file group-service.ts
 * @description Local-first application service for Page Groups
 * (plan Phase 1 Task 1.4, PRD Data §2-3, ADR-032 §8).
 *
 * This revision adds the optional Task 2.2 cloud dual-write (local first,
 * cloud fire-and-forget, offline queue on failure, echo tracking).
 * Responsibilities: validation, URL normalization, (kind, key)
 * dedupe with tombstone revive, GROUP_CAPS enforcement, fractional ordering,
 * mergeRow-compatible timestamps, and popup refresh pings.
 *
 * DI style mirrors TagService (constructor-injected repository + logger).
 * Popup refresh uses notifyLibraryDataChanged like
 * BackgroundHighlightOrchestrator (TagService itself sends no notifications;
 * there is no sibling GROUPS_DATA_CHANGED message).
 */

import { notifyLibraryDataChanged } from '@/background/services/library-change-notifier';
import type { LocalWriteEchoTracker } from '@/background/services/local-write-echo-tracker';
import type { IGroupRepository } from '@/shared/repositories/i-group-repository';
import {
  GROUP_CAPS,
  GROUP_COLORS,
  type GroupColor,
  type PageGroup,
  type PageGroupItem,
} from '@/shared/types/page-group';
import { positionBetween } from '@/shared/utils/fractional-position';
import { normalizePageUrl } from '@/shared/utils/normalize-page-url';
import { isSyncableTabUrl } from '@/shared/utils/syncable-url';
import type { ILogger } from '@/shared/utils/logger';

export type MoveDirection = 'top' | 'up' | 'down';

/** Thrown when a GROUP_CAPS limit blocks a write (PRD Data §2). */
export class GroupCapError extends Error {
  readonly code = 'GROUP_CAP_EXCEEDED';
  readonly scope: 'groups' | 'items';
  readonly limit: number;

  constructor(scope: 'groups' | 'items', limit: number) {
    super(
      scope === 'groups'
        ? `Group limit reached (${limit} groups per user)`
        : `Group item limit reached (${limit} page items per group)`
    );
    this.name = 'GroupCapError';
    this.scope = scope;
    this.limit = limit;
  }
}

/** Thrown when a group or item id is missing or tombstoned (for live-only ops). */
export class GroupNotFoundError extends Error {
  readonly code = 'GROUP_NOT_FOUND';

  constructor(message: string) {
    super(message);
    this.name = 'GroupNotFoundError';
  }
}

/** Thrown for invalid names, colors, URLs, hostnames, titles, favicons. */
export class GroupValidationError extends Error {
  readonly code = 'GROUP_INVALID';

  constructor(message: string) {
    super(message);
    this.name = 'GroupValidationError';
  }
}

export interface CreateGroupInput {
  name: string;
  color?: GroupColor;
}

export interface AddPageInput {
  url: string;
  title?: string | null;
  faviconUrl?: string | null;
}

export interface AddDomainInput {
  hostname: string;
  includeSubdomains?: boolean;
}

function nowIso(): string {
  return new Date().toISOString();
}

function byPosition<T extends { position: string }>(a: T, b: T): number {
  return a.position < b.position ? -1 : a.position > b.position ? 1 : 0;
}

export type GroupStorageScope = 'basic' | 'pro';

/**
 * Scope picker for Page Groups storage, mirroring
 * `resolveQueryStorageScope` (scoped-highlight-query.ts): signed-in reads and
 * writes hit the pro partition, guests stay on basic. This resolves the
 * Task 1.3 open question (scoped-vs-single repo) the same way the highlight
 * router and TagService pick scope — per call, from auth state.
 */
export function resolveGroupStorageScope(isAuthenticated: boolean): GroupStorageScope {
  return isAuthenticated ? 'pro' : 'basic';
}

export interface ScopedGroupServiceDeps {
  isAuthenticated: boolean;
  basicRepository: IGroupRepository;
  proRepository: IGroupRepository;
  logger: ILogger;
  /**
   * Optional cloud sync (Task 2.2). Absent = local-only, preserving the
   * Phase 1 behavior for guests and for callers that have not wired sync.
   */
  sync?: GroupCloudSyncDeps;
}

/** Build a GroupService bound to the storage partition for the auth state. */
export function createScopedGroupService(deps: ScopedGroupServiceDeps): GroupService {
  const repository =
    resolveGroupStorageScope(deps.isAuthenticated) === 'pro'
      ? deps.proRepository
      : deps.basicRepository;
  return new GroupService(repository, deps.logger, deps.sync);
}

/**
 * Cloud sync dependencies for local-first dual-write (Task 2.2, ADR-032 §8).
 *
 * Mirrors the highlight `DualWriteRepository` + `TagService` pattern: the
 * local repository write always lands first and the method returns it; the
 * cloud write runs fire-and-forget. Recorded in the echo tracker so the
 * Task 2.3 Realtime ingest skips our own echoes.
 */
export type GroupCloudEntity = 'group' | 'group_item';
export type GroupCloudOp = 'add' | 'update' | 'remove';

export interface GroupCloudSyncDeps {
  cloudRepository: IGroupRepository;
  isAuthenticated: () => boolean;
  echoTracker: LocalWriteEchoTracker;
  enqueueOperation: (
    entity: GroupCloudEntity,
    type: GroupCloudOp,
    targetId: string,
    payload: PageGroup | PageGroupItem
  ) => void | Promise<void>;
}

/**
 * Local sniff for the Task 2.1 cap trigger (SQLSTATE P0001,
 * `group_cap_exceeded`). Duplicates `isGroupCapFailure` from
 * supabase-group-repository.ts on purpose: importing that module here would
 * create a runtime cycle (it imports GroupCapError from this file).
 */
function isRawGroupCapFailure(error: unknown): boolean {
  if (error instanceof GroupCapError) return true;
  if (!error || typeof error !== 'object') return false;
  const record = error as { code?: unknown; message?: unknown };
  return (
    record.code === 'P0001' ||
    (typeof record.message === 'string' &&
      record.message.includes('group_cap_exceeded'))
  );
}

export class GroupService {
  constructor(
    private readonly repository: IGroupRepository,
    private readonly logger: ILogger,
    private readonly syncDeps?: GroupCloudSyncDeps
  ) {}

  // ==================== Groups ====================

  async createGroup(input: CreateGroupInput): Promise<PageGroup> {
    const name = GroupService.validateName(input.name);
    const color = input.color === undefined ? 'grey' : GroupService.validateColor(input.color);
    const groups = (await this.repository.listGroups()).slice().sort(byPosition);
    if (groups.length >= GROUP_CAPS.groupsPerUser) {
      throw new GroupCapError('groups', GROUP_CAPS.groupsPerUser);
    }
    const last = groups[groups.length - 1];
    const position = last ? positionBetween(last.position) : positionBetween();
    const now = nowIso();
    const group: PageGroup = {
      id: crypto.randomUUID(),
      name,
      color,
      position,
      boundDeviceId: null,
      boundDeviceLabel: null,
      boundBrowser: null,
      boundAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    await this.repository.putGroup(group);
    this.syncToCloud('group', 'add', group);
    this.logger.debug('[GroupService] createGroup', { id: group.id });
    this.notify();
    return group;
  }

  async renameGroup(id: string, name: string): Promise<PageGroup> {
    const group = await this.requireLiveGroup(id);
    const next = GroupService.validateName(name);
    if (next === group.name) return group;
    const updated: PageGroup = { ...group, name: next, updatedAt: nowIso() };
    await this.repository.putGroup(updated);
    this.syncToCloud('group', 'update', updated);
    this.logger.debug('[GroupService] renameGroup', { id });
    this.notify();
    return updated;
  }

  async recolorGroup(id: string, color: GroupColor): Promise<PageGroup> {
    const group = await this.requireLiveGroup(id);
    const next = GroupService.validateColor(color);
    if (next === group.color) return group;
    const updated: PageGroup = { ...group, color: next, updatedAt: nowIso() };
    await this.repository.putGroup(updated);
    this.syncToCloud('group', 'update', updated);
    this.logger.debug('[GroupService] recolorGroup', { id });
    this.notify();
    return updated;
  }

  /** Soft-delete (tombstone) a group. Idempotent: already-deleted is a no-op. */
  async deleteGroup(id: string): Promise<PageGroup> {
    const group = await this.requireGroup(id);
    if (group.deletedAt !== null) return group;
    const updated: PageGroup = { ...group, deletedAt: nowIso(), updatedAt: nowIso() };
    await this.repository.putGroup(updated);
    this.syncToCloud('group', 'remove', updated);
    this.logger.debug('[GroupService] deleteGroup', { id });
    this.notify();
    return updated;
  }

  /** Undo for deleteGroup. Enforces the groups cap: the revived row goes live. */
  async restoreGroup(id: string): Promise<PageGroup> {
    const group = await this.requireGroup(id);
    if (group.deletedAt === null) return group;
    const liveCount = (await this.repository.listGroups()).length;
    if (liveCount >= GROUP_CAPS.groupsPerUser) {
      throw new GroupCapError('groups', GROUP_CAPS.groupsPerUser);
    }
    const updated: PageGroup = { ...group, deletedAt: null, updatedAt: nowIso() };
    await this.repository.putGroup(updated);
    this.syncToCloud('group', 'update', updated);
    this.logger.debug('[GroupService] restoreGroup', { id });
    this.notify();
    return updated;
  }

  /** Reorder a live group among live groups. No-op at the boundary. */
  async moveGroup(id: string, to: MoveDirection): Promise<PageGroup> {
    const group = await this.requireLiveGroup(id);
    const groups = (await this.repository.listGroups()).slice().sort(byPosition);
    const next = GroupService.reposition(groups, group.id, to);
    if (!next) return group;
    const updated: PageGroup = { ...group, position: next, updatedAt: nowIso() };
    await this.repository.putGroup(updated);
    this.syncToCloud('group', 'update', updated);
    this.logger.debug('[GroupService] moveGroup', { id });
    this.notify();
    return updated;
  }

  // ==================== Items ====================

  async addPage(groupId: string, input: AddPageInput): Promise<PageGroupItem> {
    const group = await this.requireLiveGroup(groupId);
    const key = GroupService.validatePageUrl(input.url);
    const title = GroupService.validateTitle(input.title ?? null);
    const faviconUrl = GroupService.validateFavicon(input.faviconUrl ?? null);
    const items = await this.repository.listItems(group.id, { includeDeleted: true });
    const live = items.filter((item) => item.deletedAt === null);

    const liveMatch = live.find(
      (item) => item.kind === 'page' && normalizePageUrl(item.urlNormalized) === key
    );
    if (liveMatch) return liveMatch;

    const tombstone = items.find(
      (item) =>
        item.kind === 'page' &&
        item.deletedAt !== null &&
        normalizePageUrl(item.urlNormalized) === key
    );
    if (tombstone && tombstone.kind === 'page') {
      this.assertPageCap(live);
      const revived: PageGroupItem = {
        ...tombstone,
        title,
        faviconUrl,
        deletedAt: null,
        updatedAt: nowIso(),
      };
      await this.repository.putItem(revived);
      this.syncToCloud('group_item', 'add', revived);
      this.logger.debug('[GroupService] addPage revive', { groupId: group.id, id: revived.id });
      this.notify();
      return revived;
    }

    this.assertPageCap(live);
    const now = nowIso();
    const sorted = live.slice().sort(byPosition);
    const last = sorted[sorted.length - 1];
    const item: PageGroupItem = {
      id: crypto.randomUUID(),
      kind: 'page',
      groupId: group.id,
      position: last ? positionBetween(last.position) : positionBetween(),
      urlNormalized: key,
      title,
      faviconUrl,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    await this.repository.putItem(item);
    this.syncToCloud('group_item', 'add', item);
    this.logger.debug('[GroupService] addPage', { groupId: group.id, id: item.id });
    this.notify();
    return item;
  }

  /** Domain rules never count toward the 500 page-item cap (PRD Data §2). */
  async addDomain(groupId: string, input: AddDomainInput): Promise<PageGroupItem> {
    const group = await this.requireLiveGroup(groupId);
    const hostname = GroupService.validateHostname(input.hostname);
    const includeSubdomains = input.includeSubdomains ?? false;
    const items = await this.repository.listItems(group.id, { includeDeleted: true });
    const live = items.filter((item) => item.deletedAt === null);

    const liveMatch = live.find(
      (item) => item.kind === 'domain' && item.hostname === hostname
    );
    if (liveMatch) return liveMatch;

    const tombstone = items.find(
      (item) => item.kind === 'domain' && item.deletedAt !== null && item.hostname === hostname
    );
    if (tombstone && tombstone.kind === 'domain') {
      const revived: PageGroupItem = {
        ...tombstone,
        includeSubdomains,
        deletedAt: null,
        updatedAt: nowIso(),
      };
      await this.repository.putItem(revived);
      this.syncToCloud('group_item', 'add', revived);
      this.logger.debug('[GroupService] addDomain revive', {
        groupId: group.id,
        id: revived.id,
      });
      this.notify();
      return revived;
    }

    const now = nowIso();
    const sorted = live.slice().sort(byPosition);
    const last = sorted[sorted.length - 1];
    const item: PageGroupItem = {
      id: crypto.randomUUID(),
      kind: 'domain',
      groupId: group.id,
      position: last ? positionBetween(last.position) : positionBetween(),
      hostname,
      includeSubdomains,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    await this.repository.putItem(item);
    this.syncToCloud('group_item', 'add', item);
    this.logger.debug('[GroupService] addDomain', { groupId: group.id, id: item.id });
    this.notify();
    return item;
  }

  /** Soft-delete (tombstone) an item. Idempotent: already-deleted is a no-op. */
  async removeItem(groupId: string, itemId: string): Promise<PageGroupItem> {
    await this.requireLiveGroup(groupId);
    const item = await this.requireItem(groupId, itemId);
    if (item.deletedAt !== null) return item;
    const updated: PageGroupItem = { ...item, deletedAt: nowIso(), updatedAt: nowIso() };
    await this.repository.putItem(updated);
    this.syncToCloud('group_item', 'remove', updated);
    this.logger.debug('[GroupService] removeItem', { groupId, id: itemId });
    this.notify();
    return updated;
  }

  /** Undo for removeItem. Page revives enforce the 500 page-item cap. */
  async restoreItem(groupId: string, itemId: string): Promise<PageGroupItem> {
    await this.requireLiveGroup(groupId);
    const item = await this.requireItem(groupId, itemId);
    if (item.deletedAt === null) return item;
    if (item.kind === 'page') {
      const live = (await this.repository.listItems(groupId)).filter(
        (candidate) => candidate.deletedAt === null
      );
      this.assertPageCap(live);
    }
    const updated: PageGroupItem = { ...item, deletedAt: null, updatedAt: nowIso() };
    await this.repository.putItem(updated);
    this.syncToCloud('group_item', 'update', updated);
    this.logger.debug('[GroupService] restoreItem', { groupId, id: itemId });
    this.notify();
    return updated;
  }

  /** Reorder a live item among its group's live items. No-op at the boundary. */
  async moveItem(groupId: string, itemId: string, to: MoveDirection): Promise<PageGroupItem> {
    await this.requireLiveGroup(groupId);
    const items = (await this.repository.listItems(groupId))
      .filter((item) => item.deletedAt === null)
      .sort(byPosition);
    const current = items.find((item) => item.id === itemId);
    if (!current) {
      throw new GroupNotFoundError(`Item not found: ${itemId}`);
    }
    const next = GroupService.reposition(items, itemId, to);
    if (!next) return current;
    const updated: PageGroupItem = { ...current, position: next, updatedAt: nowIso() };
    await this.repository.putItem(updated);
    this.syncToCloud('group_item', 'update', updated);
    this.logger.debug('[GroupService] moveItem', { groupId, id: itemId });
    this.notify();
    return updated;
  }

  // ==================== Internals ====================

  private notify(): void {
    notifyLibraryDataChanged({ source: 'groups' });
  }

  /**
   * Fire-and-forget cloud mirror of a local row write (DualWriteRepository
   * pattern). Skipped when sync is unwired or signed out. The echo is
   * recorded before the attempt so Task 2.3 ingest skips our own Realtime
   * echo. Cap violations (cloud-side GROUP_CAPS) are logged and NOT
   * enqueued — retrying them is futile; the local copy is kept.
   */
  private syncToCloud(
    entity: GroupCloudEntity,
    op: GroupCloudOp,
    row: PageGroup | PageGroupItem
  ): void {
    const sync = this.syncDeps;
    if (!sync || !sync.isAuthenticated()) {
      return;
    }
    sync.echoTracker.record(row.id, op);
    const task =
      entity === 'group'
        ? sync.cloudRepository.putGroup(row as PageGroup)
        : sync.cloudRepository.putItem(row as PageGroupItem);
    task.then(
      () => {
        this.logger.debug('[GroupService] cloud sync ok', { entity, id: row.id });
      },
      (error: unknown) => {
        if (isRawGroupCapFailure(error)) {
          this.logger.warn('[GroupService] cloud cap exceeded; local copy kept', {
            entity,
            id: row.id,
          });
          return;
        }
        this.logger.error(
          '[GroupService] cloud write failed; queueing for retry',
          error as Error,
          { entity, id: row.id }
        );
        try {
          const queued = sync.enqueueOperation(entity, op, row.id, row);
          if (queued instanceof Promise) {
            queued.catch((enqueueError: unknown) => {
              this.logger.error(
                '[GroupService] failed to enqueue group operation',
                enqueueError as Error,
                { entity, id: row.id }
              );
            });
          }
        } catch (enqueueError) {
          this.logger.error(
            '[GroupService] failed to enqueue group operation',
            enqueueError as Error,
            { entity, id: row.id }
          );
        }
      }
    );
  }

  private async requireGroup(id: string): Promise<PageGroup> {
    const group = await this.repository.getGroup(id);
    if (!group) throw new GroupNotFoundError(`Group not found: ${id}`);
    return group;
  }

  private async requireLiveGroup(id: string): Promise<PageGroup> {
    const group = await this.requireGroup(id);
    if (group.deletedAt !== null) {
      throw new GroupNotFoundError(`Group not found: ${id}`);
    }
    return group;
  }

  private async requireItem(groupId: string, itemId: string): Promise<PageGroupItem> {
    const items = await this.repository.listItems(groupId, { includeDeleted: true });
    const item = items.find((candidate) => candidate.id === itemId);
    if (!item) throw new GroupNotFoundError(`Item not found: ${itemId}`);
    return item;
  }

  private assertPageCap(liveItems: PageGroupItem[]): void {
    const pages = liveItems.filter(
      (item) => item.deletedAt === null && item.kind === 'page'
    ).length;
    if (pages >= GROUP_CAPS.itemsPerGroup) {
      throw new GroupCapError('items', GROUP_CAPS.itemsPerGroup);
    }
  }

  /**
   * Compute the fractional position for moving `id` within an already
   * position-sorted live row list. Returns null when the move is a no-op
   * (already at the boundary).
   */
  private static reposition<T extends { id: string; position: string }>(
    sorted: T[],
    id: string,
    to: MoveDirection
  ): string | null {
    const from = sorted.findIndex((row) => row.id === id);
    if (from < 0) return null;
    let target = from;
    if (to === 'top') target = 0;
    else if (to === 'up') target = from - 1;
    else target = from + 1;
    if (target < 0 || target >= sorted.length || target === from) return null;
    const without = sorted.filter((row) => row.id !== id);
    const lo = target > 0 ? without[target - 1]!.position : null;
    const hi = target < without.length ? without[target]!.position : null;
    return positionBetween(lo ?? undefined, hi ?? undefined);
  }

  private static validateName(name: string): string {
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 80) {
      throw new GroupValidationError('Group name must be 1..80 characters');
    }
    return trimmed;
  }

  private static validateColor(color: GroupColor): GroupColor {
    if (typeof color !== 'string' || !(GROUP_COLORS as readonly string[]).includes(color)) {
      throw new GroupValidationError(
        `Group color must be one of: ${GROUP_COLORS.join(', ')}`
      );
    }
    return color;
  }

  private static validatePageUrl(url: string): string {
    if (typeof url !== 'string' || !isSyncableTabUrl(url, false)) {
      throw new GroupValidationError('Only http(s) page URLs can be added to a group');
    }
    const normalized = normalizePageUrl(url);
    if (!/^https?:\/\//i.test(normalized) || normalized.length > 2048) {
      throw new GroupValidationError('Only http(s) page URLs can be added to a group');
    }
    return normalized;
  }

  private static validateHostname(hostname: string): string {
    const cleaned =
      typeof hostname === 'string' ? hostname.trim().toLowerCase().replace(/\.+$/, '') : '';
    if (
      !cleaned ||
      cleaned.length > 255 ||
      /\s/.test(cleaned) ||
      cleaned.includes('/') ||
      cleaned.includes('://')
    ) {
      throw new GroupValidationError('Domain must be a plain hostname (e.g. example.com)');
    }
    return cleaned;
  }

  private static validateTitle(title: string | null): string | null {
    if (title === null) return null;
    if (typeof title !== 'string' || title.length > 500) {
      throw new GroupValidationError('Title too long (max 500 chars)');
    }
    return title;
  }

  private static validateFavicon(faviconUrl: string | null): string | null {
    if (faviconUrl === null) return null;
    if (
      typeof faviconUrl !== 'string' ||
      faviconUrl.length > 2048 ||
      !/^https?:\/\//i.test(faviconUrl)
    ) {
      throw new GroupValidationError('Favicon must be an http(s) URL of max 2048 chars');
    }
    return faviconUrl;
  }
}
