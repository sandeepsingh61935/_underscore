/**
 * @file useWebGroups.ts
 * @description Web Groups data hook (Phase 1 Task 1.9, wired to Supabase in
 * Phase 2 Task 2.5).
 *
 * Desktop web is Account-only for cloud data: guests always resolve to an
 * empty ready state and every mutation is a no-op. Authenticated loads go
 * through an injected {@link WebGroupRepository} — production passes the
 * Supabase-backed `WebSupabaseGroupRepository` (see
 * `src/web/lib/web-group-repository.ts`, wired in `LibraryPage`); tests
 * inject an in-memory fake (which lives in test files only).
 *
 * Mutations are optimistic with rollback: state updates immediately and the
 * previous snapshot is restored when the repository write fails. Remote rows
 * arriving over Realtime (`useWebGroupsRealtime`) merge via `mergeRow`
 * (last-write-wins on `updatedAt`, tombstone beats concurrent update) with no
 * refetch. State is written through to the per-user IndexedDB groups cache
 * (`web-library-cache.ts`), which also provides the warm paint on load.
 *
 * Web-only: no `chrome.*` access anywhere in this file.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { getWebSupabaseClient } from '@/shared/auth/supabase-web-client';
import type { GroupColor, PageGroup, PageGroupItem } from '@/shared/types/page-group';
import { positionBetween } from '@/shared/utils/fractional-position';
import { normalizePageUrl } from '@/shared/utils/normalize-page-url';
import { mergeRow } from '@/shared/utils/page-group-merge';
import {
  readWebGroupsCache,
  writeWebGroupsCache,
} from '@/web/lib/web-library-cache';
import { trackEvent } from '@/web/lib/analytics';

/**
 * Web group repository surface: the same command set as `GroupService`
 * (create/rename/recolor/delete/restore for groups;
 * addPage/addDomain/remove/restore/move for items; move for groups).
 * The hook owns all input validation/normalization so repositories stay thin.
 */
export interface WebGroupRepository {
  listGroups(): Promise<PageGroup[]>;
  listItems(groupId: string): Promise<PageGroupItem[]>;
  createGroup(input: { name: string; color: GroupColor }): Promise<PageGroup>;
  renameGroup(id: string, name: string): Promise<void>;
  recolorGroup(id: string, color: GroupColor): Promise<void>;
  deleteGroup(id: string): Promise<void>;
  restoreGroup(id: string): Promise<void>;
  moveGroup(id: string, to: 'top' | 'up' | 'down'): Promise<void>;
  addPage(groupId: string, urlNormalized: string): Promise<PageGroupItem>;
  addDomain(
    groupId: string,
    hostname: string,
    includeSubdomains: boolean
  ): Promise<PageGroupItem>;
  removeItem(groupId: string, itemId: string): Promise<void>;
  restoreItem(groupId: string, itemId: string): Promise<void>;
  moveItem(groupId: string, itemId: string, to: 'top' | 'up' | 'down'): Promise<void>;
}

export interface UseWebGroupsOpts {
  isAuthenticated: boolean;
  /** Injected repository (Supabase in production, fake in tests). Null (default) = empty stub. */
  repository?: WebGroupRepository | null;
}

export type WebGroupMutationResult =
  | { success: true }
  | { success: false; error: string };

function nowIso(): string {
  return new Date().toISOString();
}

function byPosition<T extends { position: string }>(a: T, b: T): number {
  return a.position < b.position ? -1 : a.position > b.position ? 1 : 0;
}

function liveItems(items: PageGroupItem[]): PageGroupItem[] {
  return items.filter((i) => i.deletedAt === null);
}

function mutationError(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

async function getSessionUserId(): Promise<string | null> {
  try {
    const supabase = getWebSupabaseClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Accept `http`/`https` URLs only. Returns the normalized URL or an error.
 * Exported so the add-page form and the hook share one rule.
 */
export function validateGroupPageUrl(
  raw: string
): { ok: true; urlNormalized: string } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: 'Enter a page URL.' };
  let protocol = '';
  try {
    protocol = new URL(trimmed).protocol;
  } catch {
    return { ok: false, error: 'Enter a valid http or https URL.' };
  }
  if (protocol !== 'http:' && protocol !== 'https:') {
    return { ok: false, error: 'Only http and https URLs can be added.' };
  }
  return { ok: true, urlNormalized: normalizePageUrl(trimmed) };
}

const HOSTNAME_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i;

/**
 * Accept a bare hostname (`example.com`) or a full URL and return the clean
 * hostname, or an error. Exported so the add-domain form shares one rule.
 */
export function validateGroupHostname(
  raw: string
): { ok: true; hostname: string } | { ok: false; error: string } {
  const trimmed = raw.trim().toLowerCase().replace(/\.+$/, '');
  if (!trimmed) return { ok: false, error: 'Enter a domain name.' };
  let host = trimmed;
  if (host.includes('://')) {
    try {
      host = new URL(host).hostname.toLowerCase().replace(/\.+$/, '');
    } catch {
      return { ok: false, error: 'Enter a valid domain name.' };
    }
  } else {
    host = host.split('/')[0]!.split(':')[0]!;
  }
  if (!host || !HOSTNAME_RE.test(host)) {
    return { ok: false, error: 'Enter a valid domain name.' };
  }
  return { ok: true, hostname: host };
}

export interface WebGroupsState {
  status: 'loading' | 'ready' | 'error';
  isGuest: boolean;
  groups: PageGroup[];
  itemsByGroup: Record<string, PageGroupItem[]>;
  liveItemsOf: (groupId: string) => PageGroupItem[];
  itemCountOf: (groupId: string) => number;
  error: string | null;
  refresh: () => Promise<void>;
  createGroup: (name: string, color: GroupColor) => Promise<PageGroup | null>;
  renameGroup: (id: string, name: string) => Promise<WebGroupMutationResult>;
  recolorGroup: (id: string, color: GroupColor) => Promise<WebGroupMutationResult>;
  deleteGroup: (id: string) => Promise<WebGroupMutationResult>;
  restoreGroup: (id: string) => Promise<WebGroupMutationResult>;
  moveGroup: (
    id: string,
    to: 'top' | 'up' | 'down'
  ) => Promise<WebGroupMutationResult>;
  addPage: (groupId: string, rawUrl: string) => Promise<WebGroupMutationResult>;
  addDomain: (
    groupId: string,
    rawHostname: string,
    includeSubdomains: boolean
  ) => Promise<WebGroupMutationResult>;
  removeItem: (groupId: string, itemId: string) => Promise<WebGroupMutationResult>;
  restoreItem: (groupId: string, itemId: string) => Promise<WebGroupMutationResult>;
  moveItem: (
    groupId: string,
    itemId: string,
    to: 'top' | 'up' | 'down'
  ) => Promise<WebGroupMutationResult>;
  /** Merge a remote group row (Realtime) with LWW, no refetch. */
  applyRemoteGroup: (remote: PageGroup) => void;
  /** Merge a remote item row (Realtime) with LWW, no refetch. */
  applyRemoteItem: (remote: PageGroupItem) => void;
  /** Drop a remotely deleted group without a refetch. */
  removeRemoteGroup: (id: string) => void;
  /** Drop a remotely deleted item without a refetch. */
  removeRemoteItem: (groupId: string, itemId: string) => void;
}

const GUEST_NOOP: WebGroupMutationResult = {
  success: false,
  error: 'Sign in to manage groups.',
};

/**
 * Web Groups store. Guest (or missing repository) = empty ready state.
 */
export function useWebGroups(opts: UseWebGroupsOpts): WebGroupsState {
  const { isAuthenticated, repository = null } = opts;
  const repoRef = useRef(repository);
  repoRef.current = repository;
  const isAuthenticatedRef = useRef(isAuthenticated);
  isAuthenticatedRef.current = isAuthenticated;

  const [status, setStatus] = useState<WebGroupsState['status']>(() =>
    !isAuthenticated ? 'ready' : repository ? 'loading' : 'ready'
  );
  const [groups, setGroups] = useState<PageGroup[]>([]);
  const [itemsByGroup, setItemsByGroup] = useState<Record<string, PageGroupItem[]>>({});
  const [error, setError] = useState<string | null>(null);

  // Synchronous mirrors of state so optimistic snapshots, rollbacks, and
  // cache write-through always see the latest committed values (setState is
  // async; every update below goes through applyGroups/applyItems).
  const groupsRef = useRef<PageGroup[]>([]);
  const itemsRef = useRef<Record<string, PageGroupItem[]>>({});
  const loadGenRef = useRef(0);

  const applyGroups = useCallback((next: PageGroup[]) => {
    groupsRef.current = next;
    setGroups(next);
  }, []);

  const applyItems = useCallback((next: Record<string, PageGroupItem[]>) => {
    itemsRef.current = next;
    setItemsByGroup(next);
  }, []);

  /** Fire-and-forget cache write-through of the current snapshot. */
  const persistCache = useCallback(() => {
    if (!isAuthenticatedRef.current) return;
    const groupsSnap = groupsRef.current;
    const itemsSnap = itemsRef.current;
    void (async () => {
      const userId = await getSessionUserId();
      if (!userId || !isAuthenticatedRef.current) return;
      try {
        await writeWebGroupsCache(userId, groupsSnap, itemsSnap);
      } catch {
        // Cache is best-effort; state is the source of truth.
      }
    })();
  }, []);

  const load = useCallback(async () => {
    const gen = ++loadGenRef.current;
    if (!isAuthenticatedRef.current || !repoRef.current) {
      applyGroups([]);
      applyItems({});
      setError(null);
      setStatus('ready');
      return;
    }
    // Warm paint from the per-user groups cache before the network.
    let paintedWarm = false;
    try {
      const userId = await getSessionUserId();
      if (gen !== loadGenRef.current || !isAuthenticatedRef.current) return;
      if (userId) {
        const cached = await readWebGroupsCache(userId);
        if (gen !== loadGenRef.current || !isAuthenticatedRef.current) return;
        if (cached) {
          applyGroups(cached.groups);
          applyItems(cached.itemsByGroup);
          setError(null);
          setStatus('ready');
          paintedWarm = true;
        }
      }
    } catch {
      // Cache is optional; fall through to network.
    }
    if (!paintedWarm) {
      setStatus('loading');
    }
    try {
      const repo = repoRef.current;
      if (!repo) {
        if (gen !== loadGenRef.current || !isAuthenticatedRef.current) return;
        applyGroups([]);
        applyItems({});
        setError(null);
        setStatus('ready');
        return;
      }
      const fetched = (await repo.listGroups()).filter((g) => g.deletedAt === null);
      const entries = await Promise.all(
        fetched.map(async (g) => [g.id, await repo.listItems(g.id)] as const)
      );
      if (gen !== loadGenRef.current || !isAuthenticatedRef.current) return;
      const map: Record<string, PageGroupItem[]> = {};
      for (const [id, items] of entries) map[id] = items;
      applyGroups(fetched);
      applyItems(map);
      setError(null);
      setStatus('ready');
      persistCache();
    } catch (err) {
      if (gen !== loadGenRef.current || !isAuthenticatedRef.current) return;
      const message = mutationError(err, 'Failed to load groups');
      if (paintedWarm) {
        // Keep warm data on screen; surface the error for retry.
        setError(message);
        return;
      }
      setError(message);
      setStatus('error');
    }
  }, [applyGroups, applyItems, persistCache]);

  useEffect(() => {
    if (!isAuthenticated) {
      loadGenRef.current += 1;
      applyGroups([]);
      applyItems({});
      setError(null);
      setStatus('ready');
      return;
    }
    if (!repository) {
      loadGenRef.current += 1;
      applyGroups([]);
      applyItems({});
      setError(null);
      setStatus('ready');
      return;
    }
    void load();
  }, [isAuthenticated, repository, load, applyGroups, applyItems]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  const liveItemsOf = useCallback(
    (groupId: string) => liveItems(itemsByGroup[groupId] ?? []),
    [itemsByGroup]
  );

  const itemCountOf = useCallback(
    (groupId: string) => liveItemsOf(groupId).length,
    [liveItemsOf]
  );

  const refreshItems = useCallback(
    async (groupId: string) => {
      const repo = repoRef.current;
      if (!repo) return;
      const items = await repo.listItems(groupId);
      const next = { ...itemsRef.current, [groupId]: items };
      applyItems(next);
    },
    [applyItems]
  );

  const reloadGroups = useCallback(async () => {
    const repo = repoRef.current;
    if (!repo) return;
    const fetched = (await repo.listGroups()).filter((g) => g.deletedAt === null);
    applyGroups(fetched);
  }, [applyGroups]);

  const createGroup = useCallback(
    async (name: string, color: GroupColor): Promise<PageGroup | null> => {
      const repo = repoRef.current;
      if (!isAuthenticated || !repo) return null;
      const trimmed = name.trim();
      if (trimmed.length < 1 || trimmed.length > 80) return null;
      try {
        const group = await repo.createGroup({ name: trimmed, color });
        applyGroups([...groupsRef.current, group]);
        applyItems({ ...itemsRef.current, [group.id]: [] });
        persistCache();
        trackEvent('group_created');
        return group;
      } catch {
        return null;
      }
    },
    [isAuthenticated, applyGroups, applyItems, persistCache]
  );

  const renameGroup = useCallback(
    async (id: string, name: string): Promise<WebGroupMutationResult> => {
      const repo = repoRef.current;
      if (!isAuthenticated || !repo) return GUEST_NOOP;
      const trimmed = name.trim();
      if (trimmed.length < 1 || trimmed.length > 80) {
        return { success: false, error: 'Name must be 1–80 characters.' };
      }
      const snapshot = groupsRef.current;
      const next = snapshot.map((g) =>
        g.id === id ? { ...g, name: trimmed, updatedAt: nowIso() } : g
      );
      applyGroups(next);
      try {
        await repo.renameGroup(id, trimmed);
        persistCache();
        return { success: true };
      } catch (err) {
        applyGroups(snapshot);
        return { success: false, error: mutationError(err, 'Could not rename group') };
      }
    },
    [isAuthenticated, applyGroups, persistCache]
  );

  const recolorGroup = useCallback(
    async (id: string, color: GroupColor): Promise<WebGroupMutationResult> => {
      const repo = repoRef.current;
      if (!isAuthenticated || !repo) return GUEST_NOOP;
      const snapshot = groupsRef.current;
      const next = snapshot.map((g) =>
        g.id === id ? { ...g, color, updatedAt: nowIso() } : g
      );
      applyGroups(next);
      try {
        await repo.recolorGroup(id, color);
        persistCache();
        return { success: true };
      } catch (err) {
        applyGroups(snapshot);
        return { success: false, error: mutationError(err, 'Could not change color') };
      }
    },
    [isAuthenticated, applyGroups, persistCache]
  );

  const deleteGroup = useCallback(
    async (id: string): Promise<WebGroupMutationResult> => {
      const repo = repoRef.current;
      if (!isAuthenticated || !repo) return GUEST_NOOP;
      const groupsSnap = groupsRef.current;
      const itemsSnap = itemsRef.current;
      const nextItems = { ...itemsSnap };
      delete nextItems[id];
      applyGroups(groupsSnap.filter((g) => g.id !== id));
      applyItems(nextItems);
      try {
        await repo.deleteGroup(id);
        persistCache();
        trackEvent('group_deleted');
        return { success: true };
      } catch (err) {
        applyGroups(groupsSnap);
        applyItems(itemsSnap);
        return { success: false, error: mutationError(err, 'Could not delete group') };
      }
    },
    [isAuthenticated, applyGroups, applyItems, persistCache]
  );

  const restoreGroup = useCallback(
    async (id: string): Promise<WebGroupMutationResult> => {
      const repo = repoRef.current;
      if (!isAuthenticated || !repo) return GUEST_NOOP;
      const groupsSnap = groupsRef.current;
      try {
        await repo.restoreGroup(id);
        await reloadGroups();
        persistCache();
        return { success: true };
      } catch (err) {
        applyGroups(groupsSnap);
        return { success: false, error: mutationError(err, 'Could not restore group') };
      }
    },
    [isAuthenticated, applyGroups, reloadGroups, persistCache]
  );

  const moveGroup = useCallback(
    async (
      id: string,
      to: 'top' | 'up' | 'down'
    ): Promise<WebGroupMutationResult> => {
      const repo = repoRef.current;
      if (!isAuthenticated || !repo) return GUEST_NOOP;
      const groupsSnap = groupsRef.current;
      try {
        await repo.moveGroup(id, to);
        await reloadGroups();
        persistCache();
        return { success: true };
      } catch (err) {
        applyGroups(groupsSnap);
        return { success: false, error: mutationError(err, 'Could not move group') };
      }
    },
    [isAuthenticated, applyGroups, reloadGroups, persistCache]
  );

  const addPage = useCallback(
    async (groupId: string, rawUrl: string): Promise<WebGroupMutationResult> => {
      const repo = repoRef.current;
      if (!isAuthenticated || !repo) return GUEST_NOOP;
      const checked = validateGroupPageUrl(rawUrl);
      if (!checked.ok) return { success: false, error: checked.error };
      const snapshot = itemsRef.current;
      const live = liveItems(snapshot[groupId] ?? []);
      if (
        live.some(
          (i) => i.kind === 'page' && normalizePageUrl(i.urlNormalized) === checked.urlNormalized
        )
      ) {
        return { success: false, error: 'This page is already in the group.' };
      }
      // Optimistic temp row; replaced by the post-write refresh.
      const sorted = live.slice().sort(byPosition);
      const last = sorted[sorted.length - 1];
      const temp: PageGroupItem = {
        kind: 'page',
        urlNormalized: checked.urlNormalized,
        title: null,
        faviconUrl: null,
        id: `temp-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`,
        groupId,
        position: last ? positionBetween(last.position) : positionBetween(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        deletedAt: null,
      };
      applyItems({ ...snapshot, [groupId]: [...(snapshot[groupId] ?? []), temp] });
      try {
        await repo.addPage(groupId, checked.urlNormalized);
        await refreshItems(groupId);
        persistCache();
        trackEvent('group_item_added', { kind: 'page' });
        return { success: true };
      } catch (err) {
        applyItems(snapshot);
        return { success: false, error: mutationError(err, 'Could not add page') };
      }
    },
    [isAuthenticated, applyItems, refreshItems, persistCache]
  );

  const addDomain = useCallback(
    async (
      groupId: string,
      rawHostname: string,
      includeSubdomains: boolean
    ): Promise<WebGroupMutationResult> => {
      const repo = repoRef.current;
      if (!isAuthenticated || !repo) return GUEST_NOOP;
      const checked = validateGroupHostname(rawHostname);
      if (!checked.ok) return { success: false, error: checked.error };
      const snapshot = itemsRef.current;
      const live = liveItems(snapshot[groupId] ?? []);
      if (
        live.some(
          (i) =>
            i.kind === 'domain' &&
            i.hostname.trim().toLowerCase() === checked.hostname &&
            i.includeSubdomains === includeSubdomains
        )
      ) {
        return { success: false, error: 'This domain is already in the group.' };
      }
      // A page already covered by the new rule makes the rule redundant; the
      // repository still stores rules independently, so only exact dupes block.
      const sorted = live.slice().sort(byPosition);
      const last = sorted[sorted.length - 1];
      const temp: PageGroupItem = {
        kind: 'domain',
        hostname: checked.hostname,
        includeSubdomains,
        id: `temp-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`,
        groupId,
        position: last ? positionBetween(last.position) : positionBetween(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        deletedAt: null,
      };
      applyItems({ ...snapshot, [groupId]: [...(snapshot[groupId] ?? []), temp] });
      try {
        await repo.addDomain(groupId, checked.hostname, includeSubdomains);
        await refreshItems(groupId);
        persistCache();
        trackEvent('group_item_added', { kind: 'domain' });
        return { success: true };
      } catch (err) {
        applyItems(snapshot);
        return { success: false, error: mutationError(err, 'Could not add domain') };
      }
    },
    [isAuthenticated, applyItems, refreshItems, persistCache]
  );

  const removeItem = useCallback(
    async (groupId: string, itemId: string): Promise<WebGroupMutationResult> => {
      const repo = repoRef.current;
      if (!isAuthenticated || !repo) return GUEST_NOOP;
      const snapshot = itemsRef.current;
      const next = { ...snapshot };
      next[groupId] = (next[groupId] ?? []).filter((i) => i.id !== itemId);
      applyItems(next);
      try {
        await repo.removeItem(groupId, itemId);
        await refreshItems(groupId);
        persistCache();
        return { success: true };
      } catch (err) {
        applyItems(snapshot);
        return { success: false, error: mutationError(err, 'Could not remove item') };
      }
    },
    [isAuthenticated, applyItems, refreshItems, persistCache]
  );

  const restoreItem = useCallback(
    async (groupId: string, itemId: string): Promise<WebGroupMutationResult> => {
      const repo = repoRef.current;
      if (!isAuthenticated || !repo) return GUEST_NOOP;
      const snapshot = itemsRef.current;
      try {
        await repo.restoreItem(groupId, itemId);
        await refreshItems(groupId);
        persistCache();
        return { success: true };
      } catch (err) {
        applyItems(snapshot);
        return { success: false, error: mutationError(err, 'Could not restore item') };
      }
    },
    [isAuthenticated, applyItems, refreshItems, persistCache]
  );

  const moveItem = useCallback(
    async (
      groupId: string,
      itemId: string,
      to: 'top' | 'up' | 'down'
    ): Promise<WebGroupMutationResult> => {
      const repo = repoRef.current;
      if (!isAuthenticated || !repo) return GUEST_NOOP;
      const snapshot = itemsRef.current;
      try {
        await repo.moveItem(groupId, itemId, to);
        await refreshItems(groupId);
        persistCache();
        return { success: true };
      } catch (err) {
        applyItems(snapshot);
        return { success: false, error: mutationError(err, 'Could not move item') };
      }
    },
    [isAuthenticated, applyItems, refreshItems, persistCache]
  );

  /**
   * Merge a remote group row with last-write-wins (`mergeRow`): tombstones
   * remove the row, unknown live rows insert sorted, concurrent writes
   * converge deterministically. No refetch.
   */
  const applyRemoteGroup = useCallback(
    (remote: PageGroup) => {
      if (!isAuthenticatedRef.current) return;
      const prev = groupsRef.current;
      const local = prev.find((g) => g.id === remote.id);
      if (!local) {
        if (remote.deletedAt !== null) return;
        applyGroups([...prev, remote].sort(byPosition));
        persistCache();
        return;
      }
      const winner = mergeRow(local, remote);
      if (winner.deletedAt !== null) {
        applyGroups(prev.filter((g) => g.id !== remote.id));
        const nextItems = { ...itemsRef.current };
        delete nextItems[remote.id];
        applyItems(nextItems);
        persistCache();
        return;
      }
      if (winner === remote) {
        applyGroups(prev.map((g) => (g.id === remote.id ? remote : g)));
        persistCache();
      }
    },
    [applyGroups, applyItems, persistCache]
  );

  /** Merge a remote item row with last-write-wins. No refetch. */
  const applyRemoteItem = useCallback(
    (remote: PageGroupItem) => {
      if (!isAuthenticatedRef.current) return;
      const prev = itemsRef.current[remote.groupId] ?? [];
      const local = prev.find((i) => i.id === remote.id);
      if (!local) {
        if (remote.deletedAt !== null) return;
        applyItems({
          ...itemsRef.current,
          [remote.groupId]: [...prev, remote].sort(byPosition),
        });
        persistCache();
        return;
      }
      const winner = mergeRow(local, remote);
      if (winner.deletedAt !== null) {
        applyItems({
          ...itemsRef.current,
          [remote.groupId]: prev.filter((i) => i.id !== remote.id),
        });
        persistCache();
        return;
      }
      if (winner === remote) {
        applyItems({
          ...itemsRef.current,
          [remote.groupId]: prev.map((i) => (i.id === remote.id ? remote : i)),
        });
        persistCache();
      }
    },
    [applyItems, persistCache]
  );

  const removeRemoteGroup = useCallback(
    (id: string) => {
      if (!isAuthenticatedRef.current) return;
      applyGroups(groupsRef.current.filter((g) => g.id !== id));
      const nextItems = { ...itemsRef.current };
      delete nextItems[id];
      applyItems(nextItems);
      persistCache();
    },
    [applyGroups, applyItems, persistCache]
  );

  const removeRemoteItem = useCallback(
    (groupId: string, itemId: string) => {
      if (!isAuthenticatedRef.current) return;
      const prev = itemsRef.current[groupId] ?? [];
      if (!prev.some((i) => i.id === itemId)) return;
      applyItems({
        ...itemsRef.current,
        [groupId]: prev.filter((i) => i.id !== itemId),
      });
      persistCache();
    },
    [applyItems, persistCache]
  );

  return {
    status: isAuthenticated ? status : 'ready',
    isGuest: !isAuthenticated,
    groups: isAuthenticated ? groups : [],
    itemsByGroup: isAuthenticated ? itemsByGroup : {},
    liveItemsOf: (groupId) => (isAuthenticated ? liveItemsOf(groupId) : []),
    itemCountOf: (groupId) => (isAuthenticated ? itemCountOf(groupId) : 0),
    error: isAuthenticated ? error : null,
    refresh,
    createGroup,
    renameGroup,
    recolorGroup,
    deleteGroup,
    restoreGroup,
    moveGroup,
    addPage,
    addDomain,
    removeItem,
    restoreItem,
    moveItem,
    applyRemoteGroup,
    applyRemoteItem,
    removeRemoteGroup,
    removeRemoteItem,
  };
}
