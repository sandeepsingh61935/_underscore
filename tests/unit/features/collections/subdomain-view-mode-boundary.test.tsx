import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { SubDomainView } from '@/features/collections/views/SubDomainView';

const sampleHighlight = {
  id: 'hl-1',
  text: 'A highlighted quote',
  url: 'https://example.com',
  path: '/',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  notes: '',
  tags: [] as string[],
};

vi.mock('@/core/context/AppProvider', () => ({
  useApp: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ domain: 'example.com', section: '%2F' }),
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
  })),
}));

vi.mock('@/features/collections/hooks/use-highlight-delete', () => ({
  useHighlightDelete: vi.fn(() => ({ deleteScope: vi.fn() })),
}));

vi.mock('@/features/collections/hooks/useHighlightExport', () => ({
  useHighlightExport: vi.fn(() => ({ exportFile: vi.fn(), isBusy: false })),
  copyHighlightPlainText: vi.fn(),
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

vi.mock('@/features/collections/hooks/useUserTags', () => ({
  useUserTags: vi.fn(() => ({ tagNames: [], tags: [], isLoading: false, error: null, refetch: vi.fn() })),
}));

vi.mock('@/features/ai/hooks/usePageContext', () => ({
  usePageContext: vi.fn(() => ({ fetch: vi.fn() })),
}));

describe('SubDomainView basic mode boundaries', () => {
  beforeEach(() => {
    vi.mocked(useApp).mockReturnValue({
      isAuthenticated: false,
      currentMode: 'basic',
    } as ReturnType<typeof useApp>);
  });

  it('disables section export for a guest in Basic', () => {
    render(
      <MemoryRouter>
        <SubDomainView domain="example.com" section="/" />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('export-menu-trigger')).toBeDisabled();
  });

  it('hides summarize and ask footer; keeps export/delete toolbar for a guest in Basic', () => {
    render(
      <MemoryRouter>
        <SubDomainView domain="example.com" section="/" />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Summarize this section')).toBeNull();
    expect(screen.queryByPlaceholderText('Ask about this section…')).toBeNull();
    expect(screen.getByTestId('section-scope-toolbar')).toBeTruthy();
    expect(screen.getByLabelText('Delete section')).toBeTruthy();
  });

  it('shows the marginalia strip invite for a guest in Basic (local metadata is not gated)', () => {
    render(
      <MemoryRouter>
        <SubDomainView domain="example.com" section="/" />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: '+ Add note or tags' })).toBeTruthy();
  });
});
