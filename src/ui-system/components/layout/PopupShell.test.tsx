import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { PopupShell } from './PopupShell';
import type { PopupChrome } from '../../../entrypoints/popup/chrome';

const baseChrome: PopupChrome = {
  title: '_underscore',
  showTitleStrip: true,
  showModeHeader: false,
  showTabBar: false,
};

const noopHandlers = {
  onTabChange: vi.fn(),
  onSwitch: vi.fn(),
  onBackToCollections: vi.fn(),
  onBackToDomain: vi.fn(),
  onBackFromSettings: vi.fn(),
  subDomainBackLabel: vi.fn(() => ''),
  getModeId: vi.fn(() => 'local'),
};

describe('PopupShell', () => {
  it('renders the title strip with the chrome title when showTitleStrip is true', () => {
    render(
      <PopupShell chrome={baseChrome} viewKey="LOADING">
        <div>body</div>
      </PopupShell>
    );
    expect(screen.getByText('_underscore')).toBeInTheDocument();
  });

  it('omits the title strip when showTitleStrip is false', () => {
    render(
      <PopupShell chrome={{ ...baseChrome, showTitleStrip: false, title: '' }} viewKey="WELCOME">
        <div>body</div>
      </PopupShell>
    );
    expect(screen.queryByText('_underscore')).not.toBeInTheDocument();
  });
});
