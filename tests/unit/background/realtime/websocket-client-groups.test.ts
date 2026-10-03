/**
 * @file websocket-client-groups.test.ts
 * @description Task 2.3: `groups-sync` second channel — both group tables
 * owner-filtered, event emission per table/event, malformed-payload safety.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebSocketClient } from '@/background/realtime/websocket-client';
import type { IEventBus } from '@/shared/interfaces/i-event-bus';
import type { ILogger } from '@/shared/interfaces/i-logger';
import { EventName } from '@/shared/types/events';

function makeChannel() {
  const channel: any = {
    on: vi.fn(),
    subscribe: vi.fn().mockImplementation((cb: any) => {
      if (cb) cb('SUBSCRIBED');
      return channel;
    }),
    unsubscribe: vi.fn(),
    state: 'joined',
  };
  channel.on.mockReturnValue(channel);
  return channel;
}

describe('WebSocketClient groups-sync channel', () => {
  let wsClient: WebSocketClient;
  let mockSupabase: any;
  let mockEventBus: any;
  let mockLogger: any;
  let highlightsChannel: any;
  let groupsChannel: any;

  beforeEach(() => {
    highlightsChannel = makeChannel();
    groupsChannel = makeChannel();
    mockSupabase = {
      channel: vi.fn().mockImplementation((name: string) => {
        const ch = name === 'groups-sync' ? groupsChannel : highlightsChannel;
        ch.state = 'joined';
        return ch;
      }),
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: 'fake-token-123' } },
        }),
      },
      realtime: { setAuth: vi.fn() },
    };
    mockEventBus = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };
    mockLogger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    wsClient = new WebSocketClient(
      mockSupabase as any,
      mockEventBus as unknown as IEventBus,
      mockLogger as unknown as ILogger
    );
  });

  function groupHandlers(): Array<{ filter: Record<string, string>; handler: (p: any) => void }> {
    return groupsChannel.on.mock.calls.map((call: any[]) => ({
      filter: call[1],
      handler: call[2],
    }));
  }

  it('subscribes groups-sync with both tables filtered by user_id', async () => {
    await wsClient.subscribe('user-9');

    expect(mockSupabase.channel).toHaveBeenCalledWith('groups-sync');
    const tables = groupHandlers().map((h) => (h.filter as any).table);
    expect(tables).toEqual(['page_groups', 'page_group_items']);
    for (const h of groupHandlers()) {
      expect((h.filter as any).filter).toBe('user_id=eq.user-9');
    }
  });

  it('emits REMOTE_GROUP_CREATED on page_groups INSERT', async () => {
    await wsClient.subscribe('user-9');
    const handler = groupHandlers()[0]!.handler;
    const row = { id: 'g-1', name: 'Work', deleted_at: null };

    handler({ eventType: 'INSERT', new: row, table: 'page_groups' });

    expect(mockEventBus.emit).toHaveBeenCalledWith(EventName.REMOTE_GROUP_CREATED, row);
  });

  it('emits REMOTE_GROUP_DELETED on page_groups UPDATE with deleted_at', async () => {
    await wsClient.subscribe('user-9');
    const handler = groupHandlers()[0]!.handler;

    handler({
      eventType: 'UPDATE',
      new: { id: 'g-1', deleted_at: '2026-09-28T00:00:00.000Z' },
      table: 'page_groups',
    });

    expect(mockEventBus.emit).toHaveBeenCalledWith(EventName.REMOTE_GROUP_DELETED, {
      id: 'g-1',
    });
  });

  it('emits REMOTE_GROUP_ITEM_UPDATED on page_group_items UPDATE', async () => {
    await wsClient.subscribe('user-9');
    const handler = groupHandlers()[1]!.handler;
    const row = { id: 'i-1', group_id: 'g-1', deleted_at: null };

    handler({ eventType: 'UPDATE', new: row, table: 'page_group_items' });

    expect(mockEventBus.emit).toHaveBeenCalledWith(
      EventName.REMOTE_GROUP_ITEM_UPDATED,
      row
    );
  });

  it('emits REMOTE_GROUP_ITEM_DELETED with groupId on DELETE', async () => {
    await wsClient.subscribe('user-9');
    const handler = groupHandlers()[1]!.handler;

    handler({
      eventType: 'DELETE',
      old: { id: 'i-1', group_id: 'g-1' },
      table: 'page_group_items',
    });

    expect(mockEventBus.emit).toHaveBeenCalledWith(
      EventName.REMOTE_GROUP_ITEM_DELETED,
      { id: 'i-1', groupId: 'g-1' }
    );
  });

  it('ignores malformed groups payloads without throwing', async () => {
    await wsClient.subscribe('user-9');
    const handler = groupHandlers()[0]!.handler;

    expect(() => handler(null)).not.toThrow();
    expect(() => handler('nope')).not.toThrow();
    expect(mockEventBus.emit).not.toHaveBeenCalled();
  });

  it('unsubscribe tears down both channels', async () => {
    await wsClient.subscribe('user-9');
    wsClient.unsubscribe();

    expect(highlightsChannel.unsubscribe).toHaveBeenCalled();
    expect(groupsChannel.unsubscribe).toHaveBeenCalled();
    expect(wsClient.isConnected()).toBe(false);
  });
});
