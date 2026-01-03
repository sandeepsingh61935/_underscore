/**
 * @file i-event-store.ts
 * @description Event Store interface for event sourcing pattern (ADR-001)
 * @author System Architect
 */

/**
 * Vector clock for conflict-free event ordering across devices
 * Maps device ID to logical timestamp
 * 
 * @example
 * { "device-1": 5, "device-2": 3 }
 */
export type VectorClock = Record<string, number>;

/**
 * Event types for sync operations
 * Follows event sourcing pattern - all state changes are events
 */
export enum SyncEventType {
    /** Highlight created */
    HIGHLIGHT_CREATED = 'highlight.created',
    /** Highlight updated (color, note, etc.) */
    HIGHLIGHT_UPDATED = 'highlight.updated',
    /** Highlight soft-deleted */
    HIGHLIGHT_DELETED = 'highlight.deleted',
    /** Collection created */
    COLLECTION_CREATED = 'collection.created',
    /** Collection updated (name, description) */
    COLLECTION_UPDATED = 'collection.updated',
    /** Collection deleted */
    COLLECTION_DELETED = 'collection.deleted',
}

/**
 * Immutable event in the event log
 * Represents a single state change in the system
 * 
 * @template T - Payload type specific to event type
 */
export interface SyncEvent<T = unknown> {
    /** Unique event identifier (UUID) */
    readonly id: string;

    /** Type of event */
    readonly type: SyncEventType;

    /** Event payload (specific to event type) */
    readonly payload: T;

    /** Event timestamp (milliseconds since epoch) */
    readonly timestamp: number;

    /** Device that generated this event */
    readonly deviceId: string;

    /** Vector clock for conflict resolution */
    readonly vectorClock: VectorClock;

    /** SHA-256 checksum of payload for integrity verification */
    readonly checksum: string;

    /** User ID who owns this event */
    readonly userId: string;
}

/**
 * Filter criteria for querying events
 */
export interface EventFilter {
    /** Return events after this timestamp (inclusive) */
    since?: number;

    /** Return events before this timestamp (inclusive) */
    until?: number;

    /** Filter by event type */
    eventType?: SyncEventType;

    /** Filter by entity ID (highlight ID, collection ID) */
    entityId?: string;

    /** Filter by user ID */
    userId?: string;

    /** Maximum number of events to return */
    limit?: number;
}

/**
 * Event Store interface for append-only event log
 * 
 * Implements event sourcing pattern (ADR-001):
 * - Append-only (no updates/deletes)
 * - Immutable events
 * - Chronological ordering
 * - Checksum validation
 * 
 * @example
 * ```typescript
 * const store = container.resolve<IEventStore>('eventStore');
 * 
 * // Append event
 * await store.append({
 *   id: crypto.randomUUID(),
 *   type: SyncEventType.HIGHLIGHT_CREATED,
 *   payload: { text: 'example', color: 'yellow' },
 *   timestamp: Date.now(),
 *   deviceId: 'device-1',
 *   vectorClock: { 'device-1': 1 },
 *   checksum: '...',
 *   userId: 'user-123'
 * });
 * 
 * // Query events
 * const events = await store.getEvents({ since: Date.now() - 86400000 });
 * ```
 */
export interface IEventStore {
    /**
     * Append event to the log
     * 
     * Events are immutable - once appended, they cannot be modified or deleted.
     * Validates event structure and generates checksum.
     * 
     * @param event - Event to append
     * @throws {ValidationError} If event structure is invalid
     * @throws {StorageError} If storage operation fails
     * 
     * @example
     * ```typescript
     * await store.append({
     *   id: crypto.randomUUID(),
     *   type: SyncEventType.HIGHLIGHT_CREATED,
     *   payload: highlightData,
     *   timestamp: Date.now(),
     *   deviceId: getCurrentDeviceId(),
     *   vectorClock: getVectorClock(),
     *   checksum: generateChecksum(highlightData),
     *   userId: currentUser.id
     * });
     * ```
     */
    append<T>(event: SyncEvent<T>): Promise<void>;

    /**
     * Query events with optional filters
     * 
     * **CRITICAL**: Events MUST be returned in chronological order (oldest → newest)
     * This is essential for correct state reconstruction.
     * 
     * @param filter - Optional filter criteria
     * @returns Events matching filter, sorted by timestamp ASC
     * @throws {StorageError} If query fails
     * 
     * @example
     * ```typescript
     * // Get all events for a highlight
     * const events = await store.getEvents({
     *   entityId: 'highlight-123',
     *   eventType: SyncEventType.HIGHLIGHT_UPDATED
     * });
     * 
     * // Get recent events
     * const recent = await store.getEvents({
     *   since: Date.now() - 3600000, // Last hour
     *   limit: 100
     * });
     * ```
     */
    getEvents(filter?: EventFilter): Promise<SyncEvent[]>;

    /**
     * Get events since a specific timestamp
     * Optimized for sync operations
     * 
     * @param timestamp - Timestamp in milliseconds
     * @returns Events after timestamp, sorted chronologically
     * @throws {StorageError} If query fails
     * 
     * @example
     * ```typescript
     * const lastSync = await getLastSyncTimestamp();
     * const newEvents = await store.getEventsSince(lastSync);
     * ```
     */
    getEventsSince(timestamp: number): Promise<SyncEvent[]>;

    /**
     * Get the most recent event for a specific entity
     * 
     * @param entityId - Entity identifier (highlight ID, collection ID)
     * @returns Latest event or null if not found
     * @throws {StorageError} If query fails
     * 
     * @example
     * ```typescript
     * const latestEvent = await store.getLatestEvent('highlight-123');
     * if (latestEvent?.type === SyncEventType.HIGHLIGHT_DELETED) {
     *   // Highlight was deleted
     * }
     * ```
     */
    getLatestEvent(entityId: string): Promise<SyncEvent | null>;

    /**
     * Get total number of events in the store
     * 
     * @returns Total event count
     * @throws {StorageError} If count fails
     */
    count(): Promise<number>;

    /**
     * Clear all events from the store
     * **WARNING**: This is destructive and cannot be undone
     * Should only be used for testing or explicit user action
     * 
     * @throws {StorageError} If clear fails
     */
    clear(): Promise<void>;
}
