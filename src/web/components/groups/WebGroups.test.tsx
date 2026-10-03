/**
 * @file WebGroups.test.tsx
 * @description Component tests for the web Groups rail section and group
 * pane. Uses plain fixtures (no repository) — data-layer behavior is
 * covered in `useWebGroups.test.ts`.
 */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';

vi.mock('@/ui-system/components/primitives/DropdownMenu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onSelect,
    ...props
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" onClick={onSelect} {...props}>
      {children}
    </button>
  ),
}));

import { WebGroupDeleteDialog } from './WebGroupDeleteDialog';
import { WebGroupPane, type WebGroupPaneProps } from './WebGroupPane';
import { WebGroupsRailSection } from './WebGroupsRailSection';

function group(partial: Partial<PageGroup> = {}): PageGroup {
  return {
    id: partial.id ?? 'g-1',
    name: partial.name ?? 'Research',
    color: partial.color ?? 'blue',
    position: 'a0',
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

const pageItem: Extract<PageGroupItem, { kind: 'page' }> = {
  kind: 'page',
  urlNormalized: 'https://example.com/article',
  title: 'An article',
  faviconUrl: null,
  id: 'i-1',
  groupId: 'g-1',
  position: 'a0',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  deletedAt: null,
};

const domainItem: Extract<PageGroupItem, { kind: 'domain' }> = {
  kind: 'domain',
  hostname: 'example.com',
  includeSubdomains: true,
  id: 'i-2',
  groupId: 'g-1',
  position: 'a1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  deletedAt: null,
};

function ok() {
  return Promise.resolve({ success: true as const });
}

describe('WebGroupsRailSection', () => {
  it('guest: exact guest line, no group data, no New group control', () => {
    render(
      <MemoryRouter>
        <WebGroupsRailSection
          isAuthenticated={false}
          groups={[group()]}
          activeGroupId={null}
          itemCountOf={() => 1}
          onCreateGroup={vi.fn()}
        />
      </MemoryRouter>
    );

    expect(
      screen.getByText('Groups are saved on this device. Sign in to sync them to the web app.')
    ).toBeTruthy();
    expect(screen.queryByTestId('web-group-row-g-1')).toBeNull();
    expect(screen.queryByTestId('web-groups-new')).toBeNull();
  });

  it('authenticated: lists groups with color swatch slot and New group control', () => {
    render(
      <MemoryRouter>
        <WebGroupsRailSection
          isAuthenticated
          groups={[group()]}
          activeGroupId="g-1"
          itemCountOf={() => 2}
          onCreateGroup={vi.fn().mockResolvedValue(null)}
        />
      </MemoryRouter>
    );

    const row = screen.getByTestId('web-group-row-g-1');
    expect(row.getAttribute('href')).toBe('/groups/g-1');
    expect(row.getAttribute('aria-current')).toBe('page');
    expect(screen.getByTestId('web-groups-new')).toBeTruthy();
  });

  it('domain and page items in rail can be removed from group', async () => {
    const onRemoveItem = vi.fn().mockResolvedValue(undefined);
    render(
      <MemoryRouter>
        <WebGroupsRailSection
          isAuthenticated
          groups={[group()]}
          activeGroupId="g-1"
          itemCountOf={() => 2}
          onCreateGroup={vi.fn().mockResolvedValue(null)}
          itemsByGroup={{ 'g-1': [domainItem, pageItem] }}
          onRemoveItem={onRemoveItem}
        />
      </MemoryRouter>
    );

    // Toggle group open
    fireEvent.click(screen.getByLabelText('Expand Research'));
    expect(screen.getByTestId('web-group-item-domain-i-2')).toBeTruthy();
    expect(screen.getByTestId('web-group-item-page-i-1')).toBeTruthy();

    // Click remove domain from group
    fireEvent.click(screen.getByTestId('web-group-remove-domain-i-2'));
    expect(onRemoveItem).toHaveBeenCalledWith('g-1', 'i-2');

    // Click remove page from group
    fireEvent.click(screen.getByTestId('web-group-remove-item-i-1'));
    expect(onRemoveItem).toHaveBeenCalledWith('g-1', 'i-1');
  });

  it('group rail options menu exposes Rename, Change color, and Delete', async () => {
    const onRenameGroup = vi.fn().mockResolvedValue(undefined);
    const onRecolorGroup = vi.fn().mockResolvedValue(undefined);
    const onDeleteGroup = vi.fn().mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <WebGroupsRailSection
          isAuthenticated
          groups={[group()]}
          activeGroupId="g-1"
          itemCountOf={() => 2}
          onCreateGroup={vi.fn().mockResolvedValue(null)}
          onRenameGroup={onRenameGroup}
          onRecolorGroup={onRecolorGroup}
          onDeleteGroup={onDeleteGroup}
        />
      </MemoryRouter>
    );

    expect(screen.getByTestId('web-group-menu-trigger-g-1')).toBeTruthy();
    expect(screen.getByTestId('web-group-rail-rename-g-1')).toBeTruthy();
    expect(screen.getByTestId('web-group-rail-recolor-g-1')).toBeTruthy();
    expect(screen.getByTestId('web-group-rail-delete-g-1')).toBeTruthy();

    // Click Rename
    fireEvent.click(screen.getByTestId('web-group-rail-rename-g-1'));
    expect(screen.getByText('Rename group')).toBeTruthy();

    // Close rename, click Delete
    fireEvent.click(screen.getByText('Cancel'));
    fireEvent.click(screen.getByTestId('web-group-rail-delete-g-1'));
    expect(screen.getByTestId('web-group-delete-dialog')).toBeTruthy();
  });

  it('domain child pages can be expanded and removed from group without affecting library', async () => {
    const onRemoveItem = vi.fn().mockResolvedValue(undefined);
    const onAddPage = vi.fn().mockResolvedValue(undefined);
    const childPages = [
      {
        urlNormalized: 'https://example.com/p1',
        title: 'Page 1',
        domain: 'example.com',
      },
      {
        urlNormalized: 'https://example.com/p2',
        title: 'Page 2',
        domain: 'example.com',
      },
    ];

    render(
      <MemoryRouter>
        <WebGroupsRailSection
          isAuthenticated
          groups={[group()]}
          activeGroupId="g-1"
          itemCountOf={() => 2}
          onCreateGroup={vi.fn().mockResolvedValue(null)}
          itemsByGroup={{ 'g-1': [domainItem] }}
          availablePages={childPages}
          onRemoveItem={onRemoveItem}
          onAddPage={onAddPage}
        />
      </MemoryRouter>
    );

    // Toggle group open
    fireEvent.click(screen.getByLabelText('Expand Research'));
    expect(screen.getByTestId('web-group-item-domain-i-2')).toBeTruthy();

    // Toggle domain open
    fireEvent.click(screen.getByLabelText('Expand example.com'));
    expect(screen.getByText('Page 1')).toBeTruthy();
    expect(screen.getByText('Page 2')).toBeTruthy();

    // Remove Page 1 from group
    const removePage1Btn = screen.getByTestId(
      `web-group-remove-page-${encodeURIComponent('https://example.com/p1')}`
    );
    fireEvent.click(removePage1Btn);

    // Verifies: removes the domain rule item and adds the remaining page (Page 2) explicitly
    await waitFor(() => {
      expect(onRemoveItem).toHaveBeenCalledWith('g-1', 'i-2');
      expect(onAddPage).toHaveBeenCalledWith('g-1', 'https://example.com/p2');
    });
  });
});

describe('WebGroupPane', () => {
  function renderPane(
    items: PageGroupItem[] = [domainItem, pageItem],
    opts: Partial<WebGroupPaneProps> = {}
  ) {
    return render(
      <MemoryRouter>
        <WebGroupPane
          group={group()}
          items={items}
          highlightCountForUrl={() => 3}
          onRename={vi.fn().mockImplementation(() => ok())}
          onRecolor={vi.fn().mockImplementation(() => ok())}
          onDelete={vi.fn().mockImplementation(() => ok())}
          onAddPage={vi.fn().mockImplementation(() => ok())}
          onAddDomain={vi.fn().mockImplementation(() => ok())}
          onRemoveItem={vi.fn().mockImplementation(() => ok())}
          onMoveItem={vi.fn().mockImplementation(() => ok())}
          onDeleted={vi.fn()}
          defaultAddOpen={true}
          {...opts}
        />
      </MemoryRouter>
    );
  }

  it('renders header, collapsible add container, and unified add card without subdomains checkbox', () => {
    renderPane();
    expect(screen.getByTestId('web-group-pane-name').textContent).toBe('Research');
    expect(screen.getByTestId('web-group-add-container')).toBeTruthy();
    expect(screen.getByTestId('web-group-add-card')).toBeTruthy();
    expect(screen.getByTestId('web-group-add-toggle')).toBeTruthy();
    expect(screen.getByTestId('web-group-add-input')).toBeTruthy();
    // Subdomains checkbox is removed per requirements
    expect(screen.queryByTestId('web-group-add-domain-subdomains')).toBeNull();
  });

  it('when showItemsList is true, row menus expose Move + Remove and moves announce via aria-live', async () => {
    renderPane([pageItem], { showItemsList: true });
    fireEvent.click(screen.getByTestId('web-group-item-menu-i-1'));
    expect(screen.getByText('Move to top')).toBeTruthy();
    expect(screen.getByText('Move up')).toBeTruthy();
    expect(screen.getByText('Move down')).toBeTruthy();
    expect(screen.getByText('Remove')).toBeTruthy();

    fireEvent.click(screen.getByText('Move up'));
    await waitFor(() => {
      expect(screen.getByTestId('web-group-move-announcement').textContent).toContain(
        'moved up'
      );
    });
  });

  it('delete menu opens an AlertDialog with no close-tabs affordance', () => {
    renderPane();
    fireEvent.click(screen.getByTestId('web-group-pane-menu'));
    fireEvent.click(screen.getByText('Delete'));
    expect(screen.getByTestId('web-group-delete-dialog')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/close.*tab/i);
  });

  it('hides add forms when showAddForms is false (e.g. at page view)', () => {
    renderPane([pageItem], { showAddForms: false });
    expect(screen.queryByTestId('web-group-add-container')).toBeNull();
    expect(screen.queryByTestId('web-group-add-toggle')).toBeNull();
  });

  it('supports multi-select delete mode: select multiple pages and delete in batch', async () => {
    const onRemoveItem = vi.fn().mockImplementation(() => ok());
    renderPane([pageItem], { showItemsList: true, onRemoveItem });

    // Toggle select mode
    const selectToggle = screen.getByTestId('web-group-select-mode-toggle');
    expect(selectToggle.textContent).toBe('Select');
    fireEvent.click(selectToggle);

    // Batch bar appears
    expect(screen.getByTestId('web-group-batch-bar')).toBeTruthy();
    expect(screen.getByTestId('web-group-batch-delete-btn')).toBeDisabled();

    // Select page
    const pageCheckbox = screen.getByTestId('web-group-item-select-i-1');
    fireEvent.click(pageCheckbox);

    // Delete button is now enabled
    const deleteBtn = screen.getByTestId('web-group-batch-delete-btn');
    expect(deleteBtn).not.toBeDisabled();
    expect(deleteBtn.textContent).toBe('Delete (1)');

    // Click delete
    fireEvent.click(deleteBtn);
    await waitFor(() => {
      expect(onRemoveItem).toHaveBeenCalledWith('g-1', 'i-1');
    });
  });

  it('resolves domain pages using availablePages when provided', () => {
    const availablePages = [
      { url: 'https://example.com/from-lib', title: 'Library Page', domain: 'example.com' },
    ];
    renderPane([domainItem], { showItemsList: true, availablePages });

    expect(screen.getByTestId('web-group-domain-row-i-2')).toBeTruthy();
    // Expand domain row
    fireEvent.click(screen.getByTestId('web-group-domain-toggle-i-2'));
    expect(screen.getByText('Library Page')).toBeTruthy();
  });
});

describe('WebGroupDeleteDialog', () => {
  it('copy keeps highlights in the Library and never mentions closing tabs', () => {
    render(
      <WebGroupDeleteDialog
        open
        groupName="Research"
        itemCount={2}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    const dialog = screen.getByTestId('web-group-delete-dialog');
    expect(dialog.textContent).toContain('Delete "Research"?');
    expect(dialog.textContent).toContain('Your highlights stay in the Library.');
    expect(dialog.textContent).not.toMatch(/close.*tab/i);
  });
});
