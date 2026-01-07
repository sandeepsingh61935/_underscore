/**
 * @file supabase-client.ts
 * @description Supabase API client implementation
 * @architecture Facade Pattern - wraps Supabase SDK, implements IAPIClient
 */

import { createClient, SupabaseClient as SupabaseSDKClient } from '@supabase/supabase-js';
import type { IAPIClient, SyncEvent, PushResult, Collection } from './interfaces/i-api-client';
import type { HighlightDataV2 } from '@/background/schemas/highlight-schema';
import type { IAuthManager } from '@/background/auth/interfaces/i-auth-manager';
import type { ILogger } from '@/shared/interfaces/i-logger';
import {
    APIError,
    AuthenticationError,
    TimeoutError,
    ValidationError,
} from './api-errors';
import { APIErrorHandler } from './api-error-handler';
import { HTTPSValidator } from './https-validator';

/**
 * Supabase configuration
 */
export interface SupabaseConfig {
    /** Supabase project URL */
    url: string;

    /** Supabase anon/public key */
    anonKey: string;

    /** Request timeout in milliseconds (default: 5000) */
    timeoutMs?: number;
}

/**
 * Supabase client implementation
 * Wraps Supabase SDK and provides type-safe API operations
 */
export class SupabaseClient implements IAPIClient {
    private sdkClient: SupabaseSDKClient;
    private readonly timeoutMs: number;

    get supabase(): SupabaseSDKClient {
        return this.sdkClient;
    }

    constructor(
        private readonly authManager: IAuthManager,
        private readonly logger: ILogger,
        config: SupabaseConfig,
        injectedClient?: SupabaseSDKClient
    ) {
        // Enforce HTTPS for security (prevents MITM attacks)
        HTTPSValidator.validate(config.url);

        this.sdkClient = injectedClient ?? createClient(config.url, config.anonKey);
        this.timeoutMs = config.timeoutMs ?? 5000;

        this.logger.debug('SupabaseClient initialized', {
            url: config.url,
            timeoutMs: this.timeoutMs,
        });
    }

    // ==================== Highlight Operations ====================

    async createHighlight(data: HighlightDataV2): Promise<void> {
        const user = this.authManager.currentUser;
        if (!user) {
            throw new AuthenticationError('User not authenticated');
        }

        this.logger.debug('Creating highlight in Supabase', { id: data.id });

        try {
            const response = await this.withTimeout(
                this.sdkClient
                    .from('highlights')
                    .insert({
                        id: data.id,
                        user_id: user.id,
                        url: data.url || '', // Use URL from highlight data, not background context
                        text: data.text,
                        color_role: data.colorRole,
                        selectors: data.ranges[0]?.selector,
                        content_hash: data.contentHash,
                        created_at: data.createdAt.toISOString(),
                        updated_at: new Date().toISOString(),
                    })
            ) as any;

            if (response.error) {
                throw this.transformError(response.error);
            }

            this.logger.debug('Highlight created successfully', { id: data.id });
        } catch (error) {
            this.logger.error('Failed to create highlight', error as Error, { id: data.id });
            throw error;
        }
    }

    async updateHighlight(id: string, updates: Partial<HighlightDataV2>): Promise<void> {
        const user = this.authManager.currentUser;
        if (!user) {
            throw new AuthenticationError('User not authenticated');
        }

        this.logger.debug('Updating highlight', { id, fields: Object.keys(updates) });

        try {
            // Build update payload (only include provided fields)
            const payload: Record<string, unknown> = {
                updated_at: new Date().toISOString(),
            };

            if (updates.text !== undefined) payload['text'] = updates.text;
            if (updates.colorRole !== undefined) payload['color_role'] = updates.colorRole;
            if (updates.contentHash !== undefined) payload['content_hash'] = updates.contentHash;

            const response = await this.withTimeout(
                this.sdkClient
                    .from('highlights')
                    .update(payload)
                    .eq('id', id)
                    .eq('user_id', user.id) // Ensure user owns highlight
            ) as any;

            if (response.error) {
                throw this.transformError(response.error);
            }

            this.logger.debug('Highlight updated successfully', { id });
        } catch (error) {
            this.logger.error('Failed to update highlight', error as Error, { id });
            throw error;
        }
    }

    async deleteHighlight(id: string): Promise<void> {
        const user = this.authManager.currentUser;
        if (!user) {
            throw new AuthenticationError('User not authenticated');
        }

        this.logger.debug('Soft-deleting highlight', { id });

        try {
            // Soft delete: set deleted_at timestamp
            const response = await this.withTimeout(
                this.sdkClient
                    .from('highlights')
                    .update({
                        deleted_at: new Date().toISOString(),
                    })
                    .eq('id', id)
                    .eq('user_id', user.id)
            ) as any;

            if (response.error) {
                throw this.transformError(response.error);
            }

            this.logger.debug('Highlight soft-deleted successfully', { id });
        } catch (error) {
            this.logger.error('Failed to delete highlight', error as Error, { id });
            throw error;
        }
    }

    async softDeleteAllHighlights(): Promise<void> {
        const user = this.authManager.currentUser;
        if (!user) {
            throw new AuthenticationError('User not authenticated');
        }

        this.logger.warn('Soft-deleting ALL highlights for user', { userId: user.id });

        try {
            const response = await this.withTimeout(
                this.sdkClient
                    .from('highlights')
                    .update({
                        deleted_at: new Date().toISOString(),
                    })
                    .eq('user_id', user.id)
                    .is('deleted_at', null) // Only update active ones
            ) as any;

            if (response.error) {
                throw this.transformError(response.error);
            }

            this.logger.info('All highlights soft-deleted successfully');
        } catch (error) {
            this.logger.error('Failed to clear highlights', error as Error);
            throw error;
        }
    }

    async getHighlights(url?: string): Promise<HighlightDataV2[]> {
        const user = this.authManager.currentUser;
        if (!user) {
            throw new AuthenticationError('User not authenticated');
        }

        this.logger.debug('Fetching highlights', { url });

        try {
            let query = this.sdkClient
                .from('highlights')
                .select('*')
                .eq('user_id', user.id)
                .is('deleted_at', null); // Exclude soft-deleted

            if (url) {
                query = query.eq('url', url);
            }

            const response = await this.withTimeout(query) as any;

            if (response.error) {
                throw this.transformError(response.error);
            }

            // Transform Supabase rows to HighlightDataV2
            const highlights = (response.data || []).map((row: any) => this.transformHighlightRow(row));

            this.logger.debug('Highlights fetched', { count: highlights.length });
            return highlights;
        } catch (error) {
            this.logger.error('Failed to fetch highlights', error as Error, { url });
            throw error;
        }
    }

    // ==================== Sync Operations ====================

    async pushEvents(events: SyncEvent[]): Promise<PushResult> {
        const user = this.authManager.currentUser;
        if (!user) {
            throw new AuthenticationError('User not authenticated');
        }

        this.logger.debug('Pushing events to Supabase', { count: events.length });

        try {
            // Batch insert events
            const response = await this.withTimeout(
                this.sdkClient
                    .from('sync_events')
                    .insert(
                        events.map((event) => ({
                            event_id: event.event_id,
                            user_id: event.user_id,
                            type: event.type,
                            data: event.data,
                            timestamp: event.timestamp,
                            device_id: event.device_id,
                            vector_clock: event.vector_clock,
                            checksum: event.checksum,
                        }))
                    )
                    .select('event_id')
            ) as any;

            if (response.error) {
                throw this.transformError(response.error);
            }

            const syncedIds = (response.data || []).map((row: { event_id: string }) => row.event_id);
            const failedIds = events
                .map((e) => e.event_id)
                .filter((id) => !syncedIds.includes(id));

            this.logger.debug('Events pushed', {
                synced: syncedIds.length,
                failed: failedIds.length,
            });

            return {
                synced_event_ids: syncedIds,
                failed_event_ids: failedIds,
            };
        } catch (error) {
            this.logger.error('Failed to push events', error as Error, {
                count: events.length,
            });
            throw error;
        }
    }

    async pullEvents(since: number): Promise<SyncEvent[]> {
        const user = this.authManager.currentUser;
        if (!user) {
            throw new AuthenticationError('User not authenticated');
        }

        this.logger.debug('Pulling events from Supabase', { since });

        try {
            const response = await this.withTimeout(
                this.sdkClient
                    .from('sync_events')
                    .select('*')
                    .eq('user_id', user.id)
                    .gt('timestamp', since)
                    .order('timestamp', { ascending: true }) // CRITICAL: chronological order
            ) as any;

            if (response.error) {
                throw this.transformError(response.error);
            }

            const events = (response.data || []) as SyncEvent[];

            this.logger.debug('Events pulled', { count: events.length });
            return events;
        } catch (error) {
            this.logger.error('Failed to pull events', error as Error, { since });
            throw error;
        }
    }

    // ==================== Collection Operations ====================

    async createCollection(name: string, description?: string): Promise<Collection> {
        const user = this.authManager.currentUser;
        if (!user) {
            throw new AuthenticationError('User not authenticated');
        }

        // Validate name
        if (!name || name.length === 0 || name.length > 100) {
            throw new ValidationError('Collection name must be 1-100 characters', 'name');
        }

        this.logger.debug('Creating collection', { name });

        try {
            const response = await this.withTimeout(
                this.sdkClient
                    .from('collections')
                    .insert({
                        user_id: user.id,
                        name,
                        description: description || null,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    })
                    .select()
                    .single()
            ) as any;

            if (response.error) {
                throw this.transformError(response.error);
            }

            const collection = this.transformCollectionRow(response.data);

            this.logger.debug('Collection created', { id: collection.id });
            return collection;
        } catch (error) {
            this.logger.error('Failed to create collection', error as Error, { name });
            throw error;
        }
    }

    async getCollections(): Promise<Collection[]> {
        const user = this.authManager.currentUser;
        if (!user) {
            throw new AuthenticationError('User not authenticated');
        }

        this.logger.debug('Fetching collections');

        try {
            const response = await this.withTimeout(
                this.sdkClient
                    .from('collections')
                    .select('*, highlights(count)')
                    .eq('user_id', user.id)
            ) as any;

            if (response.error) {
                throw this.transformError(response.error);
            }

            const collections = (response.data || []).map((row: any) => this.transformCollectionRow(row));

            this.logger.debug('Collections fetched', { count: collections.length });
            return collections;
        } catch (error) {
            this.logger.error('Failed to fetch collections', error as Error);
            throw error;
        }
    }

    // ==================== Helper Methods ====================

    /**
     * Add timeout to Supabase query
     */
    private async withTimeout<T>(promise: PromiseLike<T>): Promise<T> {
        const timeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new TimeoutError(this.timeoutMs)), this.timeoutMs)
        );

        return Promise.race([promise, timeout]);
    }

    /**
     * Transform Supabase error to domain error
     * @deprecated Use APIErrorHandler.handle() instead
     */
    private transformError(error: any): APIError {
        return APIErrorHandler.handle(error);
    }

    /**
     * Transform Supabase highlight row to HighlightDataV2
     */
    private transformHighlightRow(row: any): HighlightDataV2 {
        return {
            version: 2,
            id: row.id,
            text: row.text,
            contentHash: row.content_hash,
            colorRole: row.color_role,
            type: 'underscore',
            ranges: [
                {
                    xpath: '', // TODO: Extract from selectors
                    startOffset: 0,
                    endOffset: row.text.length,
                    text: row.text,
                    textBefore: '',
                    textAfter: '',
                    selector: row.selectors,
                },
            ],
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        } as HighlightDataV2;
    }

    /**
     * Transform Supabase collection row to Collection
     */
    private transformCollectionRow(row: any): Collection {
        return {
            id: row.id,
            name: row.name,
            description: row.description || undefined,
            highlight_count: row.highlights?.[0]?.count || 0,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
        };
    }
}
