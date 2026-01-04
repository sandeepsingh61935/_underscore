/**
 * @file sync-encryption-integration.test.ts
 * @description Integration tests for sync with encryption
 * @testing-strategy Test encrypted events flowing through sync pipeline
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EncryptedAPIClient } from '@/background/api/encrypted-api-client';
import { E2EEncryptionService } from '@/background/auth/e2e-encryption-service';
import { KeyManager } from '@/background/auth/key-manager';
import type { IAPIClient, SyncEvent } from '@/background/api/interfaces/i-api-client';
import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';

// Mock chrome.storage.local
const mockStorage = new Map<string, any>();
global.chrome = {
    storage: {
        local: {
            get: vi.fn((keys) => {
                if (typeof keys === 'string') {
                    return Promise.resolve({ [keys]: mockStorage.get(keys) });
                }
                const result: Record<string, any> = {};
                if (Array.isArray(keys)) {
                    keys.forEach(key => {
                        if (mockStorage.has(key)) {
                            result[key] = mockStorage.get(key);
                        }
                    });
                } else {
                    Object.keys(keys).forEach(key => {
                        if (mockStorage.has(key)) {
                            result[key] = mockStorage.get(key);
                        }
                    });
                }
                return Promise.resolve(result);
            }),
            set: vi.fn((items) => {
                Object.entries(items).forEach(([key, value]) => {
                    mockStorage.set(key, value);
                });
                return Promise.resolve();
            }),
        },
    },
} as any;

describe('Integration: Sync + Encryption', () => {
    let encryptedAPIClient: EncryptedAPIClient;
    let keyManager: KeyManager;
    let encryptionService: E2EEncryptionService;
    let mockInnerClient: IAPIClient;
    let mockAuthManager: IAuthManager;
    let mockLogger: ILogger;
    const testUserId = 'sync-user-123';

    beforeEach(async () => {
        mockStorage.clear();
        vi.clearAllMocks();

        mockLogger = {
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            setLevel: vi.fn(),
            getLevel: vi.fn(),
        };

        mockAuthManager = {
            currentUser: { id: testUserId, email: 'test@example.com', displayName: 'Test User' },
            isAuthenticated: true,
            signIn: vi.fn(),
            signOut: vi.fn(),
            refreshToken: vi.fn(),
            onAuthStateChanged: vi.fn(),
        } as unknown as IAuthManager;

        mockInnerClient = {
            createHighlight: vi.fn().mockResolvedValue(undefined),
            updateHighlight: vi.fn().mockResolvedValue(undefined),
            deleteHighlight: vi.fn().mockResolvedValue(undefined),
            getHighlights: vi.fn().mockResolvedValue([]),
            pushEvents: vi.fn().mockResolvedValue({ synced_event_ids: ['evt-1'], failed_event_ids: [] }),
            pullEvents: vi.fn().mockResolvedValue([]),
            createCollection: vi.fn().mockResolvedValue({ id: 'col-1', name: 'Test', highlight_count: 0, created_at: new Date(), updated_at: new Date() }),
            getCollections: vi.fn().mockResolvedValue([]),
        };

        // Initialize components
        keyManager = new KeyManager(mockLogger);
        await keyManager.generateKeyPair(testUserId);

        encryptionService = new E2EEncryptionService(keyManager, mockLogger);
        encryptedAPIClient = new EncryptedAPIClient(
            mockInnerClient,
            encryptionService,
            mockAuthManager,
            mockLogger
        );
    });

    describe('Test 1.3: Sync + Encryption Integration', () => {
        it('should push encrypted events to server', async () => {
            const event: SyncEvent = {
                event_id: 'evt-sync-1',
                user_id: testUserId,
                type: 'highlight.created' as any,
                data: {
                    version: 2,
                    id: 'hl-1',
                    text: 'Sensitive sync data',
                    contentHash: 'hash',
                    colorRole: 'yellow',
                    type: 'underscore',
                    ranges: [],
                    createdAt: new Date(),
                } as HighlightDataV2,
                timestamp: Date.now(),
                device_id: 'device-1',
                vector_clock: {},
                checksum: 'checksum',
            };

            const result = await encryptedAPIClient.pushEvents([event]);

            expect(result.synced_event_ids).toContain('evt-1');
            expect(mockInnerClient.pushEvents).toHaveBeenCalledTimes(1);

            const pushedEvents = (mockInnerClient.pushEvents as any).mock.calls[0][0];
            expect(pushedEvents[0]?.data.text).toContain('[ENCRYPTED:');
            expect(pushedEvents[0]?.data.text).not.toContain('Sensitive sync data');
        });

        it('should pull and decrypt events from server', async () => {
            const originalText = 'Server encrypted data';
            const highlightData = {
                text: originalText,
                url: 'https://example.com',
                selector: '[]',
                createdAt: new Date(),
                userId: testUserId,
            };
            const encrypted = await encryptionService.encrypt(highlightData);

            const serverEvent: SyncEvent = {
                event_id: 'evt-server-1',
                user_id: testUserId,
                type: 'highlight.created' as any,
                data: {
                    version: 2,
                    id: 'hl-server-1',
                    text: `[ENCRYPTED:${JSON.stringify(encrypted)}]`,
                    contentHash: 'hash',
                    colorRole: 'blue',
                    type: 'underscore',
                    ranges: [],
                    createdAt: new Date(),
                } as HighlightDataV2,
                timestamp: Date.now(),
                device_id: 'other-device',
                vector_clock: {},
                checksum: 'checksum',
            };

            (mockInnerClient.pullEvents as any).mockResolvedValue([serverEvent]);

            const events = await encryptedAPIClient.pullEvents(0);

            expect(events).toHaveLength(1);
            const highlightData2 = events[0]?.data as HighlightDataV2;
            expect(highlightData2.text).toBe(originalText);
        });

        it('should handle full sync cycle', async () => {
            // 1. Create local event
            const localEvent: SyncEvent = {
                event_id: 'evt-local-1',
                user_id: testUserId,
                type: 'highlight.created' as any,
                data: {
                    version: 2,
                    id: 'hl-local-1',
                    text: 'Local data to sync',
                    contentHash: 'hash1',
                    colorRole: 'green',
                    type: 'underscore',
                    ranges: [],
                    createdAt: new Date(),
                } as HighlightDataV2,
                timestamp: Date.now(),
                device_id: 'device-1',
                vector_clock: {},
                checksum: 'checksum',
            };

            // 2. Push (encrypted)
            await encryptedAPIClient.pushEvents([localEvent]);

            // 3. Simulate server returning the same event
            const pushedEvents = (mockInnerClient.pushEvents as any).mock.calls[0][0];
            (mockInnerClient.pullEvents as any).mockResolvedValue(pushedEvents);

            // 4. Pull (decrypted)
            const pulledEvents = await encryptedAPIClient.pullEvents(0);

            expect(pulledEvents).toHaveLength(1);
            const pulledData = pulledEvents[0]?.data as HighlightDataV2;
            expect(pulledData.text).toBe('Local data to sync');
        });

        it('should maintain data integrity through sync', async () => {
            const complexData: HighlightDataV2 = {
                version: 2,
                id: 'hl-complex-1',
                text: 'Complex: émojis 🎉, quotes "test", newlines\n\ntabs\t\there',
                contentHash: 'hash-complex',
                colorRole: 'purple',
                type: 'underscore',
                ranges: [{
                    xpath: '//div[@class="content"]/p[2]',
                    startOffset: 5,
                    endOffset: 25,
                    text: 'sample text',
                    textBefore: 'before',
                    textAfter: 'after',
                }],
                createdAt: new Date(),
            };

            const event: SyncEvent = {
                event_id: 'evt-complex-1',
                user_id: testUserId,
                type: 'highlight.created' as any,
                data: complexData,
                timestamp: Date.now(),
                device_id: 'device-1',
                vector_clock: {},
                checksum: 'checksum',
            };

            // Push
            await encryptedAPIClient.pushEvents([event]);

            // Pull
            const pushedEvents = (mockInnerClient.pushEvents as any).mock.calls[0][0];
            (mockInnerClient.pullEvents as any).mockResolvedValue(pushedEvents);
            const pulledEvents = await encryptedAPIClient.pullEvents(0);

            // Verify integrity
            const pulledData = pulledEvents[0]?.data as HighlightDataV2;
            expect(pulledData.text).toBe(complexData.text);
            expect(pulledData.ranges).toHaveLength(1);
            expect(pulledData.ranges[0]?.xpath).toBe('//div[@class="content"]/p[2]');
        });
    });
});
