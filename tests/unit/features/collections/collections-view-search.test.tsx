import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { CollectionsView } from '@/features/collections/views/CollectionsView';

const navigateMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('@/core/context/AppProvider', () => ({
  useApp: vi.fn(),
}));

vi.mock('@/features/collections/hooks/useCollections', () => ({
  useCollections: vi.fn(),
}));

vi.mock('@/features/collections/hooks/useHighlightSearch', () => ({
  useHighlightSearch: vi.fn(),
}));

vi.mock('@/features/collections/hooks/useHighlightExport', () => ({
  copyHighlightPlainText: vi.fn(),
  useHighlightExport: vi.fn(() => ({ exportFile: vi.fn(), isBusy: false })),
}));

vi.mock('@/features/collections/hooks/use-highlight-delete', () => ({
  useHighlightDelete: vi.fn(() => ({ deleteScope: vi.fn() })),
}));

vi.mock('@/features/collections/hooks/useUserTags', () => ({
  useUserTags: vi.fn(() => ({
    tags: [],
    tagNames: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

import { useApp } from '@/core/context/AppProvider';
import { useCollections } from '@/features/collections/hooks/useCollections';
import { useHighlightSearch } from '@/features/collections/hooks/useHighlightSearch';

const sampleCollections = [
  { id: '1', domain: 'example.com', highlightCount: 2, lastActive: new Date('2026-01-01') },
];

describe('CollectionsView search wiring', () => {
  beforeEach(() => {
    navigateMock.mockClear();
    vi.mocked(useCollections).mockReturnValue({
      collections: sampleCollections,
      isLoading: false,
      error: null,
    });
    vi.mocked(useHighlightSearch).mockReturnValue({ results: [], isLoading: false, error: null });
  });

  it('shows the domain list and runs no search when the query is empty', () => {
    vi.mocked(useApp).mockReturnValue({
      isAuthenticated: true,
      currentMode: 'pro',
      dataProvider: {} as ReturnType<typeof useApp>['dataProvider'],
    } as ReturnType<typeof useApp>);

    render(<CollectionsView isAuthenticated />);

    expect(screen.getByText('example.com')).toBeTruthy();
    expect(vi.mocked(useHighlightSearch)).toHaveBeenCalledWith(
      expect.objectContaining({ query: '', scope: { kind: 'library' } }),
    );
    // Single-scope root: the scope pill never renders here.
    expect(screen.queryByText(/^in: /)).toBeNull();
  });

  it('groups results under domain and section headers (not a flat dump)', async () => {
    vi.mocked(useApp).mockReturnValue({
      isAuthenticated: true,
      currentMode: 'pro',
      dataProvider: {} as ReturnType<typeof useApp>['dataProvider'],
    } as ReturnType<typeof useApp>);
    vi.mocked(useHighlightSearch).mockReturnValue({
      results: [
        {
          id: 'r1',
          text: 'A matching highlight',
          url: 'https://example.com/a',
          path: '/a',
          domain: 'example.com',
          createdAt: new Date('2026-01-01'),
          matchedFields: ['text'],
        },
        {
          id: 'r2',
          text: 'Another highlight',
          url: 'https://example.com/b',
          path: '/b',
          domain: 'example.com',
          createdAt: new Date('2026-01-01'),
          notes: 'has a note match',
          matchedFields: ['notes'],
        },
        {
          id: 'r3',
          text: 'Other site hit',
          url: 'https://other.com/',
          path: '/',
          domain: 'other.com',
          createdAt: new Date('2026-01-01'),
          matchedFields: ['text'],
        },
      ],
      isLoading: false,
      error: null,
    });
    vi.mocked(useCollections).mockReturnValue({
      collections: [
        { id: '1', domain: 'example.com', highlightCount: 2, lastActive: new Date('2026-01-01') },
        { id: '2', domain: 'other.com', highlightCount: 1, lastActive: new Date('2026-01-02') },
      ],
      isLoading: false,
      error: null,
    });

    render(<CollectionsView isAuthenticated />);

    const input = screen.getByLabelText('Search');
    fireEvent.change(input, { target: { value: 'match' } });

    await waitFor(() => {
      expect(screen.getByText('A matching highlight')).toBeTruthy();
    });

    expect(screen.getByText('Another highlight')).toBeTruthy();
    expect(screen.getByText('Other site hit')).toBeTruthy();
    // Hierarchical headers, not a flat list that drops domain context.
    expect(screen.getAllByTestId('search-domain-group')).toHaveLength(2);
    expect(screen.getAllByTestId('search-group-domain').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByTestId('search-section-group').length).toBeGreaterThanOrEqual(2);
    // notes-only match gets the field badge; pure text match does not.
    expect(screen.getByText('Notes')).toBeTruthy();
    expect(screen.getByTestId('highlight-match-badge').textContent).toBe('Notes');
  });

  it('shows the no-results empty state with Clear when a search yields nothing', async () => {
    vi.mocked(useApp).mockReturnValue({
      isAuthenticated: true,
      currentMode: 'pro',
      dataProvider: {} as ReturnType<typeof useApp>['dataProvider'],
    } as ReturnType<typeof useApp>);
    vi.mocked(useHighlightSearch).mockReturnValue({ results: [], isLoading: false, error: null });

    render(<CollectionsView isAuthenticated />);

    const input = screen.getByLabelText('Search');
    fireEvent.change(input, { target: { value: 'nothing' } });

    await waitFor(() => {
      expect(screen.getByText('No matches')).toBeTruthy();
    });
    // Empty-state CTA text (shared product copy: Clear search).
    const emptyClear = screen
      .getAllByRole('button')
      .find((el) => el.textContent?.trim() === 'Clear search' || el.textContent?.trim() === 'Clear');
    expect(emptyClear).toBeTruthy();
  });

  it('exposes Filters control on the library search bar', () => {
    vi.mocked(useApp).mockReturnValue({
      isAuthenticated: true,
      currentMode: 'pro',
      dataProvider: {} as ReturnType<typeof useApp>['dataProvider'],
    } as ReturnType<typeof useApp>);

    render(<CollectionsView isAuthenticated />);
    expect(screen.getByRole('button', { name: 'Filters' })).toBeTruthy();
  });

  it('lets a guest in Basic mode type and search (local search is not gated)', async () => {
    vi.mocked(useApp).mockReturnValue({
      isAuthenticated: false,
      currentMode: 'basic',
      dataProvider: {} as ReturnType<typeof useApp>['dataProvider'],
    } as ReturnType<typeof useApp>);
    vi.mocked(useHighlightSearch).mockReturnValue({
      results: [
        {
          id: 'r1',
          text: 'A matching highlight',
          url: 'https://example.com/a',
          path: '/a',
          domain: 'example.com',
          createdAt: new Date('2026-01-01'),
          matchedFields: ['text'],
        },
      ],
      isLoading: false,
      error: null,
    });

    render(<CollectionsView />);

    const input = screen.getByLabelText('Search');
    expect(input).not.toBeDisabled();

    fireEvent.change(input, { target: { value: 'match' } });

    await waitFor(() => {
      expect(vi.mocked(useHighlightSearch)).toHaveBeenLastCalledWith(
        expect.objectContaining({ query: 'match' }),
      );
    });

    expect(screen.getByText('A matching highlight')).toBeTruthy();
  });
});
