import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { DashboardView } from '@/entrypoints/popup/views/DashboardView';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/core/context/PopupAppProvider', () => ({
  useApp: vi.fn(),
}));

vi.mock('@/ui-system/hooks/useCurrentTabContext', () => ({
  useCurrentTabContext: vi.fn(),
}));

vi.mock('@/features/collections/hooks/useDashboardData', () => ({
  useDashboardData: vi.fn(),
}));

vi.mock('@/features/collections/hooks/useHighlightsByDomainFactory', () => ({
  useHighlightsByDomain: vi.fn(),
}));

vi.mock('@/features/collections/hooks/useHighlightExport', () => ({
  copyHighlightPlainText: vi.fn(),
}));

import { useApp } from '@/core/context/PopupAppProvider';
import { useCurrentTabContext } from '@/ui-system/hooks/useCurrentTabContext';
import { useDashboardData } from '@/features/collections/hooks/useDashboardData';
import { useHighlightsByDomain } from '@/features/collections/hooks/useHighlightsByDomainFactory';

const baseTab = {
  url: 'https://en.wikipedia.org/wiki/Article',
  domain: 'en.wikipedia.org',
  path: '/wiki/Article',
  title: 'Article - Wikipedia',
};

function mockGuestEmpty(): void {
  vi.mocked(useApp).mockReturnValue({
    currentMode: 'basic',
    user: null,
    isAuthenticated: false,
    dataProvider: {} as ReturnType<typeof useApp>['dataProvider'],
  } as ReturnType<typeof useApp>);

  vi.mocked(useCurrentTabContext).mockReturnValue(baseTab);

  vi.mocked(useDashboardData).mockReturnValue({
    data: {
      totalHighlights: 0,
      totalDomains: 0,
      thisWeekCount: 0,
      todayCount: 0,
      withNotesCount: 0,
      withTagsCount: 0,
      recentHighlights: [],
    },
    isLoading: false,
    error: null,
  });

  vi.mocked(useHighlightsByDomain).mockReturnValue({
    highlights: [],
    isLoading: false,
    error: null,
  });
}

function mockWithHighlights(opts?: {
  mode?: 'basic' | 'pro' | 'pro_xai';
  isAuthenticated?: boolean;
  recentCount?: number;
  pageCount?: number;
}): void {
  const mode = opts?.mode ?? 'pro';
  const isAuthenticated = opts?.isAuthenticated ?? true;
  const recentCount = opts?.recentCount ?? 2;
  const pageCount = opts?.pageCount ?? 1;

  const recentHighlights = Array.from({ length: recentCount }, (_, i) => ({
    id: `hl-${i + 1}`,
    text: `Highlight quote ${i + 1}`,
    url: 'https://en.wikipedia.org/wiki/Article',
    path: '/wiki/Article',
    domain: 'en.wikipedia.org',
    createdAt: '2026-01-01T00:00:00.000Z',
    notes: i === 0 ? 'A note' : undefined,
    tags: i === 0 ? ['css', 'fundamentals'] : undefined,
  }));

  vi.mocked(useApp).mockReturnValue({
    currentMode: mode,
    user: isAuthenticated
      ? { id: 'u1', email: 'a@b.com', displayName: 'Alex Rivera' }
      : null,
    isAuthenticated,
    dataProvider: {} as ReturnType<typeof useApp>['dataProvider'],
  } as ReturnType<typeof useApp>);

  vi.mocked(useCurrentTabContext).mockReturnValue(baseTab);

  vi.mocked(useDashboardData).mockReturnValue({
    data: {
      totalHighlights: recentCount,
      totalDomains: 1,
      thisWeekCount: recentCount,
      todayCount: Math.min(1, recentCount),
      withNotesCount: recentCount > 0 ? 1 : 0,
      withTagsCount: recentCount > 0 ? 1 : 0,
      recentHighlights,
    },
    isLoading: false,
    error: null,
  });

  vi.mocked(useHighlightsByDomain).mockReturnValue({
    highlights: Array.from({ length: pageCount }, (_, i) => ({
      id: `hl-${i + 1}`,
      url: 'https://en.wikipedia.org/wiki/Article',
      text: `Highlight quote ${i + 1}`,
      path: '/wiki/Article',
      createdAt: new Date('2026-01-01'),
    })),
    isLoading: false,
    error: null,
  });
}

describe('DashboardView v3 home anchor + stream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGuestEmpty();
  });

  it('empty guest shows calm first-run capture guidance', () => {
    render(<DashboardView onSignIn={vi.fn()} />);

    expect(screen.getByText('No highlights yet')).toBeTruthy();
    expect(screen.getByText(/Select text on a page to save it/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Sign in to sync/i })).toBeTruthy();
    expect(screen.queryByText('Current page')).toBeNull();
    expect(screen.queryByText('Recent')).toBeNull();
  });

  it('with highlights, Current page band and Recent labels appear', () => {
    mockWithHighlights({ recentCount: 2, pageCount: 1 });
    render(<DashboardView onSectionClick={vi.fn()} />);

    expect(screen.getByText('Current page')).toBeTruthy();
    expect(screen.getByText('en.wikipedia.org')).toBeTruthy();
    expect(screen.getByText('/wiki/Article')).toBeTruthy();
    expect(screen.getByText(/1 on this page/)).toBeTruthy();
    expect(screen.getByText('Recent')).toBeTruthy();
    expect(screen.getByText('Highlight quote 1')).toBeTruthy();
  });

  it('shows greeting/title, status, and compact stats (web Home parity)', () => {
    mockWithHighlights({ recentCount: 2 });
    render(<DashboardView />);

    expect(screen.getByTestId('home-status')).toBeTruthy();
    expect(screen.getByTestId('home-title')).toBeTruthy();
    expect(screen.getByTestId('home-status').textContent).toMatch(/2 highlights/i);
    expect(screen.getByTestId('home-status').textContent).toMatch(/1 domains/i);
    expect(screen.getByTestId('home-stats')).toBeTruthy();
    expect(screen.queryByTestId('library-pulse')).toBeNull();
    expect(screen.queryByText('This week')).toBeNull();
    expect(screen.queryByText('Resume')).toBeNull();
    expect(screen.queryByText('Needs')).toBeNull();
  });

  it('does not show Ask about this page', () => {
    mockWithHighlights({ mode: 'pro_xai' });
    render(<DashboardView />);

    expect(screen.queryByRole('button', { name: /Ask about this page/i })).toBeNull();
  });

  it('collapses Recent behind Show more when more than six items', () => {
    mockWithHighlights({ recentCount: 8 });
    render(<DashboardView />);

    expect(screen.getByText('Highlight quote 1')).toBeTruthy();
    expect(screen.getByText('Highlight quote 6')).toBeTruthy();
    expect(screen.queryByText('Highlight quote 7')).toBeNull();

    const toggle = screen.getByRole('button', { name: /Show more/i });
    expect(toggle.textContent).toMatch(/2/);
    fireEvent.click(toggle);

    expect(screen.getByText('Highlight quote 7')).toBeTruthy();
    expect(screen.getByText('Highlight quote 8')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Show less/i })).toBeTruthy();
  });

  it('shows optional note on recent cards when present', () => {
    mockWithHighlights({ recentCount: 1 });
    render(<DashboardView />);

    expect(screen.getByText('A note')).toBeTruthy();
    expect(screen.getByText('css')).toBeTruthy();
  });

  it('shows status line with local-only for guest with highlights', () => {
    mockWithHighlights({ mode: 'basic', isAuthenticated: false, recentCount: 2 });
    const { container } = render(<DashboardView />);

    expect(screen.getByText(/Local only/i)).toBeTruthy();
    const status = container.querySelector('p.u-mono');
    expect(status?.textContent?.replace(/\s+/g, ' ')).toMatch(/Local only.*2.*highlights/i);
  });
});

describe('DashboardView guest sign-out UX', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGuestEmpty();
  });

  it('hides current-page block for empty guest storage after sign-out', () => {
    render(<DashboardView onSignIn={vi.fn()} />);

    expect(screen.queryByText('Current page')).toBeNull();
    expect(screen.queryByText(/en\.wikipedia\.org/)).toBeNull();
    expect(screen.getByText('No highlights yet')).toBeTruthy();
  });

  it('shows current-page block when guest has local highlights on the active tab', () => {
    mockWithHighlights({ mode: 'basic', isAuthenticated: false, recentCount: 2, pageCount: 1 });
    render(<DashboardView />);

    expect(screen.getByText('Current page')).toBeTruthy();
    expect(screen.getByText(/1 on this page/)).toBeTruthy();
    expect(screen.getAllByText(/en\.wikipedia\.org/).length).toBeGreaterThan(0);
  });
});
