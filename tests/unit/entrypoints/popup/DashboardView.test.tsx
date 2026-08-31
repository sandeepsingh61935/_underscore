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

describe('DashboardView home product cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGuestEmpty();
  });

  it('empty guest shows calm first-run capture guidance', () => {
    render(<DashboardView onSignIn={vi.fn()} />);

    expect(screen.getByText('No highlights yet')).toBeTruthy();
    expect(
      screen.getByText(/Select text on any page and save a highlight/i)
    ).toBeTruthy();
    expect(screen.queryByTestId('home-this-page')).toBeNull();
    expect(screen.queryByTestId('home-two-col')).toBeNull();
  });

  it('with highlights shows this-page line, two columns, and stats', () => {
    mockWithHighlights({ recentCount: 2, pageCount: 1 });
    render(<DashboardView onSectionClick={vi.fn()} />);

    expect(screen.getByTestId('home-this-page').textContent).toMatch(/This page/i);
    expect(screen.getByTestId('home-this-page').textContent).toMatch(
      /en\.wikipedia\.org/i
    );
    expect(screen.getByTestId('home-two-col')).toBeTruthy();
    expect(screen.getByTestId('home-active-pages')).toBeTruthy();
    expect(screen.getByTestId('home-recent')).toBeTruthy();
    expect(screen.getByText('Highlight quote 1')).toBeTruthy();
  });

  it('shows 2x2 stats including this week and today', () => {
    mockWithHighlights({ recentCount: 2 });
    render(<DashboardView />);

    expect(screen.getByTestId('home-stats')).toBeTruthy();
    expect(screen.getByTestId('home-stat-highlightCount').textContent).toMatch(/2/);
    expect(screen.getByTestId('home-stat-domainCount').textContent).toMatch(/1/);
    expect(screen.getByTestId('home-stat-thisWeekCount')).toBeTruthy();
    expect(screen.getByTestId('home-stat-todayCount')).toBeTruthy();
    expect(screen.getByText('This week')).toBeTruthy();
    expect(screen.getByText('Today')).toBeTruthy();
  });

  it('does not show Ask about this page', () => {
    mockWithHighlights({ mode: 'pro_xai' });
    render(<DashboardView />);

    expect(screen.queryByRole('button', { name: /Ask about this page/i })).toBeNull();
  });

  it('collapses Recent behind Show more when more than eight items', () => {
    mockWithHighlights({ recentCount: 10 });
    render(<DashboardView />);

    expect(screen.getByText('Highlight quote 1')).toBeTruthy();
    expect(screen.getByText('Highlight quote 8')).toBeTruthy();
    expect(screen.queryByText('Highlight quote 9')).toBeNull();

    const toggle = screen.getByRole('button', { name: /Show more/i });
    expect(toggle.textContent).toMatch(/2/);
    fireEvent.click(toggle);

    expect(screen.getByText('Highlight quote 9')).toBeTruthy();
    expect(screen.getByText('Highlight quote 10')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Show less/i })).toBeTruthy();
  });

  it('compact recent rows do not show notes/tags chips', () => {
    mockWithHighlights({ recentCount: 1 });
    render(<DashboardView />);

    expect(screen.queryByText('A note')).toBeNull();
    expect(screen.queryByText('css')).toBeNull();
  });

  it('shows stats and this-page line for guest with highlights', () => {
    mockWithHighlights({ mode: 'basic', isAuthenticated: false, recentCount: 2 });
    render(<DashboardView />);

    expect(screen.queryByText(/Local only/i)).toBeNull();
    expect(screen.getByTestId('home-stats')).toBeTruthy();
  });
});

describe('DashboardView guest sign-out UX', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGuestEmpty();
  });

  it('hides two-col home for empty guest storage after sign-out', () => {
    render(<DashboardView onSignIn={vi.fn()} />);

    expect(screen.queryByTestId('home-two-col')).toBeNull();
    expect(screen.getByText('No highlights yet')).toBeTruthy();
  });

  it('shows this-page line when guest has local highlights on the active tab', () => {
    mockWithHighlights({
      mode: 'basic',
      isAuthenticated: false,
      recentCount: 2,
      pageCount: 1,
    });
    render(<DashboardView />);

    expect(screen.getByTestId('home-this-page').textContent).toMatch(/This page/i);
    expect(screen.getByTestId('home-this-page').textContent).toMatch(
      /en\.wikipedia\.org/i
    );
  });
});
