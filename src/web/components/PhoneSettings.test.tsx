import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { PhoneSettings } from './PhoneSettings';

vi.mock('@/core/context/AppProvider', () => ({
  useApp: () => ({
    currentMode: 'classic',
    theme: 'system',
    setTheme: vi.fn(),
  }),
}));

describe('PhoneSettings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders Browser tab groups section card and toggles mirror status', () => {
    render(
      <MemoryRouter>
        <PhoneSettings
          isAuthenticated={true}
          email="test@example.com"
          theme="system"
          onThemeChange={vi.fn()}
          highlights={[]}
          stats={{ thisWeekCount: 0 }}
          onRefresh={vi.fn()}
          refreshing={false}
          refreshError={null}
          canExport={true}
          onExport={vi.fn()}
          onDeleteLibrary={vi.fn()}
          onSignOut={vi.fn()}
          canUseIntegrations={true}
          isPaidActive={false}
        />
      </MemoryRouter>
    );

    const section = screen.getByTestId('settings-section-tab-groups');
    expect(section).toBeInTheDocument();
    expect(screen.getByTestId('settings-section-tab-groups-title')).toHaveTextContent(
      'Browser tab groups'
    );
    expect(screen.getByTestId('settings-tab-groups-status')).toHaveTextContent('Mirror status: Off');

    const toggle = screen.getByTestId('settings-tab-groups-toggle');
    fireEvent.click(toggle);

    expect(screen.getByTestId('settings-tab-groups-status')).toHaveTextContent('Mirror status: Active');
    expect(screen.getByTestId('settings-tab-groups-auto-sync-row')).toBeInTheDocument();

    const autoSyncToggle = screen.getByTestId('settings-tab-groups-auto-sync-toggle');
    fireEvent.click(autoSyncToggle);

    expect(localStorage.getItem('underscore_browser_tab_sync_enabled')).toBe('true');
    expect(localStorage.getItem('underscore_auto_sync_new_tab_groups')).toBe('false');
  });
});
