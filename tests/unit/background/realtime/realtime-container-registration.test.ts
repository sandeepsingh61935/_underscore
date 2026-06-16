/**
 * @file realtime-container-registration.test.ts
 * @description Verifies the realtime DI factory constructs a WebSocketClient
 * in both modes (Sprint: no encryption service, Vault: with encryption service).
 *
 * Regression: realtime-container-registration.ts used `let encryptionService;`
 * with no type annotation, so tsc inferred `any | undefined` and flagged
 * "Expected 3 arguments, but got 4" against the WebSocketClient ctor. The
 * correct shape: encryptionService is typed as IEncryptionService | undefined
 * and resolves to undefined when not registered.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Container } from '@/background/di/container';
import { registerRealtimeComponents } from '@/background/realtime/realtime-container-registration';
import { WebSocketClient } from '@/background/realtime/websocket-client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { EventBus } from '@/shared/utils/event-bus';
import { LoggerFactory } from '@/shared/utils/logger';
import type { IEncryptionService, HighlightData, EncryptedHighlight } from '@/background/auth/interfaces/i-encryption-service';

describe('realtime DI registration', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
    // Minimal registrations the factory needs to resolve.
    container.registerInstance('_supabaseSDK', {} as SupabaseClient);
    container.registerInstance('eventBus', new EventBus());
    container.registerInstance('logger', LoggerFactory.getLogger('Test'));
  });

  it('constructs a WebSocketClient in Sprint mode (no encryption service registered)', () => {
    registerRealtimeComponents(container);
    const wsClient = container.resolve<WebSocketClient>('webSocketClient');
    expect(wsClient).toBeInstanceOf(WebSocketClient);
  });

  it('constructs a WebSocketClient in Vault mode (with encryption service registered)', () => {
    const stubEncryption: IEncryptionService = {
      encrypt: vi.fn(async (_data: HighlightData): Promise<EncryptedHighlight> => ({} as EncryptedHighlight)),
      decrypt: vi.fn(async (_enc: EncryptedHighlight): Promise<HighlightData> => ({} as HighlightData)),
    };
    container.registerInstance('encryptionService', stubEncryption);
    registerRealtimeComponents(container);
    const wsClient = container.resolve<WebSocketClient>('webSocketClient');
    expect(wsClient).toBeInstanceOf(WebSocketClient);
  });
});
