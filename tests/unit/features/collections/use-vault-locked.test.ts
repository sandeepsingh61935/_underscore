import { renderHook, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { useVaultLocked } from '@/features/collections/hooks/use-vault-locked';
import { MessageBusProvider } from '@/shared/contexts/MessageBusContext';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import { GET_VAULT_LOCK_STATUS } from '@/shared/schemas/message-schemas';

function makeBus(vaultLocked: boolean): IMessageBus {
  return {
    send: vi.fn(async (_target, message: { type: string }) => {
      if (message.type === GET_VAULT_LOCK_STATUS) {
        return { success: true, data: { vaultLocked } };
      }
      return { success: false, error: 'unexpected' };
    }) as IMessageBus['send'],
    subscribe: vi.fn(() => () => undefined),
    publish: vi.fn(async () => undefined),
  };
}

function wrap(bus: IMessageBus): ({ children }: { children: ReactNode }) => React.ReactElement {
  return ({ children }: { children: ReactNode }) =>
    React.createElement(MessageBusProvider, { messageBus: bus, children });
}

describe('useVaultLocked', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', {
      runtime: {
        id: 'test-extension',
        sendMessage: vi.fn(),
      },
    });
  });

  it('returns false for guests without querying vault status', async () => {
    const bus = makeBus(true);
    const { result } = renderHook(() => useVaultLocked(false), { wrapper: wrap(bus) });

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
    expect(bus.send).not.toHaveBeenCalled();
  });

  it('returns true when background reports vault is locked', async () => {
    const bus = makeBus(true);
    const { result } = renderHook(() => useVaultLocked(true), { wrapper: wrap(bus) });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });
});
