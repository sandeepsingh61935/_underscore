/**
 * @file PhoneGroups.test.tsx
 * @description Handheld read-only Groups tests. Data flows through the
 * `useWebGroups` hook (Task 1.9) against an in-memory FAKE repository —
 * the fake lives in this test file only.
 *
 * Covers: list labels (Live in Chrome / Closed / manual has no line),
 * detail item anchors (`noopener noreferrer`), zero edit controls on
 * `phone` and `tablet` client kinds, and >= 44px tap targets.
 */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import type { GroupColor, PageGroup, PageGroupItem } from '@/shared/types/page-group';
import type { WebClientKind } from '@/web/lib/classify-web-client';

import { useWebGroups, type WebGroupRepository } from '@/web/hooks/useWebGroups';

vi.mock('@/ui-system/components/primitives/DropdownMenu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onSelect,
    onClick,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onSelect || onClick}>
      {children}
    </button>
  ),
}));

let seq = 0;
function rid(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

function makeGroup(partial: Partial<PageGroup> = {}): PageGroup {
  return {
    id: partial.id ?? rid('g'),
    name: partial.name ?? 'Research',
    color: partial.color ?? 'blue',
    position: partial.position ?? 'a0',
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

function makePageItem(groupId: string, partial: Partial<Extract<PageGroupItem, { kind: 'page' }>> = {}): PageGroupItem {
  return {
    kind: 'page',
    urlNormalized: 'https://example.com/article',
    title: 'An article',
    faviconUrl: null,
    id: rid('i'),
    groupId,
    position: 'a0',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    ...partial,
  };
}

function makeDomainItem(groupId: string, partial: Partial<Extract<PageGroupItem, { kind: 'domain' }>> = {}): PageGroupItem {
  return {
    kind: 'domain',
    hostname: 'example.com',
    includeSubdomains: true,
    id: rid('i'),
    groupId,
    position: 'a1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    ...partial,
  };
}

/** In-memory fake — tests only, never production. */
class FakeWebGroupRepository implements WebGroupRepository {
  groups: PageGroup[] = [];
  items: PageGroupItem[] = [];

  async listGroups(): Promise<PageGroup[]> {
    return this.groups.filter((g) => g.deletedAt === null);
  }

  async listItems(groupId: string): Promise<PageGroupItem[]> {
    return this.items.filter((i) => i.groupId === groupId && i.deletedAt === null);
  }

  async createGroup(input: { name: string; color: GroupColor }): Promise<PageGroup> {
    const group = makeGroup({ name: input.name, color: input.color });
    this.groups.push(group);
    return group;
  }

  async renameGroup(id: string, name: string): Promise<void> {
    const g = this.groups.find((x) => x.id === id);
    if (g) g.name = name;
  }

  async recolorGroup(id: string, color: GroupColor): Promise<void> {
    const g = this.groups.find((x) => x.id === id);
    if (g) g.color = color;
  }

  async deleteGroup(id: string): Promise<void> {
    const g = this.groups.find((x) => x.id === id);
    if (g) g.deletedAt = new Date().toISOString();
    this.items = this.items.filter((i) => i.groupId !== id);
  }

  async restoreGroup(id: string): Promise<void> {
    const g = this.groups.find((x) => x.id === id);
    if (g) g.deletedAt = null;
  }

  async moveGroup(): Promise<void> {
    // Order is repository-owned; the hook only needs the refresh round-trip.
  }

  async addPage(groupId: string, urlNormalized: string): Promise<PageGroupItem> {
    const item = makePageItem(groupId, { urlNormalized });
    this.items.push(item);
    return item;
  }

  async addDomain(
    groupId: string,
    hostname: string,
    includeSubdomains: boolean
  ): Promise<PageGroupItem> {
    const item = makeDomainItem(groupId, { hostname, includeSubdomains });
    this.items.push(item);
    return item;
  }

  async removeItem(_groupId: string, itemId: string): Promise<void> {
    const item = this.items.find((i) => i.id === itemId);
    if (item) item.deletedAt = new Date().toISOString();
  }

  async restoreItem(_groupId: string, itemId: string): Promise<void> {
    const item = this.items.find((i) => i.id === itemId);
    if (item) item.deletedAt = null;
  }

  async moveItem(): Promise<void> {
    // Order is repository-owned; the hook only needs the refresh round-trip.
  }
}

function seedRepo(): FakeWebGroupRepository {
  const repo = new FakeWebGroupRepository();
  repo.groups = [
    makeGroup({ id: 'g-manual', name: 'Research', color: 'blue' }),
    makeGroup({
      id: 'g-live',
      name: 'Tabs',
      color: 'red',
      boundDeviceId: 'dev-1',
      boundDeviceLabel: 'MacBook',
      boundBrowser: 'chrome',
      boundAt: '2026-01-02T00:00:00.000Z',
    }),
    makeGroup({
      id: 'g-closed',
      name: 'Archive',
      color: 'green',
      boundDeviceId: 'dev-1',
      boundDeviceLabel: 'MacBook',
      boundBrowser: null,
      boundAt: null,
    }),
  ];
  repo.items = [
    makePageItem('g-manual', { id: 'i-page-1' }),
    makeDomainItem('g-manual', { id: 'i-domain-1' }),
    makePageItem('g-live', {
      id: 'i-page-2',
      urlNormalized: 'https://other.org/post',
      title: 'A post',
    }),
  ];
  return repo;
}

import { PhoneGroups } from './PhoneGroups';
import { PhoneGroupDetail } from './PhoneGroupDetail';

function Harness({
  repo,
  clientKind: _clientKind,
  activeGroupId = null,
  isGuest = false,
  onOpenGroup = () => undefined,
  onBackFromGroup = () => undefined,
}: {
  repo: WebGroupRepository;
  clientKind: WebClientKind;
  activeGroupId?: string | null;
  isGuest?: boolean;
  onOpenGroup?: (id: string) => void;
  onBackFromGroup?: () => void;
}): React.ReactElement {
  const webGroups = useWebGroups({ isAuthenticated: true, repository: repo });
  const activeGroup = activeGroupId
    ? webGroups.groups.find((g) => g.id === activeGroupId) ?? null
    : null;

  if (activeGroup) {
    return (
      <PhoneGroupDetail
        group={activeGroup}
        items={webGroups.liveItemsOf(activeGroup.id)}
        highlightCountForUrl={() => 2}
        knownPages={[
          {
            urlNormalized: 'https://docs.example.com/guide',
            title: 'Guide',
            faviconUrl: null,
          },
        ]}
        onBack={onBackFromGroup}
      />
    );
  }

  return (
    <PhoneGroups
      groups={webGroups.groups}
      itemCountOf={webGroups.itemCountOf}
      onOpenGroup={onOpenGroup}
      isGuest={isGuest}
    />
  );
}

const EDIT_CONTROL_QUERIES = [
  /new group/i,
  /rename/i,
  /\bdelete\b/i,
  /add page/i,
  /add domain/i,
  /\bremove\b/i,
  /move to top/i,
  /move up/i,
  /move down/i,
];

describe.each([['phone'], ['tablet']] as Array<[WebClientKind]>)(
  'PhoneGroups (%s)',
  (clientKind) => {
    it('list shows swatch, name, count, and Live in Chrome / Closed labels', async () => {
      const repo = seedRepo();
      render(<Harness repo={repo} clientKind={clientKind} />);

      await waitFor(() => {
        expect(screen.getByTestId('phone-group-row-g-manual')).toBeTruthy();
      });

      // Live group: name + count + "Live in Chrome".
      const liveRow = screen.getByTestId('phone-group-row-g-live');
      expect(liveRow.textContent).toContain('Tabs');
      expect(screen.getByTestId('phone-group-state-g-live').textContent).toBe(
        'Live in Chrome'
      );

      // Closed group: device link without a live browser.
      expect(screen.getByTestId('phone-group-state-g-closed').textContent).toBe(
        'Closed'
      );

      // Manual group: name + count only, NO state line.
      expect(screen.getByTestId('phone-group-row-g-manual').textContent).toContain(
        'Research'
      );
      expect(screen.queryByTestId('phone-group-state-g-manual')).toBeNull();
    });

    it('tapping a group opens it via onOpenGroup', async () => {
      const repo = seedRepo();
      const onOpenGroup = vi.fn();
      render(<Harness repo={repo} clientKind={clientKind} onOpenGroup={onOpenGroup} />);

      await waitFor(() => {
        expect(screen.getByTestId('phone-group-row-g-manual')).toBeTruthy();
      });
      fireEvent.click(screen.getByTestId('phone-group-row-g-manual'));
      expect(onOpenGroup).toHaveBeenCalledWith('g-manual');
    });

    it('detail lists items with new-tab noopener anchors', async () => {
      const repo = seedRepo();
      render(
        <Harness repo={repo} clientKind={clientKind} activeGroupId="g-manual" />
      );

      await waitFor(() => {
        expect(screen.getByTestId('phone-group-detail')).toBeTruthy();
      });
      expect(screen.getByTestId('phone-group-detail-name').textContent).toBe(
        'Research'
      );
      // Manual group detail: no state line either.
      expect(screen.queryByTestId('phone-group-detail-state')).toBeNull();

      const pageAnchor = screen.getByTestId('phone-group-page-i-page-1');
      expect(pageAnchor.getAttribute('href')).toBe('https://example.com/article');
      expect(pageAnchor.getAttribute('target')).toBe('_blank');
      expect(pageAnchor.getAttribute('rel')).toBe('noopener noreferrer');

      // Domain rule expands to its resolved pages, also new-tab anchors.
      fireEvent.click(screen.getByTestId('phone-group-domain-toggle-i-domain-1'));
      const viaAnchors = screen.getAllByTestId('phone-group-page-via-i-domain-1');
      expect(viaAnchors.length).toBeGreaterThan(0);
      for (const anchor of viaAnchors) {
        expect(anchor.getAttribute('target')).toBe('_blank');
        expect(anchor.getAttribute('rel')).toBe('noopener noreferrer');
      }
    });

    it('renders zero edit controls in list and detail', async () => {
      const repo = seedRepo();
      const { unmount } = render(
        <Harness repo={repo} clientKind={clientKind} />
      );
      await waitFor(() => {
        expect(screen.getByTestId('phone-group-row-g-manual')).toBeTruthy();
      });
      for (const query of EDIT_CONTROL_QUERIES) {
        expect(
          screen.queryByText(query),
          `unexpected edit control matching ${query}`
        ).toBeNull();
      }
      unmount();

      render(
        <Harness repo={repo} clientKind={clientKind} activeGroupId="g-manual" />
      );
      await waitFor(() => {
        expect(screen.getByTestId('phone-group-detail')).toBeTruthy();
      });
      for (const query of EDIT_CONTROL_QUERIES) {
        expect(
          screen.queryByText(query),
          `unexpected edit control matching ${query}`
        ).toBeNull();
      }
    });

    it('every tap target is at least 44px', async () => {
      const repo = seedRepo();
      const { unmount } = render(
        <Harness repo={repo} clientKind={clientKind} />
      );
      await waitFor(() => {
        expect(screen.getByTestId('phone-group-row-g-manual')).toBeTruthy();
      });
      const listTargets = Array.from(
        document.querySelectorAll(
          '[data-od-id="phone-groups-section"] button, [data-od-id="phone-groups-section"] a'
        )
      );
      expect(listTargets.length).toBeGreaterThan(0);
      for (const el of listTargets) {
        expect((el as HTMLElement).style.minHeight).toBe('44px');
      }
      unmount();

      render(
        <Harness repo={repo} clientKind={clientKind} activeGroupId="g-manual" />
      );
      await waitFor(() => {
        expect(screen.getByTestId('phone-group-detail')).toBeTruthy();
      });
      fireEvent.click(screen.getByTestId('phone-group-domain-toggle-i-domain-1'));
      const detailTargets = Array.from(
        document.querySelectorAll(
          '[data-testid="phone-group-detail"] button, [data-testid="phone-group-detail"] a'
        )
      );
      expect(detailTargets.length).toBeGreaterThan(0);
      for (const el of detailTargets) {
        expect((el as HTMLElement).style.minHeight).toBe('44px');
      }
    });
  }
);

describe('PhoneGroups guest', () => {
  it('shows the guest line with no group data', async () => {
    const repo = seedRepo();
    render(<Harness repo={repo} clientKind="phone" isGuest />);
    await waitFor(() => {
      expect(screen.getByTestId('phone-groups-guest-copy')).toBeTruthy();
    });
    expect(
      screen
        .getByTestId('phone-groups-guest-copy')
        .textContent?.replace(/\s+/g, ' ')
    ).toContain('Groups are saved on this device.');
    expect(screen.queryByTestId('phone-group-row-g-manual')).toBeNull();
  });
});

describe('PhoneGroups parity actions', () => {
  it('renders + New button and Import button when callbacks are provided', () => {
    const onCreateGroup = vi.fn().mockResolvedValue(null);
    const onOpenImport = vi.fn();
    render(
      <PhoneGroups
        groups={[makeGroup({ id: 'g-1', name: 'Group 1' })]}
        itemCountOf={() => 2}
        onOpenGroup={vi.fn()}
        onCreateGroup={onCreateGroup}
        onOpenImport={onOpenImport}
      />
    );

    const newBtn = screen.getByTestId('phone-groups-new-button');
    expect(newBtn).toBeInTheDocument();
    expect(newBtn.textContent).toContain('+ New');

    const importBtn = screen.getByTestId('phone-groups-import-button');
    expect(importBtn).toBeInTheDocument();
    fireEvent.click(importBtn);
    expect(onOpenImport).toHaveBeenCalledTimes(1);

    fireEvent.click(newBtn);
    expect(screen.getByTestId('new-group-name')).toBeInTheDocument();
  });

  it('renders row ... menu with Rename, Change color, and Delete', () => {
    const onRenameGroup = vi.fn().mockResolvedValue(null);
    const onRecolorGroup = vi.fn().mockResolvedValue(null);
    const onDeleteGroup = vi.fn().mockResolvedValue(null);
    render(
      <PhoneGroups
        groups={[makeGroup({ id: 'g-1', name: 'Group 1' })]}
        itemCountOf={() => 2}
        onOpenGroup={vi.fn()}
        onRenameGroup={onRenameGroup}
        onRecolorGroup={onRecolorGroup}
        onDeleteGroup={onDeleteGroup}
      />
    );

    const menuBtn = screen.getByTestId('phone-group-menu-g-1');
    expect(menuBtn).toBeInTheDocument();
    fireEvent.click(menuBtn);

    expect(screen.getByText('Rename')).toBeInTheDocument();
    expect(screen.getByText('Change color')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Rename'));
    expect(screen.getByTestId('new-group-name')).toBeInTheDocument();
  });
});

