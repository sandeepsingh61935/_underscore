import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  createMemoryRouter,
  RouterProvider,
} from 'react-router-dom';
import { LibraryPage } from './LibraryPage';
import type { WebHighlight } from '@/web/hooks/useWebLibrary';

vi.mock('@/core/context/AppProvider', () => ({
  useApp: vi.fn(),
}));

vi.mock('@/features/billing/BillingProvider', () => ({
  useBillingContextOptional: vi.fn(() => null),
}));

vi.mock('@/features/collections/hooks/useUpdateHighlightMetadata', () => ({
  useUpdateHighlightMetadata: () => ({
    updateMetadata: vi.fn().mockResolvedValue(true),
  }),
}));

const mockFetch = vi.fn<() => Promise<WebHighlight[]>>();

vi.mock('@/web/hooks/useWebLibrary', async () => {
  const actual = await vi.importActual<typeof import('@/web/hooks/useWebLibrary')>(
    '@/web/hooks/useWebLibrary',
  );
  return {
    ...actual,
    useWebLibrary: (opts: {
      isAuthenticated: boolean;
      planLabel: string;
      fetchHighlights?: () => Promise<WebHighlight[]>;
    }) =>
      actual.useWebLibrary({
        ...opts,
        fetchHighlights: opts.fetchHighlights ?? mockFetch,
      }),
  };
});

import { useApp } from '@/core/context/AppProvider';

const SAMPLE: WebHighlight[] = [
  {
    id: 'h1',
    domain: 'example.com',
    path: '/docs',
    quote: 'Hello library',
    note: '',
    tags: ['a'],
    savedAt: Date.now() - 1000,
  },
  {
    id: 'h2',
    domain: 'example.com',
    path: '/',
    quote: 'Root quote',
    note: 'note here',
    tags: [],
    savedAt: Date.now() - 2000,
  },
  {
    id: 'h3',
    domain: 'other.org',
    path: '/post',
    quote: 'Elsewhere',
    note: '',
    tags: [],
    savedAt: Date.now() - 3000,
  },
];

function renderLibrary(initialPath: string, authenticated = true) {
  (useApp as ReturnType<typeof vi.fn>).mockReturnValue({
    isAuthenticated: authenticated,
    user: authenticated ? { email: 'u@test.com' } : null,
  });

  const router = createMemoryRouter(
    [{ path: '/library', element: <LibraryPage /> }],
    { initialEntries: [initialPath] },
  );

  const result = render(<RouterProvider router={router} />);
  return { router, ...result };
}

describe('LibraryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue(SAMPLE);
  });

  it('selecting All clears domain/section query params', async () => {
    const { router } = renderLibrary(
      '/library?domain=example.com&section=%2Fdocs',
    );

    await waitFor(() => {
      expect(document.querySelector('[data-od-id="lib-all"]')).toBeTruthy();
    });

    // Scope title should reflect section
    await waitFor(() => {
      expect(
        document.querySelector('[data-od-id="library-scope-title"]')?.textContent,
      ).toBe('docs');
    });

    fireEvent.click(document.querySelector('[data-od-id="lib-all"]')!);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/library');
      expect(router.state.location.search).toBe('');
    });

    expect(
      document.querySelector('[data-od-id="lib-all"]')?.classList.contains('active'),
    ).toBe(true);
  });

  it('selecting a domain sets ?domain= and clears section', async () => {
    const { router } = renderLibrary('/library?domain=example.com&section=%2Fdocs');

    await waitFor(() => {
      expect(document.querySelector('[data-od-id="lib-domain-other-org"]')).toBeTruthy();
    });

    fireEvent.click(document.querySelector('[data-od-id="lib-domain-other-org"]')!);

    await waitFor(() => {
      expect(router.state.location.search).toBe('?domain=other.org');
    });
  });

  it('guest: true empty, no export, no seed quotes', async () => {
    mockFetch.mockResolvedValue(SAMPLE);
    renderLibrary('/library', false);

    await waitFor(() => {
      expect(document.querySelector('[data-od-id="library"]')).toBeTruthy();
    });

    expect(document.querySelector('[data-od-id="guest-banner"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="library-export"]')).toBeNull();
    expect(document.querySelectorAll('.hl-quote').length).toBe(0);
    expect(screen.getByText('No highlights')).toBeTruthy();
    // useWebLibrary guest path never calls fetch — rail stays domain-empty
    expect(document.querySelector('[data-od-id="lib-all"]')).toBeTruthy();
    expect(screen.getByText('No domains')).toBeTruthy();
  });

  it('signed-in free: shows Download export when caps.export', async () => {
    renderLibrary('/library', true);

    await waitFor(() => {
      expect(document.querySelector('[data-od-id="library-export"]')).toBeTruthy();
    });

    expect(
      document.querySelector('[data-od-id="library-export-btn"]')?.textContent,
    ).toMatch(/Download/i);

    await waitFor(() => {
      expect(document.querySelectorAll('.hl-quote').length).toBe(3);
    });
  });

  it('signed-in: shows tag chips, note affordance, and note text on cards', async () => {
    renderLibrary('/library', true);

    await waitFor(() => {
      expect(document.querySelector('[data-od-id="hl-h1"]')).toBeTruthy();
    });

    expect(document.querySelector('[data-od-id="hl-tag-h1-a"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="hl-tag-add-h1"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="hl-note-h1"]')?.textContent).toMatch(
      /Add note/,
    );
    expect(document.querySelector('[data-od-id="hl-note-h2"]')?.textContent).toMatch(
      /note here/,
    );
  });

  it('clicking a tag chip toggles tag filter (does not only navigate)', async () => {
    renderLibrary('/library', true);

    await waitFor(() => {
      expect(document.querySelector('[data-od-id="hl-tag-h1-a"]')).toBeTruthy();
    });

    fireEvent.click(document.querySelector('[data-od-id="hl-tag-h1-a"]')!);

    await waitFor(() => {
      // With tag filter "a", only h1 remains in the list
      expect(document.querySelectorAll('.hl-quote').length).toBe(1);
      expect(screen.getByText(/Hello library/)).toBeTruthy();
    });
  });
});
