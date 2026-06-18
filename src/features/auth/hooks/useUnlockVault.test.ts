/**
 * @file useUnlockVault.test.ts
 * @description Tests for useUnlockVault hook (ADR-018).
 *
 * Verifies the user-facing vault unlock surface that wraps KeyManager.unlock()
 * over IPC. The hook tracks vaultStatus (unknown/locked/unlocked) and exposes
 * an async unlock() function that returns ActionResult-style feedback.
 */

import { act, renderHook } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MessageBusProvider } from '@/shared/contexts/MessageBusContext';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';

import { useUnlockVault } from './useUnlockVault';

function makeStubBus(): IMessageBus {
  return {
    send: vi.fn(),
    subscribe: vi.fn(() => () => undefined),
    publish: vi.fn(async () => undefined),
  };
}

function wrap(bus: IMessageBus): ({ children }: { children: ReactNode }) => React.ReactElement {
  return ({ children }: { children: ReactNode }) =>
    React.createElement(MessageBusProvider, { messageBus: bus, children });
}

describe('useUnlockVault', () => {
  let bus: IMessageBus;

  beforeEach(() => {
    bus = makeStubBus();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sends IPC_VAULT_UNLOCK with the passphrase on unlock()', async () => {
    vi.mocked(bus.send).mockResolvedValueOnce({
      success: true,
      data: { keyId: 'user-1_unlocked' },
    });

    const { result } = renderHook(() => useUnlockVault(), { wrapper: wrap(bus) });

    let outcome: { success: boolean; error?: string } | undefined;
    await act(async () => {
      outcome = await result.current.unlock('correct horse battery staple');
    });

    expect(bus.send).toHaveBeenCalledTimes(1);
    const [, message] = vi.mocked(bus.send).mock.calls[0] as [string, { type: string; payload: { passphrase: string } }];
    expect(message.type).toBe('IPC_VAULT_UNLOCK');
    expect(message.payload.passphrase).toBe('correct horse battery staple');
    expect(outcome).toEqual({ success: true });
  });

  it('sets vaultStatus to unlocked after a successful unlock', async () => {
    vi.mocked(bus.send).mockResolvedValueOnce({
      success: true,
      data: { keyId: 'user-1_unlocked' },
    });

    const { result } = renderHook(() => useUnlockVault(), { wrapper: wrap(bus) });

    expect(result.current.vaultStatus).toBe('unknown');

    await act(async () => {
      await result.current.unlock('open-sesame');
    });

    expect(result.current.vaultStatus).toBe('unlocked');
    expect(result.current.isUnlocking).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets vaultStatus to locked and surfaces the error on failure', async () => {
    vi.mocked(bus.send).mockResolvedValueOnce({
      success: false,
      error: 'Incorrect passphrase',
      code: 'INVALID_PASSPHRASE',
    });

    const { result } = renderHook(() => useUnlockVault(), { wrapper: wrap(bus) });

    let outcome: { success: boolean; error?: string } | undefined;
    await act(async () => {
      outcome = await result.current.unlock('wrong');
    });

    expect(result.current.vaultStatus).toBe('locked');
    expect(result.current.error).toBe('Incorrect passphrase');
    expect(outcome).toEqual({ success: false, error: 'Incorrect passphrase' });
  });

  it('exposes isUnlocking=true while the IPC is in flight', async () => {
    let resolveSend: (value: unknown) => void = () => undefined;
    vi.mocked(bus.send).mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveSend = resolve as (value: unknown) => void;
      })
    );

    const { result } = renderHook(() => useUnlockVault(), { wrapper: wrap(bus) });

    let unlockPromise: Promise<{ success: boolean; error?: string }> | undefined;
    act(() => {
      unlockPromise = result.current.unlock('any-pass');
    });

    expect(result.current.isUnlocking).toBe(true);

    await act(async () => {
      resolveSend({ success: true, data: { keyId: 'user-1_unlocked' } });
      if (unlockPromise) await unlockPromise;
    });

    expect(result.current.isUnlocking).toBe(false);
  });

  it('returns vaultStatus=locked when chrome.runtime is unavailable', () => {
    // Save real chrome/restore stub
    const originalChrome = (globalThis as { chrome?: unknown }).chrome;
    Object.defineProperty(globalThis, 'chrome', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    try {
      const { result } = renderHook(() => useUnlockVault(), { wrapper: wrap(bus) });
      expect(result.current.vaultStatus).toBe('locked');
    } finally {
      Object.defineProperty(globalThis, 'chrome', {
        value: originalChrome,
        configurable: true,
        writable: true,
      });
    }
  });
});
