import { describe, it, expect, vi } from 'vitest';
import { buildChrome, type ChromeHandlers } from './chrome';

const makeHandlers = (): ChromeHandlers => ({
  onTabChange: vi.fn(),
  onSwitch: vi.fn(),
  onBackToCollections: vi.fn(),
  onBackToDomain: vi.fn(),
  onBackFromSettings: vi.fn(),
  subDomainBackLabel: vi.fn(() => 'anthropic.com'),
  getModeId: vi.fn(() => 'local'),
});

describe('buildChrome', () => {
  it('returns chrome-less config for LOADING', () => {
    const handlers = makeHandlers();
    const map = buildChrome(handlers);
    expect(map.LOADING.title).toBe('_underscore');
    expect(map.LOADING.showTitleStrip).toBe(true);
    expect(map.LOADING.showModeHeader).toBe(false);
    expect(map.LOADING.showTabBar).toBe(false);
  });
});

describe('chrome-having screens', () => {
  it('WELCOME has title strip but no ModeHeader or TabBar', () => {
    const map = buildChrome(makeHandlers());
    expect(map.WELCOME.title).toBe('_underscore');
    expect(map.WELCOME.showTitleStrip).toBe(true);
    expect(map.WELCOME.showModeHeader).toBe(false);
    expect(map.WELCOME.showTabBar).toBe(false);
  });

  it('MODE_SELECTION has title strip but no ModeHeader or TabBar', () => {
    const map = buildChrome(makeHandlers());
    expect(map.MODE_SELECTION.title).toBe('_underscore');
    expect(map.MODE_SELECTION.showModeHeader).toBe(false);
    expect(map.MODE_SELECTION.showTabBar).toBe(false);
  });

  it('AUTH has "_underscore · sign in" title and no chrome', () => {
    const map = buildChrome(makeHandlers());
    expect(map.AUTH.title).toBe('_underscore · sign in');
    expect(map.AUTH.showTitleStrip).toBe(true);
    expect(map.AUTH.showModeHeader).toBe(false);
    expect(map.AUTH.showTabBar).toBe(false);
  });
});

describe('chrome-having screens with tab bar', () => {
  it('DASHBOARD has title, ModeHeader, TabBar; activeTab is home', () => {
    const handlers = makeHandlers();
    const map = buildChrome(handlers);
    expect(map.DASHBOARD.title).toBe('_underscore');
    expect(map.DASHBOARD.showTitleStrip).toBe(true);
    expect(map.DASHBOARD.showModeHeader).toBe(true);
    expect(map.DASHBOARD.showTabBar).toBe(true);
    expect(map.DASHBOARD.activeTab).toBe('home');
    expect(map.DASHBOARD.onTabChange).toBe(handlers.onTabChange);
    expect(map.DASHBOARD.onSwitch).toBe(handlers.onSwitch);
  });

  it('DASHBOARD forwards getModeId() into modeId', () => {
    const handlers = makeHandlers();
    handlers.getModeId = vi.fn(() => 'cloud');
    const map = buildChrome(handlers);
    expect(map.DASHBOARD.modeId).toBe('cloud');
  });

  it('COLLECTIONS has "_underscore · library" title, activeTab collections', () => {
    const handlers = makeHandlers();
    const map = buildChrome(handlers);
    expect(map.COLLECTIONS.title).toBe('_underscore · library');
    expect(map.COLLECTIONS.showModeHeader).toBe(true);
    expect(map.COLLECTIONS.showTabBar).toBe(true);
    expect(map.COLLECTIONS.activeTab).toBe('collections');
  });

  it('COLLECTIONS has no back button (root of library stack)', () => {
    const map = buildChrome(makeHandlers());
    expect(map.COLLECTIONS.onBack).toBeUndefined();
    expect(map.COLLECTIONS.backLabel).toBeUndefined();
  });

  it('DOMAIN_DETAILS has back button with label "Library"', () => {
    const handlers = makeHandlers();
    const map = buildChrome(handlers);
    expect(map.DOMAIN_DETAILS.onBack).toBe(handlers.onBackToCollections);
    expect(map.DOMAIN_DETAILS.backLabel).toBe('Library');
    expect(map.DOMAIN_DETAILS.activeTab).toBe('collections');
  });
});
