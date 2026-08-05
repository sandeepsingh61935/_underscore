import { describe, it, expect, vi } from 'vitest';

import type { AccountPillLabel } from '@/shared/utils/account-pill';

import { buildChrome, type ChromeHandlers } from './chrome';

const makeHandlers = (): ChromeHandlers => ({
  onTabChange: vi.fn(),
  onSwitch: vi.fn(),
  onBackToCollections: vi.fn(),
  onBackToDomain: vi.fn(),
  onBackFromApiKeySetup: vi.fn(),
  onBackFromLlmStreaming: vi.fn(),
  subDomainBackLabel: vi.fn(() => 'anthropic.com'),
  getModeId: vi.fn(() => 'local'),
  getAccountPill: vi.fn((): AccountPillLabel | null => 'Free'),
  onAccountPillClick: vi.fn(),
});

describe('buildChrome', () => {
  it('returns chrome-less config for LOADING', () => {
    const handlers = makeHandlers();
    const map = buildChrome(handlers);
    expect(map.LOADING.title).toBe('_underscore');
    expect(map.LOADING.showTitleStrip).toBe(true);
    expect(map.LOADING.showModeHeader).toBe(false);
    expect(map.LOADING.showTabBar).toBe(false);
    expect(map.LOADING.accountPill).toBeNull();
    expect(map.LOADING.brand).toBe('_underscore');
  });
});

describe('chrome-having screens', () => {
  it('WELCOME has title strip but no ModeHeader or TabBar', () => {
    const map = buildChrome(makeHandlers());
    expect(map.WELCOME.title).toBe('_underscore');
    expect(map.WELCOME.showTitleStrip).toBe(true);
    expect(map.WELCOME.showModeHeader).toBe(false);
    expect(map.WELCOME.showTabBar).toBe(false);
    expect(map.WELCOME.accountPill).toBeNull();
  });

  it('MODE_SELECTION has title strip but no ModeHeader or TabBar', () => {
    const map = buildChrome(makeHandlers());
    expect(map.MODE_SELECTION.title).toBe('_underscore');
    expect(map.MODE_SELECTION.showModeHeader).toBe(false);
    expect(map.MODE_SELECTION.showTabBar).toBe(false);
    expect(map.MODE_SELECTION.accountPill).toBeNull();
  });

  it('AUTH place is Sign in and accountPill is hidden', () => {
    const map = buildChrome(makeHandlers());
    expect(map.AUTH.place).toBe('Sign in');
    expect(map.AUTH.accountPill).toBeNull();
    expect(map.AUTH.showTabBar).toBe(false);
    expect(map.AUTH.title).toBe('_underscore · sign in');
    expect(map.AUTH.showTitleStrip).toBe(true);
    expect(map.AUTH.showModeHeader).toBe(false);
  });
});

describe('chrome-having screens with tab bar', () => {
  it('DASHBOARD place is Home and brand is _underscore', () => {
    const map = buildChrome(makeHandlers());
    expect(map.DASHBOARD.place).toBe('Home');
    expect(map.DASHBOARD.brand).toBe('_underscore');
  });

  it('DASHBOARD has title, ModeHeader, TabBar; activeTab is home', () => {
    const handlers = makeHandlers();
    const map = buildChrome(handlers);
    expect(map.DASHBOARD.title).toBe('_underscore');
    expect(map.DASHBOARD.showTitleStrip).toBe(true);
    expect(map.DASHBOARD.showModeHeader).toBe(true);
    expect(map.DASHBOARD.showTabBar).toBe(true);
    expect(map.DASHBOARD.activeTab).toBe('home');
    expect(map.DASHBOARD.onTabChange).toBe(handlers.onTabChange);
    expect(map.DASHBOARD.onSwitch).toBeUndefined();
    expect(map.DASHBOARD.accountPill).toBe('Free');
    expect(map.DASHBOARD.onAccountPillClick).toBe(handlers.onAccountPillClick);
  });

  it('DASHBOARD forwards getModeId() into modeId', () => {
    const handlers = makeHandlers();
    handlers.getModeId = vi.fn(() => 'cloud');
    const map = buildChrome(handlers);
    expect(map.DASHBOARD.modeId).toBe('cloud');
  });

  it('COLLECTIONS place is Library; no onSwitch', () => {
    const map = buildChrome(makeHandlers());
    expect(map.COLLECTIONS.place).toBe('Library');
    expect(map.COLLECTIONS.onSwitch).toBeUndefined();
  });

  it('COLLECTIONS has "_underscore · library" title, activeTab collections', () => {
    const handlers = makeHandlers();
    const map = buildChrome(handlers);
    expect(map.COLLECTIONS.title).toBe('_underscore · library');
    expect(map.COLLECTIONS.showModeHeader).toBe(true);
    expect(map.COLLECTIONS.showTabBar).toBe(true);
    expect(map.COLLECTIONS.activeTab).toBe('collections');
  });

  it('root library has no back; DOMAIN_DETAILS has back Library', () => {
    const map = buildChrome(makeHandlers());
    expect(map.COLLECTIONS.onBack).toBeUndefined();
    expect(map.DOMAIN_DETAILS.onBack).toBeDefined();
    expect(map.DOMAIN_DETAILS.backLabel).toBe('Library');
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
    expect(map.DOMAIN_DETAILS.onSwitch).toBeUndefined();
  });

  it('SUB_DOMAIN backLabel is resolved from handlers.subDomainBackLabel()', () => {
    const handlers = makeHandlers();
    handlers.subDomainBackLabel = vi.fn(() => 'nytimes.com');
    const map = buildChrome(handlers);
    expect(map.SUB_DOMAIN.onBack).toBe(handlers.onBackToDomain);
    expect(map.SUB_DOMAIN.backLabel).toBe('nytimes.com');
    expect(handlers.subDomainBackLabel).toHaveBeenCalled();
    expect(map.SUB_DOMAIN.onSwitch).toBeUndefined();
  });

  it('SUB_DOMAIN re-evaluates backLabel on each buildChrome call', () => {
    const handlers = makeHandlers();
    handlers.subDomainBackLabel = vi.fn(() => 'anthropic.com');
    buildChrome(handlers);
    handlers.subDomainBackLabel = vi.fn(() => 'theguardian.com');
    const map = buildChrome(handlers);
    expect(map.SUB_DOMAIN.backLabel).toBe('theguardian.com');
  });

  it('SETTINGS place is Settings; activeTab settings', () => {
    const map = buildChrome(makeHandlers());
    expect(map.SETTINGS.place).toBe('Settings');
    expect(map.SETTINGS.activeTab).toBe('settings');
  });

  it('SETTINGS has "_underscore · settings" title, activeTab settings', () => {
    const handlers = makeHandlers();
    const map = buildChrome(handlers);
    expect(map.SETTINGS.title).toBe('_underscore · settings');
    expect(map.SETTINGS.showModeHeader).toBe(true);
    expect(map.SETTINGS.showTabBar).toBe(true);
    expect(map.SETTINGS.activeTab).toBe('settings');
    expect(map.SETTINGS.onSwitch).toBeUndefined();
  });

  it('primary tab roots have no onBack (ASK/SETTINGS/COLLECTIONS/DASHBOARD)', () => {
    const map = buildChrome(makeHandlers());
    for (const key of ['ASK', 'SETTINGS', 'COLLECTIONS', 'DASHBOARD'] as const) {
      expect(map[key].onBack).toBeUndefined();
      expect(map[key].backLabel).toBeUndefined();
    }
  });

  it('ActiveTab ask is available on ASK view', () => {
    const map = buildChrome(makeHandlers());
    expect(map.ASK.activeTab).toBe('ask');
    expect(map.ASK.place).toBe('Ask');
    expect(map.ASK.brand).toBe('_underscore');
    expect(map.ASK.showTabBar).toBe(true);
  });

  it('API_KEY_SETUP has title, ModeHeader, back button, no TabBar', () => {
    const handlers = makeHandlers();
    const map = buildChrome(handlers);
    expect(map.API_KEY_SETUP.title).toBe('_underscore · models');
    expect(map.API_KEY_SETUP.showModeHeader).toBe(true);
    expect(map.API_KEY_SETUP.showTabBar).toBe(false);
    expect(map.API_KEY_SETUP.onBack).toBe(handlers.onBackFromApiKeySetup);
    expect(map.API_KEY_SETUP.backLabel).toBe('Settings');
    expect(map.API_KEY_SETUP.onSwitch).toBeUndefined();
  });

  it('LLM_STREAMING has title, ModeHeader, back button, no TabBar', () => {
    const handlers = makeHandlers();
    const map = buildChrome(handlers);
    expect(map.LLM_STREAMING.title).toBe('_underscore · summary');
    expect(map.LLM_STREAMING.showModeHeader).toBe(true);
    expect(map.LLM_STREAMING.showTabBar).toBe(false);
    expect(map.LLM_STREAMING.onBack).toBe(handlers.onBackFromLlmStreaming);
    expect(map.LLM_STREAMING.backLabel).toBe('Close');
    expect(map.LLM_STREAMING.onSwitch).toBeUndefined();
  });

  it('forwards getAccountPill into accountPill on chrome screens', () => {
    const handlers = makeHandlers();
    handlers.getAccountPill = vi.fn((): AccountPillLabel | null => 'Paid');
    const map = buildChrome(handlers);
    expect(map.DASHBOARD.accountPill).toBe('Paid');
    expect(map.COLLECTIONS.accountPill).toBe('Paid');
    expect(map.SETTINGS.accountPill).toBe('Paid');
    expect(map.ASK.accountPill).toBe('Paid');
    expect(handlers.getAccountPill).toHaveBeenCalled();
  });
});
