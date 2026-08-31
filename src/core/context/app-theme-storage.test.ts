/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { THEME_STORAGE_KEY, readStoredTheme, writeStoredTheme } from './AppProvider';

describe('web theme persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('light', 'dark');
  });

  it('defaults to system when nothing stored', () => {
    expect(readStoredTheme()).toBe('system');
  });

  it('round-trips light preference across reload read', () => {
    writeStoredTheme('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(readStoredTheme()).toBe('light');
  });

  it('round-trips dark preference', () => {
    writeStoredTheme('dark');
    expect(readStoredTheme()).toBe('dark');
  });

  it('ignores invalid stored values', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'neon');
    expect(readStoredTheme()).toBe('system');
  });
});
