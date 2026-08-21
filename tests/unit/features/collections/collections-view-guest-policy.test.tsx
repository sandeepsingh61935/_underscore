import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import { CollectionsView } from '@/features/collections/views/CollectionsView';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/core/context/AppProvider', () => ({
  useApp: vi.fn(),
}));

vi.mock('@/features/collections/hooks/useCollections', () => ({
  useCollections: vi.fn(),
}));

import { useApp } from '@/core/context/AppProvider';
import { useCollections } from '@/features/collections/hooks/useCollections';

describe('CollectionsView guest/account policy', () => {
  beforeEach(() => {
    vi.mocked(useApp).mockReturnValue({
      isAuthenticated: false,
      currentMode: 'basic',
      dataProvider: {} as ReturnType<typeof useApp>['dataProvider'],
    } as ReturnType<typeof useApp>);
  });

  it('shows sign-in empty state for unsigned users with no highlights', () => {
    vi.mocked(useCollections).mockReturnValue({
      collections: [],
      isLoading: false,
      error: null,
    });

    render(<CollectionsView onSignIn={vi.fn()} />);

    expect(screen.getByText('No highlights yet')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
  });

  it('shows local library list for unsigned users with basic data', () => {
    vi.mocked(useCollections).mockReturnValue({
      collections: [{ id: '1', domain: 'example.com', highlightCount: 2, lastActive: new Date('2026-01-01') }],
      isLoading: false,
      error: null,
    });

    render(<CollectionsView />);

    expect(screen.getByText('example.com')).toBeTruthy();
    // Domain/highlights kicker removed — guest local banner remains.
    expect(screen.queryByText(/domains · .* highlights/i)).toBeNull();
    expect(screen.getByTestId('library-guest-local-banner')).toBeTruthy();
  });

  it('shows LibraryStarters for signed-in users with empty library', () => {
    vi.mocked(useApp).mockReturnValue({
      isAuthenticated: true,
      currentMode: 'pro',
      dataProvider: {} as ReturnType<typeof useApp>['dataProvider'],
    } as ReturnType<typeof useApp>);
    vi.mocked(useCollections).mockReturnValue({
      collections: [],
      isLoading: false,
      error: null,
    });

    render(<CollectionsView isAuthenticated />);

    expect(screen.getByText('Try a starter')).toBeTruthy();
  });
});
