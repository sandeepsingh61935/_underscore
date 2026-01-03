/**
 * @file event-store.ts
 * @description IndexedDB-based event store for event sourcing pattern
 * @author System Architect
 */

import { openDB, type IDBPDatabase } from 'idb';
import type {
    IEventStore,
    SyncEvent,
    EventFilter,
    SyncEventType,
} from './interfaces/i-event-store';
import type { ILogger } from '@/shared/interfaces/i-logger';

/**
 * IndexedDB database name
 */
const DB_NAME = 'vault_events';

/**
 * Database version
 */
const DB_VERSION = 1;

/**
 * Object store name for events
 */
const EVENTS_STORE = 'events';

/**
 * Event Store implementation using IndexedDB
 * 
 * Implements append-only event log pattern per ADR-001:
 * - Events are immutable (no updates/deletes)
 * - Chronological ordering enforced
 * - Checksum validation for integrity
 * - Efficient querying with indexes
 * 
 * **IndexedDB Schema**:
 * - Database: vault_events
 * - Object Store: events (keyPath: 'id')
 * - Indexes: timestamp, eventType, entityId, userId
 */
export class EventStore implements IEventStore {
    private db: IDBPDatabase | null = null;
    private readonly logger: ILogger;

    constructor(logger: ILogger) {
        this.logger = logger;
    }

    /**
     * Initialize IndexedDB database
     * Creates object store and indexes on first run
     */
    private async ensureDatabase(): Promise<IDBPDatabase> {
        if (this.db) {
            return this.db;
        }

        this.logger.debug('Initializing EventStore database');

        this.db = await openDB(DB_NAME, DB_VERSION, {
            upgrade(db: any) {
                // Create events object store
                const store = db.createObjectStore(EVENTS_STORE, { keyPath: 'id' });

                // Create indexes for efficient querying
                store.createIndex('timestamp', 'timestamp', { unique: false });
                store.createIndex('eventType', 'type', { unique: false });
                store.createIndex('entityId', 'payload.id', { unique: false });
                store.createIndex('userId', 'userId', { unique: false });
                store.createIndex('deviceId', 'deviceId', { unique: false });
            },
        });

        this.logger.info('EventStore database initialized');
        return this.db;
    }

    /**
     * Generate SHA-256 checksum for event payload
     */
    private async generateChecksum(payload: unknown): Promise<string> {
        const payloadStr = JSON.stringify(payload);
        const encoder = new TextEncoder();
        const data = encoder.encode(payloadStr);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    /**
     * Verify event checksum
     */
    private async verifyChecksum(event: SyncEvent): Promise<boolean> {
        const expectedChecksum = await this.generateChecksum(event.payload);
        return expectedChecksum === event.checksum;
    }

    /**
     * Validate event structure
     */
    private validateEvent(event: SyncEvent): void {
        // Required fields
        if (!event.id) {
            throw new Error('Event ID is required');
        }
        if (!event.type) {
            throw new Error('Event type is required');
        }
        if (event.payload === undefined || event.payload === null) {
            throw new Error('Event payload is required');
        }
        if (!event.timestamp) {
            throw new Error('Event timestamp is required');
        }
        if (!event.deviceId) {
            throw new Error('Event deviceId is required');
        }
        if (!event.vectorClock) {
            throw new Error('Event vectorClock is required');
        }
        if (!event.checksum) {
            throw new Error('Event checksum is required');
        }
        if (!event.userId) {
            throw new Error('Event userId is required');
        }

        // Timestamp validation
        const now = Date.now();
        if (event.timestamp > now + 60000) {
            // Allow 1 minute clock skew
            throw new Error('Event timestamp cannot be in the future');
        }

        // Vector clock validation
        if (typeof event.vectorClock !== 'object' || Array.isArray(event.vectorClock)) {
            throw new Error('Vector clock must be an object');
        }
    }

    async append<T>(event: SyncEvent<T>): Promise<void> {
        this.logger.debug('Appending event', { id: event.id, type: event.type });

        // Validate event structure
        this.validateEvent(event);

        // Verify checksum
        const isValid = await this.verifyChecksum(event);
        if (!isValid) {
            this.logger.error('Event checksum mismatch', undefined, { id: event.id });
            throw new Error(`Event checksum mismatch for event ${event.id}`);
        }

        const db = await this.ensureDatabase();

        try {
            await db.add(EVENTS_STORE, event);
            this.logger.debug('Event appended successfully', { id: event.id });
        } catch (error) {
            if (error instanceof Error && error.name === 'ConstraintError') {
                this.logger.warn('Duplicate event ID', { id: event.id });
                throw new Error(`Event with ID ${event.id} already exists`);
            }
            this.logger.error('Failed to append event', error as Error);
            throw new Error('Failed to append event to store');
        }
    }

    async getEvents(filter?: EventFilter): Promise<SyncEvent[]> {
        const db = await this.ensureDatabase();
        let events: SyncEvent[] = [];

        try {
            if (!filter || Object.keys(filter).length === 0) {
                // No filter - get all events
                events = await db.getAll(EVENTS_STORE);
            } else if (filter.since !== undefined || filter.until !== undefined) {
                // Use timestamp index for range query
                const range = this.createTimestampRange(filter.since, filter.until);
                events = await db.getAllFromIndex(EVENTS_STORE, 'timestamp', range);
            } else if (filter.eventType) {
                // Use eventType index
                events = await db.getAllFromIndex(EVENTS_STORE, 'eventType', filter.eventType);
            } else if (filter.entityId) {
                // Use entityId index
                events = await db.getAllFromIndex(EVENTS_STORE, 'entityId', filter.entityId);
            } else if (filter.userId) {
                // Use userId index
                events = await db.getAllFromIndex(EVENTS_STORE, 'userId', filter.userId);
            } else {
                // Fallback to getAll
                events = await db.getAll(EVENTS_STORE);
            }

            // Apply additional filters in memory
            events = this.applyFilters(events, filter);

            // **CRITICAL**: Sort by timestamp (chronological order)
            events.sort((a, b) => a.timestamp - b.timestamp);

            // Apply limit if specified
            if (filter?.limit && filter.limit > 0) {
                events = events.slice(0, filter.limit);
            }

            this.logger.debug('Retrieved events', { count: events.length, filter });
            return events;
        } catch (error) {
            this.logger.error('Failed to get events', error as Error);
            throw new Error('Failed to retrieve events from store');
        }
    }

    /**
     * Create IDBKeyRange for timestamp queries
     */
    private createTimestampRange(
        since?: number,
        until?: number
    ): IDBKeyRange | undefined {
        if (since !== undefined && until !== undefined) {
            return IDBKeyRange.bound(since, until);
        } else if (since !== undefined) {
            return IDBKeyRange.lowerBound(since);
        } else if (until !== undefined) {
            return IDBKeyRange.upperBound(until);
        }
        return undefined;
    }

    /**
     * Apply filters to events in memory
     */
    private applyFilters(events: SyncEvent[], filter?: EventFilter): SyncEvent[] {
        if (!filter) {
            return events;
        }

        let filtered = events;

        // Filter by event type
        if (filter.eventType) {
            filtered = filtered.filter((e) => e.type === filter.eventType);
        }

        // Filter by entity ID
        if (filter.entityId) {
            filtered = filtered.filter((e) => {
                const payload = e.payload as any;
                return payload?.id === filter.entityId;
            });
        }

        // Filter by user ID
        if (filter.userId) {
            filtered = filtered.filter((e) => e.userId === filter.userId);
        }

        // Filter by timestamp range
        if (filter.since !== undefined) {
            filtered = filtered.filter((e) => e.timestamp >= filter.since!);
        }
        if (filter.until !== undefined) {
            filtered = filtered.filter((e) => e.timestamp <= filter.until!);
        }

        return filtered;
    }

    async getEventsSince(timestamp: number): Promise<SyncEvent[]> {
        return this.getEvents({ since: timestamp });
    }

    async getLatestEvent(entityId: string): Promise<SyncEvent | null> {
        const events = await this.getEvents({ entityId });

        if (events.length === 0) {
            return null;
        }

        // Events are already sorted chronologically, return last one
        return events[events.length - 1];
    }

    async count(): Promise<number> {
        const db = await this.ensureDatabase();
        try {
            const count = await db.count(EVENTS_STORE);
            this.logger.debug('Event count', { count });
            return count;
        } catch (error) {
            this.logger.error('Failed to count events', error as Error);
            throw new Error('Failed to count events in store');
        }
    }

    async clear(): Promise<void> {
        this.logger.warn('Clearing all events from store');
        const db = await this.ensureDatabase();
        try {
            await db.clear(EVENTS_STORE);
            this.logger.info('All events cleared');
        } catch (error) {
            this.logger.error('Failed to clear events', error as Error);
            throw new Error('Failed to clear event store');
        }
    }
}
