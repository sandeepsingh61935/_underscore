/**
 * @file encryption-integration.test.ts
 * @description Integration tests for encryption components
 * @testing-strategy Test KeyManager + E2EEncryptionService + EncryptedAPIClient working together
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { KeyManager } from '@/background/auth/key-manager';
import { E2EEncryptionService } from '@/background/auth/e2e-encryption-service';
import { EncryptedAPIClient } from '@/background/api/encrypted-api-client';
import type { IAPIClient, SyncEvent } from '@/background/api/interfaces/i-api-client';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
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
                Object.keys(keys).forEach(key => {
                    if (mockStorage.has(key)) {
                        result[key] = mockStorage.get(key);
                    }
                });
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

describe('Integration: Encryption Components', () => {
    let keyManager: KeyManager;
    let encryptionService: E2EEncryptionService;
    let encryptedAPIClient: EncryptedAPIClient;
    let mockInnerClient: IAPIClient;
    let mockAuthManager: IAuthManager;
    let mockLogger: ILogger;
    const testUserId = 'integration-user-123';

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
            pushEvents: vi.fn().mockResolvedValue({ synced_event_ids: [], failed_event_ids: [] }),
            pullEvents: vi.fn().mockResolvedValue([]),
            createCollection: vi.fn().mockResolvedValue({ id: 'col-1', name: 'Test', highlight_count: 0, created_at: new Date(), updated_at: new Date() }),
            getCollections: vi.fn().mockResolvedValue([]),
        };

        // Initialize components
        keyManager = new KeyManager(mockLogger);
        encryptionService = new E2EEncryptionService(keyManager, mockLogger);
        encryptedAPIClient = new EncryptedAPIClient(
            mockInnerClient,
            encryptionService,
            mockAuthManager,
            mockLogger
        );
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Test 1.1: KeyManager + E2EEncryptionService Integration', () => {
        it('should generate keys and encrypt/decrypt data end-to-end', async () => {
            // Generate keys
            await keyManager.generateKeyPair(testUserId);

            // Create sample highlight data
            const highlightData = {
                text: 'Integration test highlight',
                url: 'https://example.com/test',
                selector: JSON.stringify([{ xpath: '//p[1]', startOffset: 0, endOffset: 10 }]),
                createdAt: new Date(),
                userId: testUserId,
            };

            // Encrypt
            const encrypted = await encryptionService.encrypt(highlightData);

            expect(encrypted.version).toBe(1);
            expect(encrypted.keyId).toBeTruthy();
            expect(encrypted.data).toBeTruthy();
            expect(encrypted.data).not.toContain(highlightData.text); // Ensure encrypted

            // Decrypt
            const decrypted = await encryptionService.decrypt(encrypted);

            expect(decrypted.text).toBe(highlightData.text);
            expect(decrypted.url).toBe(highlightData.url);
            expect(decrypted.userId).toBe(testUserId);
        });

        it('should handle key rotation scenario', async () => {
            // Generate initial keys
            await keyManager.generateKeyPair(testUserId);

            // Encrypt with initial key
            const data1 = {
                text: 'Data before rotation',
                url: 'https://example.com',
                selector: '[]',
                createdAt: new Date(),
                userId: testUserId,
            };
            const encrypted1 = await encryptionService.encrypt(data1);

            // Rotate keys
            await keyManager.rotateKey(testUserId);

            // Encrypt with new key
            const data2 = {
                text: 'Data after rotation',
                url: 'https://example.com',
                selector: '[]',
                createdAt: new Date(),
                userId: testUserId,
            };
            const encrypted2 = await encryptionService.encrypt(data2);

            // New data should decrypt successfully
            const decrypted2 = await encryptionService.decrypt(encrypted2);
            expect(decrypted2.text).toBe(data2.text);

            // Old data will fail to decrypt (key rotation invalidates old keys)
            // In production, this would require re-encryption of old data
            await expect(encryptionService.decrypt(encrypted1)).rejects.toThrow();
        });

        it('should handle large payloads (10KB)', async () => {
            await keyManager.generateKeyPair(testUserId);

            const largeText = 'A'.repeat(10 * 1024); // 10KB
            const data = {
                text: largeText,
                url: 'https://example.com',
                selector: '[]',
                createdAt: new Date(),
                userId: testUserId,
            };

            const startTime = performance.now();
            const encrypted = await encryptionService.encrypt(data);
            const encryptTime = performance.now() - startTime;

            const decryptStart = performance.now();
            const decrypted = await encryptionService.decrypt(encrypted);
            const decryptTime = performance.now() - decryptStart;

            expect(decrypted.text).toBe(largeText);
            expect(encryptTime).toBeLessThan(200); // Should be fast
            expect(decryptTime).toBeLessThan(200);
        });
    });

    describe('Test 1.2: E2EEncryptionService + EncryptedAPIClient Integration', () => {
        beforeEach(async () => {
            // Generate keys for user
            await keyManager.generateKeyPair(testUserId);
        });

        it('should encrypt highlight before API call', async () => {
            const highlight: HighlightDataV2 = {
                version: 2,
                id: 'hl-integration-1',
                text: 'Sensitive integration data',
                contentHash: 'hash123',
                colorRole: 'yellow',
                type: 'underscore',
                ranges: [
                    {
                        xpath: '//p[1]',
                        startOffset: 0,
                        endOffset: 10,
                        text: 'Sensitive integration data',
                        textBefore: '',
                        textAfter: '',
                        selector: {
                            type: 'TextQuoteSelector',
                            exact: 'Sensitive integration data',
                            prefix: '',
                            suffix: '',
                        },
                    },
                ],
                createdAt: new Date(),
            };

            await encryptedAPIClient.createHighlight(highlight);

            // Verify inner client was called with encrypted data
            expect(mockInnerClient.createHighlight).toHaveBeenCalledTimes(1);
            const callArg = (mockInnerClient.createHighlight as any).mock.calls[0][0];

            expect(callArg.text).toContain('[ENCRYPTED:');
            expect(callArg.text).not.toContain('Sensitive integration data');
            expect(callArg.ranges).toEqual([]); // Ranges should be cleared
        });

        it('should decrypt highlights after retrieval', async () => {
            // Create a real encrypted highlight
            const originalText = 'Original highlight text';
            const realData = {
                text: originalText,
                url: 'https://example.com',
                selector: JSON.stringify([{ xpath: '//p[1]' }]),
                createdAt: new Date(),
                userId: testUserId,
            };
            const encrypted = await encryptionService.encrypt(realData);

            // Create encrypted highlight with proper JSON format
            const encryptedHighlight: HighlightDataV2 = {
                version: 2,
                id: 'hl-encrypted-1',
                text: `[ENCRYPTED:${JSON.stringify(encrypted)}]`,
                contentHash: 'hash',
                colorRole: 'blue',
                type: 'underscore',
                ranges: [],
                createdAt: new Date(),
            };

            // Mock inner client to return encrypted highlight
            (mockInnerClient.getHighlights as any).mockResolvedValue([encryptedHighlight]);

            // Retrieve and decrypt
            const results = await encryptedAPIClient.getHighlights();

            expect(results).toHaveLength(1);
            expect(results[0]?.text).toBe(originalText);
            expect(results[0]?.text).not.toContain('[ENCRYPTED:');
        });

        it('should handle mixed encrypted and plaintext highlights', async () => {
            const encryptedHighlight: HighlightDataV2 = {
                version: 2,
                id: 'hl-1',
                text: '[ENCRYPTED:data]',
                contentHash: 'hash1',
                colorRole: 'yellow',
                type: 'underscore',
                ranges: [],
                createdAt: new Date(),
            };

            const plaintextHighlight: HighlightDataV2 = {
                version: 2,
                id: 'hl-2',
                text: 'Plaintext legacy highlight',
                contentHash: 'hash2',
                colorRole: 'blue',
                type: 'underscore',
                ranges: [],
                createdAt: new Date(),
            };

            (mockInnerClient.getHighlights as any).mockResolvedValue([
                encryptedHighlight,
                plaintextHighlight,
            ]);

            const results = await encryptedAPIClient.getHighlights();

            expect(results).toHaveLength(2);
            // Plaintext should pass through unchanged
            expect(results[1].text).toBe('Plaintext legacy highlight');
        });

        it('should encrypt events before push', async () => {
            const event: SyncEvent = {
                event_id: 'evt-1',
                user_id: testUserId,
                type: 'highlight.created' as any, // Type assertion for test
                data: {
                    version: 2,
                    id: 'hl-1',
                    text: 'Event highlight text',
                    contentHash: 'hash',
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

            await encryptedAPIClient.pushEvents([event]);

            expect(mockInnerClient.pushEvents).toHaveBeenCalledTimes(1);
            const pushedEvents = (mockInnerClient.pushEvents as any).mock.calls[0][0];

            expect(pushedEvents[0].data.text).toContain('[ENCRYPTED:');
            expect(pushedEvents[0].data.text).not.toContain('Event highlight text');
        });
    });

    describe('Performance: Full Integration', () => {
        it('should complete full encrypt-store-retrieve-decrypt cycle in <500ms', async () => {
            await keyManager.generateKeyPair(testUserId);

            const highlight: HighlightDataV2 = {
                version: 2,
                id: 'perf-test-1',
                text: 'Performance test highlight with some content',
                contentHash: 'hash',
                colorRole: 'purple',
                type: 'underscore',
                ranges: [],
                createdAt: new Date(),
            };

            const startTime = performance.now();

            // Create (encrypt)
            await encryptedAPIClient.createHighlight(highlight);

            // Simulate retrieval
            const encrypted = (mockInnerClient.createHighlight as any).mock.calls[0][0];
            (mockInnerClient.getHighlights as any).mockResolvedValue([encrypted]);

            // Retrieve (decrypt)
            const results = await encryptedAPIClient.getHighlights();

            const totalTime = performance.now() - startTime;

            expect(results[0].text).toBe(highlight.text);
            expect(totalTime).toBeLessThan(500);
        });
    });
});
