import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { SubDomainView } from '@/features/collections/views/SubDomainView';

const sampleHighlight = {
  id: 'hl-1',
  text: 'A highlighted quote',
  url: 'https://example.com/blog',
  path: '/blog',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  notes: '',
  tags: [] as string[],
};

const navigateMock = vi.fn();

vi.mock('@/core/context/AppProvider', () => ({
  useApp: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ domain: 'example.com', section: '%2Fblog' }),
  };
});

vi.mock('@/ui-system/hooks/usePersistedMode', () => ({
  usePersistedMode: vi.fn(() => ({
    currentMode: 'pro',
    modeReady: true,
    persistMode: vi.fn(),
  })),
}));

vi.mock('@/features/collections/hooks/useHighlightsByDomainFactory', () => ({
  useHighlightsByDomain: vi.fn(() => ({
    highlights: [sampleHighlight],
    isLoading: false,
  })),
}));

vi.mock('@/features/collections/hooks/use-highlight-delete', () => ({
  useHighlightDelete: vi.fn(() => ({ deleteScope: vi.fn() })),
}));

vi.mock('@/features/collections/hooks/useHighlightExport', () => ({
  useHighlightExport: vi.fn(() => ({ exportFile: vi.fn(), isBusy: false })),
  copyHighlightPlainText: vi.fn(),
}));

vi.mock('@/features/collections/hooks/useHighlightSearch', () => ({
  useHighlightSearch: vi.fn(),
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

vi.mock('@/features/collections/hooks/useUpdateHighlightMetadata', () => ({
  useUpdateHighlightMetadata: vi.fn(() => ({ updateMetadata: vi.fn() })),
}));

vi.mock('@/features/ai/hooks/useActiveLLMProvider', () => ({
  useActiveLLMProvider: vi.fn(() => ({ provider: null })),
}));

vi.mock('@/features/ai/hooks/useGenerateSummary', () => ({
  useGenerateSummary: vi.fn(() => ({
    start: vi.fn(),
    phase: 'idle',
    status: 'idle',
    chunks: '',
    error: null,
  })),
}));

vi.mock('@/features/ai/hooks/useLlmArtifacts', () => ({
  useLlmArtifacts: vi.fn(() => ({
    getByKind: vi.fn(() => null),
    isStale: vi.fn(() => false),
    save: vi.fn(),
  })),
}));

vi.mock('@/features/ai/hooks/usePersistLlmArtifactOnDone', () => ({
  usePersistLlmArtifactOnDone: vi.fn(),
}));

vi.mock('@/features/ai/hooks/usePageContext', () => ({
  usePageContext: vi.fn(() => ({ fetch: vi.fn() })),
}));

import { useHighlightSearch } from '@/features/collections/hooks/useHighlightSearch';

describe('SubDomainView search wiring', () => {
  beforeEach(() => {
    navigateMock.mockClear();
    vi.mocked(useApp).mockReturnValue({
      isAuthenticated: true,
      currentMode: 'pro',
    } as ReturnType<typeof useApp>);
    vi.mocked(useHighlightSearch).mockReturnValue({ results: [], isLoading: false, error: null });
  });

  it('searches within the current section only, with no scope pill', () => {
    render(
      <MemoryRouter>
        <SubDomainView domain="example.com" section="/blog" />
      </MemoryRouter>,
    );

    expect(vi.mocked(useHighlightSearch)).toHaveBeenCalledWith(
      expect.objectContaining({ scope: { kind: 'section', domain: 'example.com', section: '/blog' } }),
    );
    expect(screen.queryByText(/^in: /)).toBeNull();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('lets a guest in Basic mode search too (local search is not gated)', async () => {
    vi.mocked(useApp).mockReturnValue({
      isAuthenticated: false,
      currentMode: 'basic',
    } as ReturnType<typeof useApp>);

    render(
      <MemoryRouter>
        <SubDomainView domain="example.com" section="/blog" />
      </MemoryRouter>,
    );

    const input = screen.getByLabelText('Search highlights');
    expect(input).not.toBeDisabled();

    fireEvent.change(input, { target: { value: 'quote' } });

    await waitFor(() => {
      expect(vi.mocked(useHighlightSearch)).toHaveBeenLastCalledWith(
        expect.objectContaining({
          query: 'quote',
          scope: { kind: 'section', domain: 'example.com', section: '/blog' },
        }),
      );
    });
  });

  it('shows the matched-field badge and note/label editor for search results when tags are allowed', async () => {
    vi.mocked(useHighlightSearch).mockReturnValue({
      results: [
        {
          id: 'r1',
          text: 'A highlighted quote about tags',
          url: 'https://example.com/blog',
          path: '/blog',
          domain: 'example.com',
          createdAt: new Date('2026-01-01'),
          notes: 'reminder',
          tags: ['important'],
          matchedFields: ['notes'],
        },
      ],
      isLoading: false,
      error: null,
    });

    render(
      <MemoryRouter>
        <SubDomainView domain="example.com" section="/blog" />
      </MemoryRouter>,
    );

    const input = screen.getByLabelText('Search highlights');
    fireEvent.change(input, { target: { value: 'tags' } });

    await waitFor(() => {
      expect(screen.getByText('A highlighted quote about tags')).toBeTruthy();
    });

    expect(screen.getByText('Matched in note')).toBeTruthy();
    expect(screen.getByText('important')).toBeTruthy();
  });

  it('hides location meta on search result cards (results are already scoped to this section)', async () => {
    vi.mocked(useHighlightSearch).mockReturnValue({
      results: [
        {
          id: 'r1',
          text: 'A highlighted quote',
          url: 'https://example.com/blog',
          path: '/blog',
          domain: 'example.com',
          createdAt: new Date('2026-01-01'),
          matchedFields: ['text'],
        },
      ],
      isLoading: false,
      error: null,
    });

    render(
      <MemoryRouter>
        <SubDomainView domain="example.com" section="/blog" />
      </MemoryRouter>,
    );

    const input = screen.getByLabelText('Search highlights');
    fireEvent.change(input, { target: { value: 'quote' } });

    await waitFor(() => {
      expect(screen.getByText('A highlighted quote')).toBeTruthy();
    });

    expect(screen.queryByText('example.com/blog')).toBeNull();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('refine Has notes filters section list to zero and Clear search recovers', async () => {
    // sampleHighlight has empty notes/tags — Has notes should empty the list without a query.
    render(
      <MemoryRouter>
        <SubDomainView domain="example.com" section="/blog" />
      </MemoryRouter>,
    );

    expect(screen.getByText('A highlighted quote')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    fireEvent.click(screen.getByRole('button', { name: 'Has notes' }));

    await waitFor(() => {
      expect(screen.getByText('No matches')).toBeTruthy();
    });
    expect(screen.getByText('No results')).toBeTruthy();
    expect(screen.queryByText('A highlighted quote')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));

    await waitFor(() => {
      expect(screen.getByText('A highlighted quote')).toBeTruthy();
    });
    expect(screen.queryByText('No matches')).toBeNull();
  });
});
