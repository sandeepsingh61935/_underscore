
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebSocketClient } from '@/background/realtime/websocket-client';
import { SupabaseClient } from '@/background/api/supabase-client';
import { IEventBus } from '@/shared/interfaces/i-event-bus';
import { ILogger } from '@/shared/interfaces/i-logger';
import { EventName } from '@/shared/types/events';

describe('WebSocketClient', () => {
    let wsClient: WebSocketClient;
    let mockSupabase: any;
    let mockEventBus: any;
    let mockLogger: any;
    let mockChannel: any;

    beforeEach(() => {
        mockChannel = {
            on: vi.fn().mockReturnThis(),
            subscribe: vi.fn().mockImplementation((cb) => {
                if (cb) cb('SUBSCRIBED');
                return mockChannel;
            }),
            unsubscribe: vi.fn(),
            state: 'joined'
        };

        mockSupabase = {
            supabase: {
                channel: vi.fn().mockReturnValue(mockChannel)
            }
        };

        mockEventBus = {
            emit: vi.fn(),
            on: vi.fn(),
            off: vi.fn()
        };

        mockLogger = {
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn()
        };

        wsClient = new WebSocketClient(
            mockSupabase as unknown as SupabaseClient,
            mockEventBus as unknown as IEventBus,
            mockLogger as unknown as ILogger
        );
    });

    describe('subscribe', () => {
        it('should subscribe to user channel', async () => {
            await wsClient.subscribe('user-123');

            expect(mockSupabase.supabase.channel).toHaveBeenCalledWith('highlights-sync');
            expect(mockChannel.on).toHaveBeenCalledWith(
                'postgres_changes',
                expect.objectContaining({
                    event: '*',
                    schema: 'public',
                    table: 'highlights',
                    filter: 'user_id=eq.user-123'
                }),
                expect.any(Function)
            );
            expect(mockChannel.subscribe).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith('Subscribing to realtime updates', { userId: 'user-123' });
        });

        it('should not resubscribe if already subscribed to same user', async () => {
            await wsClient.subscribe('user-123');
            mockSupabase.supabase.channel.mockClear();

            await wsClient.subscribe('user-123');
            expect(mockSupabase.supabase.channel).not.toHaveBeenCalled();
        });

        it('should unsubscribe before subscribing to new user', async () => {
            await wsClient.subscribe('user-1')
            await wsClient.subscribe('user-2');

            expect(mockChannel.unsubscribe).toHaveBeenCalled();
            expect(mockSupabase.supabase.channel).toHaveBeenCalledTimes(2);
        });

        it('should handle subscription errors', async () => {
            mockChannel.subscribe.mockImplementation((cb) => {
                if (cb) cb('CHANNEL_ERROR', new Error('Fail'));
                return mockChannel;
            });

            await wsClient.subscribe('user-1');

            expect(mockLogger.error).toHaveBeenCalledWith('Realtime channel error', expect.any(Error));
        });
    });

    describe('unsubscribe', () => {
        it('should unsubscribe from channel', async () => {
            await wsClient.subscribe('user-1');
            wsClient.unsubscribe();

            expect(mockChannel.unsubscribe).toHaveBeenCalled();
            expect(wsClient.isConnected()).toBe(false);
        });

        it('should do nothing if not connected', () => {
            wsClient.unsubscribe();
            expect(mockChannel.unsubscribe).not.toHaveBeenCalled();
        });
    });

    describe('handleChange', () => {
        let changeHandler: (payload: any) => void;

        beforeEach(async () => {
            await wsClient.subscribe('user-1');
            // Get the callback passed to .on()
            changeHandler = mockChannel.on.mock.calls[0][2];
        });

        it('should emit REMOTE_HIGHLIGHT_CREATED on INSERT', () => {
            const payload = {
                eventType: 'INSERT',
                new: { id: 'h1', text: 'test' },
                table: 'highlights'
            };

            changeHandler(payload);

            expect(mockEventBus.emit).toHaveBeenCalledWith(EventName.REMOTE_HIGHLIGHT_CREATED, payload.new);
        });

        it('should emit REMOTE_HIGHLIGHT_UPDATED on UPDATE', () => {
            const payload = {
                eventType: 'UPDATE',
                new: { id: 'h1', text: 'updated' },
                table: 'highlights'
            };

            changeHandler(payload);

            expect(mockEventBus.emit).toHaveBeenCalledWith(EventName.REMOTE_HIGHLIGHT_UPDATED, payload.new);
        });

        it('should emit REMOTE_HIGHLIGHT_DELETED on DELETE', () => {
            const payload = {
                eventType: 'DELETE',
                old: { id: 'h1' },
                table: 'highlights'
            };

            changeHandler(payload);

            expect(mockEventBus.emit).toHaveBeenCalledWith(EventName.REMOTE_HIGHLIGHT_DELETED, payload.old);
        });

        it('should log warning for unknown event type', () => {
            const payload = {
                eventType: 'UNKNOWN',
                table: 'highlights'
            };

            changeHandler(payload);

            expect(mockLogger.warn).toHaveBeenCalledWith('Unknown realtime event type', expect.anything());
            expect(mockEventBus.emit).not.toHaveBeenCalled();
        });
    });
});
