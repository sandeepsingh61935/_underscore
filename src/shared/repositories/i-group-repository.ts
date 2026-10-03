/**
 * @file i-group-repository.ts
 * @description Repository contract for Page Groups (ADR-032 §1, §8).
 *
 * Local IndexedDB and Supabase adapters implement this union contract.
 * Rows are soft-deletable (`deletedAt`); list* accessors exclude tombstones
 * by default. Permanent purge is via `purgeTombstones`.
 */

import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';

export interface IGroupRepository {
  /** All groups, ordered by `position`. Excludes tombstones unless requested. */
  listGroups(opts?: { includeDeleted?: boolean }): Promise<PageGroup[]>;

  /** Single group by id, or null when missing. Returns tombstones as-is. */
  getGroup(id: string): Promise<PageGroup | null>;

  /** Items of one group, ordered by `position`. Excludes tombstones unless requested. */
  listItems(groupId: string, opts?: { includeDeleted?: boolean }): Promise<PageGroupItem[]>;

  /** All non-deleted items across groups, ordered by `position`. */
  listAllItems(): Promise<PageGroupItem[]>;

  /** Upsert a group row (create, rename, recolor, reorder, soft-delete). */
  putGroup(group: PageGroup): Promise<void>;

  /** Upsert an item row (add, reorder, soft-delete). */
  putItem(item: PageGroupItem): Promise<void>;

  /**
   * Permanently delete tombstoned rows (`deletedAt` older than `olderThan`)
   * from both stores. Returns the number of rows purged.
   */
  purgeTombstones(olderThan: Date): Promise<number>;
}
