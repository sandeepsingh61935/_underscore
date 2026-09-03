import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
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
    '@/web/hooks/useWebLibrary'
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
import { clearWebLibrarySessionMemory } from '@/web/hooks/useWebLibrary';

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

/** Library large enough for related-tags gates (df≥2, co-occur, not ultra-common). */
const RELATED_SAMPLE: WebHighlight[] = [
  {
    id: 'r1',
    domain: 'ml.org',
    path: '/a',
    quote: 'gradient descent learning rate schedule alpha',
    note: '',
    tags: ['ml', 'python'],
    savedAt: Date.now() - 1000,
  },
  {
    id: 'r2',
    domain: 'ml.org',
    path: '/a',
    quote: 'gradient descent batch size beta gamma',
    note: '',
    tags: ['ml', 'python'],
    savedAt: Date.now() - 2000,
  },
  {
    id: 'r3',
    domain: 'ml.org',
    path: '/b',
    quote: 'unrelated wording about databases only',
    note: '',
    tags: ['ml'],
    savedAt: Date.now() - 3000,
  },
  {
    id: 'r4',
    domain: 'news.org',
    path: '/x',
    quote: 'politics and weather filler content here',
    note: '',
    tags: ['news'],
    savedAt: Date.now() - 4000,
  },
  {
    id: 'r5',
    domain: 'news.org',
    path: '/y',
    quote: 'more politics weather filler content there',
    note: '',
    tags: ['sports'],
    savedAt: Date.now() - 5000,
  },
  {
    id: 'r6',
    domain: 'other.org',
    path: '/z',
    quote: 'completely different corpus entry omega',
    note: '',
    tags: ['misc'],
    savedAt: Date.now() - 6000,
  },
];

function renderLibrary(initialPath: string, authenticated = true) {
  (useApp as ReturnType<typeof vi.fn>).mockReturnValue({
    isAuthenticated: authenticated,
    user: authenticated ? { email: 'u@test.com' } : null,
  });

  const router = createMemoryRouter([{ path: '/library', element: <LibraryPage /> }], {
    initialEntries: [initialPath],
  });

  const result = render(<RouterProvider router={router} />);
  return { router, ...result };
}

describe('LibraryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearWebLibrarySessionMemory();
    mockFetch.mockResolvedValue(SAMPLE);
  });

  it('selecting All clears domain/section query params', async () => {
    const { router } = renderLibrary('/library?domain=example.com&section=%2Fdocs');

    await waitFor(() => {
      expect(document.querySelector('[data-od-id="lib-all"]')).toBeTruthy();
    });

    // Scope title should reflect section
    await waitFor(() => {
      expect(
        document.querySelector('[data-od-id="library-scope-title"]')?.textContent
      ).toBe('docs');
    });

    expect(
      document.querySelector('[data-od-id="library-open-page"]')?.getAttribute('href')
    ).toBe('https://example.com/docs');

    fireEvent.click(document.querySelector('[data-od-id="lib-all"]')!);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/library');
      expect(router.state.location.search).toBe('');
    });

    expect(
      document.querySelector('[data-od-id="lib-all"]')?.classList.contains('active')
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
    const install = document.querySelector(
      '[data-od-id="library-empty-install"]'
    ) as HTMLAnchorElement | null;
    expect(install).toBeTruthy();
    expect(install?.getAttribute('href')).toBe('/install');
    expect(document.querySelector('[data-od-id="library-guest-signin"]')).toBeTruthy();
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
      document.querySelector('[data-od-id="library-export-btn"]')?.textContent
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
      /Add note/
    );
    expect(document.querySelector('[data-od-id="hl-note-h2"]')?.textContent).toMatch(
      /note here/
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

  it('shows Related tags when single-tag filter gate passes', async () => {
    mockFetch.mockResolvedValue(RELATED_SAMPLE);
    renderLibrary('/library', true);

    await waitFor(() => {
      expect(document.querySelector('[data-od-id="hl-tag-r1-ml"]')).toBeTruthy();
    });

    fireEvent.click(document.querySelector('[data-od-id="hl-tag-r1-ml"]')!);

    await waitFor(() => {
      expect(document.querySelector('[data-od-id="related-tags"]')).toBeTruthy();
      expect(document.querySelector('[data-od-id="related-tag-python"]')).toBeTruthy();
    });
  });

  it('hides Related tags when multi-tag filters are active', async () => {
    mockFetch.mockResolvedValue(RELATED_SAMPLE);
    renderLibrary('/library', true);

    await waitFor(() => {
      expect(document.querySelector('[data-od-id="hl-tag-r1-ml"]')).toBeTruthy();
    });

    fireEvent.click(document.querySelector('[data-od-id="hl-tag-r1-ml"]')!);
    await waitFor(() => {
      expect(document.querySelector('[data-od-id="related-tags"]')).toBeTruthy();
    });

    fireEvent.click(document.querySelector('[data-od-id="hl-tag-r1-python"]')!);
    await waitFor(() => {
      expect(document.querySelector('[data-od-id="related-tags"]')).toBeNull();
    });
  });

  it('opens highlight detail with related rows from list click', async () => {
    mockFetch.mockResolvedValue(RELATED_SAMPLE);
    const { router } = renderLibrary('/library', true);

    await waitFor(() => {
      expect(document.querySelector('[data-od-id="hl-main-r1"]')).toBeTruthy();
    });

    fireEvent.click(document.querySelector('[data-od-id="hl-main-r1"]')!);

    await waitFor(() => {
      expect(router.state.location.search).toContain('highlight=r1');
      expect(
        document.querySelector('[data-od-id="library-highlight-detail"]')
      ).toBeTruthy();
      expect(document.querySelector('[data-od-id="related-highlights"]')).toBeTruthy();
    });

    expect(document.querySelector('[data-od-id="related-hl-r2"]')).toBeTruthy();
    expect(document.querySelector('.related-reason-pill')).toBeNull();
    expect(document.body.textContent).not.toMatch(/Same page|Shared tags|Similar text/i);
  });

  it('lets the user jump to any page via number buttons and go-to input', async () => {
    const many: WebHighlight[] = Array.from({ length: 30 }, (_, i) => ({
      id: `p${i + 1}`,
      domain: 'pager.test',
      path: `/${i + 1}`,
      quote: `Quote number ${i + 1}`,
      note: '',
      tags: [],
      savedAt: Date.now() - i * 1000,
    }));
    mockFetch.mockResolvedValue(many);
    renderLibrary('/library', true);

    await waitFor(() => {
      expect(document.querySelector('[data-od-id="library-pager"]')).toBeTruthy();
    });

    // PAGE_SIZE=12 → 3 pages; page 1 shows quotes 1-12 (newest first).
    // Prefer stable card ids over quote text (curly-quote wrapping).
    expect(document.querySelector('[data-od-id="hl-p1"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="hl-p13"]')).toBeNull();

    fireEvent.click(document.querySelector('[data-od-id="library-pager-page-2"]')!);

    await waitFor(() => {
      expect(document.querySelector('[data-od-id="hl-p13"]')).toBeTruthy();
      expect(document.querySelector('[data-od-id="hl-p1"]')).toBeNull();
      expect(
        document
          .querySelector('[data-od-id="library-pager-page-2"]')
          ?.getAttribute('aria-current')
      ).toBe('page');
    });

    const goto = document.querySelector(
      '[data-od-id="library-pager-goto"]'
    ) as HTMLInputElement;
    expect(goto).toBeTruthy();
    fireEvent.change(goto, { target: { value: '3' } });
    fireEvent.keyDown(goto, { key: 'Enter' });

    await waitFor(() => {
      expect(document.querySelector('[data-od-id="hl-p25"]')).toBeTruthy();
      expect(document.querySelector('[data-od-id="hl-p13"]')).toBeNull();
      expect(
        document
          .querySelector('[data-od-id="library-pager-page-3"]')
          ?.getAttribute('aria-current')
      ).toBe('page');
    });
  });

  const PAGE_RELATED: WebHighlight[] = [
    {
      id: 's1',
      domain: 'docs.example.com',
      path: '/guide',
      quote: 'neural network backpropagation hidden layers training',
      note: '',
      tags: [],
      savedAt: Date.now() - 1000,
    },
    {
      id: 's2',
      domain: 'docs.example.com',
      path: '/other',
      quote: 'neural network backpropagation hidden layers training',
      note: '',
      tags: [],
      savedAt: Date.now() - 2000,
    },
    {
      id: 's3',
      domain: 'ml.org',
      path: '/n',
      quote: 'neural network backpropagation training schedule',
      note: '',
      tags: [],
      savedAt: Date.now() - 3000,
    },
  ];

  it('shows Related pages on a section listing and hides same-domain siblings', async () => {
    mockFetch.mockResolvedValue(PAGE_RELATED);
    renderLibrary('/library?domain=docs.example.com&section=%2Fguide');

    await waitFor(() => {
      expect(document.querySelector('[data-od-id="related-pages"]')).toBeTruthy();
    });
    expect(document.querySelector('[data-od-id="related-page-ml-org-n"]')).toBeTruthy();
    expect(
      document.querySelector('[data-od-id="related-page-docs-example-com-other"]')
    ).toBeNull();
    expect(document.querySelector('.related-reason-pill')).toBeNull();
    expect(document.body.textContent).not.toMatch(/Same page|Shared tags|Similar text/i);
  });

  it('hides Related pages on All and on domain root', async () => {
    mockFetch.mockResolvedValue(PAGE_RELATED);
    const all = renderLibrary('/library');
    await waitFor(() => {
      expect(document.querySelector('[data-od-id="library"]')).toBeTruthy();
    });
    expect(document.querySelector('[data-od-id="related-pages"]')).toBeNull();
    all.unmount();

    clearWebLibrarySessionMemory();
    mockFetch.mockResolvedValue(PAGE_RELATED);
    renderLibrary('/library?domain=docs.example.com');
    await waitFor(() => {
      expect(document.querySelector('[data-od-id="library"]')).toBeTruthy();
    });
    expect(document.querySelector('[data-od-id="related-pages"]')).toBeNull();
  });

  it('hides Related pages on highlight detail', async () => {
    mockFetch.mockResolvedValue(PAGE_RELATED);
    renderLibrary('/library?domain=docs.example.com&section=%2Fguide&highlight=s1');

    await waitFor(() => {
      expect(
        document.querySelector('[data-od-id="library-highlight-detail"]')
      ).toBeTruthy();
    });
    expect(document.querySelector('[data-od-id="related-pages"]')).toBeNull();
  });

  it('clicking a related page opens that page listing', async () => {
    mockFetch.mockResolvedValue(PAGE_RELATED);
    const { router } = renderLibrary('/library?domain=docs.example.com&section=%2Fguide');

    await waitFor(() => {
      expect(document.querySelector('[data-od-id="related-page-ml-org-n"]')).toBeTruthy();
    });

    fireEvent.click(document.querySelector('[data-od-id="related-page-ml-org-n"]')!);

    await waitFor(() => {
      expect(router.state.location.search).toContain('domain=ml.org');
      expect(router.state.location.search).toContain('section=%2Fn');
      expect(router.state.location.search).not.toContain('highlight=');
    });
  });
});
