import { describe, it, expect } from 'vitest';

import { formatSyncSubtitle } from '@/features/collections/hooks/use-sync-library';

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
