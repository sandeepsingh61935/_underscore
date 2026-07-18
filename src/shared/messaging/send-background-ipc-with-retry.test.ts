import { describe, it, expect, vi } from 'vitest';
import { sendBackgroundIpcWithRetry } from './send-background-ipc-with-retry';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';

describe('sendBackgroundIpcWithRetry', () => {
  it('returns on first success', async () => {
    const bus = {
      send: vi.fn().mockResolvedValue({ success: true, data: [1] }),
      subscribe: vi.fn(),
      publish: vi.fn(),
    } as unknown as IMessageBus;

    const res = await sendBackgroundIpcWithRetry(bus, {
      type: 'TEST',
      payload: {},
      timestamp: Date.now(),
    });

    expect(res).toEqual({ success: true, data: [1] });
    expect(bus.send).toHaveBeenCalledTimes(1);
  });

  it('retries after failure then succeeds', async () => {
    let n = 0;
    const bus = {
      send: vi.fn(async () => {
        n += 1;
        if (n === 1) throw new Error('Receiving end does not exist');
        return { success: true, data: [] };
      }),
      subscribe: vi.fn(),
      publish: vi.fn(),
    } as unknown as IMessageBus;

    const res = await sendBackgroundIpcWithRetry(bus, {
      type: 'TEST',
      payload: {},
      timestamp: Date.now(),
    });

    expect(n).toBeGreaterThanOrEqual(2);
    expect(res).toEqual({ success: true, data: [] });
  });

  it('throws when exhausted with onExhausted throw', async () => {
    const bus = {
      send: vi.fn().mockRejectedValue(new Error('down')),
      subscribe: vi.fn(),
      publish: vi.fn(),
    } as unknown as IMessageBus;

    await expect(
      sendBackgroundIpcWithRetry(
        bus,
        { type: 'TEST', payload: {}, timestamp: Date.now() },
        { onExhausted: 'throw', maxAttempts: 2, retryDelaysMs: [0, 0] }
      )
    ).rejects.toThrow(/down/);
  });

  it('logs and resolves when exhausted with onExhausted log', async () => {
    const onLog = vi.fn();
    const bus = {
      send: vi.fn().mockRejectedValue(new Error('down')),
      subscribe: vi.fn(),
      publish: vi.fn(),
    } as unknown as IMessageBus;

    const res = await sendBackgroundIpcWithRetry(
      bus,
      { type: 'TEST', payload: {}, timestamp: Date.now() },
      {
        onExhausted: 'log',
        onLogExhausted: onLog,
        maxAttempts: 2,
        retryDelaysMs: [0, 0],
      }
    );

    expect(res).toBeUndefined();
    expect(onLog).toHaveBeenCalled();
  });
});
