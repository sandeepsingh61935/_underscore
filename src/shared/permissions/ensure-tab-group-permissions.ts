/**
 * @file ensure-tab-group-permissions.ts
 * @description Optional permissions management and capability detection for browser tab-group mirroring.
 */

import { browser } from 'wxt/browser';

export const TAB_GROUP_PERMISSIONS = ['tabs', 'tabGroups'] as const;

/**
 * Resolves the active permissions API from `browser.permissions` or fallback `chrome.permissions`.
 */
function getPermissionsApi(): any {
  if (typeof browser !== 'undefined' && (browser as any)?.permissions) {
    return (browser as any).permissions;
  }
  const chromeObj = (globalThis as any)?.chrome;
  if (typeof chromeObj !== 'undefined' && chromeObj?.permissions) {
    return chromeObj.permissions;
  }
  return undefined;
}

/**
 * Request optional tab and tabGroups permissions from the user.
 * Returns true if granted, or false if rejected, unsupported, or on error.
 */
export async function requestTabGroupPermissions(): Promise<boolean> {
  try {
    const perms = getPermissionsApi();
    if (!perms || typeof perms.request !== 'function') {
      return false;
    }
    const granted = await perms.request({
      permissions: [...TAB_GROUP_PERMISSIONS],
    });
    return Boolean(granted);
  } catch {
    return false;
  }
}

/**
 * Check if optional tab and tabGroups permissions are currently granted.
 * Returns true if all permissions are present, or false if not granted, unsupported, or on error.
 */
export async function hasTabGroupPermissions(): Promise<boolean> {
  try {
    const perms = getPermissionsApi();
    if (!perms || typeof perms.contains !== 'function') {
      return false;
    }
    const has = await perms.contains({
      permissions: [...TAB_GROUP_PERMISSIONS],
    });
    return Boolean(has);
  } catch {
    return false;
  }
}

/**
 * Feature-detects whether the browser runtime supports the tabGroups API and tabs.group.
 * Checks `browser` first, falling back to `chrome`.
 */
export function isTabGroupApiAvailable(): boolean {
  if (
    typeof browser !== 'undefined' &&
    typeof (browser as any)?.tabGroups?.query === 'function' &&
    typeof (browser as any)?.tabs?.group === 'function'
  ) {
    return true;
  }

  const chromeObj = (globalThis as any)?.chrome;
  if (
    typeof chromeObj !== 'undefined' &&
    typeof chromeObj?.tabGroups?.query === 'function' &&
    typeof chromeObj?.tabs?.group === 'function'
  ) {
    return true;
  }

  return false;
}

/**
 * Detects whether the browser platform supports tab groups mirroring.
 * Returns true if the tab groups APIs are already present OR if running in an extension
 * environment on a browser engine (Chromium or Firefox 139+) where optional tabGroups permissions can be requested.
 */
export function isTabGroupSupported(): boolean {
  if (isTabGroupApiAvailable()) {
    return true;
  }

  const perms = getPermissionsApi();
  if (!perms || typeof perms.request !== 'function') {
    return false;
  }

  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent;
    if (/Chrome\//.test(ua) || /Edg\//.test(ua)) {
      return true;
    }
    const ffMatch = ua.match(/Firefox\/(\d+)/);
    if (ffMatch && ffMatch[1] && parseInt(ffMatch[1], 10) >= 139) {
      return true;
    }
  }

  const chromeObj = (globalThis as any)?.chrome;
  if (chromeObj?.runtime?.id || (browser as any)?.runtime?.id) {
    return true;
  }

  return false;
}

/**
 * Listens for permission removal events. If either 'tabs' or 'tabGroups' is removed,
 * triggers the provided callback.
 *
 * @param callback Called when tabs or tabGroups permission is revoked.
 * @returns A cleanup function to unsubscribe the listener.
 */
export function onTabGroupPermissionsRemoved(callback: () => void): () => void {
  const perms = getPermissionsApi();
  if (!perms?.onRemoved || typeof perms.onRemoved.addListener !== 'function') {
    return () => {};
  }

  const listener = (removed: { permissions?: string[]; origins?: string[] }) => {
    const permissions = removed?.permissions;
    if (
      Array.isArray(permissions) &&
      permissions.some((p) => (TAB_GROUP_PERMISSIONS as readonly string[]).includes(p))
    ) {
      callback();
    }
  };

  try {
    perms.onRemoved.addListener(listener);
    return () => {
      try {
        perms.onRemoved?.removeListener?.(listener);
      } catch {
        // Ignore unregister errors during teardown
      }
    };
  } catch {
    return () => {};
  }
}
