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
