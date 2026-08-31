import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { useApp } from '@/core/context/AppProvider';
import { useBillingContextOptional } from '@/features/billing/BillingProvider';
import { useSyncLibrary } from '@/features/collections/hooks/use-sync-library';
import { SettingsPage } from '@/pages/SettingsPage';
import { freeEntitlement } from '@/shared/billing';

vi.mock('@/core/context/AppProvider', () => ({
  useApp: vi.fn(),
}));

vi.mock('@/features/billing/BillingProvider', () => ({
  useBillingContextOptional: vi.fn(() => null),
}));

vi.mock('@/ui-system/hooks/usePersistedMode', () => ({
  usePersistedMode: vi.fn(() => ({
    currentMode: 'pro',
    modeReady: true,
    persistMode: vi.fn(),
  })),
}));

const syncMock = vi.fn();

vi.mock('@/features/collections/hooks/use-sync-library', () => ({
  useSyncLibrary: vi.fn(),
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
  TypographySettings: () => null,
}));

function mockAuthedApp(setMode = vi.fn()) {
  vi.mocked(useApp).mockReturnValue({
    theme: 'system',
    setTheme: vi.fn(),
    currentMode: 'pro',
    user: { id: 'u1', email: 'user@example.com', displayName: 'user', provider: 'email' },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    modeReady: true,
    setMode,
    availableModes: ['pro'],
    isLoading: false,
    setIsLoading: vi.fn(),
    dataProvider: {} as ReturnType<typeof useApp>['dataProvider'],
  } as ReturnType<typeof useApp>);
}

describe('SettingsPage action click targets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSyncLibrary).mockReturnValue({
      sync: syncMock,
      isSyncing: false,
      lastResult: null,
      error: null,
      status: 'idle',
      progressPercent: null,
      lastSyncedAt: null,
    });
    vi.mocked(useBillingContextOptional).mockReturnValue({
      snapshot: {
        loadState: 'ready',
        entitlement: freeEntitlement(),
        error: null,
        isPaidActive: false,
      },
      busy: false,
      refresh: vi.fn(),
      syncFromPolar: vi.fn(),
      startCheckout: vi.fn().mockResolvedValue(undefined),
      openPortal: vi.fn().mockResolvedValue(undefined),
    });
    mockAuthedApp();
  });

  it('does not start sync when row title is clicked; Sync button does', () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('Library sync'));
    expect(syncMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sync library' }));
    expect(syncMock).toHaveBeenCalledTimes(1);
  });

  it('opens delete confirm from Delete button only', () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('Delete library'));
    expect(screen.queryByText(/Delete entire library/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Delete library' }));
    expect(screen.getByText(/Delete entire library/i)).toBeTruthy();
  });

  it('has no Mode chips or billing CTAs; Keyboard opens subpage', () => {
    const startCheckout = vi.fn().mockResolvedValue(undefined);

    vi.mocked(useApp).mockReturnValue({
      theme: 'system',
      setTheme: vi.fn(),
      currentMode: 'pro_xai',
      user: {
        id: 'u1',
        email: 'user@example.com',
        displayName: 'user',
        provider: 'email',
      },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      modeReady: true,
      setMode: vi.fn(),
      availableModes: ['pro', 'pro_xai'],
      isLoading: false,
      setIsLoading: vi.fn(),
      dataProvider: {} as ReturnType<typeof useApp>['dataProvider'],
    } as ReturnType<typeof useApp>);
    vi.mocked(useBillingContextOptional).mockReturnValue({
      snapshot: {
        loadState: 'ready',
        entitlement: {
          ...freeEntitlement(),
          plan: 'paid',
          status: 'active',
          isPaidActive: true,
          provider: 'polar',
          manageUrlAvailable: true,
        },
        error: null,
        isPaidActive: true,
      },
      busy: false,
      refresh: vi.fn(),
      syncFromPolar: vi.fn(),
      startCheckout,
      openPortal: vi.fn(),
    });

    render(<SettingsPage />);
    expect(screen.queryByTestId('settings-mode-seg')).toBeNull();
    expect(screen.queryByTestId('billing-cta')).toBeNull();
    expect(screen.queryByTestId('settings-section-billing')).toBeNull();
    fireEvent.click(screen.getByTestId('settings-open-keyboard'));
    expect(screen.getByTestId('settings-keyboard-page')).toBeTruthy();
    expect(startCheckout).not.toHaveBeenCalled();
  });

  it('changes theme from Appearance segments only', () => {
    const setTheme = vi.fn();
    mockAuthedApp();
    vi.mocked(useApp).mockReturnValue({
      theme: 'system',
      setTheme,
      currentMode: 'pro',
      user: {
        id: 'u1',
        email: 'user@example.com',
        displayName: 'user',
        provider: 'email',
      },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      modeReady: true,
      setMode: vi.fn(),
      availableModes: ['pro'],
      isLoading: false,
      setIsLoading: vi.fn(),
      dataProvider: {} as ReturnType<typeof useApp>['dataProvider'],
    } as ReturnType<typeof useApp>);

    render(<SettingsPage />);
    fireEvent.click(screen.getByTestId('settings-theme-dark'));
    expect(setTheme).toHaveBeenCalledWith('dark');
  });

  it('shows sync percent while syncing', () => {
    vi.mocked(useSyncLibrary).mockReturnValue({
      sync: syncMock,
      isSyncing: true,
      lastResult: null,
      error: null,
      status: 'syncing',
      progressPercent: 42,
      lastSyncedAt: null,
    });
    render(<SettingsPage />);
    expect(screen.getByTestId('sync-progress')).toHaveTextContent('42%');
    expect(screen.getByTestId('sync-progress-bar').getAttribute('aria-valuenow')).toBe(
      '42'
    );
    expect(screen.getByText(/Syncing · 42%/)).toBeTruthy();
  });
});
