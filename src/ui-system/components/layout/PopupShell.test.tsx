import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import type { PopupChrome } from '../../../entrypoints/popup/chrome';

import { PopupShell } from './PopupShell';

const baseChrome: PopupChrome = {
  title: '_underscore',
  place: '',
  brand: '_underscore',
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

  it('renders ModeHeader when showModeHeader is true', () => {
    render(
      <PopupShell
        chrome={{
          title: '_underscore',
          place: 'Library',
          brand: '_underscore',
          showTitleStrip: true,
          showModeHeader: true,
          showTabBar: false,
          modeId: 'local',
          onBack: noopHandlers.onBackToCollections,
          backLabel: 'Library',
          onSwitch: noopHandlers.onSwitch,
        }}
        viewKey="DOMAIN_DETAILS"
      >
        <div>body</div>
      </PopupShell>
    );
    // ModeHeader renders the back label as text content
    expect(screen.getByText('← Library')).toBeInTheDocument();
  });

  it('renders TabBar with active tab when showTabBar is true', () => {
    render(
      <PopupShell
        chrome={{
          title: '_underscore · library',
          place: 'Library',
          brand: '_underscore',
          showTitleStrip: true,
          showModeHeader: true,
          showTabBar: true,
          modeId: 'local',
          activeTab: 'collections',
          onTabChange: noopHandlers.onTabChange,
        }}
        viewKey="COLLECTIONS"
      >
        <div>body</div>
      </PopupShell>
    );
    const libraryTab = screen.getByText('Library');
    expect(libraryTab.className).toContain('active');
  });
});
