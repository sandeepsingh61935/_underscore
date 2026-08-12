import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AskPage } from './AskPage';
import type { WebHighlight } from '@/web/hooks/useWebLibrary';

vi.mock('@/core/context/AppProvider', () => ({
  useApp: vi.fn(),
}));

vi.mock('@/features/billing/BillingProvider', () => ({
  useBillingContextOptional: vi.fn(() => null),
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

vi.mock('@/web/hooks/useWebChat', () => ({
  useWebChat: () => ({
    status: 'ready',
    error: null,
    threads: [],
    activeThreadId: null,
    messages: [],
    refreshThreads: vi.fn().mockResolvedValue(undefined),
    selectThread: vi.fn().mockResolvedValue(undefined),
    newThread: vi.fn(),
    deleteThread: vi.fn().mockResolvedValue(undefined),
    beginTurn: vi.fn(),
    finalizeTurn: vi.fn(),
    patchLocalMessage: vi.fn(),
    replaceMessages: vi.fn(),
  }),
}));

vi.mock('@/features/ai/hooks/useLLMStream', () => ({
  useLLMStream: () => ({
    chunks: '',
    status: 'idle',
    error: null,
    start: vi.fn(),
    abort: vi.fn(),
  }),
}));

import { useApp } from '@/core/context/AppProvider';
import { useBillingContextOptional } from '@/features/billing/BillingProvider';

function mockBilling(opts: {
  isPaidActive: boolean;
  status: string;
  cancelAtPeriodEnd?: boolean;
}) {
  const startCheckout = vi.fn().mockResolvedValue(undefined);
  const openPortal = vi.fn().mockResolvedValue(undefined);
  (useBillingContextOptional as ReturnType<typeof vi.fn>).mockReturnValue({
    snapshot: {
      loadState: 'ready',
      isPaidActive: opts.isPaidActive,
      error: null,
      entitlement: {
        plan: opts.isPaidActive ? 'paid' : 'free',
        status: opts.status,
        isPaidActive: opts.isPaidActive,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: opts.cancelAtPeriodEnd ?? false,
        provider: 'polar',
        manageUrlAvailable: true,
      },
    },
    busy: false,
    refresh: vi.fn(),
    syncFromPolar: vi.fn(),
    startCheckout,
    openPortal,
  });
  return { startCheckout, openPortal };
}

function renderAsk(initialPath = '/ask', authenticated = false) {
  (useApp as ReturnType<typeof vi.fn>).mockReturnValue({
    isAuthenticated: authenticated,
    user: authenticated ? { email: 'user@example.com' } : null,
  });

  const router = createMemoryRouter(
    [{ path: '/ask', element: <AskPage /> }],
    { initialEntries: [initialPath] },
  );

  const result = render(<RouterProvider router={router} />);
  return { router, ...result };
}

describe('AskPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue([]);
    (useBillingContextOptional as ReturnType<typeof vi.fn>).mockReturnValue(null);
  });

  it('guest lock: Account (Paid) copy, Sign in + See plan CTAs', () => {
    renderAsk('/ask', false);

    const lock = document.querySelector('[data-od-id="ask-lock"]');
    expect(lock).toBeTruthy();
    expect(lock?.textContent).toMatch(/Account \(Paid\)/);
    expect(document.querySelector('[data-od-id="ask-signin"]')).toBeTruthy();
    expect(
      (document.querySelector('[data-od-id="ask-signin"]') as HTMLAnchorElement)?.getAttribute(
        'href',
      ),
    ).toBe('/sign-in');
    const seePlan = document.querySelector('[data-od-id="ask-see-plan"]') as HTMLAnchorElement;
    expect(seePlan).toBeTruthy();
    expect(seePlan.getAttribute('href')).toContain('/settings');
    expect(seePlan.getAttribute('href')).toContain('tab=plan');
    expect(document.querySelector('[data-od-id="ask-composer"]')).toBeNull();
    expect(document.querySelector('[data-od-id="ask-upgrade"]')).toBeNull();
  });

  it('free lock: Upgrade checkout + Plan details', async () => {
    const { startCheckout, openPortal } = mockBilling({
      isPaidActive: false,
      status: 'none',
    });
    renderAsk('/ask', true);

    await waitFor(() => {
      expect(document.querySelector('[data-od-id="ask-lock"]')).toBeTruthy();
    });

    expect(document.querySelector('[data-od-id="ask-lock"]')?.textContent).toMatch(
      /Account \(Paid\)/,
    );
    const upgrade = document.querySelector('[data-od-id="ask-upgrade"]') as HTMLButtonElement;
    expect(upgrade).toBeTruthy();
    expect(upgrade.textContent?.trim()).toBe('Upgrade');
    fireEvent.click(upgrade);
    expect(startCheckout).toHaveBeenCalled();
    expect(openPortal).not.toHaveBeenCalled();

    const planDetails = document.querySelector(
      '[data-od-id="ask-plan-details"]',
    ) as HTMLAnchorElement;
    expect(planDetails).toBeTruthy();
    expect(planDetails.getAttribute('href')).toContain('tab=plan');
    expect(document.querySelector('[data-od-id="ask-composer"]')).toBeNull();
  });

  it('past_due lock: Update opens portal', async () => {
    const { startCheckout, openPortal } = mockBilling({
      isPaidActive: false,
      status: 'past_due',
    });
    renderAsk('/ask', true);

    await waitFor(() => {
      expect(document.querySelector('[data-od-id="ask-lock"]')).toBeTruthy();
    });

    const update = document.querySelector('[data-od-id="ask-update-payment"]') as HTMLButtonElement;
    expect(update).toBeTruthy();
    expect(update.textContent?.trim()).toMatch(/Update/i);
    fireEvent.click(update);
    expect(openPortal).toHaveBeenCalled();
    expect(startCheckout).not.toHaveBeenCalled();
    expect(document.querySelector('[data-od-id="ask-composer"]')).toBeNull();
  });

  it('paid: renders grounding tree and composer (mock caps)', async () => {
    mockBilling({ isPaidActive: true, status: 'active' });
    mockFetch.mockResolvedValue([
      {
        id: 'h1',
        domain: 'example.com',
        path: '/docs',
        quote: 'Hello',
        note: '',
        tags: [],
        savedAt: Date.now(),
      },
    ]);

    renderAsk('/ask', true);

    await waitFor(() => {
      expect(document.querySelector('[data-od-id="ask"]')).toBeTruthy();
    });

    expect(document.querySelector('[data-od-id="ask-lock"]')).toBeNull();
    expect(document.querySelector('[data-od-id="ask-projects"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="ask-proj-all"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="ask-composer"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="ask-send"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="ask-title"]')?.textContent?.trim()).toBe('Chat');
    // Phase 4: model chip (empty without local keys)
    expect(document.querySelector('[data-od-id="ask-model-chip"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="ask-model-label"]')).toBeTruthy();
  });

  it('paid without local keys: send disabled (needs key on this device)', async () => {
    mockBilling({ isPaidActive: true, status: 'active' });
    mockFetch.mockResolvedValue([
      {
        id: 'h1',
        domain: 'example.com',
        path: '/',
        quote: 'Note',
        note: '',
        tags: [],
        savedAt: Date.now(),
      },
    ]);

    renderAsk('/ask', true);

    await waitFor(() => {
      expect(document.querySelector('[data-od-id="ask-composer"]')).toBeTruthy();
    });

    const input = document.querySelector(
      '[data-od-id="ask-input"]',
    ) as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'Summarize my library' } });
    const send = document.querySelector('[data-od-id="ask-send"]') as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    // No fabricated assistant bubble
    expect(document.querySelector('.bubble-ai')).toBeNull();
    expect(document.querySelector('[data-od-id="ask-answer"]')).toBeNull();
  });

  it('accepts domain/section query for grounding scope', async () => {
    mockBilling({ isPaidActive: true, status: 'active' });
    mockFetch.mockResolvedValue([
      {
        id: 'h1',
        domain: 'example.com',
        path: '/guide',
        quote: 'A',
        note: '',
        tags: [],
        savedAt: Date.now(),
      },
      {
        id: 'h2',
        domain: 'other.com',
        path: '/',
        quote: 'B',
        note: '',
        tags: [],
        savedAt: Date.now(),
      },
    ]);

    renderAsk('/ask?domain=example.com&section=%2Fguide', true);

    await waitFor(() => {
      expect(document.querySelector('[data-od-id="ask"]')).toBeTruthy();
    });

    const ground = document.querySelector('[data-od-id="ask-ground"]');
    expect(ground?.textContent).toMatch(/guide/i);
    expect(ground?.textContent).toMatch(/1/);
  });
});
