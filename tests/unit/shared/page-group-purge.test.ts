/**
 * @file page-group-purge.test.ts
 * @description Task 2.4: policy-decision tests for the 30-day tombstone
 * retention rule. Binding cases: 29-day tombstone is NOT purgeable, 31-day
 * tombstone IS, live rows NEVER are.
 */

import { describe, expect, it } from 'vitest';

import {
  isPurgeable,
  PAGE_GROUP_TOMBSTONE_RETENTION_MS,
  tombstonePurgeCutoff,
} from '@/shared/utils/page-group-purge';

const NOW = new Date('2026-09-28T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number): string =>
  new Date(NOW.getTime() - days * DAY_MS).toISOString();

describe('isPurgeable', () => {
  it('returns false for a tombstone soft-deleted 29 days ago', () => {
    expect(isPurgeable(daysAgo(29), NOW)).toBe(false);
  });

  it('returns true for a tombstone soft-deleted 31 days ago', () => {
    expect(isPurgeable(daysAgo(31), NOW)).toBe(true);
  });

  it('never purges live rows (deletedAt null)', () => {
    expect(isPurgeable(null, NOW)).toBe(false);
  });

  it('retains a tombstone soft-deleted exactly 30 days ago (strict <)', () => {
    expect(isPurgeable(daysAgo(30), NOW)).toBe(false);
  });

  it('returns false for unparseable deletedAt rather than risk a live row', () => {
    expect(isPurgeable('not-a-timestamp', NOW)).toBe(false);
  });

  it('returns false for a future deletedAt', () => {
    expect(isPurgeable(new Date(NOW.getTime() + DAY_MS).toISOString(), NOW)).toBe(false);
  });
});

describe('tombstonePurgeCutoff', () => {
  it('is exactly now minus the 30-day retention window', () => {
    expect(tombstonePurgeCutoff(NOW).getTime()).toBe(
      NOW.getTime() - PAGE_GROUP_TOMBSTONE_RETENTION_MS
    );
  });

  it('agrees with isPurgeable at the boundary', () => {
    const cutoff = tombstonePurgeCutoff(NOW);
    expect(isPurgeable(daysAgo(31), NOW)).toBe(true);
    expect(Date.parse(daysAgo(31)) < cutoff.getTime()).toBe(true);
    expect(Date.parse(daysAgo(29)) < cutoff.getTime()).toBe(false);
  });
});
