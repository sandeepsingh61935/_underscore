import { renderHook, act } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { useHighlightDelete } from '@/features/collections/hooks/use-highlight-delete';
import { MessageBusProvider } from '@/shared/contexts/MessageBusContext';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import {
  IPC_HIGHLIGHT_DELETE_SCOPE,
  IPC_HIGHLIGHT_UNDO_DELETE,
} from '@/shared/schemas/message-schemas';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { toast } from 'sonner';

function makeBus(handler: (type: string) => Promise<unknown>): IMessageBus {
  return {
    send: vi.fn(async (_target, message: { type: string }) =>
      handler(message.type)
    ) as IMessageBus['send'],
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

describe('useHighlightDelete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('chrome', {
      runtime: {
        id: 'test-extension',
        sendMessage: vi.fn(),
      },
    });
  });

  it('sends scoped delete IPC for a single highlight', async () => {
    const bus = makeBus(async (type) => {
      if (type === IPC_HIGHLIGHT_DELETE_SCOPE) {
        return {
          success: true,
          data: { success: true, deletedCount: 1, removedIds: ['h-1'] },
        };
      }
      return { success: false, error: 'unexpected' };
    });

    const { result } = renderHook(() => useHighlightDelete(), { wrapper: wrap(bus) });

    await act(async () => {
      await result.current.deleteScope({ scope: 'highlight', id: 'h-1' });
    });

    expect(bus.send).toHaveBeenCalledWith('background', {
      type: IPC_HIGHLIGHT_DELETE_SCOPE,
      payload: { scope: 'highlight', id: 'h-1' },
      timestamp: expect.any(Number),
    });
    expect(toast.success).toHaveBeenCalledWith(
      'Highlight deleted',
      expect.objectContaining({
        action: expect.objectContaining({ label: 'Undo' }),
      })
    );
  });

  it('sends undo IPC and shows success toast when undo succeeds', async () => {
    const bus = makeBus(async (type) => {
      if (type === IPC_HIGHLIGHT_UNDO_DELETE) {
        return {
          success: true,
          data: { success: true, deletedCount: 0, restoredIds: ['h-1'] },
        };
      }
      return { success: true, data: { success: true, deletedCount: 1 } };
    });

    const { result } = renderHook(() => useHighlightDelete(), { wrapper: wrap(bus) });

    await act(async () => {
      const ok = await result.current.undoLastDelete();
      expect(ok).toBe(true);
    });

    expect(bus.send).toHaveBeenCalledWith('background', {
      type: IPC_HIGHLIGHT_UNDO_DELETE,
      payload: {},
      timestamp: expect.any(Number),
    });
    expect(toast.success).toHaveBeenCalledWith('Highlight restored');
  });

  it('shows error toast when undo window has expired', async () => {
    const bus = makeBus(async () => ({
      success: true,
      data: { success: false, code: 'NOT_FOUND', error: 'Nothing to undo' },
    }));

    const { result } = renderHook(() => useHighlightDelete(), { wrapper: wrap(bus) });

    await act(async () => {
      const ok = await result.current.undoLastDelete();
      expect(ok).toBe(false);
    });

    expect(toast.error).toHaveBeenCalledWith('Nothing to undo');
  });
});
