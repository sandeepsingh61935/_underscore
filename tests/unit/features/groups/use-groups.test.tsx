/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import { useBrowserTabSync } from '@/features/groups/hooks/useBrowserTabSync';
import { useGroup } from '@/features/groups/hooks/useGroup';
import { useGroupMutations } from '@/features/groups/hooks/useGroupMutations';
import { useGroups } from '@/features/groups/hooks/useGroups';
import { usePageGroupMembership } from '@/features/groups/hooks/usePageGroupMembership';
import { useUngroupedTabs } from '@/features/groups/hooks/useUngroupedTabs';

const ipcAction = vi.fn();
const hasRuntime = vi.fn(() => true);

vi.mock('@/shared/hooks/useIpcAction', () => ({
  useIpcAction: () => ipcAction,
  hasChromeRuntime: () => hasRuntime(),
}));

vi.mock('@/features/collections/hooks/use-library-data-changed', () => ({
  useLibraryDataChanged: () => undefined,
}));

const group = {
  id: 'g-1',
  name: 'Reading',
  color: 'blue',
  position: 'a0',
  boundDeviceId: null,
  boundDeviceLabel: null,
  boundBrowser: null,
  boundAt: null,
  createdAt: '2026-09-28T00:00:00.000Z',
  updatedAt: '2026-09-28T00:00:00.000Z',
  deletedAt: null,
};

const item = {
  id: 'i-1',
  kind: 'page',
  groupId: 'g-1',
  position: 'a0',
  urlNormalized: 'https://example.com/a',
  title: 'A',
  faviconUrl: null,
  createdAt: '2026-09-28T00:00:00.000Z',
  updatedAt: '2026-09-28T00:00:00.000Z',
  deletedAt: null,
};

describe('group IPC hooks', () => {
  beforeEach(() => {
    ipcAction.mockReset();
    hasRuntime.mockReset();
    hasRuntime.mockReturnValue(true);
  });

  it('useGroups loads groups and items, refetches on demand', async () => {
    ipcAction.mockResolvedValue({ success: true, data: { groups: [group], items: [item] } });
    const { result } = renderHook(() => useGroups());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(ipcAction).toHaveBeenCalledWith({});
    expect(result.current.groups).toEqual([group]);
    expect(result.current.items).toEqual([item]);
    expect(result.current.error).toBeNull();

    ipcAction.mockResolvedValue({ success: true, data: { groups: [], items: [] } });
    await result.current.refetch();
    await waitFor(() => {
      expect(result.current.groups).toEqual([]);
    });
  });

  it('useGroups surfaces IPC errors without throwing', async () => {
    ipcAction.mockResolvedValue({ success: false, error: 'boom' });
    const { result } = renderHook(() => useGroups());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.error?.message).toBe('boom');
    expect(result.current.groups).toEqual([]);
  });

  it('useGroups returns a safe empty fallback with no chrome runtime', async () => {
    hasRuntime.mockReturnValue(false);
    const { result } = renderHook(() => useGroups());
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(ipcAction).not.toHaveBeenCalled();
    expect(result.current.groups).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('useGroup fetches by id and clears on null id', async () => {
    ipcAction.mockResolvedValue({ success: true, data: { group, items: [item] } });
    const { result, rerender } = renderHook(({ id }) => useGroup(id), {
      initialProps: { id: 'g-1' as string | null },
    });
    await waitFor(() => {
      expect(result.current.group?.id).toBe('g-1');
    });
    expect(ipcAction).toHaveBeenCalledWith({ id: 'g-1' });
    expect(result.current.items).toEqual([item]);

    rerender({ id: null });
    await waitFor(() => {
      expect(result.current.group).toBeNull();
    });
  });

  it('useGroupMutations sends discriminated commands and passes cap details', async () => {
    ipcAction.mockImplementation(async (payload: unknown) => {
      const body = payload as { command: string; name?: string };
      if (body.command === 'createGroup' && body.name === 'Overflow') {
        return {
          success: false,
          error: 'Group limit reached (200 groups per user)',
          code: 'GROUP_CAP_EXCEEDED',
          scope: 'groups',
          limit: 200,
        };
      }
      if (body.command === 'createGroup') return { success: true, data: { group } };
      if (body.command === 'addPage') return { success: true, data: { item } };
      return { success: true, data: {} };
    });
    const { result } = renderHook(() => useGroupMutations());

    const created = await result.current.createGroup('Reading', 'blue');
    expect(created).toEqual({ success: true, data: { group } });
    expect(ipcAction).toHaveBeenCalledWith({
      command: 'createGroup',
      name: 'Reading',
      color: 'blue',
    });

    const added = await result.current.addPage('g-1', { url: 'https://example.com/a' });
    expect(added).toEqual({ success: true, data: { item } });

    const capped = await result.current.createGroup('Overflow');
    expect(capped).toMatchObject({
      success: false,
      code: 'GROUP_CAP_EXCEEDED',
      scope: 'groups',
      limit: 200,
    });

    await result.current.renameGroup('g-1', 'New');
    await result.current.recolorGroup('g-1', 'red');
    await result.current.deleteGroup('g-1');
    await result.current.restoreGroup('g-1');
    await result.current.moveGroup('g-1', 'top');
    await result.current.addDomain('g-1', { hostname: 'example.com' });
    await result.current.removeItem('g-1', 'i-1');
    await result.current.restoreItem('g-1', 'i-1');
    await result.current.moveItem('g-1', 'i-1', 'down');
    const commands = ipcAction.mock.calls.map(
      (args) => (args[0] as { command: string }).command
    );
    expect(commands).toEqual([
      'createGroup',
      'addPage',
      'createGroup',
      'renameGroup',
      'recolorGroup',
      'deleteGroup',
      'restoreGroup',
      'moveGroup',
      'addDomain',
      'removeItem',
      'restoreItem',
      'moveItem',
    ]);
  });

  it('usePageGroupMembership maps memberships and skips fetch without runtime', async () => {
    const memberships = [{ group, viaHostname: null }];
    ipcAction.mockResolvedValue({ success: true, data: { memberships } });
    const { result } = renderHook(() => usePageGroupMembership('https://example.com/a'));
    await waitFor(() => {
      expect(result.current.memberships).toEqual(memberships);
    });
    expect(ipcAction).toHaveBeenCalledWith({ url: 'https://example.com/a' });

    hasRuntime.mockReturnValue(false);
    ipcAction.mockClear();
    const fallback = renderHook(() => usePageGroupMembership('https://example.com/a'));
    await waitFor(() => {
      expect(fallback.result.current.isLoading).toBe(false);
    });
    expect(ipcAction).not.toHaveBeenCalled();
    expect(fallback.result.current.memberships).toEqual([]);
  });

  it('Phase 3 hooks return initial state in test environment', () => {
    const { result: sync } = renderHook(() => useBrowserTabSync());
    expect(sync.current).toMatchObject({
      isSupported: false,
      isEnabled: false,
      isLoading: false,
      error: null,
    });
    const { result: ungrouped } = renderHook(() => useUngroupedTabs());
    expect(ungrouped.current.tabs).toEqual([]);
    expect(ungrouped.current.isSupported).toBe(true);
  });
});
