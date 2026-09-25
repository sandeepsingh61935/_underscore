import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { SubDomainView } from '@/features/collections/views/SubDomainView';
import { useHighlightsByDomain } from '@/features/collections/hooks/useHighlightsByDomainFactory';

const hl1 = {
  id: 'hl-1',
  text: 'Highlight 1',
  url: 'https://example.com/page1',
  path: '/page1',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  notes: '',
  tags: [] as string[],
};

const hl2 = {
  id: 'hl-2',
  text: 'Highlight 2',
  url: 'https://example.com/page2',
  path: '/page2',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  notes: '',
  tags: [] as string[],
};

vi.mock('@/core/context/AppProvider', () => ({
  useApp: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ domain: 'example.com', section: '%2Fpage1' }),
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
  useHighlightsByDomain: vi.fn(),
}));

vi.mock('@/features/collections/hooks/use-highlight-delete', () => ({
  useHighlightDelete: vi.fn(() => ({ deleteScope: vi.fn() })),
}));

vi.mock('@/features/collections/hooks/useHighlightExport', () => ({
  useHighlightExport: vi.fn(() => ({ exportFile: vi.fn(), isBusy: false })),
  copyHighlightPlainText: vi.fn(),
}));

vi.mock('@/features/collections/hooks/useUserTags', () => ({
  useUserTags: vi.fn(() => ({
    tagNames: [],
    tags: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

describe('SubDomainView last highlight deletion and empty states', () => {
  beforeEach(() => {
    vi.mocked(useApp).mockReturnValue({
      isAuthenticated: true,
      currentMode: 'pro',
    } as ReturnType<typeof useApp>);
  });

  it('renders without error when the last highlight of a page is deleted while domain still has highlights', () => {
    // 1st render: page1 has hl1, domain also has hl2
    vi.mocked(useHighlightsByDomain).mockReturnValue({
      highlights: [hl1, hl2],
      isLoading: false,
      error: null,
    });

    const { rerender } = render(
      <MemoryRouter>
        <SubDomainView domain="example.com" section="/page1" />
      </MemoryRouter>
    );

    expect(screen.getByText('Highlight 1')).toBeTruthy();

    // 2nd render: hl1 was deleted from page1, so highlights only has hl2
    vi.mocked(useHighlightsByDomain).mockReturnValue({
      highlights: [hl2],
      isLoading: false,
      error: null,
    });

    rerender(
      <MemoryRouter>
        <SubDomainView domain="example.com" section="/page1" />
      </MemoryRouter>
    );

    expect(screen.getByText('No highlights in page1')).toBeTruthy();
  });

  it('renders without hook error on initial load when transitioning from loading to empty page', () => {
    // Simulates extension reload: 1st render isLoading = true, 2nd render highlights loaded with 0 highlights in this section
    vi.mocked(useHighlightsByDomain).mockReturnValue({
      highlights: [],
      isLoading: true,
      error: null,
    });

    const { rerender } = render(
      <MemoryRouter>
        <SubDomainView domain="example.com" section="/page1" />
      </MemoryRouter>
    );

    vi.mocked(useHighlightsByDomain).mockReturnValue({
      highlights: [hl2], // domain has hl2 on page2, but 0 highlights on page1
      isLoading: false,
      error: null,
    });

    rerender(
      <MemoryRouter>
        <SubDomainView domain="example.com" section="/page1" />
      </MemoryRouter>
    );

    expect(screen.getByText('No highlights in page1')).toBeTruthy();
  });

  it('calls onDomainEmpty when all highlights of all pages in the domain are deleted', () => {
    const onDomainEmpty = vi.fn();

    vi.mocked(useHighlightsByDomain).mockReturnValue({
      highlights: [hl1],
      isLoading: false,
      error: null,
    });

    const { rerender } = render(
      <MemoryRouter>
        <SubDomainView
          domain="example.com"
          section="/page1"
          onDomainEmpty={onDomainEmpty}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Highlight 1')).toBeTruthy();

    // Now hl1 is deleted, so the domain has 0 highlights left
    vi.mocked(useHighlightsByDomain).mockReturnValue({
      highlights: [],
      isLoading: false,
      error: null,
    });

    rerender(
      <MemoryRouter>
        <SubDomainView
          domain="example.com"
          section="/page1"
          onDomainEmpty={onDomainEmpty}
        />
      </MemoryRouter>
    );

    expect(onDomainEmpty).toHaveBeenCalledTimes(1);
  });
});
