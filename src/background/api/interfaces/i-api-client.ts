/**
 * @file i-api-client.ts
 * @description API Client interface for Supabase REST API operations
 * @architecture Following Interface Segregation Principle (ISP)
 */

import type { HighlightDataV2 } from '@/background/schemas/highlight-schema';

/**
 * Synchronization event for event sourcing
 * @see docs/04-adrs/001-event-sourcing-for-sync.md
 */
export interface SyncEvent {
    /** Unique event identifier (UUID v4) */
    event_id: string;

    /** User who created the event (UUID v4) */
    user_id: string;

    /** Type of event (e.g., 'highlight.created', 'highlight.deleted') */
    type: SyncEventType;

    /** Event payload data */
    data: HighlightDataV2 | CollectionData | DeleteData;

    /** Unix timestamp (milliseconds) when event occurred */
    timestamp: number;

    /** Device identifier that created the event */
    device_id: string;

    /** Vector clock for conflict resolution */
    vector_clock: VectorClock;

    /** SHA-256 checksum of event data for integrity */
    checksum: string;
}

/**
 * Event types for synchronization
 */
export enum SyncEventType {
    HIGHLIGHT_CREATED = 'highlight.created',
    HIGHLIGHT_UPDATED = 'highlight.updated',
    HIGHLIGHT_DELETED = 'highlight.deleted',
    COLLECTION_CREATED = 'collection.created',
    COLLECTION_UPDATED = 'collection.updated',
    COLLECTION_DELETED = 'collection.deleted',
}

/**
 * Vector clock for conflict resolution
 * Maps device_id to logical clock value
 */
export type VectorClock = Record<string, number>;

/**
 * Collection metadata
 */
export interface CollectionData {
    /** Collection UUID */
    id: string;

    /** User-defined collection name */
    name: string;

    /** Optional description */
    description?: string;

    /** Creation timestamp */
    created_at: Date;

    /** Last update timestamp */
    updated_at: Date;
}

/**
 * Delete event data (only contains ID)
 */
export interface DeleteData {
    /** ID of deleted entity */
    id: string;
}

/**
 * Result of pushing events to server
 */
export interface PushResult {
    /** Event IDs that were successfully synced */
    synced_event_ids: string[];

    /** Event IDs that failed to sync */
    failed_event_ids: string[];

    /** Conflicts detected (if any) */
    conflicts?: SyncConflict[];
}

/**
 * Conflict detected during sync
 */
export interface SyncConflict {
    /** Event ID that caused conflict */
    event_id: string;

    /** Type of conflict */
    type: 'concurrent_update' | 'delete_update' | 'version_mismatch';

    /** Local event */
    local_event: SyncEvent;

    /** Remote event that conflicts */
    remote_event: SyncEvent;
}

/**
 * Collection metadata
 */
export interface Collection {
    /** Collection UUID */
    id: string;

    /** User-defined name */
    name: string;

    /** Optional description */
    description?: string;

    /** Number of highlights in collection */
    highlight_count: number;

    /** Creation timestamp */
    created_at: Date;

    /** Last update timestamp */
    updated_at: Date;
}

/**
 * API Client interface for Supabase operations
 * 
 * @example
 * ```typescript
 * const apiClient = container.resolve<IAPIClient>('apiClient');
 * 
 * // Create highlight
 * await apiClient.createHighlight(highlightData);
 * 
 * // Sync events
 * const result = await apiClient.pushEvents(events);
 * ```
 */
export interface IAPIClient {
    // ==================== Highlight Operations ====================

    /**
     * Create a new highlight in Supabase
     * 
     * @param data - Highlight data (v2 schema)
     * @throws {AuthenticationError} If user not authenticated
     * @throws {ValidationError} If data is invalid
     * @throws {NetworkError} If network request fails
     * @throws {TimeoutError} If request exceeds 5s timeout
     */
    createHighlight(data: HighlightDataV2): Promise<void>;

    /**
     * Update an existing highlight
     * 
     * @param id - Highlight UUID
     * @param updates - Partial highlight data to update
     * @throws {AuthenticationError} If user not authenticated
     * @throws {NotFoundError} If highlight doesn't exist
     * @throws {NetworkError} If network request fails
     */
    updateHighlight(id: string, updates: Partial<HighlightDataV2>): Promise<void>;

    /**
     * Soft-delete a highlight (sets deleted flag)
     * 
     * @param id - Highlight UUID
     * @throws {AuthenticationError} If user not authenticated
     * @throws {NotFoundError} If highlight doesn't exist
     * @throws {NetworkError} If network request fails
     */
    deleteHighlight(id: string): Promise<void>;

    /**
     * Get highlights, optionally filtered by URL
     * 
     * @param url - Optional URL filter (exact match)
     * @returns Array of highlights (empty if none found)
     * @throws {AuthenticationError} If user not authenticated
     * @throws {NetworkError} If network request fails
     */
    getHighlights(url?: string): Promise<HighlightDataV2[]>;

    // ==================== Sync Operations ====================

    /**
     * Push local events to server for synchronization
     * 
     * @param events - Array of sync events
     * @returns Push result with synced/failed IDs and conflicts
     * @throws {AuthenticationError} If user not authenticated
     * @throws {NetworkError} If network request fails
     * @throws {RateLimitError} If rate limit exceeded (429)
     */
    pushEvents(events: SyncEvent[]): Promise<PushResult>;

    /**
     * Pull events from server since timestamp
     * 
     * @param since - Unix timestamp (milliseconds)
     * @returns Array of events after timestamp
     * @throws {AuthenticationError} If user not authenticated
     * @throws {NetworkError} If network request fails
     */
    pullEvents(since: number): Promise<SyncEvent[]>;

    // ==================== Collection Operations ====================

    /**
     * Create a new collection
     * 
     * @param name - Collection name (1-100 characters)
     * @param description - Optional description (max 500 characters)
     * @returns Created collection with metadata
     * @throws {AuthenticationError} If user not authenticated
     * @throws {ValidationError} If name is invalid
     * @throws {NetworkError} If network request fails
     */
    createCollection(name: string, description?: string): Promise<Collection>;

    /**
     * Get all collections for current user
     * 
     * @returns Array of collections (empty if none)
     * @throws {AuthenticationError} If user not authenticated
     * @throws {NetworkError} If network request fails
     */
    getCollections(): Promise<Collection[]>;
}
