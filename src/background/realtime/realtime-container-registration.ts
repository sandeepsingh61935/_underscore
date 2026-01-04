
import type { Container } from '@/shared/di/container';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { IEventBus } from '@/shared/interfaces/i-event-bus';
import type { IWebSocketClient } from '@/background/realtime/interfaces/i-websocket-client';
import { WebSocketClient } from '@/background/realtime/websocket-client';
import { ConnectionManager } from '@/background/realtime/connection-manager';
import { SupabaseClient } from '@/background/api/supabase-client';

/**
 * Register realtime components in DI container
 */
export function registerRealtimeComponents(container: Container): void {
    // ==================== WebSocket Client ====================
    container.registerSingleton<IWebSocketClient>('webSocketClient', () => {
        const supabase = container.resolve<SupabaseClient>('apiClient'); // Assuming 'apiClient' is SupabaseClient
        const eventBus = container.resolve<IEventBus>('eventBus');
        const logger = container.resolve<ILogger>('logger');

        return new WebSocketClient(supabase, eventBus, logger);
    });

    // ==================== Connection Manager ====================
    container.registerSingleton<ConnectionManager>('connectionManager', () => {
        const wsClient = container.resolve<IWebSocketClient>('webSocketClient');
        const eventBus = container.resolve<IEventBus>('eventBus');
        const logger = container.resolve<ILogger>('logger');

        return new ConnectionManager(wsClient, eventBus, logger);
    });
}
