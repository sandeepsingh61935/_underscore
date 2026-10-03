/**
 * @file GroupsPage.test.tsx
 * @description Seam tests for the dedicated GroupsPage component (/groups and /groups/:id).
 * Verifies:
 * - Empty state when zero groups exist
 * - Desktop master-detail layout with active group at /groups/:id
 * - URL and domain subfiltering (?url=... and ?domain=...)
 * - Opening browser import dialog from the rail
 * - Responsive mobile switching: PhoneGroups on /groups and PhoneGroupDetail on /groups/:id
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';
import type { WebHighlight } from '@/web/hooks/useWebLibrary';

const mockUseApp = vi.fn();
const mockUseMobileWebViewport = vi.fn();
const mockUseWebGroups = vi.fn();
const mockUseWebLibrary = vi.fn();
const mockUseExtensionPresence = vi.fn();

vi.mock('@/core/context/AppProvider', () => ({
  useApp: () => mockUseApp(),
}));

vi.mock('@/features/billing/BillingProvider', () => ({
  useBillingContextOptional: () => null,
}));

vi.mock('@/web/lib/is-mobile-web-viewport', () => ({
  useMobileWebViewport: () => mockUseMobileWebViewport(),
}));

vi.mock('@/web/extension-presence-context', () => ({
  useExtensionPresence: () => mockUseExtensionPresence(),
}));

vi.mock('@/web/hooks/useWebGroups', () => ({
  useWebGroups: () => mockUseWebGroups(),
}));

vi.mock('@/web/hooks/useWebGroupsRealtime', () => ({
  useWebGroupsRealtime: vi.fn(),
}));

vi.mock('@/web/hooks/useWebLibrary', () => ({
  useWebLibrary: () => mockUseWebLibrary(),
}));

vi.mock('@/web/lib/extension-bridge', () => ({
  getBrowserTabGroups: vi.fn().mockResolvedValue({ ok: true, groups: [] }),
  openGroupInBrowser: vi.fn().mockResolvedValue({ ok: true }),
  focusTabGroup: vi.fn().mockResolvedValue({ ok: true }),
}));

import { GroupsPage } from './GroupsPage';

const sampleGroup1: PageGroup = {
  id: 'g-comp',
  name: 'Compiler Design',
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

const sampleGroup2: PageGroup = {
  id: 'g-dist',
  name: 'Distributed Systems',
  color: 'green',
  position: 'a1',
  boundDeviceId: null,
  boundDeviceLabel: null,
  boundBrowser: 'chrome',
  boundAt: '2026-09-01T00:00:00Z',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  deletedAt: null,
};

const samplePageItem: PageGroupItem = {
  id: 'item-p1',
  groupId: 'g-comp',
  kind: 'page',
  urlNormalized: 'https://llvm.org/docs',
  title: 'LLVM Documentation',
  faviconUrl: null,
  position: 'a0',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  deletedAt: null,
};

const sampleHighlight: WebHighlight = {
  id: 'hl-1',
  domain: 'llvm.org',
  path: '/docs',
  quote: 'LLVM is a collection of modular and reusable compiler technologies.',
  note: 'Key definition',
  savedAt: 1725148800000,
  tags: ['compilers'],
};

function renderGroupsPage(initialEntries: string[] = ['/groups']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/groups/:id" element={<GroupsPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('GroupsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseApp.mockReturnValue({ isAuthenticated: true, user: { id: 'u1' } });
    mockUseMobileWebViewport.mockReturnValue(false);
    mockUseExtensionPresence.mockReturnValue('installed');

    mockUseWebLibrary.mockReturnValue({
      highlights: [sampleHighlight],
      domains: [{ domain: 'llvm.org', count: 1 }],
      patchHighlight: vi.fn(),
      removeHighlights: vi.fn(),
    });

    mockUseWebGroups.mockReturnValue({
      groups: [sampleGroup1, sampleGroup2],
      itemsByGroup: {
        'g-comp': [samplePageItem],
        'g-dist': [],
      },
      liveItemsOf: (id: string) => (id === 'g-comp' ? [samplePageItem] : []),
      itemCountOf: (id: string) => (id === 'g-comp' ? 1 : 0),
      createGroup: vi.fn(),
      renameGroup: vi.fn(),
      recolorGroup: vi.fn(),
      deleteGroup: vi.fn().mockResolvedValue({ success: true }),
      addPage: vi.fn(),
      addDomain: vi.fn(),
      removeItem: vi.fn(),
      moveItem: vi.fn(),
      refresh: vi.fn(),
    });
  });

  it('renders master-detail layout on desktop with active group selected', () => {
    renderGroupsPage(['/groups/g-comp']);

    expect(screen.getByTestId('groups-page')).toBeInTheDocument();
    expect(screen.getByTestId('groups-rail')).toBeInTheDocument();
    expect(screen.getByTestId('groups-main')).toBeInTheDocument();

    // Group header title
    expect(screen.getByTestId('web-group-pane-name')).toHaveTextContent('Compiler Design');
    // Highlights in main pane
    expect(screen.getByText(/LLVM is a collection of modular/i)).toBeInTheDocument();
  });

  it('renders empty state when zero groups exist', () => {
    mockUseWebGroups.mockReturnValue({
      groups: [],
      itemsByGroup: {},
      liveItemsOf: () => [],
      itemCountOf: () => 0,
      createGroup: vi.fn(),
      renameGroup: vi.fn(),
      recolorGroup: vi.fn(),
      deleteGroup: vi.fn(),
      addPage: vi.fn(),
      addDomain: vi.fn(),
      removeItem: vi.fn(),
      moveItem: vi.fn(),
      refresh: vi.fn(),
    });

    renderGroupsPage(['/groups']);

    expect(screen.getByTestId('groups-empty-state')).toBeInTheDocument();
    expect(screen.getByText('No group selected')).toBeInTheDocument();
  });

  it('filters highlights when URL subfilter is present without filter breadcrumb', () => {
    renderGroupsPage(['/groups/g-comp?url=https%3A%2F%2Fllvm.org%2Fdocs']);

    expect(screen.queryByTestId('web-group-filter-breadcrumb')).not.toBeInTheDocument();
    expect(screen.getByText(/LLVM is a collection of modular/i)).toBeInTheDocument();
  });

  it('opens browser import dialog when "Import from browser" is clicked in rail', () => {
    renderGroupsPage(['/groups/g-comp']);

    const importBtn = screen.getByTestId('web-groups-import-browser');
    expect(importBtn).toBeInTheDocument();

    fireEvent.click(importBtn);

    expect(screen.getByTestId('web-group-import-dialog')).toBeInTheDocument();
  });

  describe('Mobile Viewport', () => {
    beforeEach(() => {
      mockUseMobileWebViewport.mockReturnValue(true);
    });

    it('renders PhoneGroups list when on /groups', () => {
      renderGroupsPage(['/groups']);

      expect(screen.getByTestId('phone-groups-page')).toBeInTheDocument();
      expect(screen.getByTestId('phone-group-row-g-comp')).toBeInTheDocument();
      expect(screen.getByTestId('phone-group-row-g-dist')).toBeInTheDocument();
      expect(screen.queryByTestId('groups-rail')).not.toBeInTheDocument();
    });

    it('renders PhoneGroupDetail when on /groups/:id', () => {
      renderGroupsPage(['/groups/g-comp']);

      expect(screen.getByTestId('phone-group-detail')).toBeInTheDocument();
      expect(screen.getByTestId('phone-group-detail-name')).toHaveTextContent('Compiler Design');
      expect(screen.getByTestId('phone-group-detail-back')).toBeInTheDocument();
      expect(screen.queryByTestId('groups-rail')).not.toBeInTheDocument();
    });

    it('opens PhoneQuoteScreen when highlight is clicked and returns to detail on back', () => {
      renderGroupsPage(['/groups/g-comp']);

      expect(screen.getByTestId('phone-group-detail')).toBeInTheDocument();
      const hlText = screen.getByText(/LLVM is a collection of modular/i);
      expect(hlText).toBeInTheDocument();

      fireEvent.click(hlText);

      expect(screen.getByTestId('phone-group-highlight-detail')).toBeInTheDocument();
      expect(document.querySelector('[data-od-id="phone-quote"]')).toBeInTheDocument();
      expect(screen.queryByTestId('phone-group-detail')).not.toBeInTheDocument();

      const backBtn = screen.getByTestId('phone-highlight-back');
      fireEvent.click(backBtn);

      expect(screen.getByTestId('phone-group-detail')).toBeInTheDocument();
      expect(screen.queryByTestId('phone-group-highlight-detail')).not.toBeInTheDocument();
    });

    it('renders PhoneGroups list with + New and Import buttons on mobile, opening import dialog', () => {
      renderGroupsPage(['/groups']);

      expect(screen.getByTestId('phone-groups-new-button')).toBeInTheDocument();
      const importBtn = screen.getByTestId('phone-groups-import-button');
      expect(importBtn).toBeInTheDocument();

      fireEvent.click(importBtn);
      expect(screen.getByTestId('web-group-import-dialog')).toBeInTheDocument();
    });

    it('renders PhoneGroupDetail with header menu and page actions on mobile', () => {
      renderGroupsPage(['/groups/g-comp']);

      expect(screen.getByTestId('phone-group-detail-menu-button')).toBeInTheDocument();
      expect(screen.getByTestId('phone-group-page-menu-item-p1')).toBeInTheDocument();
      expect(screen.getByTestId('phone-group-detail-select-toggle')).toBeInTheDocument();
    });
  });
});
