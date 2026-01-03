/**
 * @file pagination-client.ts
 * @description Cursor-based pagination client for large datasets
 * @architecture Iterator Pattern - AsyncGenerator for memory efficiency
 * @scalability Prevents timeout on 10K+ events by streaming in pages
 */

import type { IAPIClient, SyncEvent } from './interfaces/i-api-client';
import type { IPaginationClient, PaginationOptions, CursorInfo, PaginatedResponse } from './interfaces/i-pagination-client';
import type { ILogger } from '@/shared/interfaces/i-logger';
import { TimeoutError } from './api-errors';

/**
 * Default pagination configuration
 */
const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Pagination client implementation
 * Streams events in pages to prevent memory overflow
 */
export class PaginationClient implements IPaginationClient {
    private currentCursor: string | null = null;
    private pageSize: number;
    private timeoutMs: number;

    constructor(
        private readonly apiClient: IAPIClient,
        private readonly logger: ILogger,
        options?: PaginationOptions
    ) {
        this.pageSize = options?.limit ?? DEFAULT_PAGE_SIZE;
        this.timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

        this.logger.debug('PaginationClient initialized', {
            pageSize: this.pageSize,
            timeoutMs: this.timeoutMs,
        });
    }

    /**
     * Pull events with cursor-based pagination
     * Uses AsyncGenerator for memory-efficient streaming
     */
    async *pullEventsPaginated(
        since: number,
        options?: PaginationOptions
    ): AsyncGenerator<SyncEvent[], void, undefined> {
        const pageSize = options?.limit ?? this.pageSize;
        const timeoutMs = options?.timeoutMs ?? this.timeoutMs;

        let cursor: string | null = options?.cursor ?? null;
        let pageCount = 0;
        let totalEvents = 0;

        this.logger.debug('Starting paginated event pull', { since, pageSize });

        try {
            while (true) {
                pageCount++;
                const startTime = Date.now();

                // Fetch page with timeout
                const page = await this.fetchPageWithTimeout(
                    since,
                    cursor,
                    pageSize,
                    timeoutMs
                );

                const fetchDuration = Date.now() - startTime;

                // Yield events if any
                if (page.data.length > 0) {
                    totalEvents += page.data.length;

                    // Update cursor BEFORE yielding (so getCursorInfo() is accurate during iteration)
                    if (page.nextCursor) {
                        this.currentCursor = page.nextCursor;
                    }

                    this.logger.debug('Page fetched', {
                        page: pageCount,
                        events: page.data.length,
                        duration: fetchDuration,
                        hasMore: !!page.nextCursor,
                    });

                    yield page.data;
                }

                // Check if more pages
                if (!page.nextCursor) {
                    this.logger.debug('Pagination complete', {
                        totalPages: pageCount,
                        totalEvents,
                    });
                    break;
                }
            }
        } catch (error) {
            this.logger.error('Pagination failed', error as Error, {
                page: pageCount,
                totalEvents,
            });
            throw error;
        }
    }

    /**
     * Fetch single page with timeout
     */
    private async fetchPageWithTimeout(
        since: number,
        cursor: string | null,
        limit: number,
        timeoutMs: number
    ): Promise<PaginatedResponse<SyncEvent>> {
        const timeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new TimeoutError(timeoutMs)), timeoutMs)
        );

        const fetchPromise = this.fetchPage(since, cursor, limit);

        return Promise.race([fetchPromise, timeout]);
    }

    /**
     * Fetch single page from API
     * NOTE: This requires API client to support cursor-based pagination
     */
    private async fetchPage(
        since: number,
        cursor: string | null,
        limit: number
    ): Promise<PaginatedResponse<SyncEvent>> {
        // For now, use regular pullEvents and simulate pagination
        // TODO: Update when Supabase schema supports server-side cursors
        const events = await this.apiClient.pullEvents(since);

        // Client-side pagination simulation
        const start = cursor ? parseInt(cursor) : 0;
        const end = start + limit;
        const pageEvents = events.slice(start, end);
        const hasMore = end < events.length;

        return {
            data: pageEvents,
            nextCursor: hasMore ? end.toString() : null,
            totalCount: events.length,
        };
    }

    /**
     * Get current cursor information
     */
    getCursorInfo(): CursorInfo {
        return {
            cursor: this.currentCursor,
            limit: this.pageSize,
            hasMore: this.currentCursor !== null,
        };
    }
}
