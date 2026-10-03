/**
 * @file presence-content.test.ts
 * @description Unit tests for presence content script postMessage bridge (Task 3.5).
 * Tests origin checking, source checking, schema validation, relay to browser.runtime.sendMessage,
 * and posting response back to window.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockSendMessage = vi.fn();

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      getManifest: () => ({ version: '1.0.0' }),
      sendMessage: (...args: unknown[]) => mockSendMessage(...args),
    },
  },
}));

import { onPageMessage } from '@/entrypoints/presence.content';

describe('presence.content onPageMessage bridge', () => {
  let postMessageSpy: ReturnType<typeof vi.spyOn>;
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';
  const targetOrigin = window.location.origin;

  beforeEach(() => {
    vi.clearAllMocks();
    postMessageSpy = vi.spyOn(window, 'postMessage').mockImplementation(() => {});
  });

  afterEach(() => {
    postMessageSpy.mockRestore();
  });

  it('discards messages where event.source is not window', async () => {
    const fakeOtherWindow = {} as Window;
    const event = new MessageEvent('message', {
      source: fakeOtherWindow,
      origin: targetOrigin,
      data: {
        source: 'underscore-web',
        type: 'GROUP_OPEN_IN_BROWSER',
        requestId: 'req-1',
        payload: { groupId: validUuid },
      },
    });

    await onPageMessage(event);

    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  it('discards messages from foreign or untrusted origins', async () => {
    const event = new MessageEvent('message', {
      source: window,
      origin: 'https://malicious.com',
      data: {
        source: 'underscore-web',
        type: 'GROUP_OPEN_IN_BROWSER',
        requestId: 'req-1',
        payload: { groupId: validUuid },
      },
    });

    await onPageMessage(event);

    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  it('discards messages with unknown type', async () => {
    const event = new MessageEvent('message', {
      source: window,
      origin: targetOrigin,
      data: {
        source: 'underscore-web',
        type: 'UNKNOWN_TYPE',
        requestId: 'req-1',
        payload: { groupId: validUuid },
      },
    });

    await onPageMessage(event);

    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  it('discards messages where source is not underscore-web', async () => {
    const event = new MessageEvent('message', {
      source: window,
      origin: targetOrigin,
      data: {
        source: 'some-other-app',
        type: 'GROUP_OPEN_IN_BROWSER',
        requestId: 'req-1',
        payload: { groupId: validUuid },
      },
    });

    await onPageMessage(event);

    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  it('replies with error when payload schema validation fails', async () => {
    const event = new MessageEvent('message', {
      source: window,
      origin: targetOrigin,
      data: {
        source: 'underscore-web',
        type: 'GROUP_OPEN_IN_BROWSER',
        requestId: 'req-invalid',
        payload: { groupId: 'not-a-uuid' },
      },
    });

    await onPageMessage(event);

    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'underscore-extension',
        type: 'GROUP_OPEN_IN_BROWSER_RESPONSE',
        requestId: 'req-invalid',
        ok: false,
        error: 'Invalid open in browser payload',
      }),
      targetOrigin
    );
  });

  it('relays valid GROUP_OPEN_IN_BROWSER message to background and posts response back', async () => {
    mockSendMessage.mockResolvedValueOnce({
      success: true,
      data: { ok: true, browserGroupId: 42, tabCount: 5 },
    });

    const event = new MessageEvent('message', {
      source: window,
      origin: targetOrigin,
      data: {
        source: 'underscore-web',
        type: 'GROUP_OPEN_IN_BROWSER',
        requestId: 'req-valid',
        payload: { groupId: validUuid, force: false },
      },
    });

    await onPageMessage(event);

    expect(mockSendMessage).toHaveBeenCalledWith({
      type: 'GROUP_OPEN_IN_BROWSER',
      payload: { groupId: validUuid, force: false },
      timestamp: expect.any(Number),
    });

    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        source: 'underscore-extension',
        type: 'GROUP_OPEN_IN_BROWSER_RESPONSE',
        requestId: 'req-valid',
        ok: true,
        needsConfirm: undefined,
        tabCount: 5,
        browserGroupId: 42,
        error: undefined,
      },
      targetOrigin
    );
  });

  it('posts response with needsConfirm when background reports confirmation needed', async () => {
    mockSendMessage.mockResolvedValueOnce({
      success: true,
      data: { ok: false, needsConfirm: true, tabCount: 20 },
    });

    const event = new MessageEvent('message', {
      source: window,
      origin: targetOrigin,
      data: {
        source: 'underscore-web',
        type: 'GROUP_OPEN_IN_BROWSER',
        requestId: 'req-confirm',
        payload: { groupId: validUuid },
      },
    });

    await onPageMessage(event);

    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        source: 'underscore-extension',
        type: 'GROUP_OPEN_IN_BROWSER_RESPONSE',
        requestId: 'req-confirm',
        ok: false,
        needsConfirm: true,
        tabCount: 20,
        browserGroupId: undefined,
        error: undefined,
      },
      targetOrigin
    );
  });

  it('posts response with error when background sendMessage throws', async () => {
    mockSendMessage.mockRejectedValueOnce(new Error('Extension context invalidated'));

    const event = new MessageEvent('message', {
      source: window,
      origin: targetOrigin,
      data: {
        source: 'underscore-web',
        type: 'GROUP_OPEN_IN_BROWSER',
        requestId: 'req-error',
        payload: { groupId: validUuid },
      },
    });

    await onPageMessage(event);

    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        source: 'underscore-extension',
        type: 'GROUP_OPEN_IN_BROWSER_RESPONSE',
        requestId: 'req-error',
        ok: false,
        error: 'Extension context invalidated',
      },
      targetOrigin
    );
  });

  it('relays valid EXTENSION_GET_BROWSER_TAB_GROUPS message to background and posts response back', async () => {
    mockSendMessage.mockResolvedValueOnce({
      success: true,
      data: {
        ok: true,
        groups: [
          {
            id: 1,
            title: 'Tabs',
            color: 'blue',
            tabCount: 2,
            validUrls: ['https://example.com'],
            skippedCount: 0,
          },
        ],
      },
    });

    const event = new MessageEvent('message', {
      source: window,
      origin: targetOrigin,
      data: {
        source: 'underscore-web',
        type: 'EXTENSION_GET_BROWSER_TAB_GROUPS',
        requestId: 'req-get-groups',
      },
    });

    await onPageMessage(event);

    expect(mockSendMessage).toHaveBeenCalledWith({
      type: 'EXTENSION_GET_BROWSER_TAB_GROUPS',
      payload: {},
      timestamp: expect.any(Number),
    });

    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        source: 'underscore-extension',
        type: 'EXTENSION_GET_BROWSER_TAB_GROUPS_RESPONSE',
        requestId: 'req-get-groups',
        ok: true,
        groups: [
          {
            id: 1,
            title: 'Tabs',
            color: 'blue',
            tabCount: 2,
            validUrls: ['https://example.com'],
            skippedCount: 0,
          },
        ],
        error: undefined,
      },
      targetOrigin
    );
  });

  it('relays valid EXTENSION_FOCUS_TAB_GROUP message to background and posts response back', async () => {
    mockSendMessage.mockResolvedValueOnce({
      success: true,
      data: { ok: true },
    });

    const event = new MessageEvent('message', {
      source: window,
      origin: targetOrigin,
      data: {
        source: 'underscore-web',
        type: 'EXTENSION_FOCUS_TAB_GROUP',
        requestId: 'req-focus',
        payload: { browserGroupId: 12 },
      },
    });

    await onPageMessage(event);

    expect(mockSendMessage).toHaveBeenCalledWith({
      type: 'EXTENSION_FOCUS_TAB_GROUP',
      payload: { browserGroupId: 12 },
      timestamp: expect.any(Number),
    });

    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        source: 'underscore-extension',
        type: 'EXTENSION_FOCUS_TAB_GROUP_RESPONSE',
        requestId: 'req-focus',
        ok: true,
        error: undefined,
      },
      targetOrigin
    );
  });
});
