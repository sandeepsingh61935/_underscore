import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

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
    syncFromPolar: vi.fn(),
    startCheckout: vi.fn(),
    openPortal: vi.fn(),
  });
}

describe('SettingsPage IA lock', () => {
  beforeEach(() => {
    mockApp({
      currentMode: 'basic',
      user: null,
      isAuthenticated: false,
    });
    vi.mocked(useBillingContextOptional).mockReturnValue(null);
  });

  it('guest: local card, no Mode, no Billing, Keyboard entry', () => {
    render(<SettingsPage onSignIn={vi.fn()} />);
    expect(screen.getByTestId('settings-guest-card')).toBeTruthy();
    expect(screen.queryByTestId('settings-mode-seg')).toBeNull();
    expect(screen.queryByTestId('settings-section-billing')).toBeNull();
    expect(screen.queryByText(/Upcoming/i)).toBeNull();
    expect(screen.getByTestId('settings-section-keyboard-entry')).toBeTruthy();
    expect(screen.getByTestId('settings-open-keyboard')).toBeTruthy();
  });

  it('Keyboard row opens dedicated shortcuts page with back', () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId('settings-open-keyboard'));
    expect(screen.getByTestId('settings-keyboard-page')).toBeTruthy();
    expect(screen.getByTestId('settings-shortcuts-table')).toBeTruthy();
    fireEvent.click(screen.getByTestId('settings-keyboard-back'));
    expect(screen.queryByTestId('settings-keyboard-page')).toBeNull();
    expect(screen.getByTestId('settings-open-keyboard')).toBeTruthy();
  });

  it('signed-in: account + appearance + keyboard entry; no mode/billing', () => {
    vi.mocked(usePersistedMode).mockReturnValue({
      currentMode: 'pro',
      modeReady: true,
      persistMode: vi.fn(),
    });
    mockApp({
      currentMode: 'pro',
      user: { id: 'u1', email: 'a@b.com', displayName: 'A' },
      isAuthenticated: true,
    });
    mockBilling(false);
    render(<SettingsPage />);
    expect(screen.getByTestId('settings-section-account')).toBeTruthy();
    expect(screen.getByText('Synced')).toBeTruthy();
    expect(screen.queryByTestId('settings-mode-seg')).toBeNull();
    expect(screen.queryByTestId('settings-section-billing')).toBeNull();
    expect(screen.getByTestId('settings-section-session')).toBeTruthy();
  });

  it('shows Integrations section', () => {
    render(<SettingsPage />);
    expect(screen.getByTestId('settings-section-integrations')).toBeTruthy();
  });

  it('legal footer present', () => {
    render(<SettingsPage />);
    expect(screen.getByTestId('settings-legal-footer')).toBeTruthy();
  });
});
