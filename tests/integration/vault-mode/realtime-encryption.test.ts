/**
 * @file realtime-encryption.test.ts
 * @description Integration tests for Real-Time + Encryption
 * @testing-strategy Verify that real-time events are correctly decrypted before being emitted
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebSocketClient } from '@/background/realtime/websocket-client';
import { E2EEncryptionService } from '@/background/auth/e2e-encryption-service';
import { KeyManager } from '@/background/auth/key-manager';
import { EventName } from '@/shared/types/events';
import type { SupabaseClient } from '@/background/api/supabase-client';
import type { IEventBus } from '@/shared/interfaces/i-event-bus';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';

describe('Integration: Real-Time + Encryption', () => {
    let webSocketClient: WebSocketClient;
    let encryptionService: E2EEncryptionService;
    let keyManager: KeyManager;
    let mockSupabase: any;
    let mockEventBus: IEventBus;
    let mockLogger: ILogger;
    let realtimeCallback: (payload: any) => void;
    const testUserId = 'rt-user-123';

    beforeEach(async () => {
        vi.clearAllMocks();

        mockLogger = {
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            setLevel: vi.fn(),
            getLevel: vi.fn(),
        };

        mockEventBus = {
            emit: vi.fn(),
            on: vi.fn(),
            off: vi.fn(),
            once: vi.fn(),
            clear: vi.fn(),
        } as any;

        // Mock Supabase SDK
        const mockChannel = {
            on: vi.fn().mockImplementation((event, filter, callback) => {
                realtimeCallback = callback;
                return mockChannel;
            }),
            subscribe: vi.fn().mockImplementation((cb) => {
                if (cb) cb('SUBSCRIBED');
                return mockChannel;
            }),
            unsubscribe: vi.fn(),
            state: 'joined',
        };

        mockSupabase = {
            supabase: {
                channel: vi.fn().mockReturnValue(mockChannel),
            },
        } as unknown as SupabaseClient;

        // Initialize encryption
        keyManager = new KeyManager(mockLogger);
        await keyManager.generateKeyPair(testUserId);
        encryptionService = new E2EEncryptionService(keyManager, mockLogger);

        // Initialize WebSocketClient
        webSocketClient = new WebSocketClient(mockSupabase, mockEventBus, mockLogger, encryptionService);
    });

    describe('Test 1.5: Real-Time + Encryption Integration', () => {
        it('should emit decrypted highlight when receiving encrypted realtime update', async () => {
            await webSocketClient.subscribe(testUserId);

            // 1. Prepare encrypted payload
            const rawHighlight = {
                text: 'Real-time secret',
                url: 'https://example.com',
                selector: '[]',
                createdAt: new Date(),
                userId: testUserId,
            };
            const encrypted = await encryptionService.encrypt(rawHighlight);

            const encryptedHighlight: HighlightDataV2 = {
                version: 2,
                id: 'hl-rt-1',
                text: `[ENCRYPTED:${JSON.stringify(encrypted)}]`,
                contentHash: 'hash-rt',
                colorRole: 'purple',
                type: 'underscore',
                ranges: [],
                createdAt: rawHighlight.createdAt,
            };

            // 2. Simulate incoming realtime event
            await (realtimeCallback as any)({
                eventType: 'INSERT',
                new: encryptedHighlight,
                table: 'highlights',
                schema: 'public',
            });

            // 3. Verify emitted event
            expect(mockEventBus.emit).toHaveBeenCalledWith(
                EventName.REMOTE_HIGHLIGHT_CREATED,
                expect.objectContaining({
                    id: 'hl-rt-1',
                    text: 'Real-time secret'
                })
            );
        });

        it('should handle updates the same way', async () => {
            await webSocketClient.subscribe(testUserId);

            const rawHighlight = {
                text: 'Updated secret',
                url: 'https://example.com',
                selector: '[]',
                createdAt: new Date(),
                userId: testUserId,
            };
            const encrypted = await encryptionService.encrypt(rawHighlight);

            const encryptedHighlight: HighlightDataV2 = {
                version: 2,
                id: 'hl-rt-update',
                text: `[ENCRYPTED:${JSON.stringify(encrypted)}]`,
                contentHash: 'hash-upd',
                colorRole: 'green',
                type: 'underscore',
                ranges: [],
                createdAt: rawHighlight.createdAt,
            };

            await (realtimeCallback as any)({
                eventType: 'UPDATE',
                new: encryptedHighlight,
            });

            expect(mockEventBus.emit).toHaveBeenCalledWith(
                EventName.REMOTE_HIGHLIGHT_UPDATED,
                expect.objectContaining({
                    text: 'Updated secret'
                })
            );
        });
    });
});
