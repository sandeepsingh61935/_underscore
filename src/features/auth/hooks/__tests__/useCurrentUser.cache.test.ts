/**
 * @file useCurrentUser.cache.test.ts
 * @description Popup must paint instantly from cached auth state (NO TTL)
 * instead of blocking on SW wake + full bootstrap before GET_AUTH_STATE.
 * First render already shows the cached user with isLoading=false,
 * then live GET_AUTH_STATE reconciles in the background.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { MessageBusProvider } from '@/shared/contexts/MessageBusContext';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';

const CACHED_USER = {
  id: 'user-1',
  email: 'sandeep@example.com',
  displayName: 'Sandeep',
};

function seedPopupAuthCache(): void {
  window.localStorage.setItem(
    'auth_cached_state',
    JSON.stringify({
      user: CACHED_USER,
      verificationStatus: 'idle',
      verificationExpiresAt: null,
      verificationEmail: null,
    })
  );
}

function makeStubBus(delayMs = 0): IMessageBus {
  return {
    send: vi.fn().mockImplementation(async (_target, message) => {
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      if ((message as { type?: string }).type === 'GET_AUTH_STATE') {
        return {
          success: true,
          data: {
            isAuthenticated: true,
            user: CACHED_USER,
            provider: 'google',
            lastAuthTime: new Date().toISOString(),
            verificationStatus: 'idle',
            verificationExpiresAt: null,
            verificationEmail: null,
          },
        };
      }
      return { success: false, error: 'Unexpected IPC' };
    }),
    subscribe: vi.fn(() => () => undefined),
    publish: vi.fn(async () => undefined),
  };
}

function wrap(
  bus: IMessageBus
): ({ children }: { children: ReactNode }) => React.ReactElement {
  return ({ children }: { children: ReactNode }) =>
    React.createElement(MessageBusProvider, { messageBus: bus, children });
}

describe('useCurrentUser cached instant paint', () => {
  beforeEach(() => {
    window.localStorage.clear();

    vi.stubGlobal('chrome', {
      runtime: {
        id: 'test-extension',
        sendMessage: vi.fn(),
        onMessage: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
      storage: {
        session: { get: vi.fn().mockResolvedValue({}), set: vi.fn() },
        local: { get: vi.fn().mockResolvedValue({}), set: vi.fn() },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('first render already shows cached user with isLoading=false (no IPC wait)', () => {
    seedPopupAuthCache();
    const bus = makeStubBus(50);

    const { result } = renderHook(() => useCurrentUser(), { wrapper: wrap(bus) });

    expect(result.current.user).toEqual(CACHED_USER);
    expect(result.current.isLoading).toBe(false);
  });

  it('without cache preserves existing behavior (loading then live state)', async () => {
    const bus = makeStubBus();

    const { result } = renderHook(() => useCurrentUser(), { wrapper: wrap(bus) });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.user).toEqual(CACHED_USER);
  });

  it('persists live auth payload to the popup mirror for next open', async () => {
    const bus = makeStubBus();

    const { result } = renderHook(() => useCurrentUser(), { wrapper: wrap(bus) });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await Promise.resolve();
    });

    const raw = window.localStorage.getItem('auth_cached_state');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw as string).user).toEqual(CACHED_USER);
  });
});
