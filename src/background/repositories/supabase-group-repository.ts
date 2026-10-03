/**
 * @file supabase-group-repository.ts
 * @description Cloud implementation of IGroupRepository via Supabase tables
 * `page_groups` / `page_group_items` (plan Phase 2 Task 2.2, ADR-032 §8).
 *
 * Mirrors SupabaseTagRepository: owner-scoped through `authManager.currentUser`
 * (RLS `user_id = auth.uid()`), snake_case rows mapped to the PageGroup /
 * PageGroupItem domain shapes. Postgres `group_cap_exceeded` (SQLSTATE P0001
 * from the Task 2.1 cap triggers) is mapped to the typed `GroupCapError` so
 * GroupService can skip the offline queue for cap violations; all other
 * cloud errors are rethrown unchanged.
 *
 * No `{ data, error, meta }` envelope here: this class implements the shared
 * `IGroupRepository` contract (void/list returns), which predates the envelope
 * rule for new API surfaces.
 */

import type { SupabaseClient } from '@/background/api/supabase-client';
import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import { GroupCapError } from '@/background/services/group-service';
import type { IGroupRepository } from '@/shared/repositories/i-group-repository';
import {
  GROUP_CAPS,
  type PageGroup,
  type PageGroupItem,
} from '@/shared/types/page-group';
import type { ILogger } from '@/shared/utils/logger';

type GroupTable = 'page_groups' | 'page_group_items';

interface CloudError {
  code?: string;
  message?: string;
}

/**
 * True when a cloud failure is the Task 2.1 cap trigger (SQLSTATE P0001,
 * message `group_cap_exceeded`). Exported so GroupService can apply the same
 * mapping to failures from any IGroupRepository cloud adapter.
 */
export function isGroupCapFailure(error: unknown): boolean {
  if (error instanceof GroupCapError) return true;
  if (!error || typeof error !== 'object') return false;
  const record = error as Partial<CloudError>;
  return (
    record.code === 'P0001' ||
    (typeof record.message === 'string' && record.message.includes('group_cap_exceeded'))
  );
}

function toGroupCapError(table: GroupTable): GroupCapError {
  return table === 'page_groups'
    ? new GroupCapError('groups', GROUP_CAPS.groupsPerUser)
    : new GroupCapError('items', GROUP_CAPS.itemsPerGroup);
}

interface PageGroupRow {
  id: string;
  user_id: string;
  name: string;
  color: string;
  position: string;
  bound_device_id: string | null;
  bound_device_label: string | null;
  bound_browser: string | null;
  bound_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface PageGroupItemRow {
  id: string;
  group_id: string;
  user_id: string;
  kind: string;
  url_normalized: string | null;
  hostname: string | null;
  include_subdomains: boolean;
  title: string | null;
  favicon_url: string | null;
  position: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function toGroup(row: PageGroupRow): PageGroup {
  return {
    id: row.id,
    name: row.name,
    color: row.color as PageGroup['color'],
    position: row.position,
    boundDeviceId: row.bound_device_id,
    boundDeviceLabel: row.bound_device_label,
    boundBrowser: row.bound_browser as PageGroup['boundBrowser'],
    boundAt: row.bound_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function toGroupRow(group: PageGroup, userId: string): PageGroupRow {
  return {
    id: group.id,
    user_id: userId,
    name: group.name,
    color: group.color,
    position: group.position,
    bound_device_id: group.boundDeviceId,
    bound_device_label: group.boundDeviceLabel,
    bound_browser: group.boundBrowser,
    bound_at: group.boundAt,
    created_at: group.createdAt,
    updated_at: group.updatedAt,
    deleted_at: group.deletedAt,
  };
}

function toItem(row: PageGroupItemRow): PageGroupItem {
  const base = {
    id: row.id,
    groupId: row.group_id,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
  if (row.kind === 'domain') {
    return {
      ...base,
      kind: 'domain',
      hostname: row.hostname ?? '',
      includeSubdomains: row.include_subdomains,
    };
  }
  return {
    ...base,
    kind: 'page',
    urlNormalized: row.url_normalized ?? '',
    title: row.title,
    faviconUrl: row.favicon_url,
  };
}

function toItemRow(item: PageGroupItem, userId: string): PageGroupItemRow {
  return {
    id: item.id,
    group_id: item.groupId,
    user_id: userId,
    kind: item.kind,
    url_normalized: item.kind === 'page' ? item.urlNormalized : null,
    hostname: item.kind === 'domain' ? item.hostname : null,
    include_subdomains: item.kind === 'domain' ? item.includeSubdomains : false,
    title: item.kind === 'page' ? item.title : null,
    favicon_url: item.kind === 'page' ? item.faviconUrl : null,
    position: item.position,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
    deleted_at: item.deletedAt,
  };
}

function byPosition<T extends { position: string }>(a: T, b: T): number {
  return a.position < b.position ? -1 : a.position > b.position ? 1 : 0;
}

export class SupabaseGroupRepository implements IGroupRepository {
  constructor(
    private readonly supabaseClient: SupabaseClient,
    private readonly authManager: IAuthManager,
    private readonly logger: ILogger
  ) {}

  private getUserId(): string | null {
    return this.authManager.currentUser?.id ?? null;
  }

  /**
   * Documented `any` escape hatch (CLAUDE.md): the generated Database types
   * predate `page_groups`, so table access goes through the untyped SDK
   * surface. Row shapes are re-narrowed by the mappers above.
   */
  private table(name: GroupTable): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.supabaseClient.supabase as any).from(name);
  }

  private throwMapped(table: GroupTable, error: unknown): never {
    if (isGroupCapFailure(error)) {
      throw toGroupCapError(table);
    }
    throw error;
  }

  async listGroups(opts?: { includeDeleted?: boolean }): Promise<PageGroup[]> {
    const userId = this.getUserId();
    if (!userId) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error }: { data: any; error: CloudError | null } = await this.table(
      'page_groups'
    )
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true });
    if (error) {
      this.logger.error('[SupabaseGroupRepo] listGroups failed', error as Error);
      this.throwMapped('page_groups', error);
    }
    const rows = ((data ?? []) as PageGroupRow[]).map(toGroup);
    return (opts?.includeDeleted ? rows : rows.filter((g) => g.deletedAt === null)).sort(
      byPosition
    );
  }

  async getGroup(id: string): Promise<PageGroup | null> {
    const userId = this.getUserId();
    if (!userId) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error }: { data: any; error: CloudError | null } = await this.table(
      'page_groups'
    )
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      this.logger.error('[SupabaseGroupRepo] getGroup failed', error as Error);
      this.throwMapped('page_groups', error);
    }
    return data ? toGroup(data as PageGroupRow) : null;
  }

  async listItems(
    groupId: string,
    opts?: { includeDeleted?: boolean }
  ): Promise<PageGroupItem[]> {
    const userId = this.getUserId();
    if (!userId) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error }: { data: any; error: CloudError | null } = await this.table(
      'page_group_items'
    )
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .order('position', { ascending: true });
    if (error) {
      this.logger.error('[SupabaseGroupRepo] listItems failed', error as Error);
      this.throwMapped('page_group_items', error);
    }
    const rows = ((data ?? []) as PageGroupItemRow[]).map(toItem);
    return (opts?.includeDeleted ? rows : rows.filter((i) => i.deletedAt === null)).sort(
      byPosition
    );
  }

  async listAllItems(): Promise<PageGroupItem[]> {    const userId = this.getUserId();
    if (!userId) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error }: { data: any; error: CloudError | null } = await this.table(
      'page_group_items'
    )
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true });
    if (error) {
      this.logger.error('[SupabaseGroupRepo] listAllItems failed', error as Error);
      this.throwMapped('page_group_items', error);
    }
    return ((data ?? []) as PageGroupItemRow[])
      .map(toItem)
      .filter((i) => i.deletedAt === null)
      .sort(byPosition);
  }

  /**
   * Incremental pull for Task 2.3 hydration: rows with
   * `updated_at >= since`, tombstones included (no `deleted_at` filter).
   * The caller separates live rows from tombstones via `deletedAt`.
   */
  async findChangedGroupsSince(since: Date | null): Promise<PageGroup[]> {
    const userId = this.getUserId();
    if (!userId) return [];
    let query = this.table('page_groups')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: true });
    if (since) {
      query = query.gte('updated_at', since.toISOString());
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error }: { data: any; error: CloudError | null } = await query;
    if (error) {
      this.logger.error('[SupabaseGroupRepo] findChangedGroupsSince failed', error as Error);
      this.throwMapped('page_groups', error);
    }
    return ((data ?? []) as PageGroupRow[]).map(toGroup);
  }

  /**
   * Incremental pull for Task 2.3 hydration: rows with
   * `updated_at >= since`, tombstones included (no `deleted_at` filter).
   */
  async findChangedItemsSince(since: Date | null): Promise<PageGroupItem[]> {
    const userId = this.getUserId();
    if (!userId) return [];
    let query = this.table('page_group_items')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: true });
    if (since) {
      query = query.gte('updated_at', since.toISOString());
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error }: { data: any; error: CloudError | null } = await query;
    if (error) {
      this.logger.error('[SupabaseGroupRepo] findChangedItemsSince failed', error as Error);
      this.throwMapped('page_group_items', error);
    }
    return ((data ?? []) as PageGroupItemRow[]).map(toItem);
  }

  async putGroup(group: PageGroup): Promise<void> {    const userId = this.getUserId();
    if (!userId) throw new Error('Not authenticated');
    const { error }: { error: CloudError | null } = await this.table(
      'page_groups'
    ).upsert(toGroupRow(group, userId), { onConflict: 'id' });
    if (error) {
      this.logger.error('[SupabaseGroupRepo] putGroup failed', error as Error);
      this.throwMapped('page_groups', error);
    }
    this.logger.debug('[SupabaseGroupRepo] putGroup', { id: group.id });
  }

  async putItem(item: PageGroupItem): Promise<void> {
    const userId = this.getUserId();
    if (!userId) throw new Error('Not authenticated');
    const { error }: { error: CloudError | null } = await this.table(
      'page_group_items'
    ).upsert(toItemRow(item, userId), { onConflict: 'id' });
    if (error) {
      this.logger.error('[SupabaseGroupRepo] putItem failed', error as Error);
      this.throwMapped('page_group_items', error);
    }
    this.logger.debug('[SupabaseGroupRepo] putItem', { id: item.id });
  }

  /**
   * Task 2.4 client-fallback purge: batch-delete the caller's own expired
   * tombstones after hydration. The query predicate mirrors the
   * `20260928120300_page_groups_delete_policy.sql` DELETE policy exactly
   * (own rows + `deleted_at IS NOT NULL` + strict `< now() - 30 days`), so
   * RLS authorizes precisely what this deletes; 29-day tombstones and live
   * rows are rejected server-side even if this client predicate regressed.
   * Items first, then groups (group delete would cascade to items anyway).
   */
  async purgeTombstones(olderThan: Date): Promise<number> {
    const userId = this.getUserId();
    if (!userId) return 0;
    const cutoff = olderThan.toISOString();
    let purged = 0;
    for (const table of ['page_group_items', 'page_groups'] as const) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error }: { data: any; error: CloudError | null } = await this.table(
        table
      )
        .delete()
        .eq('user_id', userId)
        .not('deleted_at', 'is', null)
        .lt('deleted_at', cutoff)
        .select('id');
      if (error) {
        this.logger.error('[SupabaseGroupRepo] purgeTombstones failed', error as Error);
        this.throwMapped(table, error);
      }
      purged += Array.isArray(data) ? data.length : 0;
    }
    this.logger.debug('[SupabaseGroupRepo] purgeTombstones', { purged });
    return purged;
  }
}
