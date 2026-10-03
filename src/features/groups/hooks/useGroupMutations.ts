/**
 * @file useGroupMutations.ts
 * @description Group write commands for popup views (plan Phase 1 Task 1.5).
 * Every method wraps the GROUP_MUTATE bus channel and returns a promise for
 * sonner toasts and Undo (restoreGroup/restoreItem). GroupCapError details
 * (scope/limit) ride the ActionResult error variant.
 */

import { useCallback } from 'react';

import { useIpcAction, type ActionResult } from '@/shared/hooks/useIpcAction';
import {
  GROUP_MUTATE,
  GROUP_OPEN_IN_BROWSER,
  type GroupOpenInBrowserPayload,
  type GroupOpenInBrowserResponse,
} from '@/shared/schemas/message-schemas';
import type { GroupColor, PageGroup, PageGroupItem } from '@/shared/types/page-group';
import { trackEvent } from '@/web/lib/analytics';

export interface GroupMutateData {
  group?: PageGroup;
  item?: PageGroupItem;
}

export type GroupMutationResult = ActionResult<GroupMutateData>;

export function useGroupMutations(): {
  createGroup: (name: string, color?: GroupColor) => Promise<GroupMutationResult>;
  renameGroup: (id: string, name: string) => Promise<GroupMutationResult>;
  recolorGroup: (id: string, color: GroupColor) => Promise<GroupMutationResult>;
  deleteGroup: (id: string, closeTabs?: boolean) => Promise<GroupMutationResult>;
  restoreGroup: (id: string) => Promise<GroupMutationResult>;
  moveGroup: (id: string, to: 'top' | 'up' | 'down') => Promise<GroupMutationResult>;
  addPage: (
    groupId: string,
    input: { url: string; title?: string | null; faviconUrl?: string | null }
  ) => Promise<GroupMutationResult>;
  addDomain: (
    groupId: string,
    input: { hostname: string; includeSubdomains?: boolean }
  ) => Promise<GroupMutationResult>;
  removeItem: (groupId: string, itemId: string) => Promise<GroupMutationResult>;
  restoreItem: (groupId: string, itemId: string) => Promise<GroupMutationResult>;
  moveItem: (
    groupId: string,
    itemId: string,
    to: 'top' | 'up' | 'down'
  ) => Promise<GroupMutationResult>;
  openInBrowser: (
    groupId: string,
    force?: boolean
  ) => Promise<ActionResult<GroupOpenInBrowserResponse>>;
} {
  const mutate = useIpcAction<Record<string, unknown>, GroupMutateData>(GROUP_MUTATE);

  const send = useCallback(
    (payload: Record<string, unknown>): Promise<GroupMutationResult> =>
      mutate(payload),
    [mutate]
  );

  const openAction = useIpcAction<GroupOpenInBrowserPayload, GroupOpenInBrowserResponse>(
    GROUP_OPEN_IN_BROWSER
  );

  const openInBrowser = useCallback(
    async (groupId: string, force = false): Promise<ActionResult<GroupOpenInBrowserResponse>> => {
      const res = await openAction({ groupId, force });
      if (res.success && res.data?.ok) {
        trackEvent('group_opened_in_browser', {
          tabCount: res.data.tabCount ?? 0,
          browser: 'chrome',
        });
      }
      return res;
    },
    [openAction]
  );

  const createGroup = useCallback(
    async (name: string, color?: GroupColor): Promise<GroupMutationResult> => {
      const res = await send(
        color === undefined ? { command: 'createGroup', name } : { command: 'createGroup', name, color }
      );
      if (res.success) {
        trackEvent('group_created');
      }
      return res;
    },
    [send]
  );
  const renameGroup = useCallback(
    (id: string, name: string): Promise<GroupMutationResult> =>
      send({ command: 'renameGroup', id, name }),
    [send]
  );
  const recolorGroup = useCallback(
    (id: string, color: GroupColor): Promise<GroupMutationResult> =>
      send({ command: 'recolorGroup', id, color }),
    [send]
  );
  const deleteGroup = useCallback(
    async (id: string, closeTabs?: boolean): Promise<GroupMutationResult> => {
      const res = await send(
        closeTabs !== undefined
          ? { command: 'deleteGroup', id, closeTabs }
          : { command: 'deleteGroup', id }
      );
      if (res.success) {
        trackEvent('group_deleted');
      }
      return res;
    },
    [send]
  );
  const restoreGroup = useCallback(
    (id: string): Promise<GroupMutationResult> =>
      send({ command: 'restoreGroup', id }),
    [send]
  );
  const moveGroup = useCallback(
    (id: string, to: 'top' | 'up' | 'down'): Promise<GroupMutationResult> =>
      send({ command: 'moveGroup', id, to }),
    [send]
  );
  const addPage = useCallback(
    async (
      groupId: string,
      input: { url: string; title?: string | null; faviconUrl?: string | null }
    ): Promise<GroupMutationResult> => {
      const res = await send({ command: 'addPage', groupId, ...input });
      if (res.success) {
        trackEvent('group_item_added', { kind: 'page' });
      }
      return res;
    },
    [send]
  );
  const addDomain = useCallback(
    async (
      groupId: string,
      input: { hostname: string; includeSubdomains?: boolean }
    ): Promise<GroupMutationResult> => {
      const res = await send({ command: 'addDomain', groupId, ...input });
      if (res.success) {
        trackEvent('group_item_added', { kind: 'domain' });
      }
      return res;
    },
    [send]
  );
  const removeItem = useCallback(
    (groupId: string, itemId: string): Promise<GroupMutationResult> =>
      send({ command: 'removeItem', groupId, itemId }),
    [send]
  );
  const restoreItem = useCallback(
    (groupId: string, itemId: string): Promise<GroupMutationResult> =>
      send({ command: 'restoreItem', groupId, itemId }),
    [send]
  );
  const moveItem = useCallback(
    (
      groupId: string,
      itemId: string,
      to: 'top' | 'up' | 'down'
    ): Promise<GroupMutationResult> =>
      send({ command: 'moveItem', groupId, itemId, to }),
    [send]
  );

  return {
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
    openInBrowser,
  };
}
