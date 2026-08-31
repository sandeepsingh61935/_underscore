import type { SupabaseClient as SupabaseSDKClient } from '@supabase/supabase-js';

import { EventBridge } from '../services/event-bridge';

import type { Container } from '@/background/di/container';
import { ConnectionManager } from '@/background/realtime/connection-manager';
import type { IWebSocketClient } from '@/background/realtime/interfaces/i-websocket-client';
import { WebSocketClient } from '@/background/realtime/websocket-client';
import type { ICloudHydrationService } from '@/background/services/interfaces/i-cloud-hydration-service';
import type { IEventBus } from '@/shared/interfaces/i-event-bus';
import type { ILogger } from '@/shared/interfaces/i-logger';
import { LoggerFactory } from '@/shared/utils/logger';

/**
 * Register realtime components in DI container
 */
export function registerRealtimeComponents(container: Container): void {
  // ==================== WebSocket Client ====================
  container.registerSingleton<IWebSocketClient>('webSocketClient', () => {
    const supabase = container.resolve<SupabaseSDKClient>('_supabaseSDK');
    const eventBus = container.resolve<IEventBus>('eventBus');
    const logger = container.resolve<ILogger>('logger');

    return new WebSocketClient(supabase, eventBus, logger);
  });

  // ==================== Connection Manager ====================
  container.registerSingleton<ConnectionManager>('connectionManager', () => {
    const wsClient = container.resolve<IWebSocketClient>('webSocketClient');
    const eventBus = container.resolve<IEventBus>('eventBus');
    const cloudHydrationService = container.resolve<ICloudHydrationService>(
      'cloudHydrationService'
    );
    const logger = container.resolve<ILogger>('logger');

    return new ConnectionManager(wsClient, eventBus, cloudHydrationService, logger);
  });

  // ==================== Event Bridge ====================
  container.registerSingleton('eventBridge', () => {
    const c = container; // Alias for closure if needed, or use container directly
    return new EventBridge(
      c.resolve<IEventBus>('eventBus'),
      LoggerFactory.getLogger('EventBridge')
    );
  });
}
