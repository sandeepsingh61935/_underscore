import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { WebSettingsPage } from './WebSettingsPage';
import type { WebHighlight } from '@/web/hooks/useWebLibrary';

vi.mock('@/core/context/AppProvider', () => ({
  useApp: vi.fn(),
}));

vi.mock('@/features/billing/BillingProvider', () => ({
  useBillingContextOptional: vi.fn(() => null),
}));

vi.mock('@/features/oauth/hooks/useOAuthGrants', () => ({
  useOAuthGrants: () => ({
    grants: [],
    isLoading: false,
    error: null,
    reload: vi.fn(),
    revoke: vi.fn(),
    isRevoking: false,
  }),
}));

vi.mock('@/ui-system/hooks/useTypePreset', () => ({
  useTypePreset: () => ({
    selection: { kind: 'builtin' as const, id: 'editorial' as const },
    tokens: {},
    displayName: 'Editorial',
    ready: true,
    setSelection: vi.fn(),
    resetToDefault: vi.fn(),
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
import { useBillingContextOptional } from '@/features/billing/BillingProvider';

function renderSettings(initialPath: string, authenticated = false) {
  (useApp as ReturnType<typeof vi.fn>).mockReturnValue({
    isAuthenticated: authenticated,
    user: authenticated ? { email: 'user@example.com' } : null,
    theme: 'system',
    setTheme: vi.fn(),
    logout: vi.fn(),
  });

  const router = createMemoryRouter(
    [{ path: '/settings', element: <WebSettingsPage /> }],
    { initialEntries: [initialPath] },
  );

  const result = render(<RouterProvider router={router} />);
  return { router, ...result };
}

describe('WebSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue([]);
    (useBillingContextOptional as ReturnType<typeof vi.fn>).mockReturnValue(null);
  });

  it('?tab=plan shows plan panel', () => {
    renderSettings('/settings?tab=plan');

    const plan = document.querySelector('[data-od-id="settings-plan"]');
    expect(plan).toBeTruthy();
    expect(plan?.querySelector('h2')?.textContent?.trim()).toBe('Plan');
    expect(document.querySelector('[data-od-id="settings-account"]')).toBeNull();
    expect(
      document.querySelector('[data-od-id="settings-tab-plan"]')?.classList.contains('active'),
    ).toBe(true);
  });

  it('defaults to account tab when tab missing', () => {
    renderSettings('/settings');

    expect(document.querySelector('[data-od-id="settings-account"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="settings-plan"]')).toBeNull();
  });

  it('nav click updates search to tab=plan', async () => {
    const { router } = renderSettings('/settings?tab=account');

    fireEvent.click(document.querySelector('[data-od-id="settings-tab-plan"]')!);

    await waitFor(() => {
      expect(router.state.location.search).toContain('tab=plan');
    });
    expect(document.querySelector('[data-od-id="settings-plan"]')).toBeTruthy();
  });

  it('guest plan tab: Upcoming billing, no Polar upgrade CTA', () => {
    renderSettings('/settings?tab=plan', false);

    expect(document.querySelector('[data-od-id="settings-plan"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="billing-upcoming"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="billing-upgrade-row"]')).toBeNull();
    expect(document.querySelector('[data-testid="billing-cta"]')).toBeNull();
    expect(document.body.textContent).toMatch(/Upcoming/i);
  });

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

  it('free signed-in: Billing Upcoming only — no Upgrade CTA', () => {
    const { startCheckout, openPortal } = mockBilling({
      isPaidActive: false,
      status: 'none',
    });

    renderSettings('/settings?tab=plan', true);

    expect(document.querySelector('[data-od-id="billing-upcoming"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="billing-cta"]')).toBeNull();
    expect(document.body.textContent).toMatch(/Upcoming/i);
    expect(startCheckout).not.toHaveBeenCalled();
    expect(openPortal).not.toHaveBeenCalled();
  });

  it('paid active: no Manage portal CTA in UI', () => {
    const { startCheckout, openPortal } = mockBilling({
      isPaidActive: true,
      status: 'active',
    });

    renderSettings('/settings?tab=plan', true);

    expect(document.querySelector('[data-testid="billing-cta"]')).toBeNull();
    expect(document.querySelector('[data-od-id="billing-upcoming"]')).toBeTruthy();
    expect(openPortal).not.toHaveBeenCalled();
    expect(startCheckout).not.toHaveBeenCalled();
  });

  it('past_due: no Polar Update CTA — Upcoming stub', () => {
    const { startCheckout, openPortal } = mockBilling({
      isPaidActive: false,
      status: 'past_due',
    });

    renderSettings('/settings?tab=plan', true);

    expect(document.querySelector('[data-testid="billing-cta"]')).toBeNull();
    expect(document.querySelector('[data-od-id="billing-upcoming"]')).toBeTruthy();
    expect(openPortal).not.toHaveBeenCalled();
    expect(startCheckout).not.toHaveBeenCalled();
  });

  it('AI tab is Integrations-only; guest locked with sign-in', () => {
    renderSettings('/settings?tab=ai', false);

    expect(document.querySelector('[data-od-id="settings-ai"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="ai-lock-banner"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="settings-ai-see-plan"]')?.textContent).toMatch(
      /Sign in/i,
    );
    expect(document.querySelector('[data-od-id="ai-seg-models"]')).toBeNull();
    expect(document.querySelector('[data-od-id="provider-openai"]')).toBeNull();
    // Integrations catalog may still render locked for guest
    expect(document.querySelector('[data-od-id="settings-connect-ai"], [data-od-id="settings-mcp"]')).toBeTruthy();
  });

  it('AI tab past_due: no Polar lock CTA — shows Upcoming copy', () => {
    const { startCheckout, openPortal } = mockBilling({
      isPaidActive: false,
      status: 'past_due',
    });

    renderSettings('/settings?tab=ai', true);

    expect(document.querySelector('[data-testid="settings-ai-billing-cta"]')).toBeNull();
    expect(document.querySelector('[data-od-id="ai-lock-banner"]')?.textContent).toMatch(
      /Upcoming/i,
    );
    expect(openPortal).not.toHaveBeenCalled();
    expect(startCheckout).not.toHaveBeenCalled();
  });
});
