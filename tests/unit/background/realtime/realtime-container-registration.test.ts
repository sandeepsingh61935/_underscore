/**
 * @file realtime-container-registration.test.ts
 * @description Verifies the realtime DI factory constructs a WebSocketClient.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Container } from '@/background/di/container';
import { registerRealtimeComponents } from '@/background/realtime/realtime-container-registration';
import { WebSocketClient } from '@/background/realtime/websocket-client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { EventBus } from '@/shared/utils/event-bus';
import { LoggerFactory } from '@/shared/utils/logger';

describe('realtime DI registration', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.registerInstance('_supabaseSDK', {} as SupabaseClient);
    container.registerInstance('eventBus', new EventBus());
    container.registerInstance('logger', LoggerFactory.getLogger('Test'));
  });

  it('constructs a WebSocketClient', () => {
    registerRealtimeComponents(container);
    const wsClient = container.resolve<WebSocketClient>('webSocketClient');
    expect(wsClient).toBeInstanceOf(WebSocketClient);
  });
});
