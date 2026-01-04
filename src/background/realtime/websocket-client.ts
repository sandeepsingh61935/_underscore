
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { IWebSocketClient } from './interfaces/i-websocket-client';
import { SupabaseClient } from '../api/supabase-client';
import { IEventBus } from '@/shared/interfaces/i-event-bus';
import { ILogger } from '@/shared/interfaces/i-logger';
import { EventName } from '@/shared/types/events';
import { HighlightDataV2 } from '@/shared/schemas/highlight-schema';

/**
 * WebSocket client for real-time synchronization
 * Adapts Supabase Realtime to internal EventBus
 */
export class WebSocketClient implements IWebSocketClient {
    private channel?: RealtimeChannel;
    private currentUserId?: string;

    constructor(
        private readonly supabase: SupabaseClient,
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
            // Access the underlying Supabase SDK client from our wrapper
            // We need to cast to any or extend SupabaseClient to expose the public 'client' property
            // For now, we assume public access or use a cast if private. 
            // NOTE: In the SupabaseClient implementation, 'client' is private. 
            // We might need to expose a getter or public property in SupabaseClient.
            // Let's check SupabaseClient implementation in Task 6.1 context.
            // If private, we should add a getter. 
            // Assuming for now we can access it or will fix SupabaseClient.

            // Use public getter to access Supabase SDK client
            const supabaseInstance = this.supabase.supabase;

            this.channel = supabaseInstance.channel('highlights-sync')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'highlights',
                        filter: `user_id=eq.${userId}`,
                    },
                    (payload: RealtimePostgresChangesPayload<HighlightDataV2>) => this.handleChange(payload)
                )
                .subscribe((status: string, err?: Error) => {
                    this.logger.info(`Realtime subscription status: ${status}`, {
                        userId,
                        error: err
                    });

                    if (status === 'SUBSCRIBED') {
                        this.logger.debug('Successfully subscribed to highlights channel');
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
        if (this.channel) {
            this.logger.info('Unsubscribing from realtime updates');
            this.channel.unsubscribe();
            this.channel = undefined;
            this.currentUserId = undefined;
        }
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
    private handleChange(payload: RealtimePostgresChangesPayload<HighlightDataV2>): void {
        const anyPayload = payload as any;
        const eventType = anyPayload.eventType;
        this.logger.debug('Received realtime event', {
            event: eventType,
            table: anyPayload.table
        });

        switch (eventType) {
            case 'INSERT':
                this.eventBus.emit(EventName.REMOTE_HIGHLIGHT_CREATED, anyPayload.new);
                break;
            case 'UPDATE':
                this.eventBus.emit(EventName.REMOTE_HIGHLIGHT_UPDATED, anyPayload.new);
                break;
            case 'DELETE':
                // payload.old contains the ID for DELETE events
                this.eventBus.emit(EventName.REMOTE_HIGHLIGHT_DELETED, anyPayload.old);
                break;
            default:
                this.logger.warn('Unknown realtime event type', { type: eventType });
        }
    }
}
