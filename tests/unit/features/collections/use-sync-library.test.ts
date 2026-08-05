import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  formatLastSyncedAt,
  formatSyncSubtitle,
} from '@/features/collections/hooks/use-sync-library';

describe('formatSyncSubtitle', () => {
  it('describes added and up-to-date counts', () => {
    expect(
      formatSyncSubtitle({
        localCountBefore: 1,
        cloudCount: 4,
        backfilledCount: 3,
        updatedCount: 1,
        deletedCount: 0,
        skippedCount: 1,
        failedCount: 0,
      })
    ).toBe('3 added · 1 updated · 1 up to date');
  });

  it('reports when library already matches cloud', () => {
    expect(
      formatSyncSubtitle({
        localCountBefore: 2,
        cloudCount: 2,
        backfilledCount: 0,
        updatedCount: 0,
        deletedCount: 0,
        skippedCount: 2,
        failedCount: 0,
      })
    ).toBe('2 up to date');
  });
});

describe('formatLastSyncedAt', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-05T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports never synced when missing', () => {
    expect(formatLastSyncedAt(null)).toBe('Never synced');
    expect(formatLastSyncedAt(undefined)).toBe('Never synced');
  });

  it('formats relative minutes', () => {
    expect(formatLastSyncedAt('2026-08-05T11:45:00.000Z')).toBe('15m ago');
  });

  it('formats just now', () => {
    expect(formatLastSyncedAt('2026-08-05T11:59:30.000Z')).toBe('Just now');
  });
});
