import { renderHook, act } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { MessageBusProvider } from '@/shared/contexts/MessageBusContext';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import { useIpcAction } from '@/shared/hooks/useIpcAction';

function makeStubBus(): IMessageBus {
  return {
    send: vi.fn().mockResolvedValue({ success: true, data: {} }),
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

describe('useIpcAction', () => {
  it('sends an empty object payload when the action has no input', async () => {
    vi.stubGlobal('chrome', {
      runtime: {
        id: 'test-extension',
        sendMessage: vi.fn(),
      },
    });

    const bus = makeStubBus();
    const { result } = renderHook(() => useIpcAction<void, void>('LOGOUT'), {
      wrapper: wrap(bus),
    });

    await act(async () => {
      await result.current(undefined);
    });

    expect(bus.send).toHaveBeenCalledWith('background', {
      type: 'LOGOUT',
      payload: {},
      timestamp: expect.any(Number),
    });

    vi.unstubAllGlobals();
  });
});
