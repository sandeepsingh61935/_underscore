/**
 * @file web-group-repository.test.ts
 * @description Tests for the Supabase-backed web groups repository
 * (Phase 2 Task 2.5) against a fake query-builder client: row mapping,
 * live-only filtering, position ordering, soft-delete/restore writes, and
 * the unauthenticated guards.
 */

import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import { WebSupabaseGroupRepository } from './web-group-repository';

type Row = Record<string, unknown>;
type WriteLog = { type: 'update' | 'upsert'; values: Row; count: number };

/** Minimal thenable query builder covering the chains the repository uses. */
class FakeTableQuery {
  private filters: Array<(row: Row) => boolean> = [];
  private mode: 'select' | 'update' | 'upsert' = 'select';
  private updateValues: Row = {};
  private upsertRow: Row = {};
  private single = false;

  constructor(
    private readonly store: Row[],
    private readonly writes: WriteLog[]
  ) {}

  select(): this {
    this.mode = 'select';
    return this;
  }

  update(values: Row): this {
    this.mode = 'update';
    this.updateValues = values;
    return this;
  }

  upsert(row: Row): this {
    this.mode = 'upsert';
    this.upsertRow = row;
    return this;
  }

  eq(col: string, val: unknown): this {
    this.filters.push((r) => r[col] === val);
    return this;
  }

  order(): this {
    return this;
  }

  maybeSingle(): this {
    this.single = true;
    return this;
  }

  then(
    resolve: (value: { data: unknown; error: null }) => void,
    reject: (err: unknown) => void
  ): void {
    try {
      if (this.mode === 'select') {
        const rows = this.store.filter((r) => this.filters.every((f) => f(r)));
        resolve({ data: this.single ? (rows[0] ?? null) : rows, error: null });
        return;
      }
      if (this.mode === 'update') {
        const rows = this.store.filter((r) => this.filters.every((f) => f(r)));
        for (const r of rows) Object.assign(r, this.updateValues);
        this.writes.push({ type: 'update', values: this.updateValues, count: rows.length });
        resolve({ data: rows, error: null });
        return;
      }
      const at = this.store.findIndex((r) => r['id'] === this.upsertRow['id']);
      if (at >= 0) this.store[at] = { ...this.store[at], ...this.upsertRow };
      else this.store.push({ ...this.upsertRow });
      this.writes.push({ type: 'upsert', values: this.upsertRow, count: 1 });
      resolve({ data: [this.upsertRow], error: null });
    } catch (err) {
      reject(err);
    }
  }
}

function seedGroupRow(partial: Partial<Row> = {}): Row {
  return {
    id: 'g-1',
    user_id: 'user-1',
    name: 'Research',
    color: 'blue',
    position: 'a0',
    bound_device_id: null,
    bound_device_label: null,
    bound_browser: null,
    bound_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    deleted_at: null,
    ...partial,
  };
}

function seedItemRow(partial: Partial<Row> = {}): Row {
  return {
    id: 'i-1',
    group_id: 'g-1',
    user_id: 'user-1',
    kind: 'page',
    url_normalized: 'https://example.com/a',
    hostname: null,
    include_subdomains: false,
    title: null,
    favicon_url: null,
    position: 'a0',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    deleted_at: null,
    ...partial,
  };
}

function createHarness(seed: { groups: Row[]; items: Row[] }, userId: string | null = 'user-1') {
  const writes: WriteLog[] = [];
  const client = {
    from: (name: string) =>
      new FakeTableQuery(name === 'page_groups' ? seed.groups : seed.items, writes),
    auth: {
      getSession: async () => ({
        data: userId ? { session: { user: { id: userId } } } : { session: null },
        error: null,
      }),
    },
  };
  return {
    repo: new WebSupabaseGroupRepository(client as unknown as SupabaseClient),
    seed,
    writes,
  };
}

describe('WebSupabaseGroupRepository', () => {
  it('listGroups returns live groups mapped + sorted by position', async () => {
    const { repo } = createHarness({
      groups: [
        seedGroupRow({ id: 'g-b', name: 'B', position: 'a1' }),
        seedGroupRow({ id: 'g-dead', name: 'Dead', deleted_at: '2026-02-01T00:00:00.000Z' }),
        seedGroupRow({ id: 'g-a', name: 'A', position: 'a0' }),
        seedGroupRow({ id: 'g-other', name: 'Other', user_id: 'user-2' }),
      ],
      items: [],
    });
    const groups = await repo.listGroups();
    expect(groups.map((g) => g.name)).toEqual(['A', 'B']);
    expect(groups[0]).toMatchObject({ id: 'g-a', color: 'blue', deletedAt: null });
  });

  it('listItems is scoped to the group and excludes tombstones', async () => {
    const { repo } = createHarness({
      groups: [],
      items: [
        seedItemRow({ id: 'i-1', group_id: 'g-1' }),
        seedItemRow({ id: 'i-dead', group_id: 'g-1', deleted_at: '2026-02-01T00:00:00.000Z' }),
        seedItemRow({ id: 'i-elsewhere', group_id: 'g-2' }),
      ],
    });
    const items = await repo.listItems('g-1');
    expect(items.map((i) => i.id)).toEqual(['i-1']);
  });

  it('createGroup appends after the last position and scopes the row', async () => {
    const { repo, seed, writes } = createHarness({
      groups: [seedGroupRow({ id: 'g-1', position: 'a0' })],
      items: [],
    });
    const group = await repo.createGroup({ name: '  New  ', color: 'red' });
    expect(group.name).toBe('New');
    expect(group.position > 'a0').toBe(true);
    expect(writes).toHaveLength(1);
    expect(writes[0]?.type).toBe('upsert');
    expect(seed.groups).toHaveLength(2);
    const stored = seed.groups.find((r) => r['id'] === group.id);
    expect(stored).toMatchObject({ user_id: 'user-1', name: 'New', color: 'red' });
  });

  it('renameGroup writes the trimmed name; delete/restore flip the tombstone', async () => {
    const { repo, seed } = createHarness({
      groups: [seedGroupRow({ id: 'g-1', name: 'Old' })],
      items: [],
    });
    await repo.renameGroup('g-1', '  New name  ');
    expect(seed.groups[0]?.['name']).toBe('New name');

    await repo.deleteGroup('g-1');
    expect(seed.groups[0]?.['deleted_at']).not.toBeNull();

    await repo.restoreGroup('g-1');
    expect(seed.groups[0]?.['deleted_at']).toBeNull();
  });

  it('addPage rejects non-http(s) and stores a mapped row', async () => {
    const { repo, seed } = createHarness({ groups: [], items: [] });
    await expect(repo.addPage('g-1', 'ftp://example.com/f')).rejects.toThrow();
    const item = await repo.addPage('g-1', 'https://example.com/a');
    expect(item.kind).toBe('page');
    if (item.kind !== 'page') throw new Error('expected a page item');
    expect(item.urlNormalized).toBe('https://example.com/a');
    expect(seed.items).toHaveLength(1);
    expect(seed.items[0]).toMatchObject({
      group_id: 'g-1',
      user_id: 'user-1',
      kind: 'page',
      url_normalized: 'https://example.com/a',
    });
  });

  it('moveItem at the boundary is a no-op write', async () => {
    const { repo, writes } = createHarness({
      groups: [],
      items: [seedItemRow({ id: 'i-1' })],
    });
    await repo.moveItem('g-1', 'i-1', 'up');
    expect(writes).toHaveLength(0);
  });

  it('unauthenticated: lists are empty and writes throw', async () => {
    const { repo } = createHarness({ groups: [seedGroupRow()], items: [] }, null);
    expect(await repo.listGroups()).toEqual([]);
    await expect(repo.createGroup({ name: 'x', color: 'blue' })).rejects.toThrow(
      'Sign in to manage groups.'
    );
  });
});
