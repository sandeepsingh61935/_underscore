/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UngroupedTabsSection } from '@/features/groups/components/UngroupedTabsSection';
import { useUngroupedTabs } from '@/features/groups/hooks/useUngroupedTabs';
import type { PageGroup } from '@/shared/types/page-group';

const { toastMock, mockTabsQuery, mockAddPage } = vi.hoisted(() => {
  const toastFn = Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
  });
  return {
    toastMock: toastFn,
    mockTabsQuery: vi.fn(),
    mockAddPage: vi.fn(),
  };
});

vi.mock('sonner', () => ({
  toast: toastMock,
}));

vi.mock('wxt/browser', () => ({
  browser: {
    tabs: {
      query: (...args: any[]) => mockTabsQuery(...args),
    },
    tabGroups: {
      TAB_GROUP_ID_NONE: -1,
    },
  },
}));

vi.mock('@/ui-system/components/primitives/DropdownMenu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({
    children,
    ...rest
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <div {...rest}>{children}</div>,
  DropdownMenuContent: ({
    children,
    ...rest
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <div {...rest}>{children}</div>,
  DropdownMenuItem: ({
    children,
    onSelect,
    ...rest
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onSelect} {...rest}>
      {children}
    </button>
  ),
}));

vi.mock('@/features/groups/hooks/useGroups', () => ({
  useGroups: () => ({
    groups: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/features/groups/hooks/useGroupMutations', () => ({
  useGroupMutations: () => ({
    addPage: mockAddPage,
  }),
}));

vi.mock('@/features/groups/hooks/useGroupHighlights', () => ({
  useGroupHighlights: (items: any[]) => ({
    highlights: items.map((i) => ({
      id: `hl-${i.id}`,
      url: i.urlNormalized,
      text: 'Highlight',
    })),
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

describe('useUngroupedTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries tabs in current window and filters out grouped and non-syncable tabs', async () => {
    mockTabsQuery.mockResolvedValue([
      { id: 1, url: 'https://example.com/one', title: 'Example One', groupId: -1 },
      { id: 2, url: 'chrome://extensions', title: 'Extensions', groupId: -1 }, // Non-syncable
      { id: 3, url: 'https://example.com/two', title: 'Example Two', groupId: 42 }, // Grouped
      { id: 4, url: 'https://news.ycombinator.com', title: 'Hacker News', groupId: 0 },
      { id: 5, url: 'https://private.com', title: 'Incognito Tab', groupId: -1, incognito: true }, // Incognito
    ]);

    const { result } = renderHook(() => useUngroupedTabs());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tabs).toHaveLength(2);
    expect(result.current.tabs[0]?.url).toBe('https://example.com/one');
    expect(result.current.tabs[1]?.url).toBe('https://news.ycombinator.com');
  });

  it('returns empty list if tab query fails or has no tabs', async () => {
    mockTabsQuery.mockRejectedValue(new Error('Permission denied'));

    const { result } = renderHook(() => useUngroupedTabs());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tabs).toEqual([]);
  });
});

describe('UngroupedTabsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockGroups: PageGroup[] = [
    {
      id: 'grp-1',
      name: 'Project Alpha',
      color: 'blue',
      position: 'a0',
      boundDeviceId: null,
      boundDeviceLabel: null,
      boundBrowser: null,
      boundAt: null,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
      deletedAt: null,
    },
  ];

  const mockTabs = [
    {
      id: 11,
      url: 'https://example.com/blog/article',
      title: 'Cool Article',
      favIconUrl: 'https://example.com/favicon.ico',
    },
  ];

  it('renders section with tab count and allows expanding / collapsing', () => {
    render(
      <UngroupedTabsSection
        groups={mockGroups}
        tabs={mockTabs}
        defaultExpanded={true}
      />
    );

    expect(screen.getByText('Ungrouped tabs (1)')).toBeInTheDocument();
    expect(screen.getByText('Cool Article')).toBeInTheDocument();

    // Collapse
    fireEvent.click(screen.getByTestId('ungrouped-tabs-header'));
    expect(screen.queryByText('Cool Article')).not.toBeInTheDocument();

    // Expand
    fireEvent.click(screen.getByTestId('ungrouped-tabs-header'));
    expect(screen.getByText('Cool Article')).toBeInTheDocument();
  });

  it('renders nothing when there are no ungrouped tabs', () => {
    const { container } = render(
      <UngroupedTabsSection
        groups={mockGroups}
        tabs={[]}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('adds tab to group when selected from dropdown and toasts', async () => {
    const onAddPageMock = vi.fn().mockResolvedValue(undefined);

    render(
      <UngroupedTabsSection
        groups={mockGroups}
        tabs={mockTabs}
        onAddPage={onAddPageMock}
      />
    );

    fireEvent.click(screen.getByTestId('ungrouped-tab-menu-11'));
    fireEvent.click(screen.getByText('Project Alpha'));

    await waitFor(() => {
      expect(onAddPageMock).toHaveBeenCalledWith('grp-1', {
        url: 'https://example.com/blog/article',
        title: 'Cool Article',
        faviconUrl: 'https://example.com/favicon.ico',
      });
    });

    expect(toastMock).toHaveBeenCalledWith('Added to Project Alpha');
  });
});
