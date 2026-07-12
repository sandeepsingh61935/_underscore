import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import { useApp } from '@/core/context/AppProvider';
import { SettingsPage } from '@/pages/SettingsPage';
import { usePersistedMode } from '@/ui-system/hooks/usePersistedMode';

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

vi.mock('@/features/settings/components/TypographySettings', () => ({
  TypographySettings: ({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) => (
    <button type="button" onClick={onToggle} aria-expanded={expanded}>
      Typography
    </button>
  ),
}));

describe('SettingsPage basic mode boundaries', () => {
  beforeEach(() => {
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
  });

  it('disables library export for a guest in Basic with Pro upgrade copy', () => {
    render(<SettingsPage />);

    const exportRow = screen.getByText('Export library').closest('button');
    expect(exportRow?.textContent).toContain('Available in Pro');
    expect(screen.getByLabelText('Export library highlights as MD')).toBeDisabled();
    expect(screen.getByLabelText('Export library highlights as XLSX')).toBeDisabled();
  });

  it('shows Configure AI providers as gated for a guest in Basic', () => {
    render(<SettingsPage />);

    expect(screen.getByText('Configure AI providers')).toBeTruthy();
    const aiRow = screen.getByText('Configure AI providers').closest('button');
    expect(aiRow?.textContent).toContain('Available in 10x-Pro');
  });

  it('keeps Retention settings visible in Basic', () => {
    render(<SettingsPage />);

    expect(screen.getByText('Retention')).toBeTruthy();
  });
});

describe('SettingsPage pro_xai mode boundaries', () => {
  beforeEach(() => {
    vi.mocked(usePersistedMode).mockReturnValue({
      currentMode: 'pro_xai',
      modeReady: true,
      persistMode: vi.fn(),
    });
    vi.mocked(useApp).mockReturnValue({
      theme: 'system',
      setTheme: vi.fn(),
      currentMode: 'pro_xai',
      user: { id: 'u1', email: 'a@b.com', displayName: 'Test User' },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      modeReady: true,
      setMode: vi.fn(),
      availableModes: ['basic', 'pro', 'pro_xai'],
      isLoading: false,
      setIsLoading: vi.fn(),
      dataProvider: {} as ReturnType<typeof useApp>['dataProvider'],
    } as ReturnType<typeof useApp>);
  });

  it('shows Configure AI providers for signed-in 10x-Pro', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Configure AI providers')).toBeTruthy();
    const aiRow = screen.getByText('Configure AI providers').closest('button');
    expect(aiRow?.textContent).toContain('OpenAI, Claude, Gemini');
  });

});

describe('SettingsPage Pro (non-AI) mode boundaries', () => {
  beforeEach(() => {
    vi.mocked(usePersistedMode).mockReturnValue({
      currentMode: 'pro',
      modeReady: true,
      persistMode: vi.fn(),
    });
    vi.mocked(useApp).mockReturnValue({
      theme: 'system',
      setTheme: vi.fn(),
      currentMode: 'pro',
      user: { id: 'u1', email: 'a@b.com', displayName: 'Test User' },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      modeReady: true,
      setMode: vi.fn(),
      availableModes: ['basic', 'pro', 'pro_xai'],
      isLoading: false,
      setIsLoading: vi.fn(),
      dataProvider: {} as ReturnType<typeof useApp>['dataProvider'],
    } as ReturnType<typeof useApp>);
  });

  it('shows Configure AI providers as gated for signed-in Pro (not 10x-Pro)', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Configure AI providers')).toBeTruthy();
    const aiRow = screen.getByText('Configure AI providers').closest('button');
    expect(aiRow?.textContent).toContain('Available in 10x-Pro');
  });
});
