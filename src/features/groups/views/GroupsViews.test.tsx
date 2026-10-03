/**
 * Task 1.7 tests: segmented switch, empty state, remove+undo, delete-dialog copy.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';

const useGroupsMock = vi.fn();
const useGroupMock = vi.fn();
const useGroupHighlightsMock = vi.fn();
const removeItemMock = vi.fn();
const restoreItemMock = vi.fn();
const deleteGroupMock = vi.fn();
const restoreGroupMock = vi.fn();
const createGroupMock = vi.fn();
const toastMock = vi.fn();

vi.mock('@/features/groups/hooks/useGroups', () => ({
  useGroups: (...args: unknown[]) => useGroupsMock(...args),
}));

vi.mock('@/features/groups/hooks/useGroup', () => ({
  useGroup: (...args: unknown[]) => useGroupMock(...args),
}));

vi.mock('@/features/groups/hooks/useGroupHighlights', () => ({
  useGroupHighlights: (...args: unknown[]) => useGroupHighlightsMock(...args),
}));

vi.mock('@/features/groups/hooks/useGroupMutations', () => ({
  useGroupMutations: () => ({
    createGroup: createGroupMock,
    renameGroup: vi.fn(),
    recolorGroup: vi.fn(),
    deleteGroup: deleteGroupMock,
    restoreGroup: restoreGroupMock,
    moveGroup: vi.fn(),
    addPage: vi.fn(),
    addDomain: vi.fn(),
    removeItem: removeItemMock,
    restoreItem: restoreItemMock,
    moveItem: vi.fn().mockResolvedValue({ success: true, data: {} }),
  }),
}));

vi.mock('@/features/collections/hooks/useUserTags', () => ({
  useUserTags: () => ({ tags: [], tagNames: [] }),
}));

vi.mock('@/ui-system/hooks/useModeFeature', () => ({
  useModeFeature: () => ({ allowed: false }),
}));

vi.mock('sonner', () => ({
  toast: (...args: unknown[]) => toastMock(...args),
  Toaster: () => null,
}));

vi.mock('@/features/collections/components/LibraryHighlightTile', () => ({
  LibraryHighlightTile: ({ highlight }: { highlight: { id: string; text: string } }) => (
    <div data-testid={`group-highlight-${highlight.id}`}>{highlight.text}</div>
  ),
}));

/** Radix menus portal + dismiss in ways jsdom cannot drive; render content inline. */
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

vi.mock('@/core/context/AppProvider', () => ({
  useApp: () => ({ isAuthenticated: true, currentMode: 'basic' }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/features/collections/hooks/useCollections', () => ({
  useCollections: () => ({ collections: [], isLoading: false, error: null }),
}));

vi.mock('@/features/collections/hooks/useHighlightSearch', () => ({
  useHighlightSearch: () => ({ results: [], isLoading: false, error: null }),
}));

vi.mock('@/features/collections/hooks/use-highlight-delete', () => ({
  useHighlightDelete: () => ({ deleteScope: vi.fn() }),
}));

vi.mock('@/features/collections/hooks/useLibraryRelatedness', () => ({
  useLibraryRelatednessService: () => null,
  useRelatedTags: () => [],
}));

import { DeleteGroupDialog, deleteGroupDialogCopy } from '@/features/groups/components/DeleteGroupDialog';
import { GroupEmptyState, GROUPS_EMPTY_COPY, GROUPS_GUEST_COPY } from '@/features/groups/components/GroupEmptyState';
import { GroupDetailView } from '@/features/groups/views/GroupDetailView';
import { GroupsListView } from '@/features/groups/views/GroupsListView';

const group: PageGroup = {
  id: 'g-1',
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
  groupId: 'g-1',
  kind: 'page',
  urlNormalized: 'https://example.com/article',
  title: 'Example Article',
  faviconUrl: null,
  position: 'a0',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  deletedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  useGroupsMock.mockReturnValue({ groups: [], items: [], isLoading: false, error: null, refetch: vi.fn() });
  useGroupMock.mockReturnValue({ group, items: [pageItem], isLoading: false, error: null, refetch: vi.fn() });
  useGroupHighlightsMock.mockReturnValue({
    highlights: [{ id: 'h-1', url: 'https://example.com/article', text: 'Article quote' }],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
  removeItemMock.mockResolvedValue({ success: true, data: {} });
  restoreItemMock.mockResolvedValue({ success: true, data: {} });
  deleteGroupMock.mockResolvedValue({ success: true, data: {} });
  createGroupMock.mockResolvedValue({ success: true, data: {} });
});


describe('Groups empty state', () => {
  it('shows PRD no-groups copy plus guest line for guests', () => {
    render(<GroupEmptyState isAuthenticated={false} onNewGroup={vi.fn()} onSignIn={vi.fn()} />);
    expect(screen.getByText(GROUPS_EMPTY_COPY)).toBeInTheDocument();
    expect(screen.getByTestId('groups-guest-copy').textContent).toContain(GROUPS_GUEST_COPY);
    expect(screen.getByTestId('groups-empty-new')).toBeInTheDocument();
  });

  it('hides the guest line for signed-in users', () => {
    render(<GroupEmptyState isAuthenticated onNewGroup={vi.fn()} />);
    expect(screen.getByText(GROUPS_EMPTY_COPY)).toBeInTheDocument();
    expect(screen.queryByTestId('groups-guest-copy')).not.toBeInTheDocument();
  });

  it('lists groups with swatch rows when data exists', () => {
    useGroupsMock.mockReturnValue({
      groups: [group],
      items: [pageItem],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    const onGroupClick = vi.fn();
    render(<GroupsListView onGroupClick={onGroupClick} isAuthenticated />);
    expect(screen.getByText('Research')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Research'));
    expect(onGroupClick).toHaveBeenCalledWith('g-1');
  });
});

describe('GroupDetailView remove + undo', () => {
  it('removes an item with an Undo toast that restores', async () => {
    render(<GroupDetailView groupId="g-1" isAuthenticated />);
    fireEvent.click(screen.getByTestId('group-item-menu-i-1'));
    fireEvent.click(screen.getByText('Remove'));

    await waitFor(() => expect(removeItemMock).toHaveBeenCalledWith('g-1', 'i-1'));
    expect(toastMock).toHaveBeenCalledWith(
      'Removed from Research',
      expect.objectContaining({ duration: 5000 })
    );
    const action = (toastMock.mock.calls[0] as Array<{ action?: { label: string; onClick: () => void } }>)[1]?.action;
    expect(action?.label).toBe('Undo');
    action?.onClick();
    expect(restoreItemMock).toHaveBeenCalledWith('g-1', 'i-1');
  });

  it('announces moves via the aria-live region', async () => {
    const { useGroupMutations } = await import('@/features/groups/hooks/useGroupMutations');
    void useGroupMutations;
    render(<GroupDetailView groupId="g-1" isAuthenticated />);
    fireEvent.click(screen.getByTestId('group-item-menu-i-1'));
    fireEvent.click(screen.getByText('Move to top'));
    await waitFor(() =>
      expect(screen.getByTestId('group-move-announcement').textContent).toContain('moved to top')
    );
  });

  it('omits pages that do not have highlights', () => {
    useGroupHighlightsMock.mockReturnValue({
      highlights: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<GroupDetailView groupId="g-1" isAuthenticated />);
    expect(screen.queryByTestId('group-item-menu-i-1')).not.toBeInTheDocument();
  });

  it('supports multi-select delete: selects items and deletes in batch', async () => {
    render(<GroupDetailView groupId="g-1" isAuthenticated />);
    const selectToggle = screen.getByTestId('group-detail-select-toggle');
    expect(selectToggle.textContent).toBe('Select');
    fireEvent.click(selectToggle);

    expect(screen.getByTestId('group-detail-batch-bar')).toBeInTheDocument();
    const deleteBtn = screen.getByTestId('group-detail-batch-delete-btn');
    expect(deleteBtn).toBeDisabled();

    // Select page
    const checkbox = screen.getByTestId('group-item-select-checkbox-i-1');
    fireEvent.click(checkbox);
    expect(deleteBtn).not.toBeDisabled();
    expect(deleteBtn.textContent).toBe('Delete (1)');

    // Click delete
    fireEvent.click(deleteBtn);
    await waitFor(() => expect(removeItemMock).toHaveBeenCalledWith('g-1', 'i-1'));
  });

  it('renders header menu button and allows opening rename dialog', () => {
    render(<GroupDetailView groupId="g-1" isAuthenticated />);
    const menuBtn = screen.getByTestId('group-detail-menu-button');
    expect(menuBtn).toBeInTheDocument();
    fireEvent.click(menuBtn);
    expect(screen.getByText('Rename group')).toBeInTheDocument();
    expect(screen.getByText('Change color')).toBeInTheDocument();
    expect(screen.getByText('Delete group')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Rename group'));
    expect(screen.getByTestId('new-group-name')).toBeInTheDocument();
  });
});

describe('DeleteGroupDialog copy', () => {
  it('matches state: empty, singular, plural', () => {
    expect(deleteGroupDialogCopy('Research', 0).message).toContain('empty group');
    expect(deleteGroupDialogCopy('Research', 1).message).toContain('its 1 item');
    expect(deleteGroupDialogCopy('Research', 3).message).toContain('its 3 items');
    expect(deleteGroupDialogCopy('Research', 3).title).toBe('Delete "Research"?');
    for (const n of [0, 1, 3]) {
      expect(deleteGroupDialogCopy('Research', n).message).toContain(
        'Your highlights stay in the Library.'
      );
    }
  });

  it('renders the state copy and confirms delete with Undo toast', async () => {
    const onConfirm = vi.fn();
    render(
      <DeleteGroupDialog open groupName="Research" itemCount={2} onClose={vi.fn()} onConfirm={onConfirm} />
    );
    expect(screen.getByTestId('delete-group-dialog').textContent).toContain('its 2 items');
    fireEvent.click(screen.getByTestId('delete-group-confirm'));
    expect(onConfirm).toHaveBeenCalled();
  });
});
