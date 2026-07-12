import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

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

import { useApp } from '@/core/context/PopupAppProvider';
import { useCurrentTabContext } from '@/ui-system/hooks/useCurrentTabContext';
import { useDashboardData } from '@/features/collections/hooks/useDashboardData';
import { useHighlightsByDomain } from '@/features/collections/hooks/useHighlightsByDomainFactory';

describe('DashboardView guest sign-out UX', () => {
  beforeEach(() => {
    vi.mocked(useApp).mockReturnValue({
      currentMode: 'basic',
      user: null,
      isAuthenticated: false,
      dataProvider: {} as ReturnType<typeof useApp>['dataProvider'],
    } as ReturnType<typeof useApp>);

    vi.mocked(useCurrentTabContext).mockReturnValue({
      url: 'https://en.wikipedia.org/wiki/Article',
      domain: 'en.wikipedia.org',
      path: '/wiki/Article',
      title: 'Article - Wikipedia',
    });

    vi.mocked(useDashboardData).mockReturnValue({
      data: {
        totalHighlights: 0,
        totalDomains: 0,
        thisWeekCount: 0,
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
  });

  it('hides current-page block for empty guest storage after sign-out', () => {
    render(<DashboardView onSignIn={vi.fn()} />);

    expect(screen.queryByText('Current page')).toBeNull();
    expect(screen.queryByText(/en\.wikipedia\.org/)).toBeNull();
    expect(screen.getByText('Highlight anything on any page.')).toBeTruthy();
  });

  it('shows current-page block when guest has local highlights on the active tab', () => {
    vi.mocked(useDashboardData).mockReturnValue({
      data: {
        totalHighlights: 2,
        totalDomains: 1,
        thisWeekCount: 2,
        recentHighlights: [
          {
            id: 'hl-1',
            text: 'Guest highlight',
            url: 'https://en.wikipedia.org/wiki/Article',
            path: '/wiki/Article',
            domain: 'en.wikipedia.org',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    vi.mocked(useHighlightsByDomain).mockReturnValue({
      highlights: [
        {
          id: 'hl-1',
          url: 'https://en.wikipedia.org/wiki/Article',
          text: 'Guest highlight',
          path: '/wiki/Article',
          createdAt: new Date('2026-01-01'),
        },
      ],
      isLoading: false,
      error: null,
    });

    render(<DashboardView />);

    expect(screen.getByText('Current page')).toBeTruthy();
    expect(screen.getByText('1 highlights on this page')).toBeTruthy();
    expect(screen.getAllByText(/en\.wikipedia\.org/).length).toBeGreaterThan(0);
  });
});
