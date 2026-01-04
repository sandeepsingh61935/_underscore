
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface IWebSocketClient {
    /**
     * Subscribe to real-time updates for a specific user
     * @param userId The user ID to subscribe to
     */
    subscribe(userId: string): Promise<void>;

    /**
     * Unsubscribe from the current channel
     */
    unsubscribe(): void;

    /**
     * Check if currently connected
     */
    isConnected(): boolean;
}
