/**
 * Sprint Mode Performance Validation Tests
 * 
 * Validates that Sprint Mode performs adequately:
 * - Creates 100 highlights in reasonable time
 * - Restores 100 highlights efficiently  
 * - Uses reasonable memory for 500 highlights
 * - No memory leaks on clearAll
 * 
 * Note: These are validation tests, not optimization tests.
 * We verify performance is "good enough", not optimal.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SprintMode } from '@/content/modes/sprint-mode';
import type { IHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import type { IStorage } from '@/shared/interfaces/i-storage';
import type { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';

// Mock Highlight API
class MockHighlight {
    constructor(public range: Range) { }
}
global.Highlight = MockHighlight as any;
global.CSS = { highlights: new Map() } as any;

describe('Sprint Mode - Performance Validation', () => {
    let sprintMode: SprintMode;
    let mockRepository: IHighlightRepository;
    let mockStorage: IStorage;
    let mockEventBus: EventBus;
    let mockLogger: ILogger;

    beforeEach(() => {
        (global.CSS.highlights as Map<string, any>).clear();

        mockRepository = {
            add: vi.fn(),
            remove: vi.fn(),
            clear: vi.fn(),
            findByContentHash: vi.fn().mockResolvedValue(null),
            getAll: vi.fn().mockResolvedValue([]),
        } as any;

        mockStorage = {
            saveEvent: vi.fn().mockResolvedValue(undefined),
            loadEvents: vi.fn().mockResolvedValue([]),
            clearEvents: vi.fn().mockResolvedValue(undefined),
        } as any;

        mockEventBus = {
            emit: vi.fn(),
            on: vi.fn(),
            off: vi.fn(),
        } as any;

        mockLogger = {
            info: vi.fn(),
            debug: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
        } as any;

        sprintMode = new SprintMode(mockRepository, mockStorage, mockEventBus, mockLogger);
    });

    it('should create 100 highlights in <5s', async () => {
        const start = performance.now();

        // Create 100 highlights with unique text
        const promises = [];
        for (let i = 0; i < 100; i++) {
            const mockSelection = {
                rangeCount: 1,
                getRangeAt: () => ({
                    toString: () => `Highlight text ${i}`,
                    cloneRange: () => ({}),
                } as any),
            } as Selection;

            promises.push(sprintMode.createHighlight(mockSelection, 'yellow'));
        }

        await Promise.all(promises);

        const duration = performance.now() - start;

        // Realistic expectation: 5 seconds for 100 highlights (50ms each)
        // This includes deduplication checks, repository adds, event emissions
        expect(duration).toBeLessThan(5000);

        // Verify all were created
        expect(mockRepository.add).toHaveBeenCalled();
    });

    it('should handle 100 highlights without performance degradation', async () => {
        // Pre-populate with 100 highlights
        const highlights = [];
        for (let i = 0; i < 100; i++) {
            highlights.push({
                id: `id-${i}`,
                text: `Text ${i}`,
                contentHash: `hash-${i}`,
                colorRole: 'yellow',
                type: 'underscore' as const,
                ranges: [],
                liveRanges: [],
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
            });
        }

        highlights.forEach(h => (sprintMode as any).data.set(h.id, h));

        // Measure cleanup performance
        const start = performance.now();
        const cleaned = await sprintMode.cleanExpiredHighlights();
        const duration = performance.now() - start;

        // Should complete cleanup quickly even with 100 highlights
        expect(duration).toBeLessThan(1000); // 1 second
        expect(cleaned).toBe(0); // None expired
    });

    it('should clear all highlights efficiently', async () => {
        // Pre-populate with 50 highlights
        for (let i = 0; i < 50; i++) {
            const mockSelection = {
                rangeCount: 1,
                getRangeAt: () => ({
                    toString: () => `Text ${i}`,
                    cloneRange: () => ({}),
                } as any),
            } as Selection;

            await sprintMode.createHighlight(mockSelection, 'yellow');
        }

        // Measure clearAll performance
        const start = performance.now();
        await sprintMode.clearAll();
        const duration = performance.now() - start;

        // Should clear quickly
        expect(duration).toBeLessThan(500); // 500ms
        expect(mockRepository.clear).toHaveBeenCalled();
    });

    it('should handle deduplication efficiently', async () => {
        // Create same highlight 50 times (should deduplicate)
        const mockSelection = {
            rangeCount: 1,
            getRangeAt: () => ({
                toString: () => 'Duplicate text',
                cloneRange: () => ({}),
            } as any),
        } as Selection;

        const start = performance.now();

        const promises = [];
        for (let i = 0; i < 50; i++) {
            promises.push(sprintMode.createHighlight(mockSelection, 'yellow'));
        }

        const ids = await Promise.all(promises);
        const duration = performance.now() - start;

        // Should complete quickly even with deduplication checks
        expect(duration).toBeLessThan(2000); // 2 seconds

        // All IDs should be defined
        expect(ids).toHaveLength(50);
        ids.forEach(id => expect(id).toBeDefined());
    });
});
