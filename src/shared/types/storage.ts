/**
 * @file storage.ts
 * @description Type definitions for domain-scoped storage with event sourcing
 */

// Removed dead import: highlight-store module doesn't exist


/**
 * Event types for event sourcing
 */
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';

/**
 * Event types for event sourcing
 */
export type HighlightEventType = 'highlight.created' | 'highlight.removed';

/**
 * Base event interface
 */
export interface HighlightEvent {
    type: HighlightEventType;
    timestamp: number;
    eventId: string;
}

/**
 * Highlight created event - includes serialized range for restoration
 */
export interface HighlightCreatedEvent extends HighlightEvent {
    type: 'highlight.created';
    data: HighlightDataV2;
}

/**
 * Highlight removed event
 */
export interface HighlightRemovedEvent extends HighlightEvent {
    type: 'highlight.removed';
    highlightId: string;
}

/**
 * Union type for all highlight events
 */
export type AnyHighlightEvent = HighlightCreatedEvent | HighlightRemovedEvent;

/**
 * Domain storage schema
 * Stored in chrome.storage.local with encrypted data
 */
export interface DomainStorage {
    /** Encrypted event log */
    data: string;
    /** Time-to-live timestamp */
    ttl: number;
    /** Last access timestamp */
    lastAccessed: number;
    /** Schema version for migrations */
    version: number;
}

/**
 * Decrypted event log
 */
export interface EventLog {
    events: AnyHighlightEvent[];
}

/**
 * Storage mode
 */
export type StorageMode = 'sprint' | 'vault';

/**
 * Storage configuration
 */
export interface StorageConfig {
    mode: StorageMode;
    ttlDuration: number; // milliseconds
    maxEventsPerDomain: number;
    maxDomains: number;
}

/**
 * Default storage configuration
 */
export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
    mode: 'sprint',
    ttlDuration: 4 * 60 * 60 * 1000, // 4 hours
    maxEventsPerDomain: 100,
    maxDomains: 100
};

/**
 * Validate highlight event
 */
export function isValidHighlightEvent(event: unknown): event is AnyHighlightEvent {
    if (!event || typeof event !== 'object') return false;

    const e = event as Record<string, unknown>;

    if (typeof e['type'] !== 'string') return false;
    if (typeof e['timestamp'] !== 'number') return false;
    if (typeof e['eventId'] !== 'string') return false;

    if (e['type'] === 'highlight.created') {
        if (!e['data'] || typeof e['data'] !== 'object') return false;
        const data = e['data'] as Record<string, unknown>;

        // ✅ FIXED: Check for 'ranges' array (not singular 'range')
        // We save multiple ranges, validator was checking for wrong field!
        if (!data['ranges'] || !Array.isArray(data['ranges'])) return false;

        // Accept if ranges array exists (validation passed)
        return data['ranges'].length > 0;
    } else if (e['type'] === 'highlight.removed') {
        return typeof e['highlightId'] === 'string';
    }

    return false;
}
