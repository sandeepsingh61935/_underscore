/**
 * @file useWebGroupsRealtime.ts
 * @description Web Groups Realtime subscription (plan Phase 2 Task 2.5,
 * ADR-032 §8) — the web app's first Realtime subscription.
 *
 * One channel per signed-in session (`web-groups-sync`) with
 * `postgres_changes` bindings on `page_groups` and `page_group_items`,
 * owner-filtered (`user_id=eq.<uid>`) like the extension's `groups-sync`
 * channel. Remote rows are handed to the `useWebGroups` merge callbacks
 * (`mergeRow` into cache + state, no refetch).
 *
 * - Token refresh: `realtime.setAuth` before subscribe and on every
 *   `TOKEN_REFRESHED` auth event.
 * - Reconnect: exponential backoff (1s doubling, 30s cap, 5 attempts).
 * - Gap coverage: refetch (`refresh`) after a reconnect re-subscribes.
 * - Unsubscribe on sign-out and on unmount.
 *
 * Web-only: no `chrome.*` access anywhere in this file.
 */

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useMemo, useRef } from 'react';

import { getWebSupabaseClient } from '@/shared/auth/supabase-web-client';
import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';
import {
  isGroupRowSoftDeleted,
  transformGroupItemRow,
  transformGroupRow,
  type SupabaseGroupItemRow,
  type SupabaseGroupRow,
} from '@/shared/utils/supabase-group-row';

/** Single channel name for the signed-in web session. */
export const WEB_GROUPS_REALTIME_CHANNEL = 'web-groups-sync';

/** Max reconnect attempts before giving up until the next mount/sign-in. */
export const WEB_GROUPS_REALTIME_MAX_ATTEMPTS = 5;

/** Exponential backoff for Realtime reconnects (1s doubling, 30s cap). */
export function webGroupsRealtimeBackoffMs(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, 30_000);
}

export interface WebGroupsRealtimeHandlers {
  applyRemoteGroup: (group: PageGroup) => void;
  applyRemoteItem: (item: PageGroupItem) => void;
  removeRemoteGroup: (id: string) => void;
  removeRemoteItem: (groupId: string, itemId: string) => void;
  /** Refetch after a reconnect to cover the gap. */
  refresh: () => Promise<void>;
}

export interface UseWebGroupsRealtimeOpts extends WebGroupsRealtimeHandlers {
  isAuthenticated: boolean;
  /** Injected for tests; production default is the shared web client. */
  client?: SupabaseClient;
}

type GroupPayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  new: SupabaseGroupRow | null | undefined;
  old: { id?: string } | null | undefined;
};

type GroupItemPayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  new: SupabaseGroupItemRow | null | undefined;
  old: { id?: string; group_id?: string } | null | undefined;
};

function setRealtimeAuth(client: SupabaseClient, token: string): void {
  try {
    client.realtime.setAuth(token);
  } catch {
    // Realtime auth is best-effort; the channel subscribe still runs.
  }
}

/**
 * Subscribe to Page Groups Realtime for the signed-in session. No-op (no
 * channel) while signed out. Rendered panes update via the merge handlers
 * without a refetch; a refetch runs only after a reconnect.
 */
export function useWebGroupsRealtime(opts: UseWebGroupsRealtimeOpts): void {
  const { isAuthenticated, client } = opts;
  const handlersRef = useRef<WebGroupsRealtimeHandlers>({
    applyRemoteGroup: opts.applyRemoteGroup,
    applyRemoteItem: opts.applyRemoteItem,
    removeRemoteGroup: opts.removeRemoteGroup,
    removeRemoteItem: opts.removeRemoteItem,
    refresh: opts.refresh,
  });
  handlersRef.current = {
    applyRemoteGroup: opts.applyRemoteGroup,
    applyRemoteItem: opts.applyRemoteItem,
    removeRemoteGroup: opts.removeRemoteGroup,
    removeRemoteItem: opts.removeRemoteItem,
    refresh: opts.refresh,
  };

  const resolvedClient = useMemo(
    () => client ?? getWebSupabaseClient(),
    [client]
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    const supabase = resolvedClient;
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    let needsRefetch = false;

    const clearTimer = (): void => {
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const teardownChannel = (): void => {
      if (channel) {
        try {
          void channel.unsubscribe();
        } catch {
          // Ignore teardown errors during sign-out/unmount.
        }
        channel = null;
      }
    };

    const handleGroupPayload = (payload: GroupPayload): void => {
      const handlers = handlersRef.current;
      if (payload.eventType === 'DELETE') {
        const id = payload.old?.id;
        if (id) handlers.removeRemoteGroup(id);
        return;
      }
      const row = payload.new;
      if (!row) return;
      if (payload.eventType === 'UPDATE' && isGroupRowSoftDeleted(row)) {
        handlers.removeRemoteGroup(row.id);
        return;
      }
      handlers.applyRemoteGroup(transformGroupRow(row));
    };

    const handleItemPayload = (payload: GroupItemPayload): void => {
      const handlers = handlersRef.current;
      if (payload.eventType === 'DELETE') {
        const old = payload.old;
        if (old?.id && old?.group_id) handlers.removeRemoteItem(old.group_id, old.id);
        return;
      }
      const row = payload.new;
      if (!row) return;
      if (payload.eventType === 'UPDATE' && isGroupRowSoftDeleted(row)) {
        handlers.removeRemoteItem(row.group_id, row.id);
        return;
      }
      handlers.applyRemoteItem(transformGroupItemRow(row));
    };

    const scheduleReconnect = (): void => {
      if (cancelled || attempts >= WEB_GROUPS_REALTIME_MAX_ATTEMPTS) return;
      const delay = webGroupsRealtimeBackoffMs(attempts);
      attempts += 1;
      needsRefetch = true;
      teardownChannel();
      clearTimer();
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (!cancelled) void subscribe();
      }, delay);
    };

    const subscribe = async (): Promise<void> => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (cancelled) return;
        if (error || !session) {
          scheduleReconnect();
          return;
        }
        const userId = session.user.id;
        setRealtimeAuth(supabase, session.access_token);
        if (cancelled) return;
        teardownChannel();
        channel = supabase
          .channel(WEB_GROUPS_REALTIME_CHANNEL)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'page_groups',
              filter: `user_id=eq.${userId}`,
            },
            (payload) => handleGroupPayload(payload as unknown as GroupPayload)
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'page_group_items',
              filter: `user_id=eq.${userId}`,
            },
            (payload) => handleItemPayload(payload as unknown as GroupItemPayload)
          )
          .subscribe((status) => {
            if (cancelled) return;
            if (status === 'SUBSCRIBED') {
              attempts = 0;
              if (needsRefetch) {
                needsRefetch = false;
                void handlersRef.current.refresh();
              }
            } else if (
              status === 'CHANNEL_ERROR' ||
              status === 'TIMED_OUT' ||
              status === 'CLOSED'
            ) {
              scheduleReconnect();
            }
          });
      } catch {
        scheduleReconnect();
      }
    };

    // Registered ONCE per effect lifetime (not per subscribe attempt): every
    // reconnect re-runs subscribe(), and a listener registered there would
    // leak (authUnsubscribe overwritten, prior listeners accumulating).
    const { data: authListener } = supabase.auth.onAuthStateChange((event, next) => {
      if (cancelled) return;
      if (event === 'TOKEN_REFRESHED' && next?.access_token) {
        setRealtimeAuth(supabase, next.access_token);
      }
    });

    void subscribe();

    return () => {
      cancelled = true;
      clearTimer();
      teardownChannel();
      try {
        authListener.subscription.unsubscribe();
      } catch {
        // Ignore teardown errors during sign-out/unmount.
      }
    };
  }, [isAuthenticated, resolvedClient]);
}
