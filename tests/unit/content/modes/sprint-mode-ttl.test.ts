/**
 * Sprint Mode TTL Tests
 * 
 * Tests for 4-hour Time-To-Live (TTL) auto-deletion functionality
 * Sprint Mode Philosophy: "Use and forget" - highlights expire after 4 hours
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SprintMode } from '@/content/modes/sprint-mode';
import { InMemoryHighlightRepository } from '@/shared/repositories/in-memory-highlight-repository';
import type { IStorage } from '@/shared/interfaces/i-storage';
import { EventBus } from '@/shared/utils/event-bus';
import { ConsoleLogger, LogLevel } from '@/shared/utils/logger';

describe('SprintMode - TTL Functionality', () => {
    let sprintMode: SprintMode;
    let repository: InMemoryHighlightRepository;
    let mockStorage: IStorage;
    let eventBus: EventBus;
    let logger: ConsoleLogger;

    beforeEach(() => {
        // Mock CSS Highlight API (not available in JSDOM)
        if (typeof global.Highlight === 'undefined') {
            // @ts-ignore
            global.Highlight = class Highlight {
                constructor(...ranges: Range[]) {
                    // Mock implementation
                }
            };
        }

        if (!global.CSS || !global.CSS.highlights) {
            // @ts-ignore
            global.CSS = { highlights: new Map() };
        }

        // Setup dependencies
        repository = new InMemoryHighlightRepository();
        eventBus = new EventBus(new ConsoleLogger('test', LogLevel.NONE));
        logger = new ConsoleLogger('sprint-mode-test', LogLevel.NONE);

        // Mock storage
        mockStorage = {
            saveEvent: vi.fn().mockResolvedValue(undefined),
            loadEvents: vi.fn().mockResolvedValue([]),
            clear: vi.fn().mockResolvedValue(undefined),
        };

        sprintMode = new SprintMode(repository, mockStorage, eventBus, logger);
    });

    describe('Highlight Creation with TTL', () => {
        it('should set expiresAt to 4 hours from creation', async () => {
            // Arrange
            const selection = createMockSelection('Test highlight text');
            const beforeCreate = Date.now();

            // Act
            const id = await sprintMode.createHighlight(selection, 'yellow');

            // Assert
            const highlight = sprintMode.getHighlight(id);
            expect(highlight).toBeTruthy();
            expect(highlight!.expiresAt).toBeDefined();

            const fourHoursMs = 4 * 60 * 60 * 1000;
            const expectedExpiry = beforeCreate + fourHoursMs;
            const actualExpiry = highlight!.expiresAt!.getTime();

            // Allow 100ms tolerance for test execution time
            expect(actualExpiry).toBeGreaterThanOrEqual(expectedExpiry - 100);
            expect(actualExpiry).toBeLessThanOrEqual(expectedExpiry + 100);
        });

        it('should include createdAt timestamp', async () => {
            // Arrange
            const selection = createMockSelection('Test text');
            const beforeCreate = Date.now();

            // Act
            const id = await sprintMode.createHighlight(selection, 'blue');

            // Assert
            const highlight = sprintMode.getHighlight(id);
            expect(highlight!.createdAt).toBeDefined();
            expect(highlight!.createdAt!.getTime()).toBeGreaterThanOrEqual(beforeCreate);
            expect(highlight!.createdAt!.getTime()).toBeLessThanOrEqual(Date.now());
        });
    });

    describe('cleanExpiredHighlights()', () => {
        it('should remove highlights past their expiration time', async () => {
            // Arrange: Create highlight with past expiration
            const selection = createMockSelection('Expired highlight');
            const id = await sprintMode.createHighlight(selection, 'yellow');

            // Manually set expiration to past
            const highlight = sprintMode.getHighlight(id)!;
            highlight.expiresAt = new Date(Date.now() - 1000); // 1 second ago

            // Act
            const cleanedCount = await sprintMode.cleanExpiredHighlights();

            // Assert
            expect(cleanedCount).toBe(1);
            expect(sprintMode.getHighlight(id)).toBeNull();
        });

        it('should NOT remove highlights that have not expired', async () => {
            // Arrange
            const selection = createMockSelection('Fresh highlight');
            const id = await sprintMode.createHighlight(selection, 'blue');

            // Act
            const cleanedCount = await sprintMode.cleanExpiredHighlights();

            // Assert
            expect(cleanedCount).toBe(0);
            expect(sprintMode.getHighlight(id)).toBeTruthy();
        });

        it('should remove multiple expired highlights', async () => {
            // Arrange: Create 3 expired and 2 fresh highlights
            const expired1 = await sprintMode.createHighlight(createMockSelection('Expired 1'), 'yellow');
            const expired2 = await sprintMode.createHighlight(createMockSelection('Expired 2'), 'blue');
            const expired3 = await sprintMode.createHighlight(createMockSelection('Expired 3'), 'green');
            const fresh1 = await sprintMode.createHighlight(createMockSelection('Fresh 1'), 'yellow');
            const fresh2 = await sprintMode.createHighlight(createMockSelection('Fresh 2'), 'blue');

            // Set 3 to expired
            sprintMode.getHighlight(expired1)!.expiresAt = new Date(Date.now() - 1000);
            sprintMode.getHighlight(expired2)!.expiresAt = new Date(Date.now() - 2000);
            sprintMode.getHighlight(expired3)!.expiresAt = new Date(Date.now() - 3000);

            // Act
            const cleanedCount = await sprintMode.cleanExpiredHighlights();

            // Assert
            expect(cleanedCount).toBe(3);
            expect(sprintMode.getHighlight(expired1)).toBeNull();
            expect(sprintMode.getHighlight(expired2)).toBeNull();
            expect(sprintMode.getHighlight(expired3)).toBeNull();
            expect(sprintMode.getHighlight(fresh1)).toBeTruthy();
            expect(sprintMode.getHighlight(fresh2)).toBeTruthy();
        });

        it('should return 0 when no highlights are expired', async () => {
            // Arrange
            await sprintMode.createHighlight(createMockSelection('Fresh 1'), 'yellow');
            await sprintMode.createHighlight(createMockSelection('Fresh 2'), 'blue');

            // Act
            const cleanedCount = await sprintMode.cleanExpiredHighlights();

            // Assert
            expect(cleanedCount).toBe(0);
        });

        it('should persist TTL cleanup event to storage', async () => {
            // Arrange
            const id = await sprintMode.createHighlight(createMockSelection('Expired'), 'yellow');
            sprintMode.getHighlight(id)!.expiresAt = new Date(Date.now() - 1000);

            // Act
            await sprintMode.cleanExpiredHighlights();

            // Assert
            expect(mockStorage.saveEvent).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'highlights.ttl_cleanup',
                    count: 1,
                    ids: [id],
                })
            );
        });

        it('should NOT persist event when no highlights cleaned', async () => {
            // Arrange
            await sprintMode.createHighlight(createMockSelection('Fresh'), 'yellow');
            vi.clearAllMocks();

            // Act
            await sprintMode.cleanExpiredHighlights();

            // Assert
            expect(mockStorage.saveEvent).not.toHaveBeenCalled();
        });
    });

    describe('onActivate() - Automatic TTL Cleanup', () => {
        it('should clean expired highlights on activation', async () => {
            // Arrange: Create expired highlight
            const id = await sprintMode.createHighlight(createMockSelection('Expired'), 'yellow');
            sprintMode.getHighlight(id)!.expiresAt = new Date(Date.now() - 1000);

            // Act
            await sprintMode.onActivate();

            // Assert
            expect(sprintMode.getHighlight(id)).toBeNull();
        });

        it('should log cleanup count on activation', async () => {
            // Arrange
            const loggerSpy = vi.spyOn(logger, 'info');
            const id1 = await sprintMode.createHighlight(createMockSelection('Expired 1'), 'yellow');
            const id2 = await sprintMode.createHighlight(createMockSelection('Expired 2'), 'blue');

            sprintMode.getHighlight(id1)!.expiresAt = new Date(Date.now() - 1000);
            sprintMode.getHighlight(id2)!.expiresAt = new Date(Date.now() - 2000);

            // Act
            await sprintMode.onActivate();

            // Assert
            expect(loggerSpy).toHaveBeenCalledWith(
                expect.stringContaining('cleaned 2 expired highlights')
            );
        });
    });

    describe('Edge Cases', () => {
        it('should handle highlights without expiresAt field (legacy data)', async () => {
            // Arrange: Simulate legacy highlight without expiresAt
            const selection = createMockSelection('Legacy highlight');
            const id = await sprintMode.createHighlight(selection, 'yellow');
            const highlight = sprintMode.getHighlight(id)!;
            delete highlight.expiresAt; // Remove expiresAt to simulate legacy data

            // Act
            const cleanedCount = await sprintMode.cleanExpiredHighlights();

            // Assert
            expect(cleanedCount).toBe(0);
            expect(sprintMode.getHighlight(id)).toBeTruthy(); // Should NOT be deleted
        });

        it('should handle exactly at expiration boundary (edge timestamp)', async () => {
            // Arrange
            const id = await sprintMode.createHighlight(createMockSelection('Boundary test'), 'yellow');
            const now = Date.now();
            sprintMode.getHighlight(id)!.expiresAt = new Date(now); // Exactly now

            // Act (advance time by 1ms)
            vi.useFakeTimers();
            vi.setSystemTime(now + 1);
            const cleanedCount = await sprintMode.cleanExpiredHighlights();
            vi.useRealTimers();

            // Assert
            expect(cleanedCount).toBe(1); // Should be cleaned (expired)
        });

        it('should handle empty highlight list', async () => {
            // Act
            const cleanedCount = await sprintMode.cleanExpiredHighlights();

            // Assert
            expect(cleanedCount).toBe(0);
        });
    });
});

// Helper function to create mock Selection
function createMockSelection(text: string): Selection {
    const range = document.createRange();
    const textNode = document.createTextNode(text);
    document.body.appendChild(textNode);
    range.selectNodeContents(textNode);

    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    return selection;
}
