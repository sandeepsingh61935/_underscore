/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, renderHook, screen, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GroupImportPicker } from '@/features/groups/components/GroupImportPicker';
import { useBrowserTabSync } from '@/features/groups/hooks/useBrowserTabSync';

const {
  toastMock,
  mockStorageGet,
  mockStorageSet,
  mockRequestPermissions,
  mockHasPermissions,
  mockTabGroupsQuery,
  mockTabsQuery,
  mockSendMessage,
} = vi.hoisted(() => {
  const toastFn = Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
  });
  return {
    toastMock: toastFn,
    mockStorageGet: vi.fn(),
    mockStorageSet: vi.fn(),
    mockRequestPermissions: vi.fn(),
    mockHasPermissions: vi.fn(),
    mockTabGroupsQuery: vi.fn(),
    mockTabsQuery: vi.fn(),
    mockSendMessage: vi.fn(),
  };
});

vi.mock('sonner', () => ({
  toast: toastMock,
}));

vi.mock('@/shared/permissions/ensure-tab-group-permissions', () => ({
  isTabGroupApiAvailable: () => true,
  isTabGroupSupported: () => true,
  hasTabGroupPermissions: () => mockHasPermissions(),
  requestTabGroupPermissions: () => mockRequestPermissions(),
  onTabGroupPermissionsRemoved: vi.fn(() => () => {}),
}));

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      local: {
        get: (keys: any, cb?: any) => {
          if (typeof cb === 'function') {
            cb(mockStorageGet(keys));
            return;
          }
          return Promise.resolve(mockStorageGet(keys));
        },
        set: (items: any, cb?: any) => {
          mockStorageSet(items);
          if (typeof cb === 'function') cb();
          return Promise.resolve();
        },
      },
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
    tabGroups: {
      query: (...args: any[]) => mockTabGroupsQuery(...args),
    },
    tabs: {
      query: (...args: any[]) => mockTabsQuery(...args),
    },
    runtime: {
      sendMessage: (...args: any[]) => mockSendMessage(...args),
    },
  },
}));

describe('useBrowserTabSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageGet.mockReturnValue({
      groups_browser_sync_enabled: true,
      groups_auto_sync_new_tab_groups: true,
    });
    mockHasPermissions.mockResolvedValue(true);
    mockRequestPermissions.mockResolvedValue(true);
  });

  it('initializes with state from storage and permissions check', async () => {
    const { result } = renderHook(() => useBrowserTabSync());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isSupported).toBe(true);
    expect(result.current.isEnabled).toBe(true);
    expect(result.current.autoSyncNewGroups).toBe(true);
  });

  it('enableSync requests permissions and updates storage on success', async () => {
    mockStorageGet.mockReturnValue({
      groups_browser_sync_enabled: false,
      groups_auto_sync_new_tab_groups: true,
    });
    mockRequestPermissions.mockResolvedValue(true);

    const { result } = renderHook(() => useBrowserTabSync());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let granted = false;
    await act(async () => {
      granted = await result.current.enableSync();
    });

    expect(granted).toBe(true);
    expect(mockRequestPermissions).toHaveBeenCalled();
    expect(mockStorageSet).toHaveBeenCalledWith(
      expect.objectContaining({ groups_browser_sync_enabled: true })
    );
    expect(result.current.isEnabled).toBe(true);
    expect(result.current.permissionDenied).toBe(false);
  });

  it('enableSync handles permission denial gracefully', async () => {
    mockStorageGet.mockReturnValue({
      groups_browser_sync_enabled: false,
    });
    mockRequestPermissions.mockResolvedValue(false);

    const { result } = renderHook(() => useBrowserTabSync());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let granted = true;
    await act(async () => {
      granted = await result.current.enableSync();
    });

    expect(granted).toBe(false);
    expect(result.current.isEnabled).toBe(false);
    expect(result.current.permissionDenied).toBe(true);
  });

  it('disableSync turns off sync and notifies user via toast', async () => {
    const { result } = renderHook(() => useBrowserTabSync());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.disableSync();
    });

    expect(mockStorageSet).toHaveBeenCalledWith(
      expect.objectContaining({ groups_browser_sync_enabled: false })
    );
    expect(result.current.isEnabled).toBe(false);
    expect(toastMock).toHaveBeenCalledWith(
      'Browser tab sync turned off. Your groups are kept as manual groups.'
    );
  });

  it('setAutoSyncNewGroups updates storage and state', async () => {
    const { result } = renderHook(() => useBrowserTabSync());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.setAutoSyncNewGroups(false);
    });

    expect(mockStorageSet).toHaveBeenCalledWith(
      expect.objectContaining({ groups_auto_sync_new_tab_groups: false })
    );
    expect(result.current.autoSyncNewGroups).toBe(false);
  });
});

describe('GroupImportPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockGroups = [
    { id: 101, title: 'Research Group', color: 'blue' as const, tabCount: 3 },
    { id: 102, title: 'Docs Group', color: 'green' as const, tabCount: 2 },
  ];

  it('renders tab groups with all preselected by default', () => {
    render(
      <GroupImportPicker
        open={true}
        onClose={vi.fn()}
        groups={mockGroups}
      />
    );

    expect(screen.getByText('Import browser tab groups')).toBeInTheDocument();
    expect(screen.getByText('Research Group')).toBeInTheDocument();
    expect(screen.getByText('Docs Group')).toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).toBeChecked();
  });

  it('allows toggling checkboxes and shows selected count', () => {
    render(
      <GroupImportPicker
        open={true}
        onClose={vi.fn()}
        groups={mockGroups}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeDefined();
    fireEvent.click(checkboxes[0]!); // uncheck first

    expect(checkboxes[0]!).not.toBeChecked();
    expect(checkboxes[1]!).toBeChecked();
    expect(screen.getByText('1 of 2 selected')).toBeInTheDocument();
  });

  it('calls onImport with selected group IDs and toasts on confirm', async () => {
    const onImportMock = vi.fn().mockResolvedValue(undefined);
    const onCloseMock = vi.fn();

    render(
      <GroupImportPicker
        open={true}
        onClose={onCloseMock}
        onImport={onImportMock}
        groups={mockGroups}
      />
    );

    fireEvent.click(screen.getByTestId('group-import-confirm'));

    await waitFor(() => {
      expect(onImportMock).toHaveBeenCalledWith([101, 102]);
    });
    expect(toastMock).toHaveBeenCalledWith('Imported 2 tab groups');
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onCloseMock = vi.fn();

    render(
      <GroupImportPicker
        open={true}
        onClose={onCloseMock}
        groups={mockGroups}
      />
    );

    fireEvent.click(screen.getByTestId('group-import-cancel'));
    expect(onCloseMock).toHaveBeenCalled();
  });
});
