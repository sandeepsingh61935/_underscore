/**
 * @file realtime-encryption.test.ts
 * @description Integration tests for Real-Time + Encryption
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebSocketClient } from '@/background/realtime/websocket-client';
import { RealtimeHighlightIngestService } from '@/background/services/realtime-highlight-ingest-service';
import { LocalWriteEchoTracker } from '@/background/services/local-write-echo-tracker';
import { E2EEncryptionService } from '@/background/auth/e2e-encryption-service';
import { KeyManager } from '@/background/auth/key-manager';
import { EventName } from '@/shared/types/events';
import type { IEventBus } from '@/shared/interfaces/i-event-bus';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';

vi.mock('@/background/services/library-change-notifier', () => ({
  notifyLibraryDataChanged: vi.fn(),
}));

describe('Integration: Real-Time + Encryption', () => {
    let webSocketClient: WebSocketClient;
    let encryptionService: E2EEncryptionService;
    let keyManager: KeyManager;
    let mockSupabase: any;
    let mockEventBus: IEventBus;
    let mockLogger: ILogger;
    let mockAuthManager: IAuthManager;
    let realtimeCallback: (payload: any) => void;
    const testUserId = 'rt-user-123';

    beforeEach(async () => {
        vi.clearAllMocks();

        mockAuthManager = {
            currentUser: { id: testUserId, email: 'test@example.com', displayName: 'Test User' },
            isAuthenticated: true,
            signIn: vi.fn(),
            signOut: vi.fn(),
            refreshToken: vi.fn(),
            onAuthStateChanged: vi.fn(),
        } as unknown as IAuthManager;

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

        const mockChannel = {
            on: vi.fn().mockImplementation((_event, _filter, callback) => {
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
            channel: vi.fn().mockReturnValue(mockChannel),
            auth: {
                getSession: vi.fn().mockResolvedValue({
                    data: {
                        session: {
                            access_token: 'fake-token-123'
                        }
                    }
                })
            },
            realtime: {
                setAuth: vi.fn()
            }
        } as any;

        keyManager = new KeyManager(mockLogger, mockAuthManager);
        await keyManager.unlock(testUserId, 'test-passphrase');
        await keyManager.generateKeyPair(testUserId);
        encryptionService = new E2EEncryptionService(keyManager, mockLogger);

        webSocketClient = new WebSocketClient(mockSupabase, mockEventBus, mockLogger);
    });

    it('emits raw supabase rows from websocket (decrypt happens in ingest)', async () => {
        await webSocketClient.subscribe(testUserId);

        const rawHighlight = {
            text: 'Real-time secret',
            url: 'https://example.com',
            selector: '[]',
            createdAt: new Date(),
            userId: testUserId,
        };
        const encrypted = await encryptionService.encrypt(rawHighlight);

        await (realtimeCallback as any)({
            eventType: 'INSERT',
            new: {
                id: 'hl-rt-1',
                user_id: testUserId,
                url: 'https://example.com',
                text: `[ENCRYPTED:${JSON.stringify(encrypted)}]`,
                content_hash: 'a'.repeat(64),
                color_role: 'purple',
                created_at: rawHighlight.createdAt.toISOString(),
                updated_at: rawHighlight.createdAt.toISOString(),
            },
            table: 'highlights',
            schema: 'public',
        });

        expect(mockEventBus.emit).toHaveBeenCalledWith(
            EventName.REMOTE_HIGHLIGHT_CREATED,
            expect.objectContaining({
                id: 'hl-rt-1',
                text: expect.stringContaining('[ENCRYPTED:'),
            })
        );
    });

    it('ingest decrypts legacy encrypted realtime rows before persisting', async () => {
        const handlers = new Map<string, (payload: unknown) => void>();
        const ingestBus = {
            on: vi.fn((event: string, handler: (payload: unknown) => void) => {
                handlers.set(event, handler);
            }),
        };

        const stored: HighlightDataV2[] = [];
        const repo = {
            add: vi.fn(async (h: HighlightDataV2) => {
                stored.push(h);
            }),
            update: vi.fn(),
            remove: vi.fn(),
            findById: vi.fn(async () => null),
            exists: vi.fn(async () => false),
        };

        const ingest = new RealtimeHighlightIngestService(
            ingestBus as never,
            repo as never,
            { reload: vi.fn().mockResolvedValue(undefined) } as never,
            new LocalWriteEchoTracker(),
            mockLogger,
            encryptionService
        );
        ingest.initialize();

        const rawHighlight = {
            text: 'Updated secret',
            url: 'https://example.com',
            selector: '[]',
            createdAt: new Date(),
            userId: testUserId,
        };
        const encrypted = await encryptionService.encrypt(rawHighlight);

        await handlers.get(EventName.REMOTE_HIGHLIGHT_CREATED)!({
            id: 'hl-rt-update',
            user_id: testUserId,
            url: 'https://example.com',
            text: `[ENCRYPTED:${JSON.stringify(encrypted)}]`,
            content_hash: 'b'.repeat(64),
            color_role: 'green',
            created_at: rawHighlight.createdAt.toISOString(),
            updated_at: rawHighlight.createdAt.toISOString(),
        });

        expect(stored[0]?.text).toBe('Updated secret');
    });
});
