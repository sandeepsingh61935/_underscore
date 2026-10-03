/**
 * @file useWebGroupsRealtime.test.ts
 * @description Tests for the web Groups Realtime hook (Phase 2 Task 2.5).
 *
 * A fake Supabase client captures the channel bindings; emitted
 * `postgres_changes` payloads must update pane state WITHOUT a refetch
 * (binding case), and unmount must unsubscribe the channel.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { GroupColor, PageGroup, PageGroupItem } from '@/shared/types/page-group';

import { useWebGroups, type WebGroupRepository } from './useWebGroups';
import { useWebGroupsRealtime } from './useWebGroupsRealtime';

let seq = 0;
function rid(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

function makeGroup(partial: Partial<PageGroup> = {}): PageGroup {
  return {
    id: partial.id ?? rid('g'),
    name: partial.name ?? 'Research',
    color: partial.color ?? 'blue',
    position: partial.position ?? 'a0',
    boundDeviceId: null,
    boundDeviceLabel: null,
    boundBrowser: null,
    boundAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    ...partial,
  };
}

/** In-memory fake repository with a listGroups call counter (no-refetch proof). */
class FakeWebGroupRepository implements WebGroupRepository {
  groups: PageGroup[] = [];
  items: PageGroupItem[] = [];
  listGroupsCalls = 0;
  listItemsCalls = 0;

  async listGroups(): Promise<PageGroup[]> {
    this.listGroupsCalls += 1;
    return this.groups.filter((g) => g.deletedAt === null);
  }

  async listItems(groupId: string): Promise<PageGroupItem[]> {
    this.listItemsCalls += 1;
    return this.items.filter((i) => i.groupId === groupId && i.deletedAt === null);
  }

  async createGroup(input: { name: string; color: GroupColor }): Promise<PageGroup> {
    const group = makeGroup({ name: input.name, color: input.color });
    this.groups.push(group);
    return group;
  }

  async renameGroup(id: string, name: string): Promise<void> {
    const g = this.groups.find((x) => x.id === id);
    if (g) g.name = name;
  }

  async recolorGroup(id: string, color: GroupColor): Promise<void> {
    const g = this.groups.find((x) => x.id === id);
    if (g) g.color = color;
  }

  async deleteGroup(id: string): Promise<void> {
    const g = this.groups.find((x) => x.id === id);
    if (g) g.deletedAt = new Date().toISOString();
    this.items = this.items.filter((i) => i.groupId !== id);
  }

  async restoreGroup(id: string): Promise<void> {
    const g = this.groups.find((x) => x.id === id);
    if (g) g.deletedAt = null;
  }

  async moveGroup(): Promise<void> {}

  async addPage(groupId: string, urlNormalized: string): Promise<PageGroupItem> {
    const item: PageGroupItem = {
      kind: 'page',
      urlNormalized,
      title: null,
      faviconUrl: null,
      id: rid('i'),
      groupId,
      position: 'a0',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      deletedAt: null,
    };
    this.items.push(item);
    return item;
  }

  async addDomain(
    groupId: string,
    hostname: string,
    includeSubdomains: boolean
  ): Promise<PageGroupItem> {
    const item: PageGroupItem = {
      kind: 'domain',
      hostname,
      includeSubdomains,
      id: rid('i'),
      groupId,
      position: 'a0',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      deletedAt: null,
    };
    this.items.push(item);
    return item;
  }

  async removeItem(_groupId: string, itemId: string): Promise<void> {
    const item = this.items.find((i) => i.id === itemId);
    if (item) item.deletedAt = new Date().toISOString();
  }

  async restoreItem(_groupId: string, itemId: string): Promise<void> {
    const item = this.items.find((i) => i.id === itemId);
    if (item) item.deletedAt = null;
  }

  async moveItem(): Promise<void> {}
}

type PayloadCallback = (payload: unknown) => void;
type AuthChangeCallback = (event: string, session: unknown) => void;

function createFakeSupabase() {
  const calls = {
    setAuth: 0,
    subscribe: 0,
    unsubscribe: 0,
    channels: 0,
    authRegistrations: 0,
    authUnsubscribes: 0,
  };
  let groupCb: PayloadCallback | null = null;
  let itemCb: PayloadCallback | null = null;
  let authCb: AuthChangeCallback | null = null;
  let statusCb: ((status: string) => void) | null = null;

  const channelObj = {
    on(_event: string, filter: { table?: string }, cb: PayloadCallback) {
      if (filter.table === 'page_groups') groupCb = cb;
      else if (filter.table === 'page_group_items') itemCb = cb;
      return channelObj;
    },
    subscribe(cb?: (status: string) => void) {
      calls.subscribe += 1;
      statusCb = cb ?? null;
      return channelObj;
    },
    unsubscribe() {
      calls.unsubscribe += 1;
    },
  };

  const supabase = {
    channel(_name: string) {
      calls.channels += 1;
      return channelObj;
    },
    realtime: {
      setAuth(_token: string) {
        calls.setAuth += 1;
      },
    },
    auth: {
      getSession: async () => ({
        data: {
          session: { user: { id: 'user-1' }, access_token: 'token-1' },
        },
        error: null,
      }),
      onAuthStateChange: (cb: AuthChangeCallback) => {
        calls.authRegistrations += 1;
        authCb = cb;
        return {
          data: {
            subscription: {
              unsubscribe() {
                calls.authUnsubscribes += 1;
              },
            },
          },
        };
      },
    },
  };

  return {
    supabase: supabase as unknown as SupabaseClient,
    calls,
    emitGroup: (payload: unknown) => groupCb?.(payload),
    emitItem: (payload: unknown) => itemCb?.(payload),
    emitStatus: (status: string) => statusCb?.(status),
    emitAuth: (event: string, session: unknown) => authCb?.(event, session),
  };
}

function toGroupRow(group: PageGroup, overrides: Record<string, unknown> = {}) {
  return {
    id: group.id,
    user_id: 'user-1',
    name: group.name,
    color: group.color,
    position: group.position,
    bound_device_id: group.boundDeviceId,
    bound_device_label: group.boundDeviceLabel,
    bound_browser: group.boundBrowser,
    bound_at: group.boundAt,
    created_at: group.createdAt,
    updated_at: group.updatedAt,
    deleted_at: group.deletedAt,
    ...overrides,
  };
}

describe('useWebGroupsRealtime', () => {
  beforeEach(() => {
    seq = 0;
    vi.useRealTimers();
  });

  it('Realtime UPDATE renames the group WITHOUT a refetch', async () => {
    const repo = new FakeWebGroupRepository();
    const group = makeGroup({ name: 'Papers' });
    repo.groups.push(group);
    const fake = createFakeSupabase();

    const { result } = renderHook(() => {
      const groups = useWebGroups({ isAuthenticated: true, repository: repo });
      useWebGroupsRealtime({
        isAuthenticated: true,
        client: fake.supabase,
        applyRemoteGroup: groups.applyRemoteGroup,
        applyRemoteItem: groups.applyRemoteItem,
        removeRemoteGroup: groups.removeRemoteGroup,
        removeRemoteItem: groups.removeRemoteItem,
        refresh: groups.refresh,
      });
      return groups;
    });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    await waitFor(() => expect(fake.calls.subscribe).toBeGreaterThan(0));
    expect(result.current.groups[0]?.name).toBe('Papers');

    // Baseline after the initial load (1 groups fetch + 1 items fetch).
    repo.listGroupsCalls = 0;
    repo.listItemsCalls = 0;

    const before = repo.listGroupsCalls;
    await act(async () => {
      fake.emitGroup({
        eventType: 'UPDATE',
        new: toGroupRow(group, {
          name: 'Renamed elsewhere',
          updated_at: '2026-02-01T00:00:00.000Z',
        }),
        old: toGroupRow(group),
      });
    });

    await waitFor(() =>
      expect(result.current.groups[0]?.name).toBe('Renamed elsewhere')
    );
    // Binding case: pane updated with zero repository round-trips.
    expect(repo.listGroupsCalls).toBe(before);
    expect(repo.listItemsCalls).toBe(0);
  });

  it('Realtime tombstone UPDATE removes the group WITHOUT a refetch', async () => {
    const repo = new FakeWebGroupRepository();
    const group = makeGroup({ name: 'Papers' });
    repo.groups.push(group);
    const fake = createFakeSupabase();

    const { result } = renderHook(() => {
      const groups = useWebGroups({ isAuthenticated: true, repository: repo });
      useWebGroupsRealtime({
        isAuthenticated: true,
        client: fake.supabase,
        applyRemoteGroup: groups.applyRemoteGroup,
        applyRemoteItem: groups.applyRemoteItem,
        removeRemoteGroup: groups.removeRemoteGroup,
        removeRemoteItem: groups.removeRemoteItem,
        refresh: groups.refresh,
      });
      return groups;
    });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    await waitFor(() => expect(fake.calls.subscribe).toBeGreaterThan(0));
    expect(result.current.groups).toHaveLength(1);

    repo.listGroupsCalls = 0;
    await act(async () => {
      fake.emitGroup({
        eventType: 'UPDATE',
        new: toGroupRow(group, {
          deleted_at: '2026-02-01T00:00:00.000Z',
          updated_at: '2026-02-01T00:00:00.000Z',
        }),
        old: toGroupRow(group),
      });
    });

    await waitFor(() => expect(result.current.groups).toHaveLength(0));
    expect(repo.listGroupsCalls).toBe(0);
  });

  it('TOKEN_REFRESHED refreshes the Realtime auth token', async () => {
    const repo = new FakeWebGroupRepository();
    const fake = createFakeSupabase();

    renderHook(() => {
      const groups = useWebGroups({ isAuthenticated: true, repository: repo });
      useWebGroupsRealtime({
        isAuthenticated: true,
        client: fake.supabase,
        applyRemoteGroup: groups.applyRemoteGroup,
        applyRemoteItem: groups.applyRemoteItem,
        removeRemoteGroup: groups.removeRemoteGroup,
        removeRemoteItem: groups.removeRemoteItem,
        refresh: groups.refresh,
      });
      return groups;
    });

    await waitFor(() => expect(fake.calls.subscribe).toBeGreaterThan(0));
    const before = fake.calls.setAuth;
    expect(before).toBeGreaterThan(0);

    await act(async () => {
      fake.emitAuth('TOKEN_REFRESHED', { access_token: 'token-2' });
    });
    expect(fake.calls.setAuth).toBe(before + 1);
  });

  it('keeps exactly one active auth listener across reconnects', async () => {
    const repo = new FakeWebGroupRepository();
    const fake = createFakeSupabase();

    renderHook(() => {
      const groups = useWebGroups({ isAuthenticated: true, repository: repo });
      useWebGroupsRealtime({
        isAuthenticated: true,
        client: fake.supabase,
        applyRemoteGroup: groups.applyRemoteGroup,
        applyRemoteItem: groups.applyRemoteItem,
        removeRemoteGroup: groups.removeRemoteGroup,
        removeRemoteItem: groups.removeRemoteItem,
        refresh: groups.refresh,
      });
      return groups;
    });

    await waitFor(() => expect(fake.calls.subscribe).toBeGreaterThan(0));
    expect(fake.calls.authRegistrations).toBe(1);

    // Force a reconnect: CHANNEL_ERROR schedules a 1s backoff re-subscribe.
    await act(async () => {
      fake.emitStatus('CHANNEL_ERROR');
    });
    await waitFor(() => expect(fake.calls.subscribe).toBe(2), { timeout: 5000 });

    // The channel re-subscribed, but no second auth listener was registered
    // (previously each reconnect leaked one via an overwritten unsubscribe).
    expect(fake.calls.channels).toBe(2);
    expect(fake.calls.authRegistrations).toBe(1);
    expect(fake.calls.authUnsubscribes).toBe(0);

    // The single listener still works after the reconnect.
    const setAuthBefore = fake.calls.setAuth;
    await act(async () => {
      fake.emitAuth('TOKEN_REFRESHED', { access_token: 'token-3' });
    });
    expect(fake.calls.setAuth).toBe(setAuthBefore + 1);
  });

  it('unsubscribes the channel on unmount', async () => {    const repo = new FakeWebGroupRepository();
    const fake = createFakeSupabase();

    const { unmount } = renderHook(() => {
      const groups = useWebGroups({ isAuthenticated: true, repository: repo });
      useWebGroupsRealtime({
        isAuthenticated: true,
        client: fake.supabase,
        applyRemoteGroup: groups.applyRemoteGroup,
        applyRemoteItem: groups.applyRemoteItem,
        removeRemoteGroup: groups.removeRemoteGroup,
        removeRemoteItem: groups.removeRemoteItem,
        refresh: groups.refresh,
      });
      return groups;
    });

    await waitFor(() => expect(fake.calls.subscribe).toBeGreaterThan(0));
    unmount();
    expect(fake.calls.unsubscribe).toBeGreaterThan(0);
  });
});
