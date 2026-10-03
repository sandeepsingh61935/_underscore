/**
 * @file supabase-group-row.ts
 * @description Snake_case Supabase row shapes for `page_groups` /
 * `page_group_items` and their domain mappers (plan Phase 2 Task 2.3).
 *
 * Mirrors `supabase-highlight-row.ts`: the websocket client passes raw rows
 * through the EventBus and the group ingest service maps them to the
 * PageGroup / PageGroupItem domain shapes.
 */

import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';

export interface SupabaseGroupRow {
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

export interface SupabaseGroupItemRow {
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

/** True when a realtime UPDATE row carries a tombstone. */
export function isGroupRowSoftDeleted(row: {
  deleted_at?: string | null;
}): boolean {
  return row?.deleted_at != null;
}

export function transformGroupRow(row: SupabaseGroupRow): PageGroup {
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

export function transformGroupItemRow(row: SupabaseGroupItemRow): PageGroupItem {
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
