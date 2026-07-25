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

  it('swaps the domain list for a flat results list once a query is typed', async () => {
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
      ],
      isLoading: false,
      error: null,
    });

    render(<CollectionsView isAuthenticated />);

    const input = screen.getByLabelText('Search highlights');
    fireEvent.change(input, { target: { value: 'match' } });

    await waitFor(() => {
      expect(screen.getByText('A matching highlight')).toBeTruthy();
    });

    expect(screen.getByText('Another highlight')).toBeTruthy();
    // notes-only match gets the explanatory badge; text match does not.
    expect(screen.getByText('Matched in note')).toBeTruthy();
    expect(screen.queryByText('example.com')).toBeNull();
  });

  it('shows the no-results empty state when a search yields nothing', async () => {
    vi.mocked(useApp).mockReturnValue({
      isAuthenticated: true,
      currentMode: 'pro',
      dataProvider: {} as ReturnType<typeof useApp>['dataProvider'],
    } as ReturnType<typeof useApp>);
    vi.mocked(useHighlightSearch).mockReturnValue({ results: [], isLoading: false, error: null });

    render(<CollectionsView isAuthenticated />);

    const input = screen.getByLabelText('Search highlights');
    fireEvent.change(input, { target: { value: 'nothing' } });

    await waitFor(() => {
      expect(screen.getByText('No results found')).toBeTruthy();
    });
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

    const input = screen.getByLabelText('Search highlights');
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
