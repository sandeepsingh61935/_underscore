/**
 * @file useWebGroups.test.ts
 * @description Tests for the web Groups hook against an in-memory FAKE
 * repository. The fake lives in this test file only — the real Supabase
 * repository is `WebSupabaseGroupRepository` (Task 2.5).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

import type { GroupColor, PageGroup, PageGroupItem } from '@/shared/types/page-group';

import {
  useWebGroups,
  validateGroupHostname,
  validateGroupPageUrl,
  type WebGroupRepository,
} from './useWebGroups';

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

/** In-memory fake — tests only, never production. */
class FakeWebGroupRepository implements WebGroupRepository {
  groups: PageGroup[] = [];
  items: PageGroupItem[] = [];

  async listGroups(): Promise<PageGroup[]> {
    return this.groups.filter((g) => g.deletedAt === null);
  }

  async listItems(groupId: string): Promise<PageGroupItem[]> {
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

  async moveGroup(): Promise<void> {
    // Order is repository-owned; the hook only needs the refresh round-trip.
  }

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

  async moveItem(): Promise<void> {
    // Order is repository-owned; the hook only needs the refresh round-trip.
  }
}

describe('useWebGroups', () => {
  beforeEach(() => {
    seq = 0;
  });

  it('guest: ready empty state and mutations are no-ops', async () => {
    const repo = new FakeWebGroupRepository();
    repo.groups.push(makeGroup());
    const { result } = renderHook(() => useWebGroups({ isAuthenticated: false, repository: repo }));

    expect(result.current.status).toBe('ready');
    expect(result.current.isGuest).toBe(true);
    expect(result.current.groups).toEqual([]);

    let out;
    await act(async () => {
      out = await result.current.addPage('g-1', 'https://example.com/');
    });
    expect(out).toEqual({ success: false, error: 'Sign in to manage groups.' });
    expect(await result.current.createGroup('x', 'red')).toBeNull();
  });

  it('authenticated without a repository: empty stub (Phase 2 provides the real one)', () => {
    const { result } = renderHook(() => useWebGroups({ isAuthenticated: true }));
    expect(result.current.status).toBe('ready');
    expect(result.current.groups).toEqual([]);
  });

  it('authenticated with repository: loads groups and items', async () => {
    const repo = new FakeWebGroupRepository();
    const g = makeGroup({ name: 'Papers' });
    repo.groups.push(g);
    await repo.addPage(g.id, 'https://example.com/a');

    const { result } = renderHook(() =>
      useWebGroups({ isAuthenticated: true, repository: repo })
    );

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.groups.map((x) => x.name)).toEqual(['Papers']);
    expect(result.current.itemCountOf(g.id)).toBe(1);
  });

  it('addPage validates http/https only, normalizes, and dedupes', async () => {
    const repo = new FakeWebGroupRepository();
    const g = makeGroup();
    repo.groups.push(g);
    const { result } = renderHook(() =>
      useWebGroups({ isAuthenticated: true, repository: repo })
    );
    await waitFor(() => expect(result.current.status).toBe('ready'));

    let bad;
    await act(async () => {
      bad = await result.current.addPage(g.id, 'ftp://example.com/file');
    });
    expect(bad).toEqual({ success: false, error: 'Only http and https URLs can be added.' });

    let first;
    await act(async () => {
      first = await result.current.addPage(g.id, 'https://example.com/a?utm_source=x#frag');
    });
    expect(first).toEqual({ success: true });

    let dupe;
    await act(async () => {
      dupe = await result.current.addPage(g.id, 'https://example.com/a');
    });
    expect(dupe).toEqual({ success: false, error: 'This page is already in the group.' });
  });

  it('addDomain validates hostnames and dedupes exact rules', async () => {
    const repo = new FakeWebGroupRepository();
    const g = makeGroup();
    repo.groups.push(g);
    const { result } = renderHook(() =>
      useWebGroups({ isAuthenticated: true, repository: repo })
    );
    await waitFor(() => expect(result.current.status).toBe('ready'));

    let bad: { success: boolean; error?: string } | undefined;
    await act(async () => {
      bad = await result.current.addDomain(g.id, 'not a domain!!', false);
    });
    expect(bad?.success).toBe(false);

    let first;
    await act(async () => {
      first = await result.current.addDomain(g.id, 'Example.COM.', true);
    });
    expect(first).toEqual({ success: true });
    expect(repo.items[0]).toMatchObject({ hostname: 'example.com', includeSubdomains: true });

    let dupe;
    await act(async () => {
      dupe = await result.current.addDomain(g.id, 'example.com', true);
    });
    expect(dupe).toEqual({ success: false, error: 'This domain is already in the group.' });
  });

  it('deleteGroup drops the group from state', async () => {    const repo = new FakeWebGroupRepository();
    const g = makeGroup();
    repo.groups.push(g);
    const { result } = renderHook(() =>
      useWebGroups({ isAuthenticated: true, repository: repo })
    );
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.groups).toHaveLength(1);

    let out;
    await act(async () => {
      out = await result.current.deleteGroup(g.id);
    });
    expect(out).toEqual({ success: true });
    expect(result.current.groups).toHaveLength(0);
  });

  it('optimistic rename rolls back on repository error', async () => {
    const repo = new FakeWebGroupRepository();
    const g = makeGroup({ name: 'Papers' });
    repo.groups.push(g);
    const { result } = renderHook(() =>
      useWebGroups({ isAuthenticated: true, repository: repo })
    );
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.groups[0]?.name).toBe('Papers');

    // Fail only the rename write: the optimistic paint must revert.
    const failing = new Error('network down');
    const renameSpy = vi
      .spyOn(repo, 'renameGroup')
      .mockRejectedValueOnce(failing);

    let out;
    await act(async () => {
      out = await result.current.renameGroup(g.id, 'Renamed');
    });
    expect(renameSpy).toHaveBeenCalledTimes(1);
    expect(out).toEqual({ success: false, error: 'network down' });
    expect(result.current.groups[0]?.name).toBe('Papers');
  });

  it('optimistic removeItem rolls back on repository error', async () => {
    const repo = new FakeWebGroupRepository();
    const g = makeGroup();
    repo.groups.push(g);
    await repo.addPage(g.id, 'https://example.com/a');
    const { result } = renderHook(() =>
      useWebGroups({ isAuthenticated: true, repository: repo })
    );
    await waitFor(() => expect(result.current.status).toBe('ready'));
    const itemId = result.current.liveItemsOf(g.id)[0]?.id;
    expect(itemId).toBeDefined();

    vi.spyOn(repo, 'removeItem').mockRejectedValueOnce(new Error('boom'));
    let out;
    await act(async () => {
      out = await result.current.removeItem(g.id, itemId!);
    });
    expect(out).toEqual({ success: false, error: 'boom' });
    expect(result.current.liveItemsOf(g.id)).toHaveLength(1);
  });
});

describe('group input validation', () => {
  it('validateGroupPageUrl accepts http/https only', () => {
    expect(validateGroupPageUrl('https://example.com/a').ok).toBe(true);
    expect(validateGroupPageUrl('http://example.com/').ok).toBe(true);
    expect(validateGroupPageUrl('file:///etc/passwd')).toEqual({
      ok: false,
      error: 'Only http and https URLs can be added.',
    });
    expect(validateGroupPageUrl('not a url')).toEqual({
      ok: false,
      error: 'Enter a valid http or https URL.',
    });
  });

  it('validateGroupPageUrl normalizes tracking params and hash', () => {
    const out = validateGroupPageUrl('https://example.com/a?utm_source=x#frag');
    expect(out).toEqual({ ok: true, urlNormalized: 'https://example.com/a' });
  });

  it('validateGroupHostname cleans casing, ports, paths, and trailing dots', () => {
    expect(validateGroupHostname('Example.COM.')).toEqual({ ok: true, hostname: 'example.com' });
    expect(validateGroupHostname('https://docs.example.com/x')).toEqual({
      ok: true,
      hostname: 'docs.example.com',
    });
    expect(validateGroupHostname('not a domain!!').ok).toBe(false);
    expect(validateGroupHostname('').ok).toBe(false);
  });
});
