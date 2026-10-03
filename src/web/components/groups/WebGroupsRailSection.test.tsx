/**
 * @file WebGroupsRailSection.test.tsx
 * @description Rail Component Seam tests for WebGroupsRailSection (PRD 2026-09-29 §2).
 * Tests:
 * - Group row rendering, centered color swatch placement, domain expanding/collapsing
 * - Top-8 page clamping and "+ N more pages…" action
 * - Row action menu (rename, recolor, remove)
 * - Bottom "+ New Group" button trigger
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';
import {
  WebGroupsRailSection,
  type GroupChildPage,
} from './WebGroupsRailSection';

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

function makeGroup(partial: Partial<PageGroup> = {}): PageGroup {
  return {
    id: partial.id ?? 'g-1',
    name: partial.name ?? 'Research Group',
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

describe('WebGroupsRailSection Seam', () => {
  it('renders group row with color swatch slot and handles domain expanding/collapsing', () => {
    const domainItem: Extract<PageGroupItem, { kind: 'domain' }> = {
      id: 'item-domain-1',
      groupId: 'g-1',
      kind: 'domain',
      hostname: 'example.com',
      includeSubdomains: true,
      position: 'a0',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      deletedAt: null,
    };

    render(
      <MemoryRouter>
        <WebGroupsRailSection
          isAuthenticated={true}
          groups={[makeGroup()]}
          activeGroupId="g-1"
          itemCountOf={() => 1}
          onCreateGroup={vi.fn()}
          itemsByGroup={{ 'g-1': [domainItem] }}
        />
      </MemoryRouter>
    );

    const groupRow = screen.getByTestId('web-group-row-g-1');
    expect(groupRow).toBeInTheDocument();
    expect(groupRow.getAttribute('href')).toBe('/groups/g-1');

    // Group starts collapsed - expand it
    const groupToggle = screen.getByLabelText('Expand Research Group');
    fireEvent.click(groupToggle);

    // Domain node is now visible
    const domainRow = screen.getByTestId('web-group-item-domain-item-domain-1');
    expect(domainRow).toBeInTheDocument();
    expect(screen.getByText('example.com')).toBeInTheDocument();
  });

  it('clamps domain children to top 8 and renders "+ N more pages…" action link', () => {
    const domainItem: Extract<PageGroupItem, { kind: 'domain' }> = {
      id: 'item-domain-huge',
      groupId: 'g-1',
      kind: 'domain',
      hostname: 'docs.example.com',
      includeSubdomains: true,
      position: 'a0',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      deletedAt: null,
    };

    // 12 child pages under docs.example.com
    const pages: GroupChildPage[] = Array.from({ length: 12 }, (_, i) => ({
      urlNormalized: `https://docs.example.com/page-${i + 1}`,
      title: `Doc Page ${i + 1}`,
      domain: 'docs.example.com',
    }));

    render(
      <MemoryRouter>
        <WebGroupsRailSection
          isAuthenticated={true}
          groups={[makeGroup()]}
          activeGroupId="g-1"
          itemCountOf={() => 12}
          onCreateGroup={vi.fn()}
          itemsByGroup={{ 'g-1': [domainItem] }}
          availablePages={pages}
        />
      </MemoryRouter>
    );

    // Expand group
    fireEvent.click(screen.getByLabelText('Expand Research Group'));
    // Expand domain
    fireEvent.click(screen.getByLabelText('Expand docs.example.com'));

    // Top 8 pages should be rendered
    for (let i = 1; i <= 8; i++) {
      expect(screen.getByText(`Doc Page ${i}`)).toBeInTheDocument();
    }
    // 9th page should NOT be rendered in the tree
    expect(screen.queryByText('Doc Page 9')).not.toBeInTheDocument();

    // Clamped link for the remaining 4 pages
    const clampedLink = screen.getByTestId('web-group-clamped-pages-item-domain-huge');
    expect(clampedLink).toBeInTheDocument();
    expect(clampedLink).toHaveTextContent('+ 4 more pages…');
    expect(clampedLink.getAttribute('href')).toBe('/groups/g-1?domain=docs.example.com');
  });

  it('provides row action menu with rename, recolor, and delete', () => {
    const group = makeGroup();
    const onRenameGroup = vi.fn();
    const onRecolorGroup = vi.fn();
    const onDeleteGroup = vi.fn();

    render(
      <MemoryRouter>
        <WebGroupsRailSection
          isAuthenticated={true}
          groups={[group]}
          activeGroupId="g-1"
          itemCountOf={() => 0}
          onCreateGroup={vi.fn()}
          onRenameGroup={onRenameGroup}
          onRecolorGroup={onRecolorGroup}
          onDeleteGroup={onDeleteGroup}
        />
      </MemoryRouter>
    );

    expect(screen.getByTestId('web-group-rail-rename-g-1')).toBeInTheDocument();
    expect(screen.getByTestId('web-group-rail-recolor-g-1')).toBeInTheDocument();
    expect(screen.getByTestId('web-group-rail-delete-g-1')).toBeInTheDocument();

    // Clicking delete opens delete dialog
    fireEvent.click(screen.getByTestId('web-group-rail-delete-g-1'));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('triggers "+ New Group" button at the bottom of the list', () => {
    const onCreateGroup = vi.fn();

    render(
      <MemoryRouter>
        <WebGroupsRailSection
          isAuthenticated={true}
          groups={[makeGroup()]}
          activeGroupId="g-1"
          itemCountOf={() => 0}
          onCreateGroup={onCreateGroup}
        />
      </MemoryRouter>
    );

    const newBtn = screen.getByTestId('web-groups-new');
    expect(newBtn).toBeInTheDocument();
    fireEvent.click(newBtn);

    // Dialog opens with title "New group"
    expect(screen.getByRole('heading', { name: 'New group' })).toBeInTheDocument();
  });

  it('supports collapsible groups section', () => {
    const group = makeGroup();

    render(
      <MemoryRouter>
        <WebGroupsRailSection
          isAuthenticated={true}
          groups={[group]}
          activeGroupId="g-1"
          itemCountOf={() => 0}
          onCreateGroup={vi.fn()}
        />
      </MemoryRouter>
    );

    // Groups section is expanded by default
    expect(screen.getByTestId('web-group-row-g-1')).toBeInTheDocument();

    // Toggle collapse Groups section
    const groupsToggle = screen.getByTestId('web-groups-section-toggle');
    fireEvent.click(groupsToggle);
    expect(screen.queryByTestId('web-group-row-g-1')).not.toBeInTheDocument();

    // Toggle expand Groups section
    fireEvent.click(groupsToggle);
    expect(screen.getByTestId('web-group-row-g-1')).toBeInTheDocument();
  });
});
