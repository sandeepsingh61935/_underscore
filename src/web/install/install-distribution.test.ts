import { describe, expect, it } from 'vitest';

import {
  detectInstallBrowser,
  getInstallDistributionConfig,
  orderInstallBrowsers,
  resolveBrowserAvailability,
  showManualDownload,
  showStoreCta,
} from './install-distribution';

describe('install-distribution', () => {
  it('defaults to manual mode without store CTAs', () => {
    const cfg = getInstallDistributionConfig({} as ImportMetaEnv);
    expect(cfg.mode).toBe('manual');
    expect(cfg.browsers).toHaveLength(2);
    for (const b of cfg.browsers) {
      expect(b.availability).toBe('manual');
      expect(showManualDownload(b.availability)).toBe(true);
      expect(showStoreCta(b.availability)).toBe(false);
      expect(b.storeUrl).toBeUndefined();
      expect(b.downloadHref).toContain(b.version);
      expect(b.downloadHref).toMatch(/\/downloads\//);
    }
    expect(cfg.helpHref).toBe('/help#install');
    expect(cfg.statusLine).toMatch(/store listings are in progress/i);
  });

  it('stores mode hides manual and requires store URL', () => {
    const withUrl = getInstallDistributionConfig({
      VITE_INSTALL_DISTRIBUTION_MODE: 'stores',
      VITE_CHROME_STORE_URL: 'https://chrome.example/ext',
      VITE_EXTENSION_PACKAGE_VERSION: '9.9.9',
    } as unknown as ImportMetaEnv);
    const chrome = withUrl.browsers.find((b) => b.id === 'chrome')!;
    const firefox = withUrl.browsers.find((b) => b.id === 'firefox')!;
    expect(chrome.availability).toBe('store');
    expect(showManualDownload(chrome.availability)).toBe(false);
    expect(showStoreCta(chrome.availability)).toBe(true);
    expect(chrome.storeUrl).toContain('chrome.example');
    expect(firefox.availability).toBe('unavailable');
    expect(chrome.version).toBe('9.9.9');
  });

  it('hybrid uses both when store URL set, else manual', () => {
    expect(resolveBrowserAvailability('hybrid', true)).toBe('both');
    expect(resolveBrowserAvailability('hybrid', false)).toBe('manual');
    expect(showManualDownload('both')).toBe(true);
    expect(showStoreCta('both')).toBe(true);
  });

  it('detects chrome and firefox from user agent', () => {
    expect(detectInstallBrowser('Mozilla/5.0 Firefox/140.0')).toBe('firefox');
    expect(
      detectInstallBrowser(
        'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      ),
    ).toBe('chrome');
    expect(detectInstallBrowser('Safari/605.1.15')).toBe('unknown');
  });

  it('orders detected browser first', () => {
    const list = [{ id: 'chrome' as const }, { id: 'firefox' as const }];
    expect(orderInstallBrowsers(list, 'firefox').map((b) => b.id)).toEqual([
      'firefox',
      'chrome',
    ]);
    expect(orderInstallBrowsers(list, 'unknown').map((b) => b.id)[0]).toBe('chrome');
  });
});
