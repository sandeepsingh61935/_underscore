/**
 * @file page-group-merge.ts
 * @description Row-level conflict resolution for Page Groups sync (ADR-032 §8).
 *
 * Last-write-wins on `updatedAt`. A tombstone (`deletedAt` set) beats a
 * concurrent (equal-timestamp) update; otherwise equal timestamps favor the
 * remote row so concurrent writers converge deterministically.
 */

export interface MergeableRow {
  updatedAt: string;
  deletedAt: string | null;
}

function timestampOf(value: string): number {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

/**
 * Return the winning row without mutating either input.
 */
export function mergeRow<T extends MergeableRow>(local: T, remote: T): T {
  const localTime = timestampOf(local.updatedAt);
  const remoteTime = timestampOf(remote.updatedAt);
  if (remoteTime !== localTime) {
    return remoteTime > localTime ? remote : local;
  }
  const localTombstone = local.deletedAt !== null;
  const remoteTombstone = remote.deletedAt !== null;
  if (localTombstone !== remoteTombstone) {
    return remoteTombstone ? remote : local;
  }
  return remote;
}
