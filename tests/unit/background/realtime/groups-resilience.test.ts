/**
 * @file groups-resilience.test.ts
 * @description Task 2.3: reconnect path for the `groups-sync` channel —
 * connect subscribes both channels + hydrates, online flaps reconnect,
 * and a login/logout race aborts before any channel is created.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketClient } from '@/background/realtime/websocket-client';
import { ConnectionManager } from '@/background/realtime/connection-manager';
import type { IEventBus } from '@/shared/interfaces/i-event-bus';
import type { ILogger } from '@/shared/interfaces/i-logger';
import { EventName } from '@/shared/types/events';

describe('Groups realtime resilience', () => {
  let wsClient: WebSocketClient;
  let connectionManager: ConnectionManager;
  let mockSupabase: any;
  let mockEventBus: any;
  let mockLogger: any;
  let mockHydrate: ReturnType<typeof vi.fn>;
  let networkHandler: (status: { isOnline: boolean }) => void;

  function makeChannel() {
    const channel: any = {
      on: vi.fn(),
      subscribe: vi.fn().mockImplementation((cb: any) => {
        if (cb) cb('SUBSCRIBED');
        channel.state = 'joined';
        return channel;
      }),
      unsubscribe: vi.fn(),
      state: 'closed',
    };
    channel.on.mockReturnValue(channel);
    return channel;
  }

  let highlightsChannel: any;
  let groupsChannel: any;

  beforeEach(() => {
    vi.useFakeTimers();
    highlightsChannel = makeChannel();
    groupsChannel = makeChannel();

    mockSupabase = {
      channel: vi.fn().mockImplementation((name: string) => {
        if (name === 'groups-sync') return groupsChannel;
        return highlightsChannel;
      }),
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: 'fake-token-123' } },
        }),
      },
      realtime: { setAuth: vi.fn() },
    };
    mockEventBus = {
      emit: vi.fn(),
      on: vi.fn().mockImplementation((event, handler) => {
        if (event === EventName.NETWORK_STATUS_CHANGED) {
          networkHandler = handler;
        }
      }),
      off: vi.fn(),
    };
    mockLogger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    mockHydrate = vi.fn().mockResolvedValue({});

    wsClient = new WebSocketClient(
      mockSupabase as any,
      mockEventBus as unknown as IEventBus,
      mockLogger as unknown as ILogger
    );
    connectionManager = new ConnectionManager(
      wsClient,
      mockEventBus as unknown as IEventBus,
      { hydrate: mockHydrate } as never,
      mockLogger as unknown as ILogger
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('connect subscribes the groups channel and hydrates (covers the gap)', async () => {
    await connectionManager.connect('user-1');

    expect(mockSupabase.channel).toHaveBeenCalledWith('groups-sync');
    expect(groupsChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ table: 'page_groups' }),
      expect.any(Function)
    );
    expect(groupsChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ table: 'page_group_items' }),
      expect.any(Function)
    );
    expect(mockHydrate).toHaveBeenCalled();
  });

  it('reconnects the groups channel when the network comes back online', async () => {
    await connectionManager.connect('user-1');
    expect(wsClient.isConnected()).toBe(true);

    // Simulate a socket drop, then an online flap.
    highlightsChannel.state = 'closed';
    groupsChannel.state = 'closed';
    mockSupabase.channel.mockClear();
    mockHydrate.mockClear();

    networkHandler({ isOnline: true });
    await vi.advanceTimersByTimeAsync(0);

    expect(mockSupabase.channel).toHaveBeenCalledWith('groups-sync');
    expect(mockHydrate).toHaveBeenCalled();
  });

  it('aborts the groups subscription on a login/logout race', async () => {
    const connectPromise = connectionManager.connect('user-1');

    // Log out before the session lookup resolves.
    connectionManager.disconnect();
    await connectPromise;

    expect(mockSupabase.channel).not.toHaveBeenCalled();
    expect(wsClient.isConnected()).toBe(false);
  });

  it('logs groups channel errors without throwing', async () => {
    groupsChannel.subscribe.mockImplementation((cb: any) => {
      if (cb) cb('CHANNEL_ERROR', new Error('groups boom'));
      return groupsChannel;
    });

    await wsClient.subscribe('user-1');

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Realtime groups channel error',
      expect.any(Error)
    );
  });
});
