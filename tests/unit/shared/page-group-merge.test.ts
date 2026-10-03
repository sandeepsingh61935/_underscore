import { describe, expect, it } from 'vitest';

import { mergeRow } from '@/shared/utils/page-group-merge';

interface Row {
  id: string;
  updatedAt: string;
  deletedAt: string | null;
}

function row(overrides: Partial<Row> = {}): Row {
  return {
    id: 'g1',
    updatedAt: '2026-09-28T10:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

describe('mergeRow', () => {
  it('applies last-write-wins on updatedAt', () => {
    const local = row({ updatedAt: '2026-09-28T10:00:00.000Z' });
    const remote = row({ updatedAt: '2026-09-28T11:00:00.000Z' });
    expect(mergeRow(local, remote)).toBe(remote);
    expect(mergeRow(remote, local)).toBe(remote);
  });

  it('lets a tombstone beat a concurrent (equal-timestamp) update', () => {
    const updated = row({ updatedAt: '2026-09-28T10:00:00.000Z', deletedAt: null });
    const tombstone = row({ updatedAt: '2026-09-28T10:00:00.000Z', deletedAt: '2026-09-28T10:00:00.000Z' });
    expect(mergeRow(updated, tombstone)).toBe(tombstone);
    expect(mergeRow(tombstone, updated)).toBe(tombstone);
  });

  it('favors remote on equal timestamps without a tombstone', () => {
    const local = row({ updatedAt: '2026-09-28T10:00:00.000Z' });
    const remote = row({ updatedAt: '2026-09-28T10:00:00.000Z' });
    expect(mergeRow(local, remote)).toBe(remote);
  });

  it('lets a strictly newer tombstone win and an older tombstone lose', () => {
    const live = row({ updatedAt: '2026-09-28T12:00:00.000Z', deletedAt: null });
    const newerTombstone = row({ updatedAt: '2026-09-28T13:00:00.000Z', deletedAt: '2026-09-28T13:00:00.000Z' });
    const olderTombstone = row({ updatedAt: '2026-09-28T09:00:00.000Z', deletedAt: '2026-09-28T09:00:00.000Z' });
    expect(mergeRow(live, newerTombstone)).toBe(newerTombstone);
    expect(mergeRow(live, olderTombstone)).toBe(live);
  });
});
