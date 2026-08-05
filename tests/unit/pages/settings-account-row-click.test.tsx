import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { useApp } from '@/core/context/AppProvider';
import { SettingsPage } from '@/pages/SettingsPage';

vi.mock('@/core/context/AppProvider', () => ({
  useApp: vi.fn(),
}));

vi.mock('@/features/billing/BillingProvider', () => ({
  useBillingContextOptional: vi.fn(() => null),
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
  TypographySettings: () => null,
}));

describe('SettingsPage account row click targets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls onSignIn only from the Sign in control, not the account title', () => {
    const onSignIn = vi.fn();
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
    } as ReturnType<typeof useApp>);

    render(<SettingsPage onSignIn={onSignIn} />);

    fireEvent.click(screen.getByText('Sync library across devices, export, AI'));
    expect(onSignIn).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it('calls logout only from the Sign out control, not the account email title', async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useApp).mockReturnValue({
      theme: 'system',
      setTheme: vi.fn(),
      currentMode: 'pro',
      user: { id: 'u1', email: 'user@example.com', displayName: 'user', provider: 'email' },
      isAuthenticated: true,
      login: vi.fn(),
      logout,
      modeReady: true,
      setMode: vi.fn(),
      availableModes: ['pro'],
      isLoading: false,
      setIsLoading: vi.fn(),
      dataProvider: {} as ReturnType<typeof useApp>['dataProvider'],
    } as ReturnType<typeof useApp>);

    render(<SettingsPage />);

    fireEvent.click(screen.getByText('user@example.com'));
    expect(logout).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
