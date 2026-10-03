/**
 * @file device-id-service.ts
 * @description Stable per-install device identifier for echo suppression.
 */

import { browser } from 'wxt/browser';

const STORAGE_KEY = 'underscore_device_id';
const LABEL_KEY = 'underscore_device_label';

function detectDefaultDeviceLabel(): string {
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent;
    if (/Macintosh|Mac OS X/.test(ua)) return 'Mac';
    if (/Windows/.test(ua)) return 'Windows';
    if (/Linux/.test(ua)) return 'Linux';
    if (/CrOS/.test(ua)) return 'ChromeOS';
  }
  return 'this device';
}

export class DeviceIdService {
  private cachedId: string | null = null;
  private cachedLabel: string | null = null;

  async getDeviceId(): Promise<string> {
    if (this.cachedId) {
      return this.cachedId;
    }

    const stored = await browser.storage.local.get(STORAGE_KEY);
    const existing = stored[STORAGE_KEY];

    if (typeof existing === 'string' && existing.length > 0) {
      this.cachedId = existing;
      return existing;
    }

    const id = crypto.randomUUID();
    await browser.storage.local.set({ [STORAGE_KEY]: id });
    this.cachedId = id;
    return id;
  }

  async getDeviceLabel(): Promise<string> {
    if (this.cachedLabel) {
      return this.cachedLabel;
    }

    try {
      const stored = await browser.storage.local.get(LABEL_KEY);
      const existing = stored[LABEL_KEY];
      if (typeof existing === 'string' && existing.length > 0) {
        this.cachedLabel = existing;
        return existing;
      }
    } catch {
      // Fallback
    }

    return detectDefaultDeviceLabel();
  }
}
