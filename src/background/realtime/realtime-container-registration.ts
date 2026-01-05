
import type { Container } from '@/background/di/container';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { IEventBus } from '@/shared/interfaces/i-event-bus';
import type { IWebSocketClient } from '@/background/realtime/interfaces/i-websocket-client';
import { WebSocketClient } from '@/background/realtime/websocket-client';
import { ConnectionManager } from '@/background/realtime/connection-manager';
import { SupabaseClient as SupabaseSDKClient } from '@supabase/supabase-js';

/**
 * Register realtime components in DI container
 */
export function registerRealtimeComponents(container: Container): void {
    // ==================== WebSocket Client ====================
    container.registerSingleton<IWebSocketClient>('webSocketClient', () => {
        const supabase = container.resolve<SupabaseSDKClient>('_supabaseSDK'); // Resolve raw SDK client
        const eventBus = container.resolve<IEventBus>('eventBus');
        const logger = container.resolve<ILogger>('logger');

        // Optional encryption service for Vault Mode
        let encryptionService;
        try {
            encryptionService = container.resolve<any>('encryptionService');
        } catch (e) {
            // Ignore if not registered (Sprint Mode)
        }

        return new WebSocketClient(supabase, eventBus, logger, encryptionService);
    });

    // ==================== Connection Manager ====================
    container.registerSingleton<ConnectionManager>('connectionManager', () => {
        const wsClient = container.resolve<IWebSocketClient>('webSocketClient');
        const eventBus = container.resolve<IEventBus>('eventBus');
        const logger = container.resolve<ILogger>('logger');

        return new ConnectionManager(wsClient, eventBus, logger);
    });
}
