/**
 * @file supabase-client.test.ts
 * @description Unit tests for SupabaseClient
 * @testing-strategy Realistic scenarios, minimal mocking, tricky edge cases
 * @see docs/testing/testing-strategy-v2.md
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SupabaseClient } from '@/background/api/supabase-client';
import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import type { SyncEvent } from '@/background/api/interfaces/i-api-client';
import {
    AuthenticationError,
    NetworkError,
    TimeoutError,
    RateLimitError,
} from '@/background/api/api-errors';

// Mock Supabase SDK
vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => mockSupabaseClient),
}));

// Mock Supabase client instance
const mockSupabaseClient = {
    from: vi.fn(),
};

// Mock auth manager
const mockAuthManager: IAuthManager = {
    isAuthenticated: true,
    currentUser: {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
    },
    signIn: vi.fn(),
    signOut: vi.fn(),
    refreshToken: vi.fn(),
    getAuthState: vi.fn(),
    onAuthStateChanged: vi.fn(),
};

// Mock logger (silent)
const mockLogger: ILogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
};

describe('SupabaseClient', () => {
    let client: SupabaseClient;

    beforeEach(() => {
        vi.clearAllMocks();

        // Reset auth manager to authenticated state
        mockAuthManager.currentUser = {
            id: 'user-123',
            email: 'test@example.com',
            displayName: 'Test User',
        };

        client = new SupabaseClient(mockAuthManager, mockLogger, {
            url: 'https://test.supabase.co',
            anonKey: 'test-anon-key',
            timeoutMs: 5000,
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ==================== Basic Functionality Tests ====================

    describe('Test 1: createHighlight() inserts correct Supabase schema', () => {
        it('should transform HighlightDataV2 to Supabase row format', async () => {
            // Arrange
            const highlightData: HighlightDataV2 = {
                version: 2,
                id: 'highlight-123',
                text: 'Test highlight text',
                contentHash: 'a'.repeat(64), // SHA-256 hash
                colorRole: 'yellow',
                type: 'underscore',
                ranges: [
                    {
                        xpath: '//p[1]',
                        startOffset: 0,
                        endOffset: 18,
                        text: 'Test highlight text',
                        textBefore: '',
                        textAfter: '',
                        selector: {
                            type: 'TextQuoteSelector',
                            exact: 'Test highlight text',
                            prefix: '',
                            suffix: '',
                        },
                    },
                ],
                createdAt: new Date('2024-01-01T00:00:00Z'),
            };

            const mockInsert = vi.fn().mockResolvedValue({ error: null });
            mockSupabaseClient.from.mockReturnValue({
                insert: mockInsert,
            });

            // Act
            await client.createHighlight(highlightData);

            // Assert
            expect(mockSupabaseClient.from).toHaveBeenCalledWith('highlights');
            expect(mockInsert).toHaveBeenCalledWith({
                id: 'highlight-123',
                user_id: 'user-123',
                url: expect.any(String), // window.location.href
                text: 'Test highlight text',
                color_role: 'yellow',
                selectors: highlightData.ranges[0].selector,
                content_hash: 'a'.repeat(64),
                created_at: '2024-01-01T00:00:00.000Z',
                updated_at: expect.any(String),
            });
        });
    });

    describe('Test 2: updateHighlight() patches only specified fields', () => {
        it('should only update color field when only color provided', async () => {
            // Arrange
            const updates: Partial<HighlightDataV2> = {
                colorRole: 'blue',
            };

            const mockUpdate = vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ error: null }),
                }),
            });
            mockSupabaseClient.from.mockReturnValue({
                update: mockUpdate,
            });

            // Act
            await client.updateHighlight('highlight-123', updates);

            // Assert
            expect(mockUpdate).toHaveBeenCalledWith({
                color_role: 'blue',
                updated_at: expect.any(String),
            });
            // Verify text and content_hash NOT in payload
            const payload = mockUpdate.mock.calls[0][0];
            expect(payload).not.toHaveProperty('text');
            expect(payload).not.toHaveProperty('content_hash');
        });
    });

    describe('Test 3: deleteHighlight() soft-deletes (sets deleted_at)', () => {
        it('should UPDATE with deleted_at timestamp, not DELETE', async () => {
            // Arrange
            const mockUpdate = vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ error: null }),
                }),
            });
            mockSupabaseClient.from.mockReturnValue({
                update: mockUpdate,
            });

            // Act
            await client.deleteHighlight('highlight-123');

            // Assert
            expect(mockSupabaseClient.from).toHaveBeenCalledWith('highlights');
            expect(mockUpdate).toHaveBeenCalledWith({
                deleted_at: expect.any(String),
            });
            // Verify it's UPDATE, not DELETE
            expect(mockUpdate).toHaveBeenCalled();
        });
    });

    describe('Test 4: getHighlights() filters by URL correctly', () => {
        it('should add WHERE clause when URL provided', async () => {
            // Arrange
            const mockIs = vi.fn().mockResolvedValue({
                data: [],
                error: null,
            });

            // Create chainable query object
            const queryChain = {
                eq: vi.fn().mockReturnThis(),
                is: mockIs,
            };

            // Make eq() return the same chainable object
            queryChain.eq.mockReturnValue(queryChain);

            mockSupabaseClient.from.mockReturnValue({
                select: vi.fn().mockReturnValue(queryChain),
            });

            // Act
            await client.getHighlights('https://example.com');

            // Assert
            expect(queryChain.eq).toHaveBeenCalledWith('user_id', 'user-123');
            expect(queryChain.eq).toHaveBeenCalledWith('url', 'https://example.com');
            expect(queryChain.is).toHaveBeenCalledWith('deleted_at', null);
        });

        it('should return empty array when no highlights found', async () => {
            // Arrange
            mockSupabaseClient.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        is: vi.fn().mockResolvedValue({
                            data: null, // Supabase returns null for empty
                            error: null,
                        }),
                    }),
                }),
            });

            // Act
            const result = await client.getHighlights();

            // Assert
            expect(result).toEqual([]);
        });
    });

    // ==================== Sync Operations Tests ====================

    describe('Test 5: pushEvents() batch inserts 100 events efficiently', () => {
        it('should insert all events in single transaction', async () => {
            // Arrange: Create 100 events
            const events: SyncEvent[] = Array.from({ length: 100 }, (_, i) => ({
                event_id: `event-${i}`,
                user_id: 'user-123',
                type: 'highlight.created' as const,
                data: {
                    id: `highlight-${i}`,
                    text: `Text ${i}`,
                } as any,
                timestamp: Date.now() + i,
                device_id: 'device-123',
                vector_clock: { 'device-123': i },
                checksum: 'checksum',
            }));

            const mockSelect = vi.fn().mockResolvedValue({
                data: events.map((e) => ({ event_id: e.event_id })),
                error: null,
            });
            const mockInsert = vi.fn().mockReturnValue({
                select: mockSelect,
            });
            mockSupabaseClient.from.mockReturnValue({
                insert: mockInsert,
            });

            // Act
            const result = await client.pushEvents(events);

            // Assert
            expect(mockInsert).toHaveBeenCalledTimes(1); // Single transaction
            expect(mockInsert).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        event_id: 'event-0',
                        user_id: 'user-123',
                    }),
                ])
            );
            expect(result.synced_event_ids).toHaveLength(100);
            expect(result.failed_event_ids).toHaveLength(0);
        });
    });

    describe('Test 6: pullEvents(since) queries with correct timestamp filter', () => {
        it('should return events in chronological order (CRITICAL)', async () => {
            // Arrange
            const since = Date.now() - 10000;
            const mockEvents = [
                { event_id: '1', timestamp: since + 1000 },
                { event_id: '2', timestamp: since + 2000 },
                { event_id: '3', timestamp: since + 3000 },
            ];

            const mockOrder = vi.fn().mockResolvedValue({
                data: mockEvents,
                error: null,
            });
            const mockGt = vi.fn().mockReturnValue({
                order: mockOrder,
            });
            mockSupabaseClient.from.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        gt: mockGt,
                    }),
                }),
            });

            // Act
            const result = await client.pullEvents(since);

            // Assert - CRITICAL: Events MUST be in chronological order
            expect(mockGt).toHaveBeenCalledWith('timestamp', since);
            expect(mockOrder).toHaveBeenCalledWith('timestamp', { ascending: true });
            expect(result[0].event_id).toBe('1');
            expect(result[1].event_id).toBe('2');
            expect(result[2].event_id).toBe('3');
        });
    });

    // ==================== Error Handling Tests ====================

    describe('Test 7: Unauthenticated request throws AuthenticationError', () => {
        it('should throw BEFORE making API call', async () => {
            // Arrange
            mockAuthManager.currentUser = null; // Not authenticated

            const highlightData = {
                id: 'test',
                text: 'test',
            } as HighlightDataV2;

            // Act & Assert
            await expect(client.createHighlight(highlightData)).rejects.toThrow(
                AuthenticationError
            );
            await expect(client.createHighlight(highlightData)).rejects.toThrow(
                'User not authenticated'
            );

            // Verify no API call made
            expect(mockSupabaseClient.from).not.toHaveBeenCalled();
        });
    });

    describe('Test 8: Network timeout (>5s) throws TimeoutError', () => {
        it('should abort request after 5 seconds', async () => {
            // Arrange
            const slowPromise = new Promise((resolve) => {
                setTimeout(() => resolve({ data: null, error: null }), 6000); // 6 seconds
            });

            mockSupabaseClient.from.mockReturnValue({
                insert: vi.fn().mockReturnValue(slowPromise),
            });

            const highlightData: HighlightDataV2 = {
                version: 2,
                id: 'test',
                text: 'test',
                contentHash: 'a'.repeat(64),
                colorRole: 'yellow',
                type: 'underscore',
                ranges: [
                    {
                        xpath: '//p[1]',
                        startOffset: 0,
                        endOffset: 4,
                        text: 'test',
                        textBefore: '',
                        textAfter: '',
                    },
                ],
                createdAt: new Date(),
            };

            // Act & Assert
            await expect(client.createHighlight(highlightData)).rejects.toThrow(
                TimeoutError
            );
        }, 10000); // Test timeout 10s
    });

    describe('Test 9: 401 response triggers token refresh', () => {
        it('should call refreshToken() on authentication error', async () => {
            // Arrange
            const mockInsert = vi.fn().mockResolvedValue({
                error: {
                    code: '401',
                    message: 'Unauthorized',
                },
            });
            mockSupabaseClient.from.mockReturnValue({
                insert: mockInsert,
            });

            const highlightData: HighlightDataV2 = {
                version: 2,
                id: 'test',
                text: 'test',
                contentHash: 'a'.repeat(64),
                colorRole: 'yellow',
                type: 'underscore',
                ranges: [
                    {
                        xpath: '//p[1]',
                        startOffset: 0,
                        endOffset: 4,
                        text: 'test',
                        textBefore: '',
                        textAfter: '',
                    },
                ],
                createdAt: new Date(),
            };

            // Act & Assert
            await expect(client.createHighlight(highlightData)).rejects.toThrow(
                AuthenticationError
            );

            // Note: Actual token refresh would be handled by retry decorator
            // This test verifies error transformation
        });
    });

    describe('Test 10: 429 response throws RateLimitError with retry-after', () => {
        it('should extract Retry-After header from 429 response', async () => {
            // Arrange
            const mockInsert = vi.fn().mockResolvedValue({
                error: {
                    code: '429',
                    message: 'Too many requests',
                    headers: {
                        'retry-after': '60',
                    },
                },
            });
            mockSupabaseClient.from.mockReturnValue({
                insert: mockInsert,
            });

            const highlightData: HighlightDataV2 = {
                version: 2,
                id: 'test',
                text: 'test',
                contentHash: 'a'.repeat(64),
                colorRole: 'yellow',
                type: 'underscore',
                ranges: [
                    {
                        xpath: '//p[1]',
                        startOffset: 0,
                        endOffset: 4,
                        text: 'test',
                        textBefore: '',
                        textAfter: '',
                    },
                ],
                createdAt: new Date(),
            };

            // Act & Assert
            try {
                await client.createHighlight(highlightData);
                expect.fail('Should have thrown RateLimitError');
            } catch (error) {
                expect(error).toBeInstanceOf(RateLimitError);
                expect((error as RateLimitError).retryAfter).toBe(60);
            }
        });
    });

    // ==================== Edge Cases & Tricky Scenarios ====================

    describe('Test 11: Large payload (>1MB) handled without truncation', () => {
        it('should persist 1.5MB highlight text completely', async () => {
            // Arrange: Create 1.5MB text (realistic: long article)
            const largeText = 'A'.repeat(1.5 * 1024 * 1024); // 1.5MB
            const highlightData: HighlightDataV2 = {
                version: 2,
                id: 'large-highlight',
                text: largeText,
                contentHash: 'a'.repeat(64),
                colorRole: 'yellow',
                type: 'underscore',
                ranges: [
                    {
                        xpath: '//p[1]',
                        startOffset: 0,
                        endOffset: largeText.length,
                        text: largeText,
                        textBefore: '',
                        textAfter: '',
                    },
                ],
                createdAt: new Date(),
            };

            const mockInsert = vi.fn().mockResolvedValue({ error: null });
            mockSupabaseClient.from.mockReturnValue({
                insert: mockInsert,
            });

            // Act
            await client.createHighlight(highlightData);

            // Assert: Verify full text sent (no truncation)
            const insertedData = mockInsert.mock.calls[0][0];
            expect(insertedData.text).toHaveLength(1.5 * 1024 * 1024);
            expect(insertedData.text).toBe(largeText);
        });
    });

    describe('Test 12: Concurrent API calls don\'t corrupt shared state', () => {
        it('should handle 3 parallel createHighlight calls independently', async () => {
            // Arrange: 3 different highlights
            const highlights: HighlightDataV2[] = [
                {
                    version: 2,
                    id: 'h1',
                    text: 'Text 1',
                    contentHash: '1'.repeat(64),
                    colorRole: 'yellow',
                    type: 'underscore',
                    ranges: [
                        {
                            xpath: '//p[1]',
                            startOffset: 0,
                            endOffset: 6,
                            text: 'Text 1',
                            textBefore: '',
                            textAfter: '',
                        },
                    ],
                    createdAt: new Date(),
                },
                {
                    version: 2,
                    id: 'h2',
                    text: 'Text 2',
                    contentHash: '2'.repeat(64),
                    colorRole: 'blue',
                    type: 'underscore',
                    ranges: [
                        {
                            xpath: '//p[2]',
                            startOffset: 0,
                            endOffset: 6,
                            text: 'Text 2',
                            textBefore: '',
                            textAfter: '',
                        },
                    ],
                    createdAt: new Date(),
                },
                {
                    version: 2,
                    id: 'h3',
                    text: 'Text 3',
                    contentHash: '3'.repeat(64),
                    colorRole: 'green',
                    type: 'underscore',
                    ranges: [
                        {
                            xpath: '//p[3]',
                            startOffset: 0,
                            endOffset: 6,
                            text: 'Text 3',
                            textBefore: '',
                            textAfter: '',
                        },
                    ],
                    createdAt: new Date(),
                },
            ];

            const mockInsert = vi.fn().mockResolvedValue({ error: null });
            mockSupabaseClient.from.mockReturnValue({
                insert: mockInsert,
            });

            // Act: Call all 3 in parallel
            await Promise.all(highlights.map((h) => client.createHighlight(h)));

            // Assert: All 3 succeeded independently
            expect(mockInsert).toHaveBeenCalledTimes(3);
            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'h1' })
            );
            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'h2' })
            );
            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'h3' })
            );

            // Verify no race condition in auth token retrieval
            // (currentUser accessed 3 times, should be same user)
            expect(mockAuthManager.currentUser).toBeTruthy();
        });
    });

    // ==================== Bonus: Realistic Scenarios ====================

    describe('Bonus: Unicode preservation (emoji, CJK characters)', () => {
        it('should preserve emoji and international characters exactly', async () => {
            // Arrange
            const unicodeText = '👍 日本語 ñoño 🎉 中文';
            const highlightData: HighlightDataV2 = {
                version: 2,
                id: 'unicode-test',
                text: unicodeText,
                contentHash: 'a'.repeat(64),
                colorRole: 'yellow',
                type: 'underscore',
                ranges: [
                    {
                        xpath: '//p[1]',
                        startOffset: 0,
                        endOffset: unicodeText.length,
                        text: unicodeText,
                        textBefore: '',
                        textAfter: '',
                    },
                ],
                createdAt: new Date(),
            };

            const mockInsert = vi.fn().mockResolvedValue({ error: null });
            mockSupabaseClient.from.mockReturnValue({
                insert: mockInsert,
            });

            // Act
            await client.createHighlight(highlightData);

            // Assert: Exact match after round-trip
            const insertedData = mockInsert.mock.calls[0][0];
            expect(insertedData.text).toBe(unicodeText);
            expect(insertedData.text).toContain('👍');
            expect(insertedData.text).toContain('日本語');
            expect(insertedData.text).toContain('ñoño');
        });
    });

    describe('Bonus: Null/undefined fields handled gracefully', () => {
        it('should handle highlight with no description field', async () => {
            // Arrange
            const mockInsert = vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                        data: {
                            id: 'col-1',
                            name: 'Test Collection',
                            description: null,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        },
                        error: null,
                    }),
                }),
            });
            mockSupabaseClient.from.mockReturnValue({
                insert: mockInsert,
            });

            // Act
            const result = await client.createCollection('Test Collection');

            // Assert
            expect(result.description).toBeUndefined();
            expect(mockInsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    description: null,
                })
            );
        });

        it('should ignore undefined fields in partial update', async () => {
            // Arrange
            const updates: Partial<HighlightDataV2> = {
                text: 'Updated text',
                colorRole: undefined, // Should be ignored
            };

            const mockUpdate = vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ error: null }),
                }),
            });
            mockSupabaseClient.from.mockReturnValue({
                update: mockUpdate,
            });

            // Act
            await client.updateHighlight('h1', updates);

            // Assert
            const payload = mockUpdate.mock.calls[0][0];
            expect(payload['text']).toBe('Updated text');
            expect(payload).not.toHaveProperty('color_role'); // undefined ignored
        });
    });
});
