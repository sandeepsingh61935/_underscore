import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { useApp } from '@/core/context/AppProvider';
import { SettingsPage } from '@/pages/SettingsPage';
import { usePersistedMode } from '@/ui-system/hooks/usePersistedMode';
import { useBillingContextOptional } from '@/features/billing/BillingProvider';
import { freeEntitlement } from '@/shared/billing';

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
  entitlementOverrides?: Partial<ReturnType<typeof freeEntitlement>>
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

/** DOM order of primary section anchors (product PRD order). */
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

  it('shows local card, Mode segments, and Appearance for guests', () => {
    render(<SettingsPage onSignIn={vi.fn()} />);

    const guest = screen.getByTestId('settings-guest-card');
    expect(within(guest).getByText('Local only')).toBeTruthy();
    expect(within(guest).getByText(/Highlights stay on this device/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
    expect(screen.getByTestId('settings-section-mode')).toBeTruthy();
    expect(screen.getByTestId('settings-mode-seg')).toBeTruthy();
    expect(screen.getByTestId('settings-section-appearance')).toBeTruthy();
    expect(screen.getByTestId('settings-theme-system')).toBeTruthy();
    expect(screen.queryByTestId('account-plan-pill')).toBeNull();
    expect(screen.queryByTestId('billing-cta')).toBeNull();
  });

  it('orders Mode → Typography → Appearance → AI for guests', () => {
    render(<SettingsPage />);
    assertSectionOrder([
      'settings-section-mode',
      'settings-section-typography',
      'settings-section-appearance',
      'settings-section-ai',
    ]);
  });

  it('shows Configure and Connect with lock status for guest', () => {
    render(<SettingsPage />);

    expect(screen.getByText('Connect to AI')).toBeTruthy();
    expect(screen.getByText('External agents')).toBeTruthy();
    expect(screen.getByText('Configure AI providers')).toBeTruthy();
    expect(screen.getByText('In-app models')).toBeTruthy();
    expect(screen.getAllByLabelText('Locked').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/OpenAI, Claude, Gemini/)).toBeNull();
    expect(screen.queryByTestId('connect-to-ai-flow-mock')).toBeNull();
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

describe('SettingsPage pro_xai mode boundaries', () => {
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

  it('shows Connect then Configure open for signed-in Account (Paid)', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Connect to AI')).toBeTruthy();
    expect(screen.getByText('External agents')).toBeTruthy();
    expect(screen.getByText('Configure AI providers')).toBeTruthy();
    expect(screen.getByText('In-app models')).toBeTruthy();
    expect(screen.getAllByLabelText('Open').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId('account-plan-pill').textContent).toBe('Paid');
    expect(screen.getByText('Billing')).toBeTruthy();
    expect(screen.getByTestId('billing-cta').textContent).toBe('Manage');
    expect(screen.queryByTestId('billing-sync-cta')).toBeNull();
  });

  it('shows cancel-at-period-end copy while still Paid', () => {
    mockBilling(true, { cancelAtPeriodEnd: true });
    render(<SettingsPage />);
    expect(screen.getByTestId('account-plan-pill').textContent).toBe('Paid');
    expect(screen.getByText('Cancels at period end')).toBeTruthy();
  });

  it('Paid Manage CTA opens portal from trailing button only', () => {
    const { openPortal, startCheckout } = mockBilling(true);
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('Billing'));
    expect(openPortal).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('billing-cta'));
    expect(openPortal).toHaveBeenCalledTimes(1);
    expect(startCheckout).not.toHaveBeenCalled();
  });

  it('orders Mode → Typography → Appearance → Account → Library → AI → Session', () => {
    render(<SettingsPage />);
    assertSectionOrder([
      'settings-section-mode',
      'settings-section-typography',
      'settings-section-appearance',
      'settings-section-account',
      'settings-section-library',
      'settings-section-ai',
      'settings-section-session',
    ]);
    const account = screen.getByTestId('settings-section-account');
    const billingCta = screen.getByTestId('billing-cta');
    const typography = screen.getByTestId('settings-section-typography');
    // Billing trails account; Mode/Typography come before Account.
    expect(
      account.compareDocumentPosition(billingCta) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      typography.compareDocumentPosition(account) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
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

  it('shows Free pill, Upgrade CTA, and Refresh recovery row', () => {
    const { startCheckout, openPortal, syncFromPolar } = mockBilling(false);
    render(<SettingsPage />);
    expect(screen.getByText('Connect to AI')).toBeTruthy();
    expect(screen.getByText('Configure AI providers')).toBeTruthy();
    expect(screen.getByText('In-app models')).toBeTruthy();
    expect(screen.getAllByLabelText('Locked').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId('account-plan-pill').textContent).toBe('Free');
    expect(screen.getByText('Upgrade to Paid')).toBeTruthy();
    expect(screen.getByTestId('billing-cta').textContent).toBe('Upgrade');
    expect(screen.getByTestId('billing-cta').getAttribute('data-billing-kind')).toBe(
      'upgrade'
    );
    expect(screen.getByTestId('billing-sync-cta').textContent).toBe('Refresh');

    fireEvent.click(screen.getByText('Upgrade to Paid'));
    expect(startCheckout).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('billing-cta'));
    expect(startCheckout).toHaveBeenCalledTimes(1);
    expect(openPortal).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Refresh status'));
    expect(syncFromPolar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('billing-sync-cta'));
    expect(syncFromPolar).toHaveBeenCalledTimes(1);
  });

  it('does not use Starter/Pro toy SKU labels', () => {
    render(<SettingsPage />);
    expect(screen.queryByText(/Starter/)).toBeNull();
    expect(screen.queryByText(/^Pro$/)).toBeNull();
    expect(screen.getAllByText(/Account \(Free\)/).length).toBeGreaterThan(0);
    expect(screen.getByText('Upgrade to Paid')).toBeTruthy();
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

  it('shows Past due pill and Update payment → portal', () => {
    const { openPortal, startCheckout } = mockBilling(false, {
      plan: 'paid',
      status: 'past_due',
      isPaidActive: false,
      provider: 'polar',
      manageUrlAvailable: true,
    });
    render(<SettingsPage />);
    expect(screen.getByTestId('account-plan-pill').textContent).toBe('Past due');
    expect(screen.getByText('Payment past due')).toBeTruthy();
    expect(screen.getByTestId('billing-cta').textContent).toBe('Update');
    expect(screen.getByTestId('billing-cta').getAttribute('data-billing-kind')).toBe(
      'update_payment'
    );
    expect(screen.getByTestId('billing-sync-cta')).toBeTruthy();

    fireEvent.click(screen.getByText('Payment past due'));
    expect(openPortal).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('billing-cta'));
    expect(openPortal).toHaveBeenCalledTimes(1);
    expect(startCheckout).not.toHaveBeenCalled();
  });
});
