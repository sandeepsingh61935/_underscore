import { describe, it, expect, vi } from 'vitest';

import type { AccountPillLabel } from '@/shared/utils/account-pill';

import { buildChrome, type ChromeHandlers } from './chrome';

const makeHandlers = (): ChromeHandlers => ({
  onTabChange: vi.fn(),
  onSwitch: vi.fn(),
  onBackToCollections: vi.fn(),
  onBackToDomain: vi.fn(),
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

describe('chrome brand-only title strip', () => {
  it('never surfaces place labels or account pills on tab roots', () => {
    const handlers = makeHandlers();
    handlers.getAccountPill = vi.fn((): AccountPillLabel | null => 'Paid');
    const map = buildChrome(handlers);

    for (const key of [
      'DASHBOARD',
      'COLLECTIONS',
      'DOMAIN_DETAILS',
      'SUB_DOMAIN',
      'SETTINGS',
      'AUTH',
    ] as const) {
      expect(map[key].place).toBe('');
      expect(map[key].accountPill).toBeNull();
      expect(map[key].brand).toBe('_underscore');
    }
  });

  it('DASHBOARD has ModeHeader, TabBar; activeTab is home', () => {
    const handlers = makeHandlers();
    const map = buildChrome(handlers);
    expect(map.DASHBOARD.title).toBe('_underscore');
    expect(map.DASHBOARD.showTitleStrip).toBe(true);
    expect(map.DASHBOARD.showModeHeader).toBe(true);
    expect(map.DASHBOARD.showTabBar).toBe(true);
    expect(map.DASHBOARD.activeTab).toBe('home');
    expect(map.DASHBOARD.onTabChange).toBe(handlers.onTabChange);
  });

  it('DASHBOARD forwards getModeId() into modeId', () => {
    const handlers = makeHandlers();
    handlers.getModeId = vi.fn(() => 'cloud');
    const map = buildChrome(handlers);
    expect(map.DASHBOARD.modeId).toBe('cloud');
  });

  it('COLLECTIONS has library title and collections tab', () => {
    const handlers = makeHandlers();
    const map = buildChrome(handlers);
    expect(map.COLLECTIONS.title).toBe('_underscore · library');
    expect(map.COLLECTIONS.showModeHeader).toBe(true);
    expect(map.COLLECTIONS.showTabBar).toBe(true);
    expect(map.COLLECTIONS.activeTab).toBe('collections');
  });

  it('DOMAIN_DETAILS wires back to collections', () => {
    const handlers = makeHandlers();
    const map = buildChrome(handlers);
    expect(map.DOMAIN_DETAILS.onBack).toBe(handlers.onBackToCollections);
    expect(map.DOMAIN_DETAILS.backLabel).toBe('Library');
  });

  it('SUB_DOMAIN wires domain back label', () => {
    const handlers = makeHandlers();
    const map = buildChrome(handlers);
    expect(map.SUB_DOMAIN.onBack).toBe(handlers.onBackToDomain);
    expect(map.SUB_DOMAIN.backLabel).toBe('anthropic.com');
  });

  it('SETTINGS activeTab is settings', () => {
    const map = buildChrome(makeHandlers());
    expect(map.SETTINGS.activeTab).toBe('settings');
    expect(map.SETTINGS.showTabBar).toBe(true);
  });

  it('AUTH has no tab bar', () => {
    const map = buildChrome(makeHandlers());
    expect(map.AUTH.showTabBar).toBe(false);
    expect(map.AUTH.showModeHeader).toBe(false);
  });
});
