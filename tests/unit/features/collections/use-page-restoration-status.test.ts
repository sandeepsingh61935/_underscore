import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePageRestorationStatus } from '@/features/collections/hooks/usePageRestorationStatus';
import {
  PAGE_RESTORATION_STATUS,
  GET_RESTORATION_STATUS,
  REANCHOR_HIGHLIGHT,
  CHECK_PAGE_SELECTION,
} from '@/shared/schemas/message-schemas';

describe('usePageRestorationStatus', () => {
  let messageListeners: Array<(message: any) => void> = [];

  beforeEach(() => {
    messageListeners = [];

    // Mock chrome / browser API
    (globalThis as any).chrome = {
      tabs: {
        query: vi.fn().mockImplementation((_query, callback) => {
          callback([{ id: 123, url: 'https://example.com/article' }]);
        }),
        sendMessage: vi.fn().mockImplementation((_tabId: unknown, _message: any, _callback?: any): Promise<any> => {
          const message = _message;
          const callback = _callback;
          if (message.type === GET_RESTORATION_STATUS) {
            const res = {
              success: true,
              data: {
                url: 'https://example.com/article',
                anchoredCount: 1,
                unanchoredIds: ['hl-orphan-1'],
                hasSelection: true,
              },
            };
            if (callback) callback(res);
            return Promise.resolve(res);
          }
          if (message.type === CHECK_PAGE_SELECTION) {
            const res = {
              success: true,
              data: { hasSelection: true },
            };
            if (callback) callback(res);
            return Promise.resolve(res);
          }
          if (message.type === REANCHOR_HIGHLIGHT) {
            const res = {
              success: true,
              data: { highlightId: message.payload.highlightId },
            };
            if (callback) callback(res);
            return Promise.resolve(res);
          }
          const defaultRes = { success: true };
          if (callback) callback(defaultRes);
          return Promise.resolve(defaultRes);
        }),
      },
      runtime: {
        onMessage: {
          addListener: vi.fn().mockImplementation((fn) => {
            messageListeners.push(fn);
          }),
          removeListener: vi.fn().mockImplementation((fn) => {
            messageListeners = messageListeners.filter((l) => l !== fn);
          }),
        },
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as any).chrome;
  });

  it('queries initial restoration status and flags unanchored highlights', async () => {
    const { result } = renderHook(() =>
      usePageRestorationStatus('https://example.com/article')
    );

    // Allow initial query to resolve
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isUnanchored('hl-orphan-1')).toBe(true);
    expect(result.current.isUnanchored('hl-anchored')).toBe(false);
    expect(result.current.unanchoredIds.has('hl-orphan-1')).toBe(true);
    expect(result.current.hasPageSelection).toBe(true);
  });

  it('updates state when receiving PAGE_RESTORATION_STATUS broadcast', async () => {
    const { result } = renderHook(() =>
      usePageRestorationStatus('https://example.com/article')
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isUnanchored('hl-new-orphan')).toBe(false);

    // Broadcast new status
    act(() => {
      for (const listener of messageListeners) {
        listener({
          type: PAGE_RESTORATION_STATUS,
          payload: {
            url: 'https://example.com/article',
            anchoredCount: 2,
            unanchoredIds: ['hl-orphan-1', 'hl-new-orphan'],
          },
        });
      }
    });

    expect(result.current.isUnanchored('hl-new-orphan')).toBe(true);
    expect(result.current.unanchoredCount).toBe(2);
  });

  it('reanchorHighlight sends REANCHOR_HIGHLIGHT message and clears unanchored flag on success', async () => {
    const { result } = renderHook(() =>
      usePageRestorationStatus('https://example.com/article')
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isUnanchored('hl-orphan-1')).toBe(true);

    let success = false;
    await act(async () => {
      success = await result.current.reanchorHighlight('hl-orphan-1');
    });

    expect(success).toBe(true);
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
      123,
      expect.objectContaining({
        type: REANCHOR_HIGHLIGHT,
        payload: { highlightId: 'hl-orphan-1' },
      }),
      expect.any(Function)
    );
    expect(result.current.isUnanchored('hl-orphan-1')).toBe(false);
  });
});
