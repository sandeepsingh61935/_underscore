import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import { useApp } from '@/core/context/AppProvider';
import { SettingsPage } from '@/pages/SettingsPage';

vi.mock('@/core/context/AppProvider', () => ({
  useApp: vi.fn(),
}));

vi.mock('@/ui-system/hooks/usePersistedMode', () => ({
  usePersistedMode: vi.fn(() => ({
    currentMode: 'basic',
    modeReady: true,
    persistMode: vi.fn(),
  })),
}));

vi.mock('@/features/collections/hooks/use-vault-locked', () => ({
  useVaultLocked: vi.fn(() => false),
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

vi.mock('@/ui-system/hooks/useBasicTtlOption', () => ({
  useBasicTtlOption: vi.fn(() => ({
    ttlConfig: { kind: 'preset', preset: '24h' },
    ttlMs: 86_400_000,
  })),
}));

vi.mock('@/features/collections/hooks/use-highlight-delete', () => ({
  useHighlightDelete: vi.fn(() => ({ deleteScope: vi.fn() })),
}));

vi.mock('@/features/collections/hooks/useHighlightExport', () => ({
  useHighlightExport: vi.fn(() => ({ exportFile: vi.fn(), isBusy: false })),
}));

vi.mock('@/features/settings/components/McpBridgeSettings', () => ({
  McpBridgeSettings: () => null,
}));

vi.mock('@/features/settings/components/ConnectedAppsSettings', () => ({
  ConnectedAppsSettings: () => null,
}));

describe('SettingsPage basic mode boundaries', () => {
  beforeEach(() => {
    vi.mocked(useApp).mockReturnValue({
      theme: 'system',
      setTheme: vi.fn(),
      currentMode: 'basic',
      user: null,
      logout: vi.fn(),
    } as ReturnType<typeof useApp>);
  });

  it('disables library export for a guest in Basic with Pro upgrade copy', () => {
    render(<SettingsPage />);

    const exportRow = screen.getByText('Export library').closest('button');
    expect(exportRow?.textContent).toContain('Available in Pro');
    expect(screen.getByLabelText('Export library highlights as MD')).toBeDisabled();
    expect(screen.getByLabelText('Export library highlights as XLSX')).toBeDisabled();
  });

  it('hides Configure AI providers for a guest in Basic', () => {
    render(<SettingsPage />);

    expect(screen.queryByText('Configure AI providers')).toBeNull();
  });

  it('keeps Retention settings visible in Basic', () => {
    render(<SettingsPage />);

    expect(screen.getByText('Retention')).toBeTruthy();
  });
});
