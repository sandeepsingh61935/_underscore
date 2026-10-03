import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { browser } from 'wxt/browser';
import {
  TAB_GROUP_PERMISSIONS,
  requestTabGroupPermissions,
  hasTabGroupPermissions,
  isTabGroupApiAvailable,
  isTabGroupSupported,
  onTabGroupPermissionsRemoved,
} from '@/shared/permissions/ensure-tab-group-permissions';
import { GROUPS_BROWSER_SYNC_ENABLED } from '@/shared/constants/groups-flags';

vi.mock('wxt/browser', () => ({
  browser: {
    permissions: {
      request: vi.fn(),
      contains: vi.fn(),
      onRemoved: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
    tabGroups: {
      query: vi.fn(),
    },
    tabs: {
      group: vi.fn(),
    },
  },
}));

describe('ensure-tab-group-permissions', () => {
  const originalChrome = (globalThis as any).chrome;

  beforeEach(() => {
    vi.clearAllMocks();
    (browser as any).permissions = {
      request: vi.fn().mockResolvedValue(true),
      contains: vi.fn().mockResolvedValue(true),
      onRemoved: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    };
    (browser as any).tabGroups = {
      query: vi.fn(),
    };
    (browser as any).tabs = {
      group: vi.fn(),
    };
    (globalThis as any).chrome = undefined;
  });

  afterEach(() => {
    (globalThis as any).chrome = originalChrome;
  });

  describe('GROUPS_BROWSER_SYNC_ENABLED', () => {
    it('is enabled by default for browser tab group mirroring', () => {
      expect(GROUPS_BROWSER_SYNC_ENABLED).toBe(true);
    });
  });

  describe('TAB_GROUP_PERMISSIONS', () => {
    it('contains tabs and tabGroups permissions', () => {
      expect(TAB_GROUP_PERMISSIONS).toEqual(['tabs', 'tabGroups']);
    });
  });

  describe('requestTabGroupPermissions', () => {
    it('calls permissions.request with tabs and tabGroups', async () => {
      (browser.permissions.request as any).mockResolvedValue(true);

      const result = await requestTabGroupPermissions();

      expect(browser.permissions.request).toHaveBeenCalledWith({
        permissions: ['tabs', 'tabGroups'],
      });
      expect(result).toBe(true);
    });

    it('returns false when user rejects permission prompt', async () => {
      (browser.permissions.request as any).mockResolvedValue(false);

      const result = await requestTabGroupPermissions();

      expect(result).toBe(false);
    });

    it('returns false when permissions.request throws an error', async () => {
      (browser.permissions.request as any).mockRejectedValue(new Error('User cancelled'));

      const result = await requestTabGroupPermissions();

      expect(result).toBe(false);
    });

    it('returns false when permissions API is unavailable', async () => {
      (browser as any).permissions = undefined;

      const result = await requestTabGroupPermissions();

      expect(result).toBe(false);
    });

    it('falls back to chrome.permissions when browser.permissions is unavailable', async () => {
      (browser as any).permissions = undefined;
      const chromeRequest = vi.fn().mockResolvedValue(true);
      (globalThis as any).chrome = {
        permissions: {
          request: chromeRequest,
        },
      };

      const result = await requestTabGroupPermissions();

      expect(chromeRequest).toHaveBeenCalledWith({
        permissions: ['tabs', 'tabGroups'],
      });
      expect(result).toBe(true);
    });
  });

  describe('hasTabGroupPermissions', () => {
    it('calls permissions.contains with tabs and tabGroups and returns true when granted', async () => {
      (browser.permissions.contains as any).mockResolvedValue(true);

      const result = await hasTabGroupPermissions();

      expect(browser.permissions.contains).toHaveBeenCalledWith({
        permissions: ['tabs', 'tabGroups'],
      });
      expect(result).toBe(true);
    });

    it('returns false when permissions are not granted', async () => {
      (browser.permissions.contains as any).mockResolvedValue(false);

      const result = await hasTabGroupPermissions();

      expect(result).toBe(false);
    });

    it('returns false when permissions.contains throws an error', async () => {
      (browser.permissions.contains as any).mockRejectedValue(new Error('Extension context invalidated'));

      const result = await hasTabGroupPermissions();

      expect(result).toBe(false);
    });

    it('returns false when permissions API is unavailable', async () => {
      (browser as any).permissions = undefined;

      const result = await hasTabGroupPermissions();

      expect(result).toBe(false);
    });

    it('falls back to chrome.permissions when browser.permissions is unavailable', async () => {
      (browser as any).permissions = undefined;
      const chromeContains = vi.fn().mockResolvedValue(true);
      (globalThis as any).chrome = {
        permissions: {
          contains: chromeContains,
        },
      };

      const result = await hasTabGroupPermissions();

      expect(chromeContains).toHaveBeenCalledWith({
        permissions: ['tabs', 'tabGroups'],
      });
      expect(result).toBe(true);
    });
  });

  describe('isTabGroupApiAvailable', () => {
    it('returns true when tabGroups.query and tabs.group are supported on browser', () => {
      expect(isTabGroupApiAvailable()).toBe(true);
    });

    it('returns false when tabGroups is missing', () => {
      (browser as any).tabGroups = undefined;

      expect(isTabGroupApiAvailable()).toBe(false);
    });

    it('returns false when tabGroups.query is not a function', () => {
      (browser as any).tabGroups = {};

      expect(isTabGroupApiAvailable()).toBe(false);
    });

    it('returns false when tabs.group is not a function', () => {
      (browser as any).tabs = {};

      expect(isTabGroupApiAvailable()).toBe(false);
    });

    it('returns false when tabs is missing', () => {
      (browser as any).tabs = undefined;

      expect(isTabGroupApiAvailable()).toBe(false);
    });

    it('falls back to chrome.tabGroups and chrome.tabs when browser APIs are missing', () => {
      (browser as any).tabGroups = undefined;
      (browser as any).tabs = undefined;
      (globalThis as any).chrome = {
        tabGroups: {
          query: vi.fn(),
        },
        tabs: {
          group: vi.fn(),
        },
      };

      expect(isTabGroupApiAvailable()).toBe(true);
    });

    it('returns false when neither browser nor chrome support tab groups', () => {
      (browser as any).tabGroups = undefined;
      (browser as any).tabs = undefined;
      (globalThis as any).chrome = undefined;

      expect(isTabGroupApiAvailable()).toBe(false);
    });
  });

  describe('isTabGroupSupported', () => {
    it('returns true when isTabGroupApiAvailable is true', () => {
      expect(isTabGroupSupported()).toBe(true);
    });

    it('returns true when tabGroups API is not yet attached but extension permissions API is present in Chromium', () => {
      (browser as any).tabGroups = undefined;
      (browser as any).tabs = undefined;
      (globalThis as any).chrome = {
        runtime: { id: 'test-extension-id' },
        permissions: { request: vi.fn() },
      };

      expect(isTabGroupSupported()).toBe(true);
    });

    it('returns false when permissions API is missing and tabGroups API is missing', () => {
      (browser as any).tabGroups = undefined;
      (browser as any).tabs = undefined;
      (browser as any).permissions = undefined;
      (globalThis as any).chrome = undefined;

      expect(isTabGroupSupported()).toBe(false);
    });
  });

  describe('onTabGroupPermissionsRemoved', () => {
    it('registers onRemoved listener and invokes callback when tabs permission is removed', () => {
      let registeredListener: ((removed: { permissions?: string[] }) => void) | undefined;
      (browser.permissions.onRemoved.addListener as any).mockImplementation((listener: any) => {
        registeredListener = listener;
      });

      const callback = vi.fn();
      onTabGroupPermissionsRemoved(callback);

      expect(browser.permissions.onRemoved.addListener).toHaveBeenCalledTimes(1);
      expect(registeredListener).toBeDefined();

      registeredListener!({ permissions: ['tabs'] });
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('invokes callback when tabGroups permission is removed', () => {
      let registeredListener: ((removed: { permissions?: string[] }) => void) | undefined;
      (browser.permissions.onRemoved.addListener as any).mockImplementation((listener: any) => {
        registeredListener = listener;
      });

      const callback = vi.fn();
      onTabGroupPermissionsRemoved(callback);

      registeredListener!({ permissions: ['tabGroups'] });
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('invokes callback when both tabs and tabGroups permissions are removed', () => {
      let registeredListener: ((removed: { permissions?: string[] }) => void) | undefined;
      (browser.permissions.onRemoved.addListener as any).mockImplementation((listener: any) => {
        registeredListener = listener;
      });

      const callback = vi.fn();
      onTabGroupPermissionsRemoved(callback);

      registeredListener!({ permissions: ['tabs', 'tabGroups'] });
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('does not invoke callback when unrelated permissions are removed', () => {
      let registeredListener: ((removed: { permissions?: string[] }) => void) | undefined;
      (browser.permissions.onRemoved.addListener as any).mockImplementation((listener: any) => {
        registeredListener = listener;
      });

      const callback = vi.fn();
      onTabGroupPermissionsRemoved(callback);

      registeredListener!({ permissions: ['storage', 'alarms'] });
      expect(callback).not.toHaveBeenCalled();
    });

    it('does not invoke callback when removed permissions array is empty or undefined', () => {
      let registeredListener: ((removed: { permissions?: string[] }) => void) | undefined;
      (browser.permissions.onRemoved.addListener as any).mockImplementation((listener: any) => {
        registeredListener = listener;
      });

      const callback = vi.fn();
      onTabGroupPermissionsRemoved(callback);

      registeredListener!({ permissions: [] });
      registeredListener!({});
      expect(callback).not.toHaveBeenCalled();
    });

    it('returns an unsubscribe function that removes the registered listener', () => {
      let registeredListener: ((removed: { permissions?: string[] }) => void) | undefined;
      (browser.permissions.onRemoved.addListener as any).mockImplementation((listener: any) => {
        registeredListener = listener;
      });

      const callback = vi.fn();
      const unsubscribe = onTabGroupPermissionsRemoved(callback);

      expect(browser.permissions.onRemoved.removeListener).not.toHaveBeenCalled();
      unsubscribe();

      expect(browser.permissions.onRemoved.removeListener).toHaveBeenCalledTimes(1);
      expect(browser.permissions.onRemoved.removeListener).toHaveBeenCalledWith(registeredListener);
    });

    it('handles unavailable permissions API gracefully and returns a no-op unregister', () => {
      (browser as any).permissions = undefined;

      const callback = vi.fn();
      const unsubscribe = onTabGroupPermissionsRemoved(callback);

      expect(typeof unsubscribe).toBe('function');
      expect(() => unsubscribe()).not.toThrow();
    });
  });
});
