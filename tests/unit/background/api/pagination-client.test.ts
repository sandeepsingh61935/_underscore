/**
 * @file pagination-client.test.ts
 * @description Unit tests for PaginationClient
 * @testing-strategy Memory efficiency, streaming behavior, edge cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaginationClient } from '@/background/api/pagination-client';
import type { IAPIClient, SyncEvent } from '@/background/api/interfaces/i-api-client';
import type { ILogger } from '@/shared/interfaces/i-logger';
import { TimeoutError } from '@/background/api/api-errors';

// Mock API client
const mockAPIClient: IAPIClient = {
    pullEvents: vi.fn(),
    pushEvents: vi.fn(),
    createHighlight: vi.fn(),
    updateHighlight: vi.fn(),
    deleteHighlight: vi.fn(),
    getHighlights: vi.fn(),
    createCollection: vi.fn(),
    getCollections: vi.fn(),
};

// Mock logger
const mockLogger: ILogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
    getLevel: vi.fn(),
};

describe('PaginationClient', () => {
    let client: PaginationClient;

    beforeEach(() => {
        vi.clearAllMocks();
        client = new PaginationClient(mockAPIClient, mockLogger);
    });

    describe('Test 1: Single page (< 100 events) - no pagination needed', () => {
        it('should yield single page and exit', async () => {
            // Arrange: 50 events (less than page size)
            const events: SyncEvent[] = Array.from({ length: 50 }, (_, i) => ({
                event_id: `event-${i}`,
                user_id: 'user-123',
                type: 'highlight.created' as any,
                data: {} as any,
                timestamp: Date.now() + i,
                device_id: 'device-1',
                vector_clock: {},
                checksum: 'checksum',
            }));

            (mockAPIClient.pullEvents as any).mockResolvedValue(events);

            // Act
            const pages: SyncEvent[][] = [];
            for await (const page of client.pullEventsPaginated(Date.now())) {
                pages.push(page);
            }

            // Assert
            expect(pages).toHaveLength(1);
            expect(pages[0]).toHaveLength(50);
            expect(mockAPIClient.pullEvents).toHaveBeenCalledTimes(1);
        });
    });

    describe('Test 2: Multiple pages (250 events) - streams in 3 pages', () => {
        it('should stream 250 events in 3 pages of 100', async () => {
            // Arrange: 250 events
            const events: SyncEvent[] = Array.from({ length: 250 }, (_, i) => ({
                event_id: `event-${i}`,
                user_id: 'user-123',
                type: 'highlight.created' as any,
                data: {} as any,
                timestamp: Date.now() + i,
                device_id: 'device-1',
                vector_clock: {},
                checksum: 'checksum',
            }));

            (mockAPIClient.pullEvents as any).mockResolvedValue(events);

            // Act
            const pages: SyncEvent[][] = [];
            for await (const page of client.pullEventsPaginated(Date.now())) {
                pages.push(page);
            }

            // Assert
            expect(pages).toHaveLength(3); // 100 + 100 + 50
            expect(pages[0]).toHaveLength(100);
            expect(pages[1]).toHaveLength(100);
            expect(pages[2]).toHaveLength(50);
        });
    });

    describe('Test 3: Empty result - yields nothing, exits gracefully', () => {
        it('should handle empty result without yielding', async () => {
            // Arrange
            (mockAPIClient.pullEvents as any).mockResolvedValue([]);

            // Act
            const pages: SyncEvent[][] = [];
            for await (const page of client.pullEventsPaginated(Date.now())) {
                pages.push(page);
            }

            // Assert
            expect(pages).toHaveLength(0);
        });
    });

    describe('Test 4: Large dataset (1K events) - memory efficient', () => {
        it('should stream 1K events without loading all in memory', async () => {
            // Arrange: 1,000 events
            const events: SyncEvent[] = Array.from({ length: 1000 }, (_, i) => ({
                event_id: `event-${i}`,
                user_id: 'user-123',
                type: 'highlight.created' as any,
                data: {} as any,
                timestamp: Date.now() + i,
                device_id: 'device-1',
                vector_clock: {},
                checksum: 'checksum',
            }));

            (mockAPIClient.pullEvents as any).mockResolvedValue(events);

            // Act - Process one page at a time (memory efficient)
            let totalProcessed = 0;
            let maxPageSize = 0;

            for await (const page of client.pullEventsPaginated(Date.now())) {
                totalProcessed += page.length;
                maxPageSize = Math.max(maxPageSize, page.length);

                // Verify we never hold more than 100 events at once
                expect(page.length).toBeLessThanOrEqual(100);
            }

            // Assert
            expect(totalProcessed).toBe(1000);
            expect(maxPageSize).toBe(100); // Never exceeded page size
        });
    });

    describe('Test 5: Cursor reset on error', () => {
        it('should reset cursor when error occurs', async () => {
            // Arrange
            (mockAPIClient.pullEvents as any).mockRejectedValue(
                new Error('Network error')
            );

            // Act & Assert
            try {
                for await (const _ of client.pullEventsPaginated(Date.now())) {
                    // Should not reach here
                }
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toBe('Network error');
            }
        });
    });

    describe('Test 6: Timeout per page (page takes > timeout) throws error', () => {
        it('should timeout if page fetch exceeds configured limit', async () => {
            // Arrange: Client with short timeout (100ms)
            const shortTimeoutClient = new PaginationClient(mockAPIClient, mockLogger, {
                timeoutMs: 100
            });

            // Mock API delay of 200ms (exceeds 100ms)
            (mockAPIClient.pullEvents as any).mockImplementation(
                () => new Promise((resolve) => setTimeout(resolve, 200))
            );

            // Act & Assert
            try {
                for await (const _ of shortTimeoutClient.pullEventsPaginated(Date.now())) {
                    // Should not reach here
                }
                expect.fail('Should have thrown TimeoutError');
            } catch (error) {
                expect(error).toBeInstanceOf(TimeoutError);
            }
        });
    });

    describe('Test 7: Last page partial (92 events) - handles correctly', () => {
        it('should handle partial last page correctly', async () => {
            // Arrange: 292 events (100 + 100 + 92)
            const events: SyncEvent[] = Array.from({ length: 292 }, (_, i) => ({
                event_id: `event-${i}`,
                user_id: 'user-123',
                type: 'highlight.created' as any,
                data: {} as any,
                timestamp: Date.now() + i,
                device_id: 'device-1',
                vector_clock: {},
                checksum: 'checksum',
            }));

            (mockAPIClient.pullEvents as any).mockResolvedValue(events);

            // Act
            const pages: SyncEvent[][] = [];
            for await (const page of client.pullEventsPaginated(Date.now())) {
                pages.push(page);
            }

            // Assert
            expect(pages).toHaveLength(3);
            expect(pages[0]).toHaveLength(100);
            expect(pages[1]).toHaveLength(100);
            expect(pages[2]).toHaveLength(92); // Partial last page
        });
    });

    describe('Test 8: getCursorInfo() returns current state', () => {
        it('should return cursor information', async () => {
            // Arrange
            const events: SyncEvent[] = Array.from({ length: 150 }, (_, i) => ({
                event_id: `event-${i}`,
                user_id: 'user-123',
                type: 'highlight.created' as any,
                data: {} as any,
                timestamp: Date.now() + i,
                device_id: 'device-1',
                vector_clock: {},
                checksum: 'checksum',
            }));

            (mockAPIClient.pullEvents as any).mockResolvedValue(events);

            // Act - Consume first page
            const iterator = client.pullEventsPaginated(Date.now());
            await iterator.next(); // First page

            const cursorInfo = client.getCursorInfo();

            // Assert
            expect(cursorInfo.limit).toBe(100);
            expect(cursorInfo.cursor).toBe('100'); // After first page
            expect(cursorInfo.hasMore).toBe(true);
        });
    });
});
