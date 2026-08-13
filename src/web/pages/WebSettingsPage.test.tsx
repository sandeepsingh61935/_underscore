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

  it('guest plan tab: Sign in CTA, no upgrade without auth', () => {
    renderSettings('/settings?tab=plan', false);

    expect(document.querySelector('[data-od-id="settings-plan"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="billing-upgrade-row"]')).toBeNull();
    expect(document.querySelector('a[href="/sign-in"]')).toBeTruthy();
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

  it('free signed-in: shows Upgrade billing CTA', () => {
    mockBilling({ isPaidActive: false, status: 'none' });

    renderSettings('/settings?tab=plan', true);

    const cta = document.querySelector('[data-testid="billing-cta"]');
    expect(cta).toBeTruthy();
    expect(cta?.getAttribute('data-billing-kind')).toBe('upgrade');
    expect(cta?.textContent?.trim()).toBe('Upgrade');
  });

  it('paid active: Manage CTA opens portal', () => {
    const { startCheckout, openPortal } = mockBilling({
      isPaidActive: true,
      status: 'active',
    });

    renderSettings('/settings?tab=plan', true);

    const cta = document.querySelector('[data-testid="billing-cta"]');
    expect(cta).toBeTruthy();
    expect(cta?.getAttribute('data-billing-kind')).toBe('manage');
    expect(cta?.textContent?.trim()).toBe('Manage');

    fireEvent.click(cta!);
    expect(openPortal).toHaveBeenCalled();
    expect(startCheckout).not.toHaveBeenCalled();
  });

  it('past_due: Update CTA opens portal', () => {
    const { startCheckout, openPortal } = mockBilling({
      isPaidActive: false,
      status: 'past_due',
    });

    renderSettings('/settings?tab=plan', true);

    const cta = document.querySelector('[data-testid="billing-cta"]');
    expect(cta).toBeTruthy();
    expect(cta?.getAttribute('data-billing-kind')).toBe('update_payment');
    expect(cta?.textContent?.trim()).toBe('Update');

    fireEvent.click(cta!);
    expect(openPortal).toHaveBeenCalled();
    expect(startCheckout).not.toHaveBeenCalled();
  });

  it('AI tab locked when !caps.ai', () => {
    renderSettings('/settings?tab=ai', false);

    expect(document.querySelector('[data-od-id="settings-ai"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="ai-lock-banner"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="settings-ai-see-plan"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="ai-seg-models"]')?.textContent?.trim()).toBe(
      'Models',
    );
    expect(
      document.querySelector('[data-od-id="ai-seg-integrations"]')?.textContent?.trim(),
    ).toBe('Integrations');
    // Guest: catalog is visible, no setup actions (sign-in only).
    expect(document.querySelector('[data-od-id="provider-openai"]')).toBeTruthy();
    expect(
      document.querySelectorAll('[data-od-id^="provider-"][data-od-id$="-action"]').length,
    ).toBe(0);

    // Integrations: status row (no fake toggle); catalog locked
    fireEvent.click(document.querySelector('[data-od-id="ai-seg-integrations"]')!);
    expect(document.querySelector('[data-od-id="settings-mcp"]')).toBeTruthy();
    expect(document.querySelector('[data-od-id="settings-mcp-status"]')?.textContent).toMatch(
      /Off|Ready|Connected|Paid/i,
    );
    expect(document.querySelectorAll('[data-od-id^="mcp-app-"]').length).toBeGreaterThan(0);
    expect(
      Array.from(document.querySelectorAll('[data-od-id^="mcp-app-"]')).every(
        (el) => (el as HTMLButtonElement).disabled,
      ),
    ).toBe(true);
  });

  it('AI tab past_due: lock CTA is Update and opens portal', () => {
    const { startCheckout, openPortal } = mockBilling({
      isPaidActive: false,
      status: 'past_due',
    });

    renderSettings('/settings?tab=ai', true);

    const aiCta = document.querySelector('[data-testid="settings-ai-billing-cta"]');
    expect(aiCta).toBeTruthy();
    expect(aiCta?.getAttribute('data-billing-kind')).toBe('update_payment');
    expect(aiCta?.textContent?.trim()).toBe('Update');

    fireEvent.click(aiCta!);
    expect(openPortal).toHaveBeenCalled();
    expect(startCheckout).not.toHaveBeenCalled();
  });
});
