/**
 * @file extension-bridge.test.ts
 * @description Unit tests for web extension bridge client (Task 3.5).
 * Tests postMessage roundtrip, requestId correlation, origin check, and timeout handling.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  focusTabGroup,
  getBrowserTabGroups,
  openGroupInBrowser,
} from '@/web/lib/extension-bridge';

describe('openGroupInBrowser', () => {
  const validGroupId = '123e4567-e89b-12d3-a456-426614174000';
  let messageListeners: ((event: MessageEvent) => void)[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    messageListeners = [];
  });

  afterEach(() => {
    messageListeners.forEach((l) => window.removeEventListener('message', l));
  });

  it('successful roundtrip with matching requestId', async () => {
    let capturedRequestId: string | null = null;

    const onMessage = (event: MessageEvent) => {
      if (
        event.data?.source === 'underscore-web' &&
        event.data?.type === 'GROUP_OPEN_IN_BROWSER'
      ) {
        capturedRequestId = event.data.requestId;
        window.dispatchEvent(
          new MessageEvent('message', {
            origin: window.location.origin,
            data: {
              source: 'underscore-extension',
              type: 'GROUP_OPEN_IN_BROWSER_RESPONSE',
              requestId: capturedRequestId,
              ok: true,
              browserGroupId: 101,
              tabCount: 3,
            },
          })
        );
      }
    };

    window.addEventListener('message', onMessage);
    messageListeners.push(onMessage);

    const result = await openGroupInBrowser(validGroupId, false, 1000);

    expect(result).toEqual({
      ok: true,
      needsConfirm: undefined,
      tabCount: 3,
      browserGroupId: 101,
      error: undefined,
    });
    expect(capturedRequestId).toBeTruthy();
  });

  it('handles needsConfirm responses correctly', async () => {
    const onMessage = (event: MessageEvent) => {
      if (
        event.data?.source === 'underscore-web' &&
        event.data?.type === 'GROUP_OPEN_IN_BROWSER'
      ) {
        window.dispatchEvent(
          new MessageEvent('message', {
            origin: window.location.origin,
            data: {
              source: 'underscore-extension',
              type: 'GROUP_OPEN_IN_BROWSER_RESPONSE',
              requestId: event.data.requestId,
              ok: false,
              needsConfirm: true,
              tabCount: 25,
            },
          })
        );
      }
    };

    window.addEventListener('message', onMessage);
    messageListeners.push(onMessage);

    const result = await openGroupInBrowser(validGroupId, false, 1000);

    expect(result).toEqual({
      ok: false,
      needsConfirm: true,
      tabCount: 25,
      browserGroupId: undefined,
      error: undefined,
    });
  });

  it('handles timeout when extension does not respond', async () => {
    // We pass a short timeout of 50ms and do not dispatch any response
    const result = await openGroupInBrowser(validGroupId, false, 50);

    expect(result).toEqual({
      ok: false,
      error: 'Extension bridge timed out',
    });
  });

  it('ignores responses with mismatched requestId', async () => {
    let callCount = 0;

    const onMessage = (event: MessageEvent) => {
      if (
        event.data?.source === 'underscore-web' &&
        event.data?.type === 'GROUP_OPEN_IN_BROWSER'
      ) {
        callCount++;
        // Dispatch response with mismatched requestId
        window.dispatchEvent(
          new MessageEvent('message', {
            origin: window.location.origin,
            data: {
              source: 'underscore-extension',
              type: 'GROUP_OPEN_IN_BROWSER_RESPONSE',
              requestId: 'different-request-id',
              ok: true,
            },
          })
        );
      }
    };

    window.addEventListener('message', onMessage);
    messageListeners.push(onMessage);

    const result = await openGroupInBrowser(validGroupId, false, 60);

    expect(callCount).toBe(1);
    // Should time out because the mismatched response was ignored
    expect(result).toEqual({
      ok: false,
      error: 'Extension bridge timed out',
    });
  });

  it('ignores responses from foreign origins', async () => {
    const onMessage = (event: MessageEvent) => {
      if (
        event.data?.source === 'underscore-web' &&
        event.data?.type === 'GROUP_OPEN_IN_BROWSER'
      ) {
        // Dispatch response from malicious foreign origin
        window.dispatchEvent(
          new MessageEvent('message', {
            origin: 'https://malicious.com',
            data: {
              source: 'underscore-extension',
              type: 'GROUP_OPEN_IN_BROWSER_RESPONSE',
              requestId: event.data.requestId,
              ok: true,
            },
          })
        );
      }
    };

    window.addEventListener('message', onMessage);
    messageListeners.push(onMessage);

    const result = await openGroupInBrowser(validGroupId, false, 60);

    // Should time out because the foreign-origin response was discarded
    expect(result).toEqual({
      ok: false,
      error: 'Extension bridge timed out',
    });
  });
});

describe('getBrowserTabGroups', () => {
  let messageListeners: ((event: MessageEvent) => void)[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    messageListeners = [];
  });

  afterEach(() => {
    messageListeners.forEach((l) => window.removeEventListener('message', l));
  });

  it('successful roundtrip with groups list', async () => {
    let capturedRequestId: string | null = null;

    const onMessage = (event: MessageEvent) => {
      if (
        event.data?.source === 'underscore-web' &&
        event.data?.type === 'EXTENSION_GET_BROWSER_TAB_GROUPS'
      ) {
        capturedRequestId = event.data.requestId;
        window.dispatchEvent(
          new MessageEvent('message', {
            origin: window.location.origin,
            data: {
              source: 'underscore-extension',
              type: 'EXTENSION_GET_BROWSER_TAB_GROUPS_RESPONSE',
              requestId: capturedRequestId,
              ok: true,
              groups: [
                {
                  id: 10,
                  title: 'Research',
                  color: 'blue',
                  tabCount: 4,
                  validUrls: ['https://example.com/1', 'https://example.com/2'],
                  skippedCount: 1,
                },
              ],
            },
          })
        );
      }
    };

    window.addEventListener('message', onMessage);
    messageListeners.push(onMessage);

    const result = await getBrowserTabGroups(1000);

    expect(result.ok).toBe(true);
    expect(result.groups).toHaveLength(1);
    expect(result.groups![0]!.title).toBe('Research');
    expect(result.groups![0]!.skippedCount).toBe(1);
    expect(capturedRequestId).toBeTruthy();
  });

  it('handles timeout when extension does not respond', async () => {
    const result = await getBrowserTabGroups(60);
    expect(result).toEqual({
      ok: false,
      error: 'Extension bridge timed out',
    });
  });
});

describe('focusTabGroup', () => {
  let messageListeners: ((event: MessageEvent) => void)[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    messageListeners = [];
  });

  afterEach(() => {
    messageListeners.forEach((l) => window.removeEventListener('message', l));
  });

  it('successful roundtrip when focusing tab group', async () => {
    let capturedPayload: any = null;

    const onMessage = (event: MessageEvent) => {
      if (
        event.data?.source === 'underscore-web' &&
        event.data?.type === 'EXTENSION_FOCUS_TAB_GROUP'
      ) {
        capturedPayload = event.data.payload;
        window.dispatchEvent(
          new MessageEvent('message', {
            origin: window.location.origin,
            data: {
              source: 'underscore-extension',
              type: 'EXTENSION_FOCUS_TAB_GROUP_RESPONSE',
              requestId: event.data.requestId,
              ok: true,
            },
          })
        );
      }
    };

    window.addEventListener('message', onMessage);
    messageListeners.push(onMessage);

    const result = await focusTabGroup(42, 1000);

    expect(result).toEqual({ ok: true, error: undefined });
    expect(capturedPayload).toEqual({ browserGroupId: 42 });
  });

  it('handles error response from extension', async () => {
    const onMessage = (event: MessageEvent) => {
      if (
        event.data?.source === 'underscore-web' &&
        event.data?.type === 'EXTENSION_FOCUS_TAB_GROUP'
      ) {
        window.dispatchEvent(
          new MessageEvent('message', {
            origin: window.location.origin,
            data: {
              source: 'underscore-extension',
              type: 'EXTENSION_FOCUS_TAB_GROUP_RESPONSE',
              requestId: event.data.requestId,
              ok: false,
              error: 'Browser group not found',
            },
          })
        );
      }
    };

    window.addEventListener('message', onMessage);
    messageListeners.push(onMessage);

    const result = await focusTabGroup(99, 1000);

    expect(result).toEqual({ ok: false, error: 'Browser group not found' });
  });
});
