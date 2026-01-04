/**
 * @file encrypted-api-client.test.ts
 * @description Unit tests for EncryptedAPIClient
 * @testing-strategy Mock inner client and encryption service, verify encryption flow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EncryptedAPIClient } from '@/background/api/encrypted-api-client';
import type { IAPIClient, SyncEvent, SyncEventType } from '@/background/api/interfaces/i-api-client';
import type { IEncryptionService, EncryptedHighlight } from '@/background/auth/interfaces/i-encryption-service';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';

describe('EncryptedAPIClient', () => {
    let encryptedClient: EncryptedAPIClient;
    let mockInnerClient: IAPIClient;
    let mockEncryptionService: IEncryptionService;
    let mockLogger: ILogger;
    const testUserId = 'user-123';

    beforeEach(() => {
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

        mockEncryptionService = {
            encrypt: vi.fn().mockResolvedValue({
                version: 1,
                keyId: 'key-123',
                data: 'encrypted-base64-data',
                timestamp: Date.now(),
            }),
            decrypt: vi.fn().mockResolvedValue({
                text: 'Decrypted text',
                url: 'https://example.com',
                selector: '[]',
                createdAt: new Date(),
                userId: testUserId,
            }),
        };

        mockLogger = {
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            setLevel: vi.fn(),
            getLevel: vi.fn(),
        };

        encryptedClient = new EncryptedAPIClient(
            mockInnerClient,
            mockEncryptionService,
            mockLogger,
            testUserId
        );
    });

    describe('createHighlight()', () => {
        it('should encrypt highlight before creating', async () => {
            const highlight: HighlightDataV2 = {
                version: 2,
                id: 'hl-1',
                text: 'Sensitive text',
                contentHash: 'hash',
                colorRole: 'yellow',
                type: 'underscore',
                ranges: [{ xpath: '//p[1]', startOffset: 0, endOffset: 10, text: 'Sensitive text', textBefore: '', textAfter: '', selector: { type: 'TextQuoteSelector', exact: 'Sensitive text', prefix: '', suffix: '' } }],
                createdAt: new Date(),
            };

            await encryptedClient.createHighlight(highlight);

            // Verify encryption was called
            expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(
                expect.objectContaining({
                    text: 'Sensitive text',
                    userId: testUserId,
                })
            );

            // Verify inner client received encrypted data
            expect(mockInnerClient.createHighlight).toHaveBeenCalledWith(
                expect.objectContaining({
                    text: expect.stringContaining('[ENCRYPTED:'),
                })
            );
        });

        it('should handle encryption errors gracefully', async () => {
            (mockEncryptionService.encrypt as any).mockRejectedValue(new Error('Encryption failed'));

            const highlight: HighlightDataV2 = {
                version: 2,
                id: 'hl-1',
                text: 'Text',
                contentHash: 'hash',
                colorRole: 'yellow',
                type: 'underscore',
                ranges: [],
                createdAt: new Date(),
            };

            await expect(encryptedClient.createHighlight(highlight)).rejects.toThrow('Encryption failed');
        });
    });

    describe('getHighlights()', () => {
        it('should decrypt highlights after retrieval', async () => {
            const encryptedHighlight: HighlightDataV2 = {
                version: 2,
                id: 'hl-1',
                text: '[ENCRYPTED:encrypted-base64-data]',
                contentHash: 'hash',
                colorRole: 'yellow',
                type: 'underscore',
                ranges: [],
                createdAt: new Date(),
            };

            (mockInnerClient.getHighlights as any).mockResolvedValue([encryptedHighlight]);

            const result = await encryptedClient.getHighlights();

            // Verify decryption was called
            expect(mockEncryptionService.decrypt).toHaveBeenCalled();

            // Verify result contains decrypted data
            expect(result[0].text).toBe('Decrypted text');
        });

        it('should handle legacy plaintext highlights', async () => {
            const plaintextHighlight: HighlightDataV2 = {
                version: 2,
                id: 'hl-1',
                text: 'Plaintext highlight',
                contentHash: 'hash',
                colorRole: 'yellow',
                type: 'underscore',
                ranges: [],
                createdAt: new Date(),
            };

            (mockInnerClient.getHighlights as any).mockResolvedValue([plaintextHighlight]);

            const result = await encryptedClient.getHighlights();

            // Should not attempt decryption
            expect(mockEncryptionService.decrypt).not.toHaveBeenCalled();

            // Should return plaintext as-is
            expect(result[0].text).toBe('Plaintext highlight');
        });

        it('should handle decryption failures gracefully', async () => {
            const encryptedHighlight: HighlightDataV2 = {
                version: 2,
                id: 'hl-1',
                text: '[ENCRYPTED:corrupted-data]',
                contentHash: 'hash',
                colorRole: 'yellow',
                type: 'underscore',
                ranges: [],
                createdAt: new Date(),
            };

            (mockInnerClient.getHighlights as any).mockResolvedValue([encryptedHighlight]);
            (mockEncryptionService.decrypt as any).mockRejectedValue(new Error('Decryption failed'));

            const result = await encryptedClient.getHighlights();

            // Should return placeholder for failed decryption
            expect(result[0].text).toBe('[DECRYPTION FAILED]');
            expect(mockLogger.warn).toHaveBeenCalled();
        });
    });

    describe('pushEvents()', () => {
        it('should encrypt highlight events before pushing', async () => {
            const event: SyncEvent = {
                event_id: 'evt-1',
                user_id: testUserId,
                type: 'highlight.created' as SyncEventType,
                data: {
                    version: 2,
                    id: 'hl-1',
                    text: 'Sensitive text',
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

            await encryptedClient.pushEvents([event]);

            // Verify encryption was called
            expect(mockEncryptionService.encrypt).toHaveBeenCalled();

            // Verify inner client received encrypted event
            const callArgs = (mockInnerClient.pushEvents as any).mock.calls[0][0];
            expect(callArgs[0].data.text).toContain('[ENCRYPTED:');
        });

        it('should not encrypt collection events', async () => {
            const event: SyncEvent = {
                event_id: 'evt-1',
                user_id: testUserId,
                type: 'collection.created' as SyncEventType,
                data: { id: 'col-1', name: 'Test Collection', created_at: new Date(), updated_at: new Date() },
                timestamp: Date.now(),
                device_id: 'device-1',
                vector_clock: {},
                checksum: 'checksum',
            };

            await encryptedClient.pushEvents([event]);

            // Should not encrypt collection events
            expect(mockEncryptionService.encrypt).not.toHaveBeenCalled();
        });
    });

    describe('pullEvents()', () => {
        it('should decrypt highlight events after pulling', async () => {
            const encryptedEvent: SyncEvent = {
                event_id: 'evt-1',
                user_id: testUserId,
                type: 'highlight.created' as SyncEventType,
                data: {
                    version: 2,
                    id: 'hl-1',
                    text: '[ENCRYPTED:encrypted-data]',
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

            (mockInnerClient.pullEvents as any).mockResolvedValue([encryptedEvent]);

            const result = await encryptedClient.pullEvents(Date.now());

            // Verify decryption was called
            expect(mockEncryptionService.decrypt).toHaveBeenCalled();

            // Verify result contains decrypted data
            expect((result[0].data as HighlightDataV2).text).toBe('Decrypted text');
        });

        it('should not decrypt collection events', async () => {
            const collectionEvent: SyncEvent = {
                event_id: 'evt-1',
                user_id: testUserId,
                type: 'collection.created' as SyncEventType,
                data: { id: 'col-1', name: 'Test', created_at: new Date(), updated_at: new Date() },
                timestamp: Date.now(),
                device_id: 'device-1',
                vector_clock: {},
                checksum: 'checksum',
            };

            (mockInnerClient.pullEvents as any).mockResolvedValue([collectionEvent]);

            const result = await encryptedClient.pullEvents(Date.now());

            // Should not decrypt
            expect(mockEncryptionService.decrypt).not.toHaveBeenCalled();

            // Should return as-is
            expect(result[0].data).toEqual(collectionEvent.data);
        });
    });

    describe('Collection operations', () => {
        it('should pass through createCollection without encryption', async () => {
            await encryptedClient.createCollection('Test Collection', 'Description');

            expect(mockInnerClient.createCollection).toHaveBeenCalledWith('Test Collection', 'Description');
            expect(mockEncryptionService.encrypt).not.toHaveBeenCalled();
        });

        it('should pass through getCollections without decryption', async () => {
            await encryptedClient.getCollections();

            expect(mockInnerClient.getCollections).toHaveBeenCalled();
            expect(mockEncryptionService.decrypt).not.toHaveBeenCalled();
        });
    });

    describe('Delete operations', () => {
        it('should pass through deleteHighlight without encryption', async () => {
            await encryptedClient.deleteHighlight('hl-1');

            expect(mockInnerClient.deleteHighlight).toHaveBeenCalledWith('hl-1');
            expect(mockEncryptionService.encrypt).not.toHaveBeenCalled();
        });
    });
});
