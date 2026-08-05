import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { DomainDetailsView } from '@/features/collections/views/DomainDetailsView';

const sampleHighlight = {
  id: 'hl-1',
  text: 'A highlighted quote',
  url: 'https://example.com',
  path: '/',
  createdAt: new Date('2026-01-01T00:00:00Z'),
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
    useParams: () => ({ domain: 'example.com' }),
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
  isExtensionContext: vi.fn(() => true),
}));

vi.mock('@/features/collections/hooks/useUpdateHighlightMetadata', () => ({
  useUpdateHighlightMetadata: vi.fn(() => ({
    updateMetadata: vi.fn().mockResolvedValue(true),
  })),
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

vi.mock('@/features/collections/hooks/useSectionLabels', () => ({
  useSectionLabels: vi.fn(() => ({
    labels: {},
    canEdit: false,
    saveLabel: vi.fn(),
  })),
}));

vi.mock('@/features/ai/hooks/useActiveLLMProvider', () => ({
  useActiveLLMProvider: vi.fn(() => ({ provider: null })),
}));

vi.mock('@/features/ai/hooks/useSynthesizeDomain', () => ({
  useSynthesizeDomain: vi.fn(() => ({
    start: vi.fn(),
    phase: 'idle',
    status: 'idle',
    chunks: '',
    error: null,
    sectionProgress: { current: 0, total: 0 },
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

describe('DomainDetailsView search wiring', () => {
  beforeEach(() => {
    navigateMock.mockClear();
    vi.mocked(useApp).mockReturnValue({
      isAuthenticated: true,
      currentMode: 'pro',
    } as ReturnType<typeof useApp>);
    vi.mocked(useHighlightSearch).mockReturnValue({ results: [], isLoading: false, error: null });
  });

  it('searches within the current domain only, with no scope pill', () => {
    render(
      <MemoryRouter>
        <DomainDetailsView domain="example.com" />
      </MemoryRouter>,
    );

    expect(vi.mocked(useHighlightSearch)).toHaveBeenCalledWith(
      expect.objectContaining({ scope: { kind: 'domain', domain: 'example.com' } }),
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
        <DomainDetailsView domain="example.com" />
      </MemoryRouter>,
    );

    const input = screen.getByLabelText('Search highlights');
    expect(input).not.toBeDisabled();

    fireEvent.change(input, { target: { value: 'hit' } });

    await waitFor(() => {
      expect(vi.mocked(useHighlightSearch)).toHaveBeenLastCalledWith(
        expect.objectContaining({ query: 'hit', scope: { kind: 'domain', domain: 'example.com' } }),
      );
    });
  });

  it('groups domain search hits under section headers', async () => {
    vi.mocked(useHighlightSearch).mockReturnValue({
      results: [
        {
          id: 'r1',
          text: 'A matching highlight',
          url: 'https://example.com/x',
          path: '/x',
          domain: 'example.com',
          createdAt: new Date('2026-01-01'),
          matchedFields: ['text'],
        },
        {
          id: 'r2',
          text: 'Second path hit',
          url: 'https://example.com/y',
          path: '/y',
          domain: 'example.com',
          createdAt: new Date('2026-01-02'),
          matchedFields: ['text'],
        },
      ],
      isLoading: false,
      error: null,
    });

    render(
      <MemoryRouter>
        <DomainDetailsView domain="example.com" />
      </MemoryRouter>,
    );

    const input = screen.getByLabelText('Search highlights');
    fireEvent.change(input, { target: { value: 'hit' } });

    await waitFor(() => {
      expect(screen.getByText('A matching highlight')).toBeTruthy();
    });
    expect(screen.getAllByTestId('search-section-group')).toHaveLength(2);
    expect(screen.getByText('Second path hit')).toBeTruthy();
  });

  it('routes a result click through onSectionClick when provided', async () => {
    const onSectionClick = vi.fn();
    vi.mocked(useHighlightSearch).mockReturnValue({
      results: [
        {
          id: 'r1',
          text: 'A matching highlight',
          url: 'https://example.com/x',
          path: '/x',
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
        <DomainDetailsView domain="example.com" onSectionClick={onSectionClick} />
      </MemoryRouter>,
    );

    const input = screen.getByLabelText('Search highlights');
    fireEvent.change(input, { target: { value: 'hit' } });

    const resultMeta = await screen.findByText('example.com/x');
    fireEvent.click(resultMeta);

    expect(onSectionClick).toHaveBeenCalledWith('example.com', '/x');
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('falls back to navigate for a result click when no onSectionClick is provided', async () => {
    vi.mocked(useHighlightSearch).mockReturnValue({
      results: [
        {
          id: 'r1',
          text: 'A matching highlight',
          url: 'https://example.com/x',
          path: '/x',
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
        <DomainDetailsView domain="example.com" />
      </MemoryRouter>,
    );

    const input = screen.getByLabelText('Search highlights');
    fireEvent.change(input, { target: { value: 'hit' } });

    const resultMeta = await screen.findByText('example.com/x');
    fireEvent.click(resultMeta);

    expect(navigateMock).toHaveBeenCalledWith('/domain/example.com/section/%2Fx');
  });
});
