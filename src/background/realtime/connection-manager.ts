
import { ILogger } from '@/shared/interfaces/i-logger';
import { IWebSocketClient } from './interfaces/i-websocket-client';
import { IEventBus } from '@/shared/interfaces/i-event-bus';
import { EventName } from '@/shared/types/events';

/**
 * Manages WebSocket connection lifecycle
 * Handles automatic reconnection with exponential backoff
 */
export class ConnectionManager {
    private reconnectAttempts = 0;
    private readonly MAX_ATTEMPTS = 5;
    private isManuallyDisconnected = false;
    private userId?: string;

    constructor(
        private readonly wsClient: IWebSocketClient,
        private readonly eventBus: IEventBus,
        private readonly logger: ILogger
    ) {
        this.listenToNetworkChanges();
    }

    private isConnecting = false;

    /**
     * Connect to the Supabase Realtime service
     * Uses exponential backoff for retries
     */
    public async connect(userId: string): Promise<void> {
        // Prevent race conditions / spamming
        if (this.isConnecting || this.wsClient.isConnected()) {
            this.logger.debug('Already connected or connecting, ignoring connect request');
            return;
        }

        this.userId = userId;
        this.isManuallyDisconnected = false;
        this.isConnecting = true;

        try {
            await this.wsClient.subscribe(userId);
            this.reconnectAttempts = 0;
            this.logger.info('Connected to realtime service');
        } catch (error) {
            this.logger.error('Failed to connect to realtime service', error as Error);
            await this.handleReconnect();
        } finally {
            this.isConnecting = false;
        }
    }

    /**
     * Disconnect manually
     */
    disconnect(): void {
        this.isManuallyDisconnected = true;
        this.userId = undefined;
        this.wsClient.unsubscribe();
        this.logger.info('Disconnected from realtime service');
    }

    /**
     * Handle reconnection logic with exponential backoff
     */
    private async handleReconnect(): Promise<void> {
        if (this.isManuallyDisconnected || !this.userId) {
            return;
        }

        if (this.reconnectAttempts >= this.MAX_ATTEMPTS) {
            this.logger.error('Max reconnect attempts reached for realtime service');
            return;
        }

        const delay = Math.min(
            1000 * Math.pow(2, this.reconnectAttempts),
            30000
        );

        this.logger.info(`Scheduling reconnect attempt ${this.reconnectAttempts + 1}/${this.MAX_ATTEMPTS} in ${delay}ms`);
        this.reconnectAttempts++;

        await new Promise((resolve) => setTimeout(resolve, delay));
        await this.connect(this.userId);
    }

    /**
     * Listen for network status changes
     */
    private listenToNetworkChanges(): void {
        // Listen to EventBus for network changes (from NetworkDetector)
        this.eventBus.on(EventName.NETWORK_STATUS_CHANGED, (data: any) => {
            this.logger.info(`Network status changed: ${data.isOnline ? 'ONLINE' : 'OFFLINE'}`);
            if (data.isOnline && this.userId && !this.wsClient.isConnected()) {
                this.reconnectAttempts = 0;
                this.connect(this.userId);
            }
        });

        // Fallback to window events
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                this.logger.info('Network online (window event), attempting to reconnect realtime');
                if (this.userId && !this.wsClient.isConnected()) {
                    this.reconnectAttempts = 0;
                    this.connect(this.userId);
                }
            });
        }
    }
}
