/**
 * @file conflict-encryption.test.ts
 * @description Integration tests for Conflict Resolution + Encryption
 * @testing-strategy Test that conflicting encrypted data is correctly resolved and re-secured
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictResolver } from '@/background/conflict/conflict-resolver';
import { ConflictType, type Conflict } from '@/background/conflict/interfaces/i-conflict-detector';
import { ResolutionStrategy } from '@/background/conflict/interfaces/i-conflict-resolver';
import { EncryptedAPIClient } from '@/background/api/encrypted-api-client';
import { E2EEncryptionService } from '@/background/auth/e2e-encryption-service';
import { KeyManager } from '@/background/auth/key-manager';
import type { SyncEvent as APISyncEvent } from '@/background/api/interfaces/i-api-client';
import type { SyncEvent as StoreSyncEvent } from '@/background/events/interfaces/i-event-store';
import type { IAPIClient } from '@/background/api/interfaces/i-api-client';
import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import type { IVectorClockManager } from '@/background/conflict/interfaces/i-vector-clock-manager';
import type { IEventBus } from '@/shared/interfaces/i-event-bus';

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

describe('Integration: Conflict Resolution + Encryption', () => {
    let conflictResolver: ConflictResolver;
    let encryptedAPIClient: EncryptedAPIClient;
    let keyManager: KeyManager;
    let encryptionService: E2EEncryptionService;
    let mockInnerClient: IAPIClient;
    let mockAuthManager: IAuthManager;
    let mockLogger: ILogger;
    let mockClockManager: IVectorClockManager;
    let mockEventBus: IEventBus;
    const testUserId = 'conflict-user-123';

    // Helpers to bridge the type gap
    function apiToStoreEvent(apiEvent: APISyncEvent): StoreSyncEvent {
        return {
            id: apiEvent.event_id,
            type: apiEvent.type as any,
            payload: apiEvent.data,
            timestamp: apiEvent.timestamp,
            deviceId: apiEvent.device_id,
            vectorClock: apiEvent.vector_clock as any,
            checksum: apiEvent.checksum,
            userId: apiEvent.user_id
        };
    }

    function storeToApiEvent(storeEvent: StoreSyncEvent): APISyncEvent {
        return {
            event_id: storeEvent.id,
            user_id: storeEvent.userId,
            type: storeEvent.type as any,
            data: storeEvent.payload as any,
            timestamp: storeEvent.timestamp,
            device_id: storeEvent.deviceId,
            vector_clock: storeEvent.vectorClock as any,
            checksum: storeEvent.checksum
        };
    }

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
            pushEvents: vi.fn().mockResolvedValue({ synced_event_ids: ['evt-res'], failed_event_ids: [] }),
            pullEvents: vi.fn().mockResolvedValue([]),
            createCollection: vi.fn().mockResolvedValue({} as any),
            getCollections: vi.fn().mockResolvedValue([]),
        };

        mockClockManager = {
            increment: vi.fn().mockReturnValue({ [testUserId]: 2 }),
            merge: vi.fn().mockReturnValue({ [testUserId]: 2, 'other': 1 }),
            compare: vi.fn().mockReturnValue(0),
            getClock: vi.fn().mockReturnValue({ [testUserId]: 1 }),
        } as any;

        mockEventBus = {
            on: vi.fn(),
            off: vi.fn(),
            emit: vi.fn(),
            once: vi.fn(),
            clear: vi.fn(),
        } as any;

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

        conflictResolver = new ConflictResolver(mockClockManager, mockEventBus, mockLogger);
    });

    describe('Test 1.4: Conflict Resolution + Encryption Integration', () => {
        it('should resolve conflict between local plaintext and remote encrypted then re-encrypt', async () => {
            // 1. Prepare Local Event (Plaintext)
            const localHighlight: HighlightDataV2 = {
                version: 2,
                id: 'hl-conf-1',
                text: 'Local change',
                contentHash: 'hash-local',
                colorRole: 'yellow',
                type: 'underscore',
                ranges: [],
                createdAt: new Date(Date.now() - 10000),
            };

            const localEvent: StoreSyncEvent = {
                id: 'evt-local',
                userId: testUserId,
                type: 'highlight.updated' as any,
                payload: localHighlight,
                timestamp: localHighlight.createdAt.getTime(),
                deviceId: 'device-local',
                vectorClock: { [testUserId]: 1 },
                checksum: 'chk-local',
            };

            // 2. Prepare Remote Event (Encrypted)
            const remoteHighlightPayload = {
                text: 'Remote change (winner)',
                url: 'https://example.com',
                selector: '[]',
                createdAt: new Date(),
                userId: testUserId,
            };
            const encrypted = await encryptionService.encrypt(remoteHighlightPayload);

            const remoteEvent: APISyncEvent = {
                event_id: 'evt-remote',
                user_id: testUserId,
                type: 'highlight.updated' as any,
                data: {
                    version: 2,
                    id: 'hl-conf-1',
                    text: `[ENCRYPTED:${JSON.stringify(encrypted)}]`,
                    contentHash: 'hash-remote',
                    colorRole: 'blue',
                    type: 'underscore',
                    ranges: [],
                    createdAt: remoteHighlightPayload.createdAt,
                } as HighlightDataV2,
                timestamp: remoteHighlightPayload.createdAt.getTime(),
                device_id: 'device-remote',
                vector_clock: { 'other': 1 },
                checksum: 'chk-remote',
            };

            // 3. Simulate Pull (Decrypts remote event)
            (mockInnerClient.pullEvents as any).mockResolvedValue([remoteEvent]);
            const pulledEvents = await encryptedAPIClient.pullEvents(0);
            const decryptedRemoteEventAPI = pulledEvents[0]!;

            expect(decryptedRemoteEventAPI.data.text).toBe('Remote change (winner)');

            // Convert to StoreSyncEvent for resolver
            const decryptedRemoteEvent = apiToStoreEvent(decryptedRemoteEventAPI);

            // 4. Resolve Conflict (LWW should pick remote because it's newer)
            const conflict: Conflict = {
                id: 'conf-1',
                type: ConflictType.METADATA_CONFLICT,
                entityId: 'hl-conf-1',
                local: [localEvent],
                remote: [decryptedRemoteEvent],
                detectedAt: Date.now(),
            };

            const resolvedEventStore = await conflictResolver.resolve(conflict, ResolutionStrategy.LAST_WRITE_WINS);

            const resolvedPayload = resolvedEventStore.payload as HighlightDataV2;
            expect(resolvedPayload.text).toBe('Remote change (winner)');
            expect(resolvedPayload.colorRole).toBe('blue');

            // Convert back to APISyncEvent for push
            const resolvedEventAPI = storeToApiEvent(resolvedEventStore);

            // 5. Push Resolved (Re-encrypts)
            await encryptedAPIClient.pushEvents([resolvedEventAPI]);

            expect(mockInnerClient.pushEvents).toHaveBeenCalledTimes(1);
            const pushedEvents = (mockInnerClient.pushEvents as any).mock.calls[0][0];
            expect(pushedEvents[0]?.data.text).toContain('[ENCRYPTED:');
            expect(pushedEvents[0]?.data.text).not.toContain('Remote change (winner)');
        });

        it('should handle MERGE resolution with encrypted data', async () => {
            // 1. Local: Tag change
            const localHighlight: HighlightDataV2 = {
                version: 2,
                id: 'hl-merge-1',
                text: 'Base text',
                contentHash: 'hash',
                colorRole: 'yellow',
                type: 'underscore',
                ranges: [],
                createdAt: new Date(),
                metadata: { source: 'user', tags: ['local-tag'] } as any,
            };

            const localEvent: StoreSyncEvent = {
                id: 'evt-l',
                userId: testUserId,
                type: 'highlight.updated' as any,
                payload: localHighlight,
                timestamp: Date.now(),
                deviceId: 'dev-l',
                vectorClock: { 'l': 1 },
                checksum: 'c1',
            };

            // 2. Remote: Color change (Encrypted)
            const remotePayload = {
                text: 'Base text',
                url: 'https://example.com',
                selector: '[]',
                createdAt: new Date(),
                userId: testUserId,
                metadata: { source: 'user', tags: ['remote-tag'] },
            };
            const encrypted = await encryptionService.encrypt(remotePayload);

            const remoteEvent: APISyncEvent = {
                event_id: 'evt-r',
                user_id: testUserId,
                type: 'highlight.updated' as any,
                data: {
                    version: 2,
                    id: 'hl-merge-1',
                    text: `[ENCRYPTED:${JSON.stringify(encrypted)}]`,
                    contentHash: 'hash',
                    colorRole: 'blue',
                    type: 'underscore',
                    ranges: [],
                    createdAt: new Date(),
                    metadata: { source: 'user', tags: ['remote-tag'] } as any,
                } as HighlightDataV2,
                timestamp: Date.now(),
                device_id: 'dev-r',
                vector_clock: { 'r': 1 },
                checksum: 'c2',
            };

            // 3. Pull & Decrypt
            (mockInnerClient.pullEvents as any).mockResolvedValue([remoteEvent]);
            const pulled = await encryptedAPIClient.pullEvents(0);

            const decryptedRemoteEvent = apiToStoreEvent(pulled[0]!);

            // 4. Merge
            const conflict: Conflict = {
                id: 'c-merge',
                type: ConflictType.METADATA_CONFLICT,
                entityId: 'hl-merge-1',
                local: [localEvent],
                remote: [decryptedRemoteEvent],
                detectedAt: Date.now(),
            };

            const mergedEventStore = await conflictResolver.resolve(conflict, ResolutionStrategy.MERGE);

            // Verify both changes are kept (tags merged)
            const mergedPayload = mergedEventStore.payload as HighlightDataV2;
            expect(mergedPayload.text).toBe('Base text');
            expect(mergedPayload.metadata?.tags).toContain('local-tag');
            expect(mergedPayload.metadata?.tags).toContain('remote-tag');

            // 5. Push (Encrypt merged result)
            const mergedEventAPI = storeToApiEvent(mergedEventStore);
            await encryptedAPIClient.pushEvents([mergedEventAPI]);
            const pushed = (mockInnerClient.pushEvents as any).mock.calls[0][0];
            expect(pushed[0]?.data.text).toContain('[ENCRYPTED:');
        });
    });
});
