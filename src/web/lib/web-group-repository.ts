/**
 * @file web-group-repository.ts
 * @description Supabase-backed {@link WebGroupRepository} for the web SPA
 * (plan Phase 2 Task 2.5, ADR-032 §8).
 *
 * Wraps the shared web Supabase client (`getWebSupabaseClient`) with the same
 * command set as `GroupService` (create/rename/recolor/delete/restore for
 * groups; addPage/addDomain/remove/restore/move for items; move for groups).
 * Owner scoping is via `user_id = session.user.id` (RLS `auth.uid()`); rows
 * are soft-deleted (`deleted_at`), never hard-deleted. Ordering uses the
 * fractional `position` text column.
 *
 * Input validation/normalization stays in `useWebGroups` (hook owns it per
 * the 1.9 contract); this class re-guards the thin invariants it needs.
 *
 * Web-only: no `chrome.*` access anywhere in this file.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { getWebSupabaseClient } from '@/shared/auth/supabase-web-client';
import {
  GROUP_CAPS,
  GROUP_COLORS,
  type GroupColor,
  type PageGroup,
  type PageGroupItem,
} from '@/shared/types/page-group';
import { positionBetween } from '@/shared/utils/fractional-position';
import {
  transformGroupItemRow,
  transformGroupRow,
  type SupabaseGroupItemRow,
  type SupabaseGroupRow,
} from '@/shared/utils/supabase-group-row';
import type { WebGroupRepository } from '@/web/hooks/useWebGroups';

function nowIso(): string {
  return new Date().toISOString();
}

function byPosition<T extends { position: string }>(a: T, b: T): number {
  return a.position < b.position ? -1 : a.position > b.position ? 1 : 0;
}

function validateName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 80) {
    throw new Error('Name must be 1–80 characters.');
  }
  return trimmed;
}

function validateColor(color: GroupColor): GroupColor {
  if (typeof color !== 'string' || !(GROUP_COLORS as readonly string[]).includes(color)) {
    throw new Error(`Group color must be one of: ${GROUP_COLORS.join(', ')}`);
  }
  return color;
}

function validatePageUrl(urlNormalized: string): string {
  if (typeof urlNormalized !== 'string' || !/^https?:\/\//i.test(urlNormalized)) {
    throw new Error('Only http and https URLs can be added.');
  }
  return urlNormalized;
}

function validateHostname(hostname: string): string {
  const cleaned =
    typeof hostname === 'string' ? hostname.trim().toLowerCase().replace(/\.+$/, '') : '';
  if (!cleaned || cleaned.length > 255 || /\s/.test(cleaned) || cleaned.includes('/')) {
    throw new Error('Enter a valid domain name.');
  }
  return cleaned;
}

interface PageGroupRow extends SupabaseGroupRow {
  // Same shape; alias kept so to-row/from-row read symmetrically.
}

interface PageGroupItemRow extends SupabaseGroupItemRow {
  // Same shape; alias kept so to-row/from-row read symmetrically.
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

/**
 * Compute the fractional position for moving `id` within an already
 * position-sorted live row list. Returns null when the move is a no-op
 * (already at the boundary). Mirrors `GroupService.reposition`.
 */
function reposition<T extends { id: string; position: string }>(
  sorted: T[],
  id: string,
  to: 'top' | 'up' | 'down'
): string | null {
  const from = sorted.findIndex((row) => row.id === id);
  if (from < 0) return null;
  let target = from;
  if (to === 'top') target = 0;
  else if (to === 'up') target = from - 1;
  else target = from + 1;
  if (target < 0 || target >= sorted.length || target === from) return null;
  const without = sorted.filter((row) => row.id !== id);
  const lo = target > 0 ? without[target - 1]?.position ?? null : null;
  const hi = target < without.length ? without[target]?.position ?? null : null;
  return positionBetween(lo ?? undefined, hi ?? undefined);
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `wg-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export class WebSupabaseGroupRepository implements WebGroupRepository {
  constructor(private readonly client: SupabaseClient = getWebSupabaseClient()) {}

  private async getUserId(): Promise<string | null> {
    try {
      const { data, error } = await this.client.auth.getSession();
      if (error) return null;
      return data.session?.user.id ?? null;
    } catch {
      return null;
    }
  }

  private async requireUserId(): Promise<string> {
    const userId = await this.getUserId();
    if (!userId) throw new Error('Sign in to manage groups.');
    return userId;
  }

  /**
   * Documented `any` escape hatch (CLAUDE.md): the generated Database types
   * predate `page_groups`, so table access goes through the untyped SDK
   * surface (same pattern as `SupabaseGroupRepository`). Rows are
   * re-narrowed by the mappers above.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private table(name: 'page_groups' | 'page_group_items'): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.client as any).from(name);
  }

  async listGroups(): Promise<PageGroup[]> {
    const userId = await this.getUserId();
    if (!userId) return [];
    const { data, error } = await this.table('page_groups')
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true });
    if (error) throw error;
    return ((data ?? []) as SupabaseGroupRow[])
      .map(transformGroupRow)
      .filter((g) => g.deletedAt === null)
      .sort(byPosition);
  }

  async listItems(groupId: string): Promise<PageGroupItem[]> {
    const userId = await this.getUserId();
    if (!userId) return [];
    const { data, error } = await this.table('page_group_items')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .order('position', { ascending: true });
    if (error) throw error;
    return ((data ?? []) as SupabaseGroupItemRow[])
      .map(transformGroupItemRow)
      .filter((i) => i.deletedAt === null)
      .sort(byPosition);
  }

  async createGroup(input: { name: string; color: GroupColor }): Promise<PageGroup> {
    const name = validateName(input.name);
    const color = validateColor(input.color);
    const userId = await this.requireUserId();
    const existing = await this.listGroups();
    if (existing.length >= GROUP_CAPS.groupsPerUser) {
      throw new Error(`Group limit reached (${GROUP_CAPS.groupsPerUser} groups per user)`);
    }
    const last = existing[existing.length - 1];
    const now = nowIso();
    const group: PageGroup = {
      id: newId(),
      name,
      color,
      position: last ? positionBetween(last.position) : positionBetween(),
      boundDeviceId: null,
      boundDeviceLabel: null,
      boundBrowser: null,
      boundAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    const { error } = await this.table('page_groups').upsert(toGroupRow(group, userId), {
      onConflict: 'id',
    });
    if (error) throw error;
    return group;
  }

  async renameGroup(id: string, name: string): Promise<void> {
    const next = validateName(name);
    const userId = await this.requireUserId();
    const { error } = await this.table('page_groups')
      .update({ name: next, updated_at: nowIso() })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
  }

  async recolorGroup(id: string, color: GroupColor): Promise<void> {
    const next = validateColor(color);
    const userId = await this.requireUserId();
    const { error } = await this.table('page_groups')
      .update({ color: next, updated_at: nowIso() })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
  }

  async deleteGroup(id: string): Promise<void> {
    const userId = await this.requireUserId();
    const now = nowIso();
    const { error } = await this.table('page_groups')
      .update({ deleted_at: now, updated_at: now })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
  }

  async restoreGroup(id: string): Promise<void> {
    const userId = await this.requireUserId();
    const live = await this.listGroups();
    if (live.length >= GROUP_CAPS.groupsPerUser) {
      throw new Error(`Group limit reached (${GROUP_CAPS.groupsPerUser} groups per user)`);
    }
    const { error } = await this.table('page_groups')
      .update({ deleted_at: null, updated_at: nowIso() })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
  }

  async moveGroup(id: string, to: 'top' | 'up' | 'down'): Promise<void> {
    const userId = await this.requireUserId();
    const groups = await this.listGroups();
    const next = reposition(groups, id, to);
    if (!next) return;
    const { error } = await this.table('page_groups')
      .update({ position: next, updated_at: nowIso() })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
  }

  async addPage(groupId: string, urlNormalized: string): Promise<PageGroupItem> {
    const key = validatePageUrl(urlNormalized);
    const userId = await this.requireUserId();
    const live = await this.listItems(groupId);
    const pages = live.filter((i) => i.kind === 'page').length;
    if (pages >= GROUP_CAPS.itemsPerGroup) {
      throw new Error(
        `Group item limit reached (${GROUP_CAPS.itemsPerGroup} page items per group)`
      );
    }
    const sorted = live.slice().sort(byPosition);
    const last = sorted[sorted.length - 1];
    const now = nowIso();
    const item: PageGroupItem = {
      id: newId(),
      kind: 'page',
      groupId,
      position: last ? positionBetween(last.position) : positionBetween(),
      urlNormalized: key,
      title: null,
      faviconUrl: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    const { error } = await this.table('page_group_items').upsert(toItemRow(item, userId), {
      onConflict: 'id',
    });
    if (error) throw error;
    return item;
  }

  async addDomain(
    groupId: string,
    hostname: string,
    includeSubdomains: boolean
  ): Promise<PageGroupItem> {
    const host = validateHostname(hostname);
    const userId = await this.requireUserId();
    const live = await this.listItems(groupId);
    const sorted = live.slice().sort(byPosition);
    const last = sorted[sorted.length - 1];
    const now = nowIso();
    const item: PageGroupItem = {
      id: newId(),
      kind: 'domain',
      groupId,
      position: last ? positionBetween(last.position) : positionBetween(),
      hostname: host,
      includeSubdomains,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    const { error } = await this.table('page_group_items').upsert(toItemRow(item, userId), {
      onConflict: 'id',
    });
    if (error) throw error;
    return item;
  }

  async removeItem(groupId: string, itemId: string): Promise<void> {
    const userId = await this.requireUserId();
    const now = nowIso();
    const { error } = await this.table('page_group_items')
      .update({ deleted_at: now, updated_at: now })
      .eq('id', itemId)
      .eq('group_id', groupId)
      .eq('user_id', userId);
    if (error) throw error;
  }

  async restoreItem(groupId: string, itemId: string): Promise<void> {
    const userId = await this.requireUserId();
    const { data, error: fetchError } = await this.table('page_group_items')
      .select('*')
      .eq('id', itemId)
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!data) throw new Error('Item not found.');
    const row = data as SupabaseGroupItemRow;
    if (row.kind === 'page') {
      const live = await this.listItems(groupId);
      const pages = live.filter((i) => i.kind === 'page').length;
      if (pages >= GROUP_CAPS.itemsPerGroup) {
        throw new Error(
          `Group item limit reached (${GROUP_CAPS.itemsPerGroup} page items per group)`
        );
      }
    }
    const { error } = await this.table('page_group_items')
      .update({ deleted_at: null, updated_at: nowIso() })
      .eq('id', itemId)
      .eq('group_id', groupId)
      .eq('user_id', userId);
    if (error) throw error;
  }

  async moveItem(
    groupId: string,
    itemId: string,
    to: 'top' | 'up' | 'down'
  ): Promise<void> {
    const userId = await this.requireUserId();
    const items = await this.listItems(groupId);
    const next = reposition(items, itemId, to);
    if (!next) return;
    const { error } = await this.table('page_group_items')
      .update({ position: next, updated_at: nowIso() })
      .eq('id', itemId)
      .eq('group_id', groupId)
      .eq('user_id', userId);
    if (error) throw error;
  }
}

/** Production factory for the web Library (memoize per mount). */
export function createWebGroupRepository(
  client?: SupabaseClient
): WebSupabaseGroupRepository {
  return new WebSupabaseGroupRepository(client ?? getWebSupabaseClient());
}
