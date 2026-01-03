/**
 * @file i-pagination-client.ts
 * @description Pagination client interface for large dataset handling
 * @architecture Iterator Pattern with AsyncGenerator
 */

import type { SyncEvent } from './i-api-client';

/**
 * Paginated response with cursor information
 */
export interface PaginatedResponse<T> {
    /** Data items in current page */
    data: T[];

    /** Cursor for next page (null if last page) */
    nextCursor: string | null;

    /** Total count (if available from server) */
    totalCount?: number;
}

/**
 * Cursor information for pagination
 */
export interface CursorInfo {
    /** Current cursor position */
    cursor: string | null;

    /** Page size */
    limit: number;

    /** Has more pages */
    hasMore: boolean;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
    /** Page size (default: 100) */
    limit?: number;

    /** Starting cursor (null for first page) */
    cursor?: string | null;

    /** Timeout per page in milliseconds (default: 5000) */
    timeoutMs?: number;
}

/**
 * Pagination client interface
 * Uses AsyncGenerator for memory-efficient streaming
 * 
 * @example
 * ```typescript
 * const paginator = container.resolve<IPaginationClient>('paginationClient');
 * 
 * // Stream events in pages of 100
 * for await (const events of paginator.pullEventsPaginated(since)) {
 *   await processEvents(events);
 * }
 * ```
 */
export interface IPaginationClient {
    /**
     * Pull events with pagination (AsyncGenerator)
     * 
     * @param since - Unix timestamp (milliseconds)
     * @param options - Pagination options
     * @yields Pages of events (array of SyncEvent)
     * @throws {TimeoutError} If page fetch exceeds timeout
     * @throws {NetworkError} If network request fails
     */
    pullEventsPaginated(
        since: number,
        options?: PaginationOptions
    ): AsyncGenerator<SyncEvent[], void, undefined>;

    /**
     * Get cursor info for current pagination state
     * 
     * @returns Current cursor information
     */
    getCursorInfo(): CursorInfo;
}
