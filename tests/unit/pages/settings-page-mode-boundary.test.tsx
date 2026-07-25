import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

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
  })),
  formatSyncSubtitle: vi.fn(),
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

function mockBilling(isPaidActive: boolean) {
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
          }
        : freeEntitlement(),
      error: null,
      isPaidActive,
    },
    busy: false,
    refresh: vi.fn(),
    startCheckout: vi.fn(),
    openPortal: vi.fn(),
  });
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

  it('shows guest account sign-in row with sync upsell', () => {
    render(<SettingsPage onSignIn={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
    expect(screen.getByText('Not signed in')).toBeTruthy();
    expect(screen.getByText('Sync library across devices, export, AI')).toBeTruthy();
    expect(screen.getByText('Guest')).toBeTruthy();
    expect(screen.queryByTestId('account-plan-pill')).toBeNull();
  });

  it('shows Connect then Configure with short subs and lock status for guest', () => {
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
    expect(screen.getByText('Manage billing')).toBeTruthy();
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

  it('shows Connect then Configure locked for signed-in Account (Free)', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Connect to AI')).toBeTruthy();
    expect(screen.getByText('Configure AI providers')).toBeTruthy();
    expect(screen.getByText('In-app models')).toBeTruthy();
    expect(screen.getAllByLabelText('Locked').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId('account-plan-pill').textContent).toBe('Free');
    expect(screen.getByText('Upgrade to Account (Paid)')).toBeTruthy();
  });
});
