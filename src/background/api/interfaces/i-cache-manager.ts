/**
 * @file i-cache-manager.ts
 * @description Cache manager interface with LRU eviction
 * @architecture Strategy Pattern for eviction policy
 */

/**
 * Cache entry with timestamp
 */
export interface CacheEntry<V> {
    /** Cached value */
    value: V;

    /** Timestamp when entry was created/updated */
    timestamp: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
    /** Current cache size */
    size: number;

    /** Maximum cache size */
    maxSize: number;

    /** Total cache hits */
    hits: number;

    /** Total cache misses */
    misses: number;

    /** Hit rate (hits / (hits + misses)) */
    hitRate: number;

    /** Miss rate (misses / (hits + misses)) */
    missRate: number;
}

/**
 * Cache configuration options
 */
export interface CacheOptions {
    /** Maximum number of entries (default: 100) */
    maxSize?: number;

    /** Time-to-live in milliseconds (default: 300000 = 5min) */
    ttlMs?: number;
}

/**
 * Cache manager interface
 * Implements LRU (Least Recently Used) eviction policy
 * 
 * @example
 * ```typescript
 * const cache = new CacheManager<string, HighlightDataV2[]>(100, 300000);
 * 
 * // Set value
 * cache.set('highlights:url:example.com', highlights);
 * 
 * // Get value (returns null if expired or not found)
 * const cached = cache.get('highlights:url:example.com');
 * 
 * // Invalidate on write
 * cache.invalidate('highlights:url:example.com');
 * ```
 */
export interface ICacheManager<K, V> {
    /**
     * Set cache entry
     * 
     * @param key - Cache key
     * @param value - Value to cache
     */
    set(key: K, value: V): void;

    /**
     * Get cache entry
     * Returns null if not found or expired
     * Updates LRU position on access
     * 
     * @param key - Cache key
     * @returns Cached value or null
     */
    get(key: K): V | null;

    /**
     * Invalidate (remove) cache entry
     * 
     * @param key - Cache key
     */
    invalidate(key: K): void;

    /**
     * Clear all cache entries
     */
    clear(): void;

    /**
     * Get cache statistics
     * 
     * @returns Cache stats (size, hits, misses, rates)
     */
    getStats(): CacheStats;
}
