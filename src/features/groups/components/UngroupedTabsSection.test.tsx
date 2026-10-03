/**
 * @file UngroupedTabsSection.test.tsx
 * @description Unit tests for UngroupedTabsSection.
 * Verifies that:
 * 1. Only open tabs with highlights (> 0) are rendered.
 * 2. If no open tabs have highlights, section returns null and does not render.
 * 3. Clicking "Add to..." allows adding the tab to an existing group.
 */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

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

import type { PageGroup } from '@/shared/types/page-group';
import { UngroupedTabsSection } from './UngroupedTabsSection';

const mockGroup: PageGroup = {
  id: 'g-1',
  name: 'Machine Learning',
  color: 'purple',
  position: 'a0',
  boundDeviceId: null,
  boundDeviceLabel: null,
  boundBrowser: null,
  boundAt: null,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  deletedAt: null,
};

vi.mock('@/features/groups/hooks/useGroups', () => ({
  useGroups: () => ({ groups: [mockGroup], items: [], isLoading: false }),
}));

vi.mock('@/features/groups/hooks/useGroupMutations', () => ({
  useGroupMutations: () => ({ addPage: vi.fn().mockResolvedValue({ success: true }) }),
}));

vi.mock('@/features/groups/hooks/useGroupHighlights', () => ({
  useGroupHighlights: (items: any[]) => {
    // Only return highlights for https://example.com/has-highlights
    const hasMatch = items.some((i) => i.urlNormalized === 'https://example.com/has-highlights');
    return {
      highlights: hasMatch
        ? [
            {
              id: 'h-1',
              url: 'https://example.com/has-highlights',
              text: 'Attention Is All You Need',
              path: '/has-highlights',
              domain: 'example.com',
              createdAt: new Date(),
            },
          ]
        : [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
  },
}));

vi.mock('@/features/groups/hooks/useUngroupedTabs', () => ({
  useUngroupedTabs: () => ({
    tabs: [
      { id: 1, url: 'https://example.com/no-highlights', title: 'No Highlights Tab', favIconUrl: null },
      { id: 2, url: 'https://example.com/has-highlights', title: 'Highlighted Tab', favIconUrl: null },
    ],
    isLoading: false,
    error: null,
    isSupported: true,
    refetch: vi.fn(),
  }),
}));

describe('UngroupedTabsSection', () => {
  it('omits tabs with 0 highlights and renders only tabs with highlights', () => {
    render(<UngroupedTabsSection groups={[mockGroup]} />);

    // "Highlighted Tab" should be in document
    expect(screen.getByText('Highlighted Tab')).toBeInTheDocument();
    // "No Highlights Tab" should NOT be in document
    expect(screen.queryByText('No Highlights Tab')).toBeNull();
    // Section header shows 1 tab
    expect(screen.getByText('Ungrouped tabs (1)')).toBeInTheDocument();
  });

  it('returns null when no ungrouped tabs have highlights', () => {
    const { container } = render(
      <UngroupedTabsSection
        groups={[mockGroup]}
        tabs={[
          { id: 10, url: 'https://example.com/other-no-highlights', title: 'Other Tab', favIconUrl: null },
        ]}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('calls onAddPage when tab is added to a group', async () => {
    const onAddPage = vi.fn().mockResolvedValue(undefined);
    render(
      <UngroupedTabsSection
        groups={[mockGroup]}
        onAddPage={onAddPage}
      />
    );

    const addBtn = screen.getByTestId('ungrouped-tab-menu-2');
    expect(addBtn).toBeInTheDocument();
    fireEvent.click(addBtn);

    const groupItem = screen.getByTestId('add-to-group-g-1');
    expect(groupItem).toBeInTheDocument();
    fireEvent.click(groupItem);

    expect(onAddPage).toHaveBeenCalledWith('g-1', {
      url: 'https://example.com/has-highlights',
      title: 'Highlighted Tab',
      faviconUrl: null,
    });
  });
});
