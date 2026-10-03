/**
 * @file page-group-purge.ts
 * @description Tombstone retention policy for Page Groups (ADR-032 §8,
 * plan Phase 2 Task 2.4).
 *
 * Tombstones (`deletedAt` set) are hard-deleted once older than 30 days.
 * This module is the single policy-decision point shared by the local
 * IndexedDB purge, the Supabase client-fallback purge, and the
 * `20260928120300_page_groups_delete_policy.sql` DELETE policy — all three
 * use strict `<` against `now() - 30 days`, so a row soft-deleted exactly
 * 30 days ago is retained and only strictly-older rows are purged.
 */

/** Retention window for soft-deleted Page Groups rows (30 days in ms). */
export const PAGE_GROUP_TOMBSTONE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Cutoff instant: tombstones with `deletedAt` strictly before this are
 * eligible for hard deletion.
 */
export function tombstonePurgeCutoff(now: Date | number): Date {
  const nowMs = now instanceof Date ? now.getTime() : now;
  return new Date(nowMs - PAGE_GROUP_TOMBSTONE_RETENTION_MS);
}

/**
 * Pure policy decision mirroring the SQL DELETE policy
 * (`deleted_at IS NOT NULL AND deleted_at < now() - interval '30 days'`).
 *
 * Returns false for live rows (`deletedAt === null`) and for unparseable
 * timestamps — purging must never delete a row it cannot prove is expired.
 */
export function isPurgeable(deletedAt: string | null, now: Date | number): boolean {
  if (deletedAt === null) return false;
  const deletedMs = Date.parse(deletedAt);
  if (Number.isNaN(deletedMs)) return false;
  const nowMs = now instanceof Date ? now.getTime() : now;
  return deletedMs < nowMs - PAGE_GROUP_TOMBSTONE_RETENTION_MS;
}
