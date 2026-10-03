/**
 * @file supabase-group-repository.test.ts
 * @description TDD contract for Task 2.2: SupabaseGroupRepository cloud CRUD,
 * row mapping, and `group_cap_exceeded` (SQLSTATE P0001) mapping to
 * GroupCapError. Fake SDK client, no network.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SupabaseClient } from '@/background/api/supabase-client';
import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import { GroupCapError } from '@/background/services/group-service';
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

/** Minimal thenable query builder faking the Supabase JS chains this repo uses. */
interface CannedResponse {
  data: unknown;
  error: { code?: string; message: string } | null;
}

function createFakeSdk(responder: (table: string, action: string) => CannedResponse) {
  const calls: Array<{ table: string; action: string; payload?: unknown }> = [];
  const builder = (table: string): unknown => {
    const chain: Record<string, unknown> = {};
    const terminal = (action: string, payload?: unknown) => {
      calls.push({ table, action, payload });
      const response = responder(table, action);
      return {
        then(
          resolve: (value: CannedResponse) => unknown,
          reject?: (reason: unknown) => unknown
        ) {
          return Promise.resolve(response).then(resolve, reject);
        },
      };
    };
    // The proxy is returned for every link so the final chain stays awaitable.
    let proxy: unknown;
    for (const method of ['select', 'eq', 'order', 'is', 'not', 'lt', 'delete']) {
      chain[method] = () => proxy;
    }
    for (const method of ['maybeSingle', 'upsert']) {
      chain[method] = (...args: unknown[]) => terminal(method, args[0]);
    }
    proxy = new Proxy(chain, {
      get(target, prop: string) {
        if (prop === 'then') {
          return (
            resolve: (value: CannedResponse) => unknown,
            reject?: (reason: unknown) => unknown
          ) => Promise.resolve(responder(table, 'select')).then(resolve, reject);
        }
        return target[prop];
      },
    });
    return proxy;
  };
  const sdk = { from: (table: string) => builder(table) };
  const supabaseClient = { supabase: sdk } as unknown as SupabaseClient;
  return { sdk, supabaseClient, calls };
}

const GROUP_ROW = {
  id: 'g-1',
  user_id: 'user-1',
  name: 'Research',
  color: 'blue',
  position: 'a0',
  bound_device_id: null,
  bound_device_label: null,
  bound_browser: null,
  bound_at: null,
  created_at: '2026-09-28T10:00:00.000Z',
  updated_at: '2026-09-28T10:00:00.000Z',
  deleted_at: null,
};

const ITEM_ROW = {
  id: 'i-1',
  group_id: 'g-1',
  user_id: 'user-1',
  kind: 'page',
  url_normalized: 'https://example.com/a',
  hostname: null,
  include_subdomains: false,
  title: 'A',
  favicon_url: null,
  position: 'a0',
  created_at: '2026-09-28T10:00:00.000Z',
  updated_at: '2026-09-28T10:00:00.000Z',
  deleted_at: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SupabaseGroupRepository reads', () => {
  it('maps page_groups rows to PageGroup domain shape', async () => {
    const { supabaseClient } = createFakeSdk((table) => ({
      data: table === 'page_groups' ? [GROUP_ROW] : [],
      error: null,
    }));
    const repo = new SupabaseGroupRepository(supabaseClient, authManager, logger);

    const groups = await repo.listGroups();

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      id: 'g-1',
      name: 'Research',
      color: 'blue',
      position: 'a0',
      boundDeviceId: null,
      boundBrowser: null,
      createdAt: '2026-09-28T10:00:00.000Z',
      deletedAt: null,
    });
  });

  it('excludes tombstones by default and includes them on request', async () => {
    const tombstoned = { ...GROUP_ROW, id: 'g-2', deleted_at: '2026-09-28T11:00:00.000Z' };
    const { supabaseClient } = createFakeSdk(() => ({
      data: [GROUP_ROW, tombstoned],
      error: null,
    }));
    const repo = new SupabaseGroupRepository(supabaseClient, authManager, logger);

    expect((await repo.listGroups()).map((g) => g.id)).toEqual(['g-1']);
    expect((await repo.listGroups({ includeDeleted: true })).map((g) => g.id)).toEqual([
      'g-1',
      'g-2',
    ]);
  });

  it('maps page_group_items page rows to the PageGroupItem union', async () => {
    const { supabaseClient } = createFakeSdk((table) => ({
      data: table === 'page_group_items' ? [ITEM_ROW] : [],
      error: null,
    }));
    const repo = new SupabaseGroupRepository(supabaseClient, authManager, logger);

    const items = await repo.listItems('g-1');

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'i-1',
      kind: 'page',
      groupId: 'g-1',
      urlNormalized: 'https://example.com/a',
      title: 'A',
    });
  });

  it('returns null from getGroup when the row is missing', async () => {
    const { supabaseClient } = createFakeSdk(() => ({ data: null, error: null }));
    const repo = new SupabaseGroupRepository(supabaseClient, authManager, logger);

    await expect(repo.getGroup('missing')).resolves.toBeNull();
  });
});

describe('SupabaseGroupRepository writes', () => {
  it('upserts group rows with the authenticated user_id', async () => {
    const { supabaseClient, calls } = createFakeSdk(() => ({ data: [], error: null }));
    const repo = new SupabaseGroupRepository(supabaseClient, authManager, logger);

    await repo.putGroup({
      id: 'g-9',
      name: 'New',
      color: 'grey',
      position: 'a0',
      boundDeviceId: null,
      boundDeviceLabel: null,
      boundBrowser: null,
      boundAt: null,
      createdAt: '2026-09-28T10:00:00.000Z',
      updatedAt: '2026-09-28T10:00:00.000Z',
      deletedAt: null,
    });

    const upsert = calls.find((c) => c.table === 'page_groups' && c.action === 'upsert');
    expect(upsert).toBeDefined();
    expect(upsert?.payload).toMatchObject({ id: 'g-9', user_id: 'user-1', name: 'New' });
  });

  it('maps P0001 group_cap_exceeded on page_groups to GroupCapError(groups)', async () => {
    const { supabaseClient } = createFakeSdk((table) => ({
      data: null,
      error:
        table === 'page_groups'
          ? { code: 'P0001', message: 'group_cap_exceeded' }
          : null,
    }));
    const repo = new SupabaseGroupRepository(supabaseClient, authManager, logger);

    const failure = await repo
      .putGroup({
        id: 'g-9',
        name: 'New',
        color: 'grey',
        position: 'a0',
        boundDeviceId: null,
        boundDeviceLabel: null,
        boundBrowser: null,
        boundAt: null,
        createdAt: '2026-09-28T10:00:00.000Z',
        updatedAt: '2026-09-28T10:00:00.000Z',
        deletedAt: null,
      })
      .then(
        () => null,
        (error: unknown) => error
      );

    expect(failure).toBeInstanceOf(GroupCapError);
    expect((failure as GroupCapError).scope).toBe('groups');
    expect((failure as GroupCapError).limit).toBe(200);
  });

  it('maps P0001 group_cap_exceeded on page_group_items to GroupCapError(items)', async () => {
    const { supabaseClient } = createFakeSdk((table) => ({
      data: null,
      error:
        table === 'page_group_items'
          ? { code: 'P0001', message: 'group_cap_exceeded' }
          : null,
    }));
    const repo = new SupabaseGroupRepository(supabaseClient, authManager, logger);

    const failure = await repo
      .putItem({
        id: 'i-9',
        kind: 'page',
        groupId: 'g-1',
        position: 'a0',
        urlNormalized: 'https://example.com/z',
        title: null,
        faviconUrl: null,
        createdAt: '2026-09-28T10:00:00.000Z',
        updatedAt: '2026-09-28T10:00:00.000Z',
        deletedAt: null,
      })
      .then(
        () => null,
        (error: unknown) => error
      );

    expect(failure).toBeInstanceOf(GroupCapError);
    expect((failure as GroupCapError).scope).toBe('items');
    expect((failure as GroupCapError).limit).toBe(500);
  });

  it('rethrows non-cap cloud errors unchanged', async () => {
    const raw = { code: '42501', message: 'permission denied' };
    const { supabaseClient } = createFakeSdk(() => ({ data: null, error: raw }));
    const repo = new SupabaseGroupRepository(supabaseClient, authManager, logger);

    await expect(
      repo.putItem({
        id: 'i-9',
        kind: 'page',
        groupId: 'g-1',
        position: 'a0',
        urlNormalized: 'https://example.com/z',
        title: null,
        faviconUrl: null,
        createdAt: '2026-09-28T10:00:00.000Z',
        updatedAt: '2026-09-28T10:00:00.000Z',
        deletedAt: null,
      })
    ).rejects.toBe(raw);
  });
});
