/**
 * @file cache-manager.test.ts
 * @description Unit tests for CacheManager (LRU + TTL)
 * @testing-strategy LRU eviction, TTL expiration, statistics accuracy
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheManager } from '@/background/api/cache-manager';
import type { ILogger } from '@/shared/interfaces/i-logger';

// Mock logger
const mockLogger: ILogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
    getLevel: vi.fn(),
};

describe('CacheManager', () => {
    let cache: CacheManager<string, string>;

    beforeEach(() => {
        vi.clearAllMocks();
        cache = new CacheManager<string, string>(mockLogger, {
            maxSize: 3,
            ttlMs: 1000, // 1 second for fast tests
        });
    });

    describe('Test 1: Basic set/get operations', () => {
        it('should store and retrieve values', () => {
            // Act
            cache.set('key1', 'value1');
            const result = cache.get('key1');

            // Assert
            expect(result).toBe('value1');
        });

        it('should return null for non-existent key', () => {
            // Act
            const result = cache.get('nonexistent');

            // Assert
            expect(result).toBeNull();
        });
    });

    describe('Test 2: LRU eviction when cache is full', () => {
        it('should evict oldest entry when maxSize reached', () => {
            // Arrange: Fill cache to capacity (3 entries)
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');

            // Act: Add 4th entry (should evict key1)
            cache.set('key4', 'value4');

            // Assert
            expect(cache.get('key1')).toBeNull(); // Evicted
            expect(cache.get('key2')).toBe('value2');
            expect(cache.get('key3')).toBe('value3');
            expect(cache.get('key4')).toBe('value4');
        });
    });

    describe('Test 3: LRU updates on access', () => {
        it('should move accessed entry to end (most recently used)', () => {
            // Arrange: Fill cache
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');

            // Act: Access key1 (moves to end)
            cache.get('key1');

            // Add 4th entry (should evict key2, not key1)
            cache.set('key4', 'value4');

            // Assert
            expect(cache.get('key1')).toBe('value1'); // Still present
            expect(cache.get('key2')).toBeNull(); // Evicted
            expect(cache.get('key3')).toBe('value3');
            expect(cache.get('key4')).toBe('value4');
        });
    });

    describe('Test 4: TTL expiration', () => {
        it('should return null for expired entries', async () => {
            // Arrange
            cache.set('key1', 'value1');

            // Act: Wait for TTL to expire (1 second)
            await new Promise((resolve) => setTimeout(resolve, 1100));

            const result = cache.get('key1');

            // Assert
            expect(result).toBeNull();
        });

        it('should not return expired entry even if within maxSize', async () => {
            // Arrange
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');

            // Act: Wait for TTL
            await new Promise((resolve) => setTimeout(resolve, 1100));

            // Assert
            expect(cache.get('key1')).toBeNull();
            expect(cache.get('key2')).toBeNull();
        });
    });

    describe('Test 5: Invalidate removes entry', () => {
        it('should remove entry on invalidate', () => {
            // Arrange
            cache.set('key1', 'value1');

            // Act
            cache.invalidate('key1');

            // Assert
            expect(cache.get('key1')).toBeNull();
        });

        it('should not throw on invalidating non-existent key', () => {
            // Act & Assert
            expect(() => cache.invalidate('nonexistent')).not.toThrow();
        });
    });

    describe('Test 6: Clear removes all entries', () => {
        it('should remove all entries and reset stats', () => {
            // Arrange
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.get('key1'); // Hit
            cache.get('nonexistent'); // Miss

            // Act
            cache.clear();

            // Assert - Check stats first (before new get() calls add misses)
            const stats = cache.getStats();
            expect(stats.size).toBe(0);
            expect(stats.hits).toBe(0);
            expect(stats.misses).toBe(0);

            // Then verify entries are gone
            expect(cache.get('key1')).toBeNull();
            expect(cache.get('key2')).toBeNull();
        });
    });

    describe('Test 7: Statistics tracking', () => {
        it('should track hits and misses accurately', () => {
            // Arrange
            cache.set('key1', 'value1');

            // Act
            cache.get('key1'); // Hit
            cache.get('key1'); // Hit
            cache.get('key2'); // Miss
            cache.get('key3'); // Miss

            const stats = cache.getStats();

            // Assert
            expect(stats.hits).toBe(2);
            expect(stats.misses).toBe(2);
            expect(stats.hitRate).toBe(0.5); // 2/4
            expect(stats.missRate).toBe(0.5); // 2/4
        });

        it('should calculate hit rate correctly', () => {
            // Arrange
            cache.set('key1', 'value1');

            // Act: 3 hits, 1 miss
            cache.get('key1'); // Hit
            cache.get('key1'); // Hit
            cache.get('key1'); // Hit
            cache.get('key2'); // Miss

            const stats = cache.getStats();

            // Assert
            expect(stats.hitRate).toBe(0.75); // 3/4
            expect(stats.missRate).toBe(0.25); // 1/4
        });
    });

    describe('Test 8: Update existing key (LRU position)', () => {
        it('should update value and move to end on set', () => {
            // Arrange
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');

            // Act: Update key1 (should move to end)
            cache.set('key1', 'updated1');

            // Add 4th entry (should evict key2, not key1)
            cache.set('key4', 'value4');

            // Assert
            expect(cache.get('key1')).toBe('updated1'); // Still present
            expect(cache.get('key2')).toBeNull(); // Evicted
        });
    });

    describe('Test 9: Complex objects as values', () => {
        it('should cache arrays and objects correctly', () => {
            // Arrange
            interface Highlight {
                id: string;
                text: string;
            }

            const cacheWithObjects = new CacheManager<string, Highlight[]>(
                mockLogger,
                { maxSize: 10, ttlMs: 5000 }
            );

            const highlights: Highlight[] = [
                { id: '1', text: 'Highlight 1' },
                { id: '2', text: 'Highlight 2' },
            ];

            // Act
            cacheWithObjects.set('highlights:url1', highlights);
            const result = cacheWithObjects.get('highlights:url1');

            // Assert
            expect(result).toEqual(highlights);
            expect(result).toHaveLength(2);
            expect(result![0].id).toBe('1');
        });
    });

    describe('Test 10: Edge case - zero TTL', () => {
        it('should immediately expire with TTL=0', async () => {
            // Arrange
            const zeroTTLCache = new CacheManager<string, string>(mockLogger, {
                maxSize: 10,
                ttlMs: 0,
            });

            zeroTTLCache.set('key1', 'value1');

            // Act: Even 1ms wait should expire
            await new Promise((resolve) => setTimeout(resolve, 10));

            const result = zeroTTLCache.get('key1');

            // Assert
            expect(result).toBeNull();
        });
    });
});
