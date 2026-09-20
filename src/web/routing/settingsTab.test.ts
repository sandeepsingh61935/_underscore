import { describe, it, expect } from 'vitest';
import {
  parseSettingsTab,
  buildSettingsSearch,
  coerceSettingsTab,
  visibleSettingsTabs,
  type SettingsTab,
} from './settingsTab';

describe('parseSettingsTab', () => {
  it('defaults to account when empty', () => {
    expect(parseSettingsTab('')).toBe('account');
    expect(parseSettingsTab('?')).toBe('account');
  });

  it('parses valid tabs', () => {
    const tabs: SettingsTab[] = ['account', 'plan', 'appearance', 'ai', 'data'];
    for (const tab of tabs) {
      expect(parseSettingsTab(`?tab=${tab}`)).toBe(tab);
      expect(parseSettingsTab(`tab=${tab}`)).toBe(tab);
    }
  });

  it('falls back to account for invalid tab values', () => {
    expect(parseSettingsTab('?tab=billing')).toBe('account');
    expect(parseSettingsTab('?tab=')).toBe('account');
    expect(parseSettingsTab('?tab=ACCOUNT')).toBe('account');
  });
});

describe('buildSettingsSearch', () => {
  it('builds tab=plan without leading ?', () => {
    expect(buildSettingsSearch('plan')).toBe('tab=plan');
  });

  it('builds each valid tab', () => {
    expect(buildSettingsSearch('account')).toBe('tab=account');
    expect(buildSettingsSearch('appearance')).toBe('tab=appearance');
    expect(buildSettingsSearch('ai')).toBe('tab=ai');
    expect(buildSettingsSearch('data')).toBe('tab=data');
  });

  it('round-trips with parseSettingsTab', () => {
    const tab: SettingsTab = 'ai';
    expect(parseSettingsTab(buildSettingsSearch(tab))).toBe(tab);
  });
});

describe('visibleSettingsTabs', () => {
  it('hides integrations and data on handheld', () => {
    expect(visibleSettingsTabs(true)).toEqual([
      'account',
      'plan',
      'appearance',
      'keyboard',
    ]);
    expect(visibleSettingsTabs(false)).toContain('ai');
    expect(visibleSettingsTabs(false)).toContain('data');
  });
});

describe('coerceSettingsTab', () => {
  it('keeps desktop tabs', () => {
    expect(coerceSettingsTab('ai', false)).toBe('ai');
    expect(coerceSettingsTab('data', false)).toBe('data');
  });

  it('maps handheld ai/data to account', () => {
    expect(coerceSettingsTab('ai', true)).toBe('account');
    expect(coerceSettingsTab('data', true)).toBe('account');
    expect(coerceSettingsTab('appearance', true)).toBe('appearance');
  });
});
