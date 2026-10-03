/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';

const { useGroupMock, useGroupHighlightsMock, openInBrowserMock, toastMock, mockStorageGet } = vi.hoisted(() => {
  const toastFn = Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
  });
  return {
    useGroupMock: vi.fn(),
    useGroupHighlightsMock: vi.fn(),
    openInBrowserMock: vi.fn(),
    toastMock: toastFn,
    mockStorageGet: vi.fn(),
  };
});

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      local: {
        get: (...args: unknown[]) => mockStorageGet(...args),
      },
    },
  },
}));

vi.mock('@/features/groups/hooks/useGroup', () => ({
  useGroup: (...args: unknown[]) => useGroupMock(...args),
}));

vi.mock('@/features/groups/hooks/useGroupHighlights', () => ({
  useGroupHighlights: (...args: unknown[]) => useGroupHighlightsMock(...args),
}));

vi.mock('@/features/groups/hooks/useGroupMutations', () => ({
  useGroupMutations: () => ({
    createGroup: vi.fn(),
    renameGroup: vi.fn(),
    recolorGroup: vi.fn(),
    deleteGroup: vi.fn(),
    restoreGroup: vi.fn(),
    moveGroup: vi.fn(),
    addPage: vi.fn(),
    addDomain: vi.fn(),
    removeItem: vi.fn(),
    restoreItem: vi.fn(),
    moveItem: vi.fn(),
    openInBrowser: openInBrowserMock,
  }),
}));

vi.mock('@/features/collections/hooks/useUserTags', () => ({
  useUserTags: () => ({ tags: [], tagNames: [] }),
}));

vi.mock('@/ui-system/hooks/useModeFeature', () => ({
  useModeFeature: () => ({ allowed: false }),
}));

vi.mock('sonner', () => ({
  toast: toastMock,
  Toaster: () => null,
}));

vi.mock('@/features/collections/components/LibraryHighlightTile', () => ({
  LibraryHighlightTile: () => <div data-testid="tile" />,
}));

vi.mock('@/ui-system/components/primitives/DropdownMenu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onSelect }: { children: React.ReactNode; onSelect?: () => void }) => (
    <button type="button" onClick={onSelect}>
      {children}
    </button>
  ),
}));

import { GroupDetailView } from '@/features/groups/views/GroupDetailView';

const baseGroup: PageGroup = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Research',
  color: 'blue',
  position: 'a0',
  boundDeviceId: null,
  boundDeviceLabel: null,
  boundBrowser: null,
  boundAt: null,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  deletedAt: null,
};

const pageItem: PageGroupItem = {
  id: 'i-1',
  groupId: baseGroup.id,
  kind: 'page',
  urlNormalized: 'https://example.com/article',
  title: 'Example Article',
  faviconUrl: null,
  position: 'a0',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  deletedAt: null,
};

describe('GroupDetailView: Open in browser (Task 3.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageGet.mockResolvedValue({ underscore_device_id: 'this-device-uuid' });
    useGroupHighlightsMock.mockReturnValue({ highlights: [], isLoading: false, error: null, refetch: vi.fn() });
    openInBrowserMock.mockResolvedValue({ success: true, data: { ok: true, browserGroupId: 10, tabCount: 1 } });
  });

  it('renders "Open in browser" button when group is closed (boundDeviceId === null)', () => {
    useGroupMock.mockReturnValue({
      group: { ...baseGroup, boundDeviceId: null },
      items: [pageItem],
      isLoading: false,
      error: null,
    });

    render(<GroupDetailView groupId={baseGroup.id} />);

    expect(screen.getByTestId('group-open-in-browser-button')).toBeInTheDocument();
    expect(screen.getByTestId('group-open-in-browser-button')).toHaveTextContent('Open in browser');
  });

  it('renders "Open in browser" button when group is linked elsewhere with realistic label', async () => {
    useGroupMock.mockReturnValue({
      group: {
        ...baseGroup,
        boundDeviceId: 'other-device-uuid',
        boundDeviceLabel: 'Mac',
        boundBrowser: 'chrome',
      },
      items: [pageItem],
      isLoading: false,
      error: null,
    });

    render(<GroupDetailView groupId={baseGroup.id} />);

    await waitFor(() => {
      expect(mockStorageGet).toHaveBeenCalledWith('underscore_device_id');
    });

    expect(screen.getByTestId('group-open-in-browser-button')).toBeInTheDocument();
  });

  it('does NOT render "Open in browser" button when group is live on this device (with realistic label Mac)', async () => {
    useGroupMock.mockReturnValue({
      group: {
        ...baseGroup,
        boundDeviceId: 'this-device-uuid',
        boundDeviceLabel: 'Mac',
        boundBrowser: 'chrome',
      },
      items: [pageItem],
      isLoading: false,
      error: null,
    });

    render(<GroupDetailView groupId={baseGroup.id} />);

    await waitFor(() => {
      expect(mockStorageGet).toHaveBeenCalledWith('underscore_device_id');
    });

    expect(screen.queryByTestId('group-open-in-browser-button')).not.toBeInTheDocument();
  });

  it('clicking "Open in browser" sends IPC and toasts success on response', async () => {
    useGroupMock.mockReturnValue({
      group: baseGroup,
      items: [pageItem],
      isLoading: false,
      error: null,
    });

    render(<GroupDetailView groupId={baseGroup.id} />);

    const button = screen.getByTestId('group-open-in-browser-button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(openInBrowserMock).toHaveBeenCalledWith(baseGroup.id, false);
    });

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith('Opened in browser');
    });
  });

  it('clicking "Open in browser" shows error toast on failure', async () => {
    openInBrowserMock.mockResolvedValue({
      success: false,
      error: 'Group has no pages to open',
    });

    useGroupMock.mockReturnValue({
      group: baseGroup,
      items: [],
      isLoading: false,
      error: null,
    });

    render(<GroupDetailView groupId={baseGroup.id} />);

    fireEvent.click(screen.getByTestId('group-open-in-browser-button'));

    await waitFor(() => {
      expect(openInBrowserMock).toHaveBeenCalledWith(baseGroup.id, false);
    });

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith('Group has no pages to open');
    });
  });

  it('shows confirm dialog when response has needsConfirm: true (> 15 tabs)', async () => {
    openInBrowserMock.mockResolvedValue({
      success: true,
      data: { ok: false, needsConfirm: true, tabCount: 18 },
    });

    useGroupMock.mockReturnValue({
      group: baseGroup,
      items: [pageItem],
      isLoading: false,
      error: null,
    });

    render(<GroupDetailView groupId={baseGroup.id} />);

    fireEvent.click(screen.getByTestId('group-open-in-browser-button'));

    await waitFor(() => {
      expect(screen.getByTestId('open-in-browser-dialog')).toBeInTheDocument();
    });

    expect(screen.getByText('Open 18 tabs?')).toBeInTheDocument();
    expect(
      screen.getByText('Opening 18 tabs might slow down your browser. Open anyway?')
    ).toBeInTheDocument();
    expect(screen.getByTestId('open-in-browser-cancel')).toBeInTheDocument();
    expect(screen.getByTestId('open-in-browser-confirm')).toHaveTextContent('Open 18 tabs');
  });

  it('clicking Cancel in confirm dialog closes dialog without calling force', async () => {
    openInBrowserMock.mockResolvedValue({
      success: true,
      data: { ok: false, needsConfirm: true, tabCount: 18 },
    });

    useGroupMock.mockReturnValue({
      group: baseGroup,
      items: [pageItem],
      isLoading: false,
      error: null,
    });

    render(<GroupDetailView groupId={baseGroup.id} />);

    fireEvent.click(screen.getByTestId('group-open-in-browser-button'));

    await waitFor(() => {
      expect(screen.getByTestId('open-in-browser-dialog')).toBeInTheDocument();
    });

    openInBrowserMock.mockClear();

    fireEvent.click(screen.getByTestId('open-in-browser-cancel'));

    await waitFor(() => {
      expect(screen.queryByTestId('open-in-browser-dialog')).not.toBeInTheDocument();
    });

    expect(openInBrowserMock).not.toHaveBeenCalled();
  });

  it('confirming dialog calls openInBrowser with force: true and toasts on success', async () => {
    openInBrowserMock
      .mockResolvedValueOnce({
        success: true,
        data: { ok: false, needsConfirm: true, tabCount: 18 },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { ok: true, browserGroupId: 15, tabCount: 18 },
      });

    useGroupMock.mockReturnValue({
      group: baseGroup,
      items: [pageItem],
      isLoading: false,
      error: null,
    });

    render(<GroupDetailView groupId={baseGroup.id} />);

    fireEvent.click(screen.getByTestId('group-open-in-browser-button'));

    await waitFor(() => {
      expect(screen.getByTestId('open-in-browser-dialog')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('open-in-browser-confirm'));

    await waitFor(() => {
      expect(openInBrowserMock).toHaveBeenCalledWith(baseGroup.id, true);
    });

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith('Opened in browser');
    });
  });
});
