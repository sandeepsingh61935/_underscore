/**
 * Performance Optimization Benchmarks
 * 
 * Comprehensive performance testing for Sprint Mode:
 * - Highlight creation performance
 * - Memory usage optimization
 * - Storage operation benchmarks
 * - Restoration performance
 * - Deduplication efficiency
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SprintMode } from '@/content/modes/sprint-mode';
import { InMemoryHighlightRepository } from '@/shared/repositories/in-memory-highlight-repository';
import { EventBus } from '@/shared/utils/event-bus';
import { ConsoleLogger } from '@/shared/utils/logger';

describe('Performance Optimization Benchmarks', () => {
    let sprintMode: SprintMode;
    let repository: InMemoryHighlightRepository;
    let eventBus: EventBus;
    let logger: ConsoleLogger;
    let storage: any;

    beforeEach(() => {
        // Setup mocks
        global.CSS = {
            highlights: new Map(),
        } as any;

        global.Highlight = class {
            constructor(...ranges: Range[]) {
                return { ranges } as any;
            }
        } as any;

        // Mock storage
        storage = {
            get: vi.fn().mockResolvedValue(null),
            set: vi.fn().mockResolvedValue(undefined),
            remove: vi.fn().mockResolvedValue(undefined),
            clear: vi.fn().mockResolvedValue(undefined),
            saveEvent: vi.fn().mockResolvedValue(undefined),
        };

        // Create instances
        logger = new ConsoleLogger('test');
        eventBus = new EventBus(logger);
        repository = new InMemoryHighlightRepository(logger);
        sprintMode = new SprintMode(repository, storage, eventBus, logger);
    });

    afterEach(() => {
        (global.CSS.highlights as Map<string, any>).clear();
    });

    // ============================================
    // BENCHMARK 1: Highlight Creation Performance
    // ============================================
    describe('Highlight Creation Performance', () => {
        it('should create 100 highlights in under 5 seconds', async () => {
            const startTime = performance.now();
            const highlights: string[] = [];

            for (let i = 0; i < 100; i++) {
                const mockSelection = {
                    rangeCount: 1,
                    getRangeAt: () => ({
                        toString: () => `Performance test text ${i}`,
                        cloneRange: () => ({}),
                    } as any),
                } as Selection;

                const id = await sprintMode.createHighlight(mockSelection, 'yellow');
                highlights.push(id);
            }

            const endTime = performance.now();
            const duration = endTime - startTime;

            console.log(`Created 100 highlights in ${duration.toFixed(2)}ms`);
            expect(duration).toBeLessThan(5000); // 5 seconds
            expect(highlights.length).toBe(100);
        });

        it('should create highlights at consistent speed (no degradation)', async () => {
            const timings: number[] = [];

            for (let i = 0; i < 50; i++) {
                const start = performance.now();

                const mockSelection = {
                    rangeCount: 1,
                    getRangeAt: () => ({
                        toString: () => `Consistency test ${i}`,
                        cloneRange: () => ({}),
                    } as any),
                } as Selection;

                await sprintMode.createHighlight(mockSelection, 'yellow');

                const end = performance.now();
                timings.push(end - start);
            }

            // Calculate average and variance
            const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
            const variance = timings.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / timings.length;
            const stdDev = Math.sqrt(variance);

            console.log(`Average: ${avg.toFixed(2)}ms, StdDev: ${stdDev.toFixed(2)}ms`);

            // Performance should be consistent (low variance)
            expect(stdDev).toBeLessThan(avg * 0.5); // StdDev < 50% of average
        });
    });

    // ============================================
    // BENCHMARK 2: Memory Usage Optimization
    // ============================================
    describe('Memory Usage Optimization', () => {
        it('should maintain reasonable memory footprint for 1000 highlights', async () => {
            const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

            // Create 1000 highlights
            for (let i = 0; i < 1000; i++) {
                const mockSelection = {
                    rangeCount: 1,
                    getRangeAt: () => ({
                        toString: () => `Memory test ${i}`,
                        cloneRange: () => ({}),
                    } as any),
                } as Selection;

                await sprintMode.createHighlight(mockSelection, 'yellow');
            }

            const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
            const memoryUsed = finalMemory - initialMemory;

            console.log(`Memory used for 1000 highlights: ${(memoryUsed / 1024 / 1024).toFixed(2)}MB`);

            // Should use less than 100MB for 1000 highlights
            expect(memoryUsed).toBeLessThan(100 * 1024 * 1024);
        });

        it('should properly release memory on clearAll', async () => {
            // Create highlights
            for (let i = 0; i < 100; i++) {
                const mockSelection = {
                    rangeCount: 1,
                    getRangeAt: () => ({
                        toString: () => `Cleanup test ${i}`,
                        cloneRange: () => ({}),
                    } as any),
                } as Selection;

                await sprintMode.createHighlight(mockSelection, 'yellow');
            }

            const beforeClear = (global.CSS.highlights as Map<string, any>).size;
            expect(beforeClear).toBe(100);

            // Clear all
            await sprintMode.clearAll();

            const afterClear = (global.CSS.highlights as Map<string, any>).size;
            expect(afterClear).toBe(0);

            // Verify internal maps cleared
            expect((sprintMode as any).highlights.size).toBe(0);
            expect((sprintMode as any).data.size).toBe(0);
        });
    });

    // ============================================
    // BENCHMARK 3: Deduplication Efficiency
    // ============================================
    describe('Deduplication Efficiency', () => {
        it('should deduplicate 100 identical highlights efficiently', async () => {
            const startTime = performance.now();
            const ids: string[] = [];

            const mockSelection = {
                rangeCount: 1,
                getRangeAt: () => ({
                    toString: () => 'Duplicate text',
                    cloneRange: () => ({}),
                } as any),
            } as Selection;

            // Try to create 100 identical highlights
            for (let i = 0; i < 100; i++) {
                const id = await sprintMode.createHighlight(mockSelection, 'yellow');
                ids.push(id);
            }

            const endTime = performance.now();
            const duration = endTime - startTime;

            // All IDs should be the same (deduplicated)
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(1);

            // Should be fast (deduplication is efficient)
            console.log(`Deduplicated 100 attempts in ${duration.toFixed(2)}ms`);
            expect(duration).toBeLessThan(1000); // 1 second
        });

        it('should handle mixed duplicate/unique highlights efficiently', async () => {
            const startTime = performance.now();
            const ids: string[] = [];

            // Create 50 unique + 50 duplicates
            for (let i = 0; i < 100; i++) {
                const text = i < 50 ? `Unique ${i}` : `Unique ${i - 50}`; // Second half duplicates first half

                const mockSelection = {
                    rangeCount: 1,
                    getRangeAt: () => ({
                        toString: () => text,
                        cloneRange: () => ({}),
                    } as any),
                } as Selection;

                const id = await sprintMode.createHighlight(mockSelection, 'yellow');
                ids.push(id);
            }

            const endTime = performance.now();
            const duration = endTime - startTime;

            // Should have exactly 50 unique highlights
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(50);

            console.log(`Processed 100 highlights (50 unique) in ${duration.toFixed(2)}ms`);
            expect(duration).toBeLessThan(3000); // 3 seconds
        });
    });

    // ============================================
    // BENCHMARK 4: Bulk Operations
    // ============================================
    describe('Bulk Operations Performance', () => {
        it('should handle bulk deletion efficiently', async () => {
            // Create 100 highlights
            const ids: string[] = [];
            for (let i = 0; i < 100; i++) {
                const mockSelection = {
                    rangeCount: 1,
                    getRangeAt: () => ({
                        toString: () => `Bulk delete ${i}`,
                        cloneRange: () => ({}),
                    } as any),
                } as Selection;

                const id = await sprintMode.createHighlight(mockSelection, 'yellow');
                ids.push(id);
            }

            // Delete all individually
            const startTime = performance.now();
            for (const id of ids) {
                await sprintMode.removeHighlight(id);
            }
            const endTime = performance.now();
            const duration = endTime - startTime;

            console.log(`Deleted 100 highlights in ${duration.toFixed(2)}ms`);
            expect(duration).toBeLessThan(2000); // 2 seconds
            expect((global.CSS.highlights as Map<string, any>).size).toBe(0);
        });

        it('should clear all highlights instantly', async () => {
            // Create 500 highlights
            for (let i = 0; i < 500; i++) {
                const mockSelection = {
                    rangeCount: 1,
                    getRangeAt: () => ({
                        toString: () => `Clear all test ${i}`,
                        cloneRange: () => ({}),
                    } as any),
                } as Selection;

                await sprintMode.createHighlight(mockSelection, 'yellow');
            }

            // Clear all
            const startTime = performance.now();
            await sprintMode.clearAll();
            const endTime = performance.now();
            const duration = endTime - startTime;

            console.log(`Cleared 500 highlights in ${duration.toFixed(2)}ms`);
            expect(duration).toBeLessThan(100); // 100ms
            expect((global.CSS.highlights as Map<string, any>).size).toBe(0);
        });
    });

    // ============================================
    // BENCHMARK 5: Concurrent Operations
    // ============================================
    describe('Concurrent Operations Performance', () => {
        it('should handle concurrent highlight creation', async () => {
            const startTime = performance.now();

            // Create 50 highlights concurrently
            const promises = Array.from({ length: 50 }, (_, i) => {
                const mockSelection = {
                    rangeCount: 1,
                    getRangeAt: () => ({
                        toString: () => `Concurrent ${i}`,
                        cloneRange: () => ({}),
                    } as any),
                } as Selection;

                return sprintMode.createHighlight(mockSelection, 'yellow');
            });

            const ids = await Promise.all(promises);
            const endTime = performance.now();
            const duration = endTime - startTime;

            console.log(`Created 50 highlights concurrently in ${duration.toFixed(2)}ms`);
            expect(ids.length).toBe(50);
            expect(duration).toBeLessThan(2000); // 2 seconds
        });

        it('should maintain consistency during concurrent operations', async () => {
            // Mix of create and delete operations
            const createPromises = Array.from({ length: 25 }, (_, i) => {
                const mockSelection = {
                    rangeCount: 1,
                    getRangeAt: () => ({
                        toString: () => `Concurrent create ${i}`,
                        cloneRange: () => ({}),
                    } as any),
                } as Selection;

                return sprintMode.createHighlight(mockSelection, 'yellow');
            });

            const ids = await Promise.all(createPromises);

            // Now delete half while creating more
            const mixedPromises = [
                ...ids.slice(0, 12).map(id => sprintMode.removeHighlight(id)),
                ...Array.from({ length: 13 }, (_, i) => {
                    const mockSelection = {
                        rangeCount: 1,
                        getRangeAt: () => ({
                            toString: () => `Concurrent mixed ${i}`,
                            cloneRange: () => ({}),
                        } as any),
                    } as Selection;

                    return sprintMode.createHighlight(mockSelection, 'yellow');
                }),
            ];

            await Promise.all(mixedPromises);

            // Should have 25 - 12 + 13 = 26 highlights
            const finalCount = (global.CSS.highlights as Map<string, any>).size;
            expect(finalCount).toBe(26);
        });
    });
});
