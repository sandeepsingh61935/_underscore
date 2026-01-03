/**
 * @file event-types.ts
 * @description Event payload type definitions for event sourcing
 * @author System Architect
 */

import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';

/**
 * Payload for HIGHLIGHT_CREATED event
 * Contains complete highlight data for initial creation
 */
export interface HighlightCreatedPayload {
    /** Highlight entity ID */
    readonly id: string;

    /** Complete highlight data */
    readonly data: HighlightDataV2;

    /** URL where highlight was created */
    readonly url: string;

    /** Page title at creation time */
    readonly pageTitle?: string;
}

/**
 * Payload for HIGHLIGHT_UPDATED event
 * Contains only the fields that changed (partial update)
 */
export interface HighlightUpdatedPayload {
    /** Highlight entity ID */
    readonly id: string;

    /** Partial highlight data (only changed fields) */
    readonly changes: Partial<HighlightDataV2>;

    /** Timestamp of previous version (for conflict detection) */
    readonly previousVersion: number;
}

/**
 * Payload for HIGHLIGHT_DELETED event
 * Soft delete - keeps event in log but marks as deleted
 */
export interface HighlightDeletedPayload {
    /** Highlight entity ID */
    readonly id: string;

    /** Reason for deletion (user action, TTL expiry, etc.) */
    readonly reason: 'user' | 'ttl' | 'sync';

    /** Timestamp when deleted */
    readonly deletedAt: number;
}

/**
 * Collection data structure
 * Groups related highlights together
 */
export interface CollectionData {
    /** Collection ID */
    readonly id: string;

    /** Collection name */
    readonly name: string;

    /** Optional description */
    readonly description?: string;

    /** Highlight IDs in this collection */
    readonly highlightIds: readonly string[];

    /** Creation timestamp */
    readonly createdAt: number;

    /** Last update timestamp */
    readonly updatedAt: number;

    /** User who owns this collection */
    readonly userId: string;
}

/**
 * Payload for COLLECTION_CREATED event
 */
export interface CollectionCreatedPayload {
    /** Collection entity ID */
    readonly id: string;

    /** Complete collection data */
    readonly data: CollectionData;
}

/**
 * Payload for COLLECTION_UPDATED event
 */
export interface CollectionUpdatedPayload {
    /** Collection entity ID */
    readonly id: string;

    /** Partial collection data (only changed fields) */
    readonly changes: Partial<Omit<CollectionData, 'id' | 'createdAt' | 'userId'>>;

    /** Timestamp of previous version */
    readonly previousVersion: number;
}

/**
 * Payload for COLLECTION_DELETED event
 */
export interface CollectionDeletedPayload {
    /** Collection entity ID */
    readonly id: string;

    /** What happens to highlights in this collection */
    readonly highlightAction: 'keep' | 'delete';

    /** Timestamp when deleted */
    readonly deletedAt: number;
}

/**
 * Union type of all event payloads
 * Useful for type-safe event handling
 */
export type EventPayload =
    | HighlightCreatedPayload
    | HighlightUpdatedPayload
    | HighlightDeletedPayload
    | CollectionCreatedPayload
    | CollectionUpdatedPayload
    | CollectionDeletedPayload;
