/**
 * Minimal presence beacon for the web install gate.
 * Runs at document_start. Signals via:
 * 1) documentElement attribute (shared DOM)
 * 2) window.postMessage (page JS can hear content-script posts)
 */
import { browser } from 'wxt/browser';
import { z } from 'zod';

import {
  isWebAppOrigin,
  WEB_APP_ORIGIN_MATCHES,
} from '@/shared/extension/web-app-origin-matches';
import {
  GROUP_OPEN_IN_BROWSER,
  GroupOpenInBrowserPayloadSchema,
  EXTENSION_GET_BROWSER_TAB_GROUPS,
  EXTENSION_FOCUS_TAB_GROUP,
  ExtensionFocusTabGroupPayloadSchema,
} from '@/shared/schemas/message-schemas';

const ATTR = 'data-underscore-ext';
const MSG_SOURCE = 'underscore-extension';
const WEB_SOURCE = 'underscore-web';

export const WebGroupOpenInBrowserMessageSchema = z.object({
  source: z.literal(WEB_SOURCE),
  type: z.literal(GROUP_OPEN_IN_BROWSER),
  requestId: z.string(),
  payload: GroupOpenInBrowserPayloadSchema,
});

export type WebGroupOpenInBrowserMessage = z.infer<
  typeof WebGroupOpenInBrowserMessageSchema
>;

export const WebGetBrowserTabGroupsMessageSchema = z.object({
  source: z.literal(WEB_SOURCE),
  type: z.literal(EXTENSION_GET_BROWSER_TAB_GROUPS),
  requestId: z.string(),
});

export const WebFocusTabGroupMessageSchema = z.object({
  source: z.literal(WEB_SOURCE),
  type: z.literal(EXTENSION_FOCUS_TAB_GROUP),
  requestId: z.string(),
  payload: ExtensionFocusTabGroupPayloadSchema,
});

function versionOf(): string {
  try {
    return browser.runtime.getManifest().version || '1';
  } catch {
    return '1';
  }
}

function announce(version: string): void {
  try {
    document.documentElement.setAttribute(ATTR, version);
  } catch {
    /* ignore */
  }
  try {
    window.postMessage(
      { source: MSG_SOURCE, type: 'EXTENSION_PRESENT', version },
      window.location.origin
    );
  } catch {
    /* ignore */
  }
}

export async function onPageMessage(event: MessageEvent): Promise<void> {
  if (event.source !== window) {
    return;
  }
  if (!isWebAppOrigin(event.origin)) {
    return;
  }
  const data = event.data;
  if (!data || typeof data !== 'object' || data.source !== WEB_SOURCE) {
    return;
  }
  if (
    data.type !== GROUP_OPEN_IN_BROWSER &&
    data.type !== EXTENSION_GET_BROWSER_TAB_GROUPS &&
    data.type !== EXTENSION_FOCUS_TAB_GROUP
  ) {
    return;
  }

  if (data.type === GROUP_OPEN_IN_BROWSER) {
    const parsed = WebGroupOpenInBrowserMessageSchema.safeParse(data);
    if (!parsed.success) {
      if (typeof data.requestId === 'string') {
        try {
          window.postMessage(
            {
              source: MSG_SOURCE,
              type: 'GROUP_OPEN_IN_BROWSER_RESPONSE',
              requestId: data.requestId,
              ok: false,
              error: 'Invalid open in browser payload',
            },
            window.location.origin
          );
        } catch {
          /* ignore */
        }
      }
      return;
    }

    const validMessage = parsed.data;
    try {
      const response: any = await browser.runtime.sendMessage({
        type: GROUP_OPEN_IN_BROWSER,
        payload: validMessage.payload,
        timestamp: Date.now(),
      });

      window.postMessage(
        {
          source: MSG_SOURCE,
          type: 'GROUP_OPEN_IN_BROWSER_RESPONSE',
          requestId: validMessage.requestId,
          ok: response?.success ? (response.data?.ok ?? true) : false,
          needsConfirm: response?.data?.needsConfirm,
          tabCount: response?.data?.tabCount,
          browserGroupId: response?.data?.browserGroupId,
          error: response?.success
            ? response.data?.error
            : (response?.error ?? 'Extension failed to open group'),
        },
        window.location.origin
      );
    } catch (err) {
      window.postMessage(
        {
          source: MSG_SOURCE,
          type: 'GROUP_OPEN_IN_BROWSER_RESPONSE',
          requestId: validMessage.requestId,
          ok: false,
          error:
            err instanceof Error ? err.message : 'Extension failed to open group',
        },
        window.location.origin
      );
    }
    return;
  }

  if (data.type === EXTENSION_GET_BROWSER_TAB_GROUPS) {
    const parsed = WebGetBrowserTabGroupsMessageSchema.safeParse(data);
    if (!parsed.success) {
      if (typeof data.requestId === 'string') {
        try {
          window.postMessage(
            {
              source: MSG_SOURCE,
              type: 'EXTENSION_GET_BROWSER_TAB_GROUPS_RESPONSE',
              requestId: data.requestId,
              ok: false,
              error: 'Invalid get browser tab groups payload',
            },
            window.location.origin
          );
        } catch {
          /* ignore */
        }
      }
      return;
    }

    const validMessage = parsed.data;
    try {
      const response: any = await browser.runtime.sendMessage({
        type: EXTENSION_GET_BROWSER_TAB_GROUPS,
        payload: {},
        timestamp: Date.now(),
      });

      window.postMessage(
        {
          source: MSG_SOURCE,
          type: 'EXTENSION_GET_BROWSER_TAB_GROUPS_RESPONSE',
          requestId: validMessage.requestId,
          ok: response?.success ? (response.data?.ok ?? true) : false,
          groups: response?.data?.groups,
          error: response?.success
            ? response.data?.error
            : (response?.error ?? 'Extension failed to get browser tab groups'),
        },
        window.location.origin
      );
    } catch (err) {
      window.postMessage(
        {
          source: MSG_SOURCE,
          type: 'EXTENSION_GET_BROWSER_TAB_GROUPS_RESPONSE',
          requestId: validMessage.requestId,
          ok: false,
          error:
            err instanceof Error
              ? err.message
              : 'Extension failed to get browser tab groups',
        },
        window.location.origin
      );
    }
    return;
  }

  if (data.type === EXTENSION_FOCUS_TAB_GROUP) {
    const parsed = WebFocusTabGroupMessageSchema.safeParse(data);
    if (!parsed.success) {
      if (typeof data.requestId === 'string') {
        try {
          window.postMessage(
            {
              source: MSG_SOURCE,
              type: 'EXTENSION_FOCUS_TAB_GROUP_RESPONSE',
              requestId: data.requestId,
              ok: false,
              error: 'Invalid focus tab group payload',
            },
            window.location.origin
          );
        } catch {
          /* ignore */
        }
      }
      return;
    }

    const validMessage = parsed.data;
    try {
      const response: any = await browser.runtime.sendMessage({
        type: EXTENSION_FOCUS_TAB_GROUP,
        payload: validMessage.payload,
        timestamp: Date.now(),
      });

      window.postMessage(
        {
          source: MSG_SOURCE,
          type: 'EXTENSION_FOCUS_TAB_GROUP_RESPONSE',
          requestId: validMessage.requestId,
          ok: response?.success ? (response.data?.ok ?? true) : false,
          error: response?.success
            ? response.data?.error
            : (response?.error ?? 'Extension failed to focus tab group'),
        },
        window.location.origin
      );
    } catch (err) {
      window.postMessage(
        {
          source: MSG_SOURCE,
          type: 'EXTENSION_FOCUS_TAB_GROUP_RESPONSE',
          requestId: validMessage.requestId,
          ok: false,
          error:
            err instanceof Error
              ? err.message
              : 'Extension failed to focus tab group',
        },
        window.location.origin
      );
    }
    return;
  }
}

const defineScript =
  typeof defineContentScript !== 'undefined'
    ? defineContentScript
    : <T>(def: T): T => def;

export default defineScript({
  matches: [...WEB_APP_ORIGIN_MATCHES],
  runAt: 'document_start',
  world: 'ISOLATED',
  main() {
    const version = versionOf();
    announce(version);
    // SPA navigations keep the document; re-announce on visibility for stubborn cases.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        announce(version);
      }
    });
    // Late listeners on the page
    window.setTimeout(() => announce(version), 0);
    window.setTimeout(() => announce(version), 250);

    window.addEventListener('message', (event) => {
      void onPageMessage(event);
    });
  },
});

