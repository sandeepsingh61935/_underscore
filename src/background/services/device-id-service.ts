/**
 * @file device-id-service.ts
 * @description Stable per-install device identifier for echo suppression.
 */

import { browser } from 'wxt/browser';

const STORAGE_KEY = 'underscore_device_id';

export class DeviceIdService {
  private cachedId: string | null = null;

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
}
