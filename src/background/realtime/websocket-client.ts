
import { RealtimeChannel, RealtimePostgresChangesPayload, SupabaseClient as SupabaseSDKClient } from '@supabase/supabase-js';
import { IWebSocketClient } from './interfaces/i-websocket-client';
import { IEventBus } from '@/shared/interfaces/i-event-bus';
import { ILogger } from '@/shared/interfaces/i-logger';
import { IEncryptionService } from '../auth/interfaces/i-encryption-service';
import { EventName } from '@/shared/types/events';
import { HighlightDataV2 } from '@/background/schemas/highlight-schema';

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
        private readonly logger: ILogger,
        private readonly encryptionService?: IEncryptionService
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

            // Get the current session to get the access token
            const { data: { session } } = await this.supabase.auth.getSession();
            if (!session?.access_token) {
                this.logger.warn('[WebSocketClient] No active session found during subscribe');
                return;
            }

            this.logger.info('[WebSocketClient] Initializing connection with auth token', {
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
                    (payload: RealtimePostgresChangesPayload<HighlightDataV2>) => this.handleChange(payload)
                )
                .subscribe((status: string, err?: Error) => {
                    this.logger.info(`Realtime subscription status: ${status} `, {
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
    private async handleChange(payload: RealtimePostgresChangesPayload<HighlightDataV2>): Promise<void> {
        const anyPayload = payload as any;
        const eventType = anyPayload.eventType;
        this.logger.debug('Received realtime event', {
            event: eventType,
            table: anyPayload.table
        });

        // 1. Process payload to decrypt if needed
        let data = anyPayload.new;
        if (this.encryptionService && data && data.text && data.text.startsWith('[ENCRYPTED:')) {
            try {
                data = await this.decryptHighlight(data);
            } catch (error) {
                this.logger.error('Failed to decrypt realtime highlight', error as Error, { id: data.id });
                // Continue with encrypted data or handle failure?
                // Emitting encrypted data might break UI, so we might want to skip or emit failure.
                // For now, emit with error marker as in EncryptedAPIClient.
            }
        }

        // 2. Emit events
        switch (eventType) {
            case 'INSERT':
                this.eventBus.emit(EventName.REMOTE_HIGHLIGHT_CREATED, data);
                break;
            case 'UPDATE':
                this.eventBus.emit(EventName.REMOTE_HIGHLIGHT_UPDATED, data);
                break;
            case 'DELETE':
                // payload.old contains the ID for DELETE events
                this.eventBus.emit(EventName.REMOTE_HIGHLIGHT_DELETED, anyPayload.old);
                break;
            default:
                this.logger.warn('Unknown realtime event type', { type: eventType });
        }
    }

    /**
     * Decrypt highlight data from realtime payload
     */
    private async decryptHighlight(data: HighlightDataV2): Promise<HighlightDataV2> {
        if (!this.encryptionService) return data;

        try {
            // Extract encrypted payload (matching EncryptedAPIClient logic)
            const encryptedJson = data.text.substring(11, data.text.length - 1);
            const encryptedPayload = JSON.parse(encryptedJson);

            // Decrypt
            const decrypted = await this.encryptionService.decrypt(encryptedPayload);

            // Restore original data
            return {
                ...data,
                text: decrypted.text,
                url: decrypted.url,
                ranges: JSON.parse(decrypted.selector),
            } as HighlightDataV2;
        } catch (error) {
            this.logger.warn('Realtime decryption failed', error as Error);
            return {
                ...data,
                text: '[DECRYPTION FAILED]',
                ranges: [],
            } as HighlightDataV2;
        }
    }
}
