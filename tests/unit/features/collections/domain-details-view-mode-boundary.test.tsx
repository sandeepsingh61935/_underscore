import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

vi.mock('@/core/context/AppProvider', () => ({
  useApp: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ domain: 'example.com' }),
  };
});

vi.mock('@/ui-system/hooks/usePersistedMode', () => ({
  usePersistedMode: vi.fn(() => ({
    currentMode: 'basic',
    modeReady: true,
    persistMode: vi.fn(),
  })),
}));

vi.mock('@/features/collections/hooks/useHighlightsByDomainFactory', () => ({
  useHighlightsByDomain: vi.fn(() => ({
    highlights: [sampleHighlight],
    isLoading: false,
    vaultLocked: false,
  })),
}));

vi.mock('@/features/collections/hooks/use-highlight-delete', () => ({
  useHighlightDelete: vi.fn(() => ({ deleteScope: vi.fn() })),
}));

vi.mock('@/features/collections/hooks/useHighlightExport', () => ({
  useHighlightExport: vi.fn(() => ({ exportFile: vi.fn(), isBusy: false })),
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

describe('DomainDetailsView basic mode boundaries', () => {
  beforeEach(() => {
    vi.mocked(useApp).mockReturnValue({
      isAuthenticated: false,
      currentMode: 'basic',
    } as ReturnType<typeof useApp>);
  });

  it('disables domain export for a guest in Basic', () => {
    render(
      <MemoryRouter>
        <DomainDetailsView domain="example.com" />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('Export domain highlights as MD')).toBeDisabled();
  });

  it('hides synthesize and ask for a guest in Basic', () => {
    render(
      <MemoryRouter>
        <DomainDetailsView domain="example.com" />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Synthesize this domain')).toBeNull();
    expect(screen.queryByPlaceholderText('Ask about this domain…')).toBeNull();
  });
});
