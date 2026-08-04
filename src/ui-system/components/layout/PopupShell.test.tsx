import { fireEvent, render, screen } from '@testing-library/react';
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
  it('renders place left, brand center, account pill right', () => {
    render(
      <PopupShell
        chrome={{
          title: '_underscore',
          place: 'Home',
          brand: '_underscore',
          accountPill: 'Guest',
          onAccountPillClick: vi.fn(),
          showTitleStrip: true,
          showModeHeader: false,
          showTabBar: false,
        }}
        viewKey="DASHBOARD"
      >
        <div>body</div>
      </PopupShell>
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('_underscore')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guest/i })).toBeInTheDocument();
  });

  it('hides account pill when accountPill is null', () => {
    render(
      <PopupShell
        chrome={{
          title: '_underscore',
          place: 'Sign in',
          brand: '_underscore',
          accountPill: null,
          showTitleStrip: true,
          showModeHeader: false,
          showTabBar: false,
        }}
        viewKey="AUTH"
      >
        <div>body</div>
      </PopupShell>
    );
    expect(screen.queryByRole('button', { name: /guest|free|paid|past due/i })).not.toBeInTheDocument();
  });

  it('invokes onAccountPillClick when pill clicked', () => {
    const onAccountPillClick = vi.fn();
    render(
      <PopupShell
        chrome={{
          title: '_underscore',
          place: 'Home',
          brand: '_underscore',
          accountPill: 'Free',
          onAccountPillClick,
          showTitleStrip: true,
          showModeHeader: false,
          showTabBar: false,
        }}
        viewKey="DASHBOARD"
      >
        <div>body</div>
      </PopupShell>
    );
    fireEvent.click(screen.getByRole('button', { name: /free/i }));
    expect(onAccountPillClick).toHaveBeenCalled();
  });

  it('renders the title strip with the chrome brand when showTitleStrip is true', () => {
    render(
      <PopupShell chrome={baseChrome} viewKey="LOADING">
        <div>body</div>
      </PopupShell>
    );
    expect(screen.getByText('_underscore')).toBeInTheDocument();
  });

  it('omits the title strip when showTitleStrip is false', () => {
    render(
      <PopupShell chrome={{ ...baseChrome, showTitleStrip: false, title: '', brand: '' }} viewKey="WELCOME">
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
    const libraryTab = screen.getByRole('button', { name: 'Library', current: 'page' });
    expect(libraryTab.className).toContain('active');
  });
});
