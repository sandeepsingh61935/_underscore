/**
 * @file supabase-group-repository-purge.test.ts
 * @description Task 2.4: repository integration test for the client-fallback
 * cloud purge. A fake Supabase query builder applies the filters the repo
 * sends (`user_id` eq + `deleted_at` not-null + `deleted_at < cutoff`) to
 * seeded rows, proving the binding cases end to end: 29-day tombstones and
 * live rows survive, 31-day tombstones are batch-deleted, and other users'
 * expired tombstones are never touched.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SupabaseClient } from '@/background/api/supabase-client';
import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import type { ILogger } from '@/shared/utils/logger';

import { SupabaseGroupRepository } from './supabase-group-repository';

const logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as unknown as ILogger;

const authManager = {
  currentUser: { id: 'user-1' },
} as unknown as IAuthManager;

const NOW = new Date('2026-09-28T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number): string =>
  new Date(NOW.getTime() - days * DAY_MS).toISOString();

interface SeedRow {
  id: string;
  user_id: string;
  group_id?: string;
  deleted_at: string | null;
}

function seedRows(): { page_groups: SeedRow[]; page_group_items: SeedRow[] } {
  const groupRows: SeedRow[] = [
    { id: 'g-live', user_id: 'user-1', deleted_at: null },
    { id: 'g-29d', user_id: 'user-1', deleted_at: daysAgo(29) },
    { id: 'g-31d', user_id: 'user-1', deleted_at: daysAgo(31) },
    { id: 'g-other', user_id: 'user-2', deleted_at: daysAgo(60) },
  ];
  const itemRows: SeedRow[] = [
    { id: 'i-live', user_id: 'user-1', group_id: 'g-live', deleted_at: null },
    { id: 'i-29d', user_id: 'user-1', group_id: 'g-live', deleted_at: daysAgo(29) },
    { id: 'i-31d', user_id: 'user-1', group_id: 'g-live', deleted_at: daysAgo(31) },
    { id: 'i-other', user_id: 'user-2', group_id: 'g-other', deleted_at: daysAgo(60) },
  ];
  return { page_groups: groupRows, page_group_items: itemRows };
}

/**
 * Fake honoring exactly the filter chain SupabaseGroupRepository
 * .purgeTombstones sends: delete → eq(user_id) → not(deleted_at, is, null)
 * → lt(deleted_at, cutoff) → select(id). Captures the lt cutoff for the
 * caller to assert and applies the filters to the seeded rows.
 */
function createPurgeFake(seed: Record<string, SeedRow[]>) {
  const seenLtCutoffs: string[] = [];
  const sdk = {
    from: (table: string) => {
      const eqFilters: Array<{ col: string; value: unknown }> = [];
      let notFilter: { col: string; op: string; value: unknown } | null = null;
      let ltFilter: { col: string; value: string } | null = null;
      const chain: Record<string, unknown> = {
        delete: () => chain,
        eq: (col: string, value: unknown) => {
          eqFilters.push({ col, value });
          return chain;
        },
        not: (col: string, op: string, value: unknown) => {
          notFilter = { col, op, value };
          return chain;
        },
        lt: (col: string, value: string) => {
          ltFilter = { col, value };
          seenLtCutoffs.push(value);
          return chain;
        },
        select: () => chain,
        then: (
          resolve: (value: { data: Array<{ id: string }>; error: null }) => unknown
        ) => {
          const remaining = seed[table] ?? [];
          const deleted = remaining.filter((row) => {
            for (const { col, value } of eqFilters) {
              if ((row as unknown as Record<string, unknown>)[col] !== value) return false;
            }
            if (notFilter) {
              const cell = (row as unknown as Record<string, unknown>)[notFilter.col];
              // Only the `is null` negation this repo sends is understood.
              if (notFilter.op === 'is' && notFilter.value === null && cell === null) {
                return false;
              }
            }
            if (ltFilter) {
              const cell = (row as unknown as Record<string, unknown>)[ltFilter.col];
              if (typeof cell !== 'string' || !(cell < ltFilter.value)) return false;
            }
            return true;
          });
          const deletedIds = new Set(deleted.map((row) => row.id));
          seed[table] = remaining.filter((row) => !deletedIds.has(row.id));
          return Promise.resolve({
            data: deleted.map((row) => ({ id: row.id })),
            error: null,
          }).then(resolve);
        },
      };
      return chain;
    },
  };
  const supabaseClient = { supabase: sdk } as unknown as SupabaseClient;
  return { supabaseClient, seenLtCutoffs };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SupabaseGroupRepository purgeTombstones (Task 2.4 client fallback)', () => {
  it('deletes only expired tombstones: 31d purged, 29d/live/other-user retained', async () => {
    const seed = seedRows();
    const { supabaseClient, seenLtCutoffs } = createPurgeFake(seed);
    const repo = new SupabaseGroupRepository(supabaseClient, authManager, logger);

    const purged = await repo.purgeTombstones(
      new Date(NOW.getTime() - 30 * DAY_MS)
    );

    // One expired tombstone per table.
    expect(purged).toBe(2);
    expect(seed['page_groups'].map((r) => r.id).sort()).toEqual([
      'g-29d',
      'g-live',
      'g-other',
    ]);
    expect(seed['page_group_items'].map((r) => r.id).sort()).toEqual([
      'i-29d',
      'i-live',
      'i-other',
    ]);
    // Both tables were scoped with the same ~now-30d cutoff.
    expect(seenLtCutoffs).toHaveLength(2);
    for (const cutoff of seenLtCutoffs) {
      expect(Math.abs(Date.parse(cutoff) - (NOW.getTime() - 30 * DAY_MS))).toBeLessThan(
        60_000
      );
    }
  });

  it('returns 0 and deletes nothing when no tombstone is expired', async () => {
    const seed = seedRows();
    // Refresh every tombstone so nothing is older than the cutoff.
    for (const rows of Object.values(seed)) {
      for (const row of rows) {
        if (row.deleted_at !== null && row.user_id === 'user-1') {
          row.deleted_at = daysAgo(1);
        }
      }
    }
    const { supabaseClient } = createPurgeFake(seed);
    const repo = new SupabaseGroupRepository(supabaseClient, authManager, logger);

    await expect(
      repo.purgeTombstones(new Date(NOW.getTime() - 30 * DAY_MS))
    ).resolves.toBe(0);
    expect(seed['page_groups']).toHaveLength(4);
    expect(seed['page_group_items']).toHaveLength(4);
  });
});
