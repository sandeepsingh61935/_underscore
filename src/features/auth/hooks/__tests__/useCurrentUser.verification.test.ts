/**
 * @file useCurrentUser.verification.test.ts
 * @description registerWithEmail must surface verificationStatus synchronously
 * and verificationEmail must persist through GET_AUTH_STATE / AUTH_STATE_CHANGED
 * so a reopened popup can resend an OTP without an empty email.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { MessageBusProvider } from '@/shared/contexts/MessageBusContext';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';

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

describe('useCurrentUser verification state', () => {
  let bus: IMessageBus;

  beforeEach(() => {
    bus = makeStubBus();

    vi.stubGlobal('chrome', {
      runtime: {
        id: 'test-extension',
        sendMessage: vi.fn(),
        onMessage: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
    });

    vi.mocked(bus.send).mockImplementation(async (_target, message) => {
      if (message.type === 'GET_AUTH_STATE') {
        return {
          success: true,
          data: {
            isAuthenticated: false,
            user: null,
            provider: null,
            lastAuthTime: null,
            verificationStatus: 'idle',
            verificationExpiresAt: null,
            verificationEmail: null,
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

  it('returns verificationStatus from registerWithEmail and persists the email', async () => {
    vi.mocked(bus.send).mockImplementation(async (_target, message) => {
      if (message.type === 'GET_AUTH_STATE') {
        return {
          success: true,
          data: {
            isAuthenticated: false,
            user: null,
            provider: null,
            lastAuthTime: null,
            verificationStatus: 'idle',
            verificationExpiresAt: null,
            verificationEmail: null,
          },
        };
      }
      if (message.type === 'REGISTER_EMAIL') {
        return {
          success: true,
          data: {
            isAuthenticated: false,
            user: null,
            provider: null,
            lastAuthTime: null,
            verificationStatus: 'awaiting',
            verificationExpiresAt: Date.now() + 600_000,
            verificationEmail: 'new@example.com',
          },
        };
      }
      return { success: false, error: 'Unexpected IPC' };
    });

    const { result } = renderHook(() => useCurrentUser(), { wrapper: wrap(bus) });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let registerResult: { success: boolean; verificationStatus?: string } | undefined;
    await act(async () => {
      registerResult = await result.current.registerWithEmail(
        'new@example.com',
        'password123'
      );
    });

    expect(registerResult?.verificationStatus).toBe('awaiting');
    expect(result.current.verificationEmail).toBe('new@example.com');
  });

  it('restores verificationEmail from GET_AUTH_STATE on mount (popup reopen)', async () => {
    vi.mocked(bus.send).mockImplementation(async (_target, message) => {
      if (message.type === 'GET_AUTH_STATE') {
        return {
          success: true,
          data: {
            isAuthenticated: false,
            user: null,
            provider: null,
            lastAuthTime: null,
            verificationStatus: 'awaiting',
            verificationExpiresAt: Date.now() + 600_000,
            verificationEmail: 'reopened@example.com',
          },
        };
      }
      return { success: false, error: 'Unexpected IPC' };
    });

    const { result } = renderHook(() => useCurrentUser(), { wrapper: wrap(bus) });

    await waitFor(() => {
      expect(result.current.verificationStatus).toBe('awaiting');
    });

    expect(result.current.verificationEmail).toBe('reopened@example.com');
  });
});
