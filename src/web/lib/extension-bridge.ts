/**
 * @file extension-bridge.ts
 * @description Web companion to extension postMessage bridge.
 * Allows the web app (e.g. `/library/groups/:id`) to request local browser actions
 * like opening a group in a browser tab group.
 */

export interface OpenGroupInBrowserResult {
  ok: boolean;
  needsConfirm?: boolean;
  tabCount?: number;
  browserGroupId?: number;
  error?: string;
}

/**
 * Requests the extension to open a page group in the local browser.
 */
export function openGroupInBrowser(
  groupId: string,
  force = false,
  timeoutMs = 5000
): Promise<OpenGroupInBrowserResult> {
  if (typeof window === 'undefined') {
    return Promise.resolve({ ok: false, error: 'Window is not defined' });
  }

  return new Promise((resolve) => {
    const requestId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = (): void => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      window.removeEventListener('message', onMessage);
    };

    const onMessage = (event: MessageEvent): void => {
      const isAllowedOrigin =
        event.origin === window.location.origin ||
        (process.env['NODE_ENV'] === 'test' && event.origin === '');
      if (!isAllowedOrigin) {
        return;
      }

      const data = event.data;
      if (
        data &&
        typeof data === 'object' &&
        data.source === 'underscore-extension' &&
        data.type === 'GROUP_OPEN_IN_BROWSER_RESPONSE' &&
        data.requestId === requestId
      ) {
        cleanup();
        resolve({
          ok: Boolean(data.ok),
          needsConfirm: data.needsConfirm,
          tabCount: data.tabCount,
          browserGroupId: data.browserGroupId,
          error: data.error,
        });
      }
    };

    window.addEventListener('message', onMessage);

    timer = setTimeout(() => {
      cleanup();
      resolve({ ok: false, error: 'Extension bridge timed out' });
    }, timeoutMs);

    window.postMessage(
      {
        source: 'underscore-web',
        type: 'GROUP_OPEN_IN_BROWSER',
        requestId,
        payload: {
          groupId,
          force,
        },
      },
      window.location.origin
    );
  });
}

import type { BrowserTabGroupSummary } from '@/shared/schemas/message-schemas';

export type { BrowserTabGroupSummary };

export interface GetBrowserTabGroupsResult {
  ok: boolean;
  groups?: BrowserTabGroupSummary[];
  error?: string;
}

export interface FocusTabGroupResult {
  ok: boolean;
  error?: string;
}

/**
 * Requests the extension to list active browser tab groups.
 */
export function getBrowserTabGroups(timeoutMs = 5000): Promise<GetBrowserTabGroupsResult> {
  if (typeof window === 'undefined') {
    return Promise.resolve({ ok: false, error: 'Window is not defined' });
  }

  return new Promise((resolve) => {
    const requestId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = (): void => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      window.removeEventListener('message', onMessage);
    };

    const onMessage = (event: MessageEvent): void => {
      const isAllowedOrigin =
        event.origin === window.location.origin ||
        (process.env['NODE_ENV'] === 'test' && event.origin === '');
      if (!isAllowedOrigin) {
        return;
      }

      const data = event.data;
      if (
        data &&
        typeof data === 'object' &&
        data.source === 'underscore-extension' &&
        data.type === 'EXTENSION_GET_BROWSER_TAB_GROUPS_RESPONSE' &&
        data.requestId === requestId
      ) {
        cleanup();
        resolve({
          ok: Boolean(data.ok),
          groups: data.groups,
          error: data.error,
        });
      }
    };

    window.addEventListener('message', onMessage);

    timer = setTimeout(() => {
      cleanup();
      resolve({ ok: false, error: 'Extension bridge timed out' });
    }, timeoutMs);

    window.postMessage(
      {
        source: 'underscore-web',
        type: 'EXTENSION_GET_BROWSER_TAB_GROUPS',
        requestId,
      },
      window.location.origin
    );
  });
}

/**
 * Requests the extension to focus the specified browser tab group.
 */
export function focusTabGroup(
  browserGroupId: number,
  timeoutMs = 5000
): Promise<FocusTabGroupResult> {
  if (typeof window === 'undefined') {
    return Promise.resolve({ ok: false, error: 'Window is not defined' });
  }

  return new Promise((resolve) => {
    const requestId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = (): void => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      window.removeEventListener('message', onMessage);
    };

    const onMessage = (event: MessageEvent): void => {
      const isAllowedOrigin =
        event.origin === window.location.origin ||
        (process.env['NODE_ENV'] === 'test' && event.origin === '');
      if (!isAllowedOrigin) {
        return;
      }

      const data = event.data;
      if (
        data &&
        typeof data === 'object' &&
        data.source === 'underscore-extension' &&
        data.type === 'EXTENSION_FOCUS_TAB_GROUP_RESPONSE' &&
        data.requestId === requestId
      ) {
        cleanup();
        resolve({
          ok: Boolean(data.ok),
          error: data.error,
        });
      }
    };

    window.addEventListener('message', onMessage);

    timer = setTimeout(() => {
      cleanup();
      resolve({ ok: false, error: 'Extension bridge timed out' });
    }, timeoutMs);

    window.postMessage(
      {
        source: 'underscore-web',
        type: 'EXTENSION_FOCUS_TAB_GROUP',
        requestId,
        payload: {
          browserGroupId,
        },
      },
      window.location.origin
    );
  });
}
