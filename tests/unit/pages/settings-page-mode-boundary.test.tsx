import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { useApp } from '@/core/context/AppProvider';
import { SettingsPage } from '@/pages/SettingsPage';
import { usePersistedMode } from '@/ui-system/hooks/usePersistedMode';
import { useBillingContextOptional } from '@/features/billing/BillingProvider';
import { freeEntitlement } from '@/shared/billing';
import { BILLING_UPCOMING_SUB } from '@/shared/billing/billing-upcoming-copy';

vi.mock('@/core/context/AppProvider', () => ({
  useApp: vi.fn(),
}));

vi.mock('@/features/billing/BillingProvider', () => ({
  useBillingContextOptional: vi.fn(() => null),
  BillingProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/ui-system/hooks/usePersistedMode', () => ({
  usePersistedMode: vi.fn(() => ({
    currentMode: 'basic',
    modeReady: true,
    persistMode: vi.fn(),
  })),
}));

vi.mock('@/features/collections/hooks/use-sync-library', () => ({
  useSyncLibrary: vi.fn(() => ({
    sync: vi.fn(),
    isSyncing: false,
    lastResult: null,
    error: null,
    status: 'idle',
    progressPercent: null,
    lastSyncedAt: null,
  })),
  formatSyncSubtitle: vi.fn(),
  formatLastSyncedAt: vi.fn(() => 'Never synced'),
}));

vi.mock('@/features/collections/hooks/use-highlight-delete', () => ({
  useHighlightDelete: vi.fn(() => ({ deleteScope: vi.fn() })),
}));

vi.mock('@/features/collections/hooks/useHighlightExport', () => ({
  useHighlightExport: vi.fn(() => ({ exportFile: vi.fn(), isBusy: false })),
}));

vi.mock('@/features/settings/components/ConnectToAiFlow', () => ({
  ConnectToAiFlow: () => <div data-testid="connect-to-ai-flow-mock" />,
}));

vi.mock('@/features/settings/components/TypographySettings', () => ({
  TypographySettings: ({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) => (
    <button type="button" onClick={onToggle} aria-expanded={expanded}>
      Typography
    </button>
  ),
}));

vi.mock('@/shared/auth/web-legal-urls', () => ({
  resolveLegalDocUrl: (path: string) => `https://app.example${path}`,
  openLegalDoc: vi.fn(),
}));

function mockApp(partial: Record<string, unknown>) {
  vi.mocked(useApp).mockReturnValue({
    theme: 'system',
    setTheme: vi.fn(),
    currentMode: 'basic',
    user: null,
    isAuthenticated: false,
    login: vi.fn(),
    logout: vi.fn(),
    modeReady: true,
    setMode: vi.fn(),
    availableModes: ['basic'],
    isLoading: false,
    setIsLoading: vi.fn(),
    dataProvider: {} as ReturnType<typeof useApp>['dataProvider'],
    ...partial,
  } as ReturnType<typeof useApp>);
}

function mockBilling(
  isPaidActive: boolean,
  entitlementOverrides?: Partial<ReturnType<typeof freeEntitlement>>,
) {
  const startCheckout = vi.fn().mockResolvedValue(undefined);
  const openPortal = vi.fn().mockResolvedValue(undefined);
  const syncFromPolar = vi.fn().mockResolvedValue(false);
  vi.mocked(useBillingContextOptional).mockReturnValue({
    snapshot: {
      loadState: 'ready',
      entitlement: isPaidActive
        ? {
            ...freeEntitlement(),
            plan: 'paid',
            status: 'active',
            isPaidActive: true,
            provider: 'polar',
            manageUrlAvailable: true,
            ...entitlementOverrides,
          }
        : { ...freeEntitlement(), ...entitlementOverrides },
      error: null,
      isPaidActive,
    },
    busy: false,
    refresh: vi.fn(),
    syncFromPolar,
    startCheckout,
    openPortal,
  });
  return { startCheckout, openPortal, syncFromPolar };
}

function assertSectionOrder(ids: string[]): void {
  const nodes = ids.map((id) => screen.getByTestId(id));
  for (let i = 1; i < nodes.length; i++) {
    const prev = nodes[i - 1]!;
    const next = nodes[i]!;
    const position = prev.compareDocumentPosition(next);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  }
}

describe('SettingsPage basic mode boundaries', () => {
  beforeEach(() => {
    mockApp({
      currentMode: 'basic',
      user: null,
      isAuthenticated: false,
      availableModes: ['basic'],
    });
    vi.mocked(useBillingContextOptional).mockReturnValue(null);
  });

  it('disables library export and sync for a guest (library section auth-gated)', () => {
    render(<SettingsPage />);

    expect(screen.queryByText('Export library')).toBeNull();
    expect(screen.queryByText('Sync library')).toBeNull();
  });

  it('shows local card, Guest|Account mode, no topic nav, no Polar CTAs', () => {
    render(<SettingsPage onSignIn={vi.fn()} />);

    const guest = screen.getByTestId('settings-guest-card');
    expect(within(guest).getByText('Local only')).toBeTruthy();
    expect(screen.getByTestId('settings-section-mode')).toBeTruthy();
    expect(screen.getByTestId('settings-mode-guest')).toBeTruthy();
    expect(screen.getByTestId('settings-mode-account')).toBeTruthy();
    expect(screen.queryByTestId('settings-mode-free')).toBeNull();
    expect(screen.queryByTestId('settings-mode-paid')).toBeNull();
    expect(screen.queryByTestId('settings-topic-nav')).toBeNull();
    expect(screen.getByTestId('settings-section-appearance')).toBeTruthy();
    expect(screen.queryByTestId('billing-cta')).toBeNull();
    expect(screen.queryByTestId('billing-sync-cta')).toBeNull();
    expect(screen.getByTestId('settings-section-billing').textContent).toMatch(
      /Upcoming/i,
    );
  });

  it('orders Mode → Appearance → Integrations for guests', () => {
    render(<SettingsPage />);
    assertSectionOrder([
      'settings-section-mode',
      'settings-section-appearance',
      'settings-section-ai',
    ]);
    expect(screen.getByTestId('settings-section-typography')).toBeTruthy();
  });

  it('shows Integrations locked for guest (Models/Ask retired)', () => {
    render(<SettingsPage />);

    expect(screen.getByTestId('settings-section-integrations')).toBeTruthy();
    expect(screen.getByText(/Sign in to use account features/i)).toBeTruthy();
    expect(screen.queryByText('Models & providers')).toBeNull();
    expect(screen.getByLabelText('Locked')).toBeTruthy();
  });

  it('renders Privacy and Terms legal footer', () => {
    render(<SettingsPage />);
    expect(screen.getByTestId('settings-legal-footer')).toBeTruthy();
    expect(screen.getByTestId('settings-legal-privacy')).toBeTruthy();
    expect(screen.getByTestId('settings-legal-terms')).toBeTruthy();
  });

  it('does not show Retention settings after TTL removal', () => {
    mockApp({
      currentMode: 'basic',
      user: { id: 'u1', email: 'a@b.com', displayName: 'Test User' },
      isAuthenticated: true,
      availableModes: ['basic'],
    });

    render(<SettingsPage />);

    expect(screen.queryByText('Retention')).toBeNull();
  });
});

describe('SettingsPage account signed-in', () => {
  beforeEach(() => {
    vi.mocked(usePersistedMode).mockReturnValue({
      currentMode: 'pro_xai',
      modeReady: true,
      persistMode: vi.fn(),
    });
    mockApp({
      currentMode: 'pro_xai',
      user: { id: 'u1', email: 'a@b.com', displayName: 'Test User' },
      isAuthenticated: true,
      availableModes: ['pro_xai'],
    });
    mockBilling(true);
  });

  it('shows Integrations open; Billing Upcoming; no Polar Manage CTA', () => {
    const { openPortal, startCheckout, syncFromPolar } = mockBilling(true);
    render(<SettingsPage />);
    expect(screen.getByTestId('settings-section-integrations')).toBeTruthy();
    expect(screen.getByText(/Let agents use your library/)).toBeTruthy();
    expect(screen.getByTestId('account-plan-pill').textContent).toBe('Paid');
    expect(screen.getByTestId('settings-section-billing').textContent).toContain(
      BILLING_UPCOMING_SUB,
    );
    expect(screen.queryByTestId('billing-cta')).toBeNull();
    expect(screen.queryByTestId('billing-sync-cta')).toBeNull();
    expect(screen.queryByText(/Polar/i)).toBeNull();

    // Code still wired in provider mock — UI must not call it
    expect(openPortal).not.toHaveBeenCalled();
    expect(startCheckout).not.toHaveBeenCalled();
    expect(syncFromPolar).not.toHaveBeenCalled();
  });

  it('orders Account → Mode → Billing → Appearance → Data → Integrations → Session', () => {
    render(<SettingsPage />);
    assertSectionOrder([
      'settings-section-account',
      'settings-section-mode',
      'settings-section-billing',
      'settings-section-appearance',
      'settings-section-library',
      'settings-section-ai',
      'settings-section-session',
    ]);
  });

  it('Guest|Account mode chips only', () => {
    render(<SettingsPage />);
    expect(screen.getByTestId('settings-mode-guest')).toBeTruthy();
    expect(screen.getByTestId('settings-mode-account')).toBeTruthy();
    expect(screen.queryByTestId('settings-mode-free')).toBeNull();
    expect(screen.queryByTestId('settings-mode-paid')).toBeNull();
  });
});

describe('SettingsPage Pro (non-AI) mode boundaries', () => {
  beforeEach(() => {
    vi.mocked(usePersistedMode).mockReturnValue({
      currentMode: 'pro',
      modeReady: true,
      persistMode: vi.fn(),
    });
    mockApp({
      currentMode: 'pro',
      user: { id: 'u1', email: 'a@b.com', displayName: 'Test User' },
      isAuthenticated: true,
      availableModes: ['pro'],
    });
    mockBilling(false);
  });

  it('shows Free pill and Upcoming billing without Upgrade CTAs', () => {
    const { startCheckout, openPortal, syncFromPolar } = mockBilling(false);
    render(<SettingsPage />);
    expect(screen.getByTestId('account-plan-pill').textContent).toBe('Free');
    expect(screen.getByTestId('settings-section-billing').textContent).toMatch(
      /Upcoming/i,
    );
    expect(screen.queryByText('Upgrade to Paid')).toBeNull();
    expect(screen.queryByTestId('billing-cta')).toBeNull();
    expect(screen.queryByTestId('billing-sync-cta')).toBeNull();
    expect(startCheckout).not.toHaveBeenCalled();
    expect(openPortal).not.toHaveBeenCalled();
    expect(syncFromPolar).not.toHaveBeenCalled();
  });

  it('does not use Starter/Pro toy SKU labels', () => {
    render(<SettingsPage />);
    expect(screen.queryByText(/Starter/)).toBeNull();
    expect(screen.queryByText(/^Pro$/)).toBeNull();
    expect(screen.getAllByText(/Account \(Free\)/).length).toBeGreaterThan(0);
  });

  it('selecting Account while signed-in does not start checkout', () => {
    const setMode = vi.fn();
    const { startCheckout } = mockBilling(false);
    mockApp({
      currentMode: 'pro',
      user: { id: 'u1', email: 'a@b.com', displayName: 'Test User' },
      isAuthenticated: true,
      availableModes: ['pro'],
      setMode,
    });
    render(<SettingsPage />);
    // Account already active for pro — click is no-op for mode write
    fireEvent.click(screen.getByTestId('settings-mode-account'));
    expect(startCheckout).not.toHaveBeenCalled();
  });
});

describe('SettingsPage past_due billing', () => {
  beforeEach(() => {
    vi.mocked(usePersistedMode).mockReturnValue({
      currentMode: 'pro',
      modeReady: true,
      persistMode: vi.fn(),
    });
    mockApp({
      currentMode: 'pro',
      user: { id: 'u1', email: 'past@due.com', displayName: 'Past' },
      isAuthenticated: true,
      availableModes: ['pro'],
    });
  });

  it('shows Past due pill without Polar Update payment CTA', () => {
    const { openPortal, startCheckout } = mockBilling(false, {
      plan: 'paid',
      status: 'past_due',
      isPaidActive: false,
      provider: 'polar',
      manageUrlAvailable: true,
    });
    render(<SettingsPage />);
    expect(screen.getByTestId('account-plan-pill').textContent).toBe('Past due');
    expect(screen.queryByTestId('billing-cta')).toBeNull();
    expect(screen.getByTestId('settings-section-billing').textContent).toMatch(
      /Upcoming/i,
    );
    expect(openPortal).not.toHaveBeenCalled();
    expect(startCheckout).not.toHaveBeenCalled();
  });
});
