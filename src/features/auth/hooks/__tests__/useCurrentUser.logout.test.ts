/**
 * @file useCurrentUser.logout.test.ts
 * @description Logout must clear session only when background confirms sign-out.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { AUTH_SESSION_CLEARED, AUTH_STATE_CHANGED } from '@/shared/auth/constants';
import { MessageBusProvider } from '@/shared/contexts/MessageBusContext';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';

const signedInUser = {
  id: 'user-1',
  email: 'reader@example.com',
  displayName: 'Reader',
};

function makeStubBus(): IMessageBus {
  return {
    send: vi.fn(),
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

describe('useCurrentUser logout', () => {
  let bus: IMessageBus;
  let messageListener: ((message: unknown) => void) | undefined;

  beforeEach(() => {
    bus = makeStubBus();
    messageListener = undefined;

    vi.stubGlobal('chrome', {
      runtime: {
        id: 'test-extension',
        sendMessage: vi.fn(),
        onMessage: {
          addListener: vi.fn((listener: (message: unknown) => void) => {
            messageListener = listener;
          }),
          removeListener: vi.fn(),
        },
      },
    });

    vi.mocked(bus.send).mockImplementation(async (_target, message) => {
      if (message.type === 'GET_AUTH_STATE') {
        return {
          success: true,
          data: {
            isAuthenticated: true,
            user: signedInUser,
            provider: 'google',
            lastAuthTime: null,
            verificationStatus: 'idle',
            verificationExpiresAt: null,
          },
        };
      }
      return { success: false, error: 'Unexpected IPC' };
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('keeps the user when LOGOUT IPC fails', async () => {
    vi.mocked(bus.send).mockImplementation(async (_target, message) => {
      if (message.type === 'GET_AUTH_STATE') {
        return {
          success: true,
          data: {
            isAuthenticated: true,
            user: signedInUser,
            provider: 'google',
            lastAuthTime: null,
            verificationStatus: 'idle',
            verificationExpiresAt: null,
          },
        };
      }
      if (message.type === 'LOGOUT') {
        return { success: false, error: 'Background unavailable' };
      }
      return { success: false, error: 'Unexpected IPC' };
    });

    const { result } = renderHook(() => useCurrentUser(), { wrapper: wrap(bus) });

    await waitFor(() => {
      expect(result.current.user?.email).toBe('reader@example.com');
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user?.email).toBe('reader@example.com');
    expect(result.current.error).toBe('Background unavailable');
  });

  it('clears the user when LOGOUT IPC succeeds', async () => {
    vi.mocked(bus.send).mockImplementation(async (_target, message) => {
      if (message.type === 'GET_AUTH_STATE') {
        return {
          success: true,
          data: {
            isAuthenticated: true,
            user: signedInUser,
            provider: 'google',
            lastAuthTime: null,
            verificationStatus: 'idle',
            verificationExpiresAt: null,
          },
        };
      }
      if (message.type === 'LOGOUT') {
        return {
          success: true,
          data: {
            isAuthenticated: false,
            user: null,
            provider: null,
            lastAuthTime: null,
            verificationStatus: 'idle',
            verificationExpiresAt: null,
          },
        };
      }
      return { success: false, error: 'Unexpected IPC' };
    });

    const { result } = renderHook(() => useCurrentUser(), { wrapper: wrap(bus) });

    await waitFor(() => {
      expect(result.current.user?.email).toBe('reader@example.com');
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
  });

  it('clears the user when AUTH_SESSION_CLEARED is broadcast', async () => {
    const { result } = renderHook(() => useCurrentUser(), { wrapper: wrap(bus) });

    await waitFor(() => {
      expect(result.current.user?.email).toBe('reader@example.com');
    });

    act(() => {
      messageListener?.({
        type: AUTH_SESSION_CLEARED,
        timestamp: Date.now(),
      });
    });

    expect(result.current.user).toBeNull();
  });

  it('clears the user when AUTH_STATE_CHANGED reports signed out', async () => {
    const { result } = renderHook(() => useCurrentUser(), { wrapper: wrap(bus) });

    await waitFor(() => {
      expect(result.current.user?.email).toBe('reader@example.com');
    });

    act(() => {
      messageListener?.({
        type: AUTH_STATE_CHANGED,
        payload: {
          isAuthenticated: false,
          user: null,
          provider: null,
          lastAuthTime: null,
          verificationStatus: 'idle',
          verificationExpiresAt: null,
        },
        timestamp: Date.now(),
      });
    });

    expect(result.current.user).toBeNull();
  });
});
