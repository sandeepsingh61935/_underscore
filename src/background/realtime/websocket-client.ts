
import { RealtimeChannel, RealtimePostgresChangesPayload, SupabaseClient as SupabaseSDKClient } from '@supabase/supabase-js';
import { IWebSocketClient } from './interfaces/i-websocket-client';
import { IEventBus } from '@/shared/interfaces/i-event-bus';
import { ILogger } from '@/shared/interfaces/i-logger';
import { EventName } from '@/shared/types/events';
import {
  isHighlightRowSoftDeleted,
  transformHighlightRow,
  type SupabaseHighlightRow,
} from '@/shared/utils/supabase-highlight-row';

/**
 * WebSocket client for real-time synchronization
 * Adapts Supabase Realtime to internal EventBus
 */
export class WebSocketClient implements IWebSocketClient {
    private channel?: RealtimeChannel;
    private currentUserId?: string;

    constructor(
        private readonly supabase: SupabaseSDKClient,
        private readonly eventBus: IEventBus,
        private readonly logger: ILogger
    ) { }

    /**
     * Subscribe to real-time updates for a specific user
     */
    async subscribe(userId: string): Promise<void> {
        if (this.currentUserId === userId && this.isConnected()) {
            this.logger.debug('Already subscribed to user channel', { userId });
            return;
        }

        // Unsubscribe if existing connection exists
        if (this.channel) {
            this.unsubscribe();
        }

        this.currentUserId = userId;
        this.logger.info('Subscribing to realtime updates', { userId });

        try {
            // Use Supabase SDK client directly
            if (!this.supabase || typeof this.supabase.channel !== 'function') {
                this.logger.error('Supabase SDK client invalid or missing channel method', undefined, {
                    keys: this.supabase ? Object.keys(this.supabase) : []
                });
                return;
            }

            // CRITICAL: Get the access token from the current session
            // Supabase Realtime requires the JWT token to authenticate the WebSocket connection
            const { data: { session } } = await this.supabase.auth.getSession();

            // Check if unsubscribed or switched user while waiting for session
            if (this.currentUserId !== userId) {
                this.logger.info('Subscription aborted: user changed or unsubscribed during authentication');
                return;
            }

            if (!session || !session.access_token) {
                this.logger.error('Cannot subscribe to realtime: No active session or access token');
                throw new Error('No active session for realtime subscription');
            }

            this.logger.info('[WebSocketClient] Setting access token for realtime channel', {
                userId,
                tokenLength: session.access_token.length
            });

            // Set the access token on the Supabase client for Realtime auth
            // This is essential for Supabase to recognize the WebSocket connection as authenticated
            this.supabase.realtime.setAuth(session.access_token);

            this.channel = this.supabase.channel('highlights-sync')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'highlights',
                        filter: `user_id=eq.${userId}`,
                    },
                    (payload: RealtimePostgresChangesPayload<SupabaseHighlightRow>) => this.handleChange(payload)
                )
                .subscribe((status: string, err?: Error) => {
                    this.logger.info(`Realtime subscription status: ${status}`, {
                        userId,
                        error: err
                    });

                    if (status === 'SUBSCRIBED') {
                        this.logger.info('[WebSocketClient] [OK] Successfully subscribed to highlights channel');
                    } else if (status === 'CHANNEL_ERROR') {
                        this.logger.error('Realtime channel error', err || new Error('Unknown channel error'));
                    }
                });

        } catch (error) {
            this.logger.error('Failed to subscribe to realtime', error as Error);
            throw error;
        }
    }

    /**
     * Unsubscribe from the current channel
     */
    unsubscribe(): void {
        this.logger.info('Unsubscribing from realtime updates');
        if (this.channel) {
            this.channel.unsubscribe();
            this.channel = undefined;
        }
        this.currentUserId = undefined;
    }

    /**
     * Check if currently connected
     */
    isConnected(): boolean {
        return this.channel?.state === 'joined';
    }

    /**
     * Handle incoming change events from Supabase
     */
    private handleChange(payload: RealtimePostgresChangesPayload<SupabaseHighlightRow>): void {
        const eventType = payload.eventType;
        this.logger.info('[WebSocketClient] [MSG] Received realtime event', {
            event: eventType,
            table: payload.table,
            hasNew: !!payload.new,
            hasOld: !!payload.old
        });

        switch (eventType) {
            case 'INSERT': {
                const row = payload.new;
                if (!row) return;
                const highlight = transformHighlightRow(row);
                this.logger.info('[WebSocketClient] Emitting REMOTE_HIGHLIGHT_CREATED', { id: highlight.id });
                this.eventBus.emit(EventName.REMOTE_HIGHLIGHT_CREATED, row);
                break;
            }
            case 'UPDATE': {
                const row = payload.new;
                if (!row) return;
                if (isHighlightRowSoftDeleted(row)) {
                    this.logger.info('[WebSocketClient] Detected Soft Delete via UPDATE', { id: row.id });
                    this.eventBus.emit(EventName.REMOTE_HIGHLIGHT_DELETED, { id: row.id });
                } else {
                    this.logger.info('[WebSocketClient] Emitting REMOTE_HIGHLIGHT_UPDATED', { id: row.id });
                    this.eventBus.emit(EventName.REMOTE_HIGHLIGHT_UPDATED, row);
                }
                break;
            }
            case 'DELETE': {
                const id = payload.old?.id;
                this.logger.info('[WebSocketClient] Emitting REMOTE_HIGHLIGHT_DELETED', { id });
                this.eventBus.emit(EventName.REMOTE_HIGHLIGHT_DELETED, { id });
                break;
            }
            default:
                this.logger.warn('Unknown realtime event type', { type: eventType });
        }
    }
}
