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
export type HighlightEventType =
  | 'highlight.created'
  | 'highlight.removed'
  | 'highlights.cleared';

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
 * Highlights cleared event (bulk delete)
 */
export interface HighlightsClearedEvent extends HighlightEvent {
  type: 'highlights.cleared';
  count: number;
}

/**
 * Union type for all highlight events
 */
export type AnyHighlightEvent =
  | HighlightCreatedEvent
  | HighlightRemovedEvent
  | HighlightsClearedEvent;

/**
 * Domain storage schema
 * Stored in chrome.storage.local with encrypted data
 */
export interface DomainStorage {
  /** Encrypted event log */
  data: string;
  /** Time-to-live timestamp; null means no expiry (permanent) */
  ttl: number | null;
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
export type StorageMode = 'walk' | 'sprint' | 'vault';

/**
 * Storage configuration
 */
export interface StorageConfig {
  mode: StorageMode;
  /** TTL in milliseconds; null = permanent (no expiry) */
  ttlDuration: number | null;
  maxEventsPerDomain: number;
  maxDomains: number;
}

/**
 * Default storage configuration (Sprint: permanent, no TTL)
 */
export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  mode: 'sprint',
  ttlDuration: null,
  maxEventsPerDomain: 100,
  maxDomains: 100,
};

/**
 * Entry in the plain-domain collections index.
 * Stored under __collections_index in chrome.storage.local.
 * Enables background SW to aggregate across modes without reversing hashes.
 */
export interface CollectionsIndexEntry {
  domain: string;
  mode: StorageMode;
  count: number;
  lastActive: number;
  /** Absolute expiry in ms since epoch; null = permanent */
  ttl: number | null;
  /** Vault-only sync metadata */
  synced?: boolean;
  syncedAt?: number;
  lastFetchedAt?: number;
}

/** Shape of the __collections_index value in chrome.storage.local */
export type CollectionsIndex = Record<string, CollectionsIndexEntry>;

/** Storage key for the plain-domain index */
export const COLLECTIONS_INDEX_KEY = '__collections_index';

/**
 * Compute live highlight count from an event log.
 * Replays created / removed / cleared events to get the current set.
 */
export function computeHighlightCount(events: AnyHighlightEvent[]): number {
  const live = new Set<string>();

  for (const event of events) {
    if (event.type === 'highlight.created') {
      live.add(event.data.id);
    } else if (event.type === 'highlight.removed') {
      live.delete(event.highlightId);
    } else if (event.type === 'highlights.cleared') {
      live.clear();
    }
  }

  return live.size;
}

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

    // [OK] FIXED: Check for 'ranges' array (not singular 'range')
    // We save multiple ranges, validator was checking for wrong field!
    if (!data['ranges'] || !Array.isArray(data['ranges'])) return false;

    // Accept if ranges array exists (validation passed)
    return data['ranges'].length > 0;
  } else if (e['type'] === 'highlight.removed') {
    return typeof e['highlightId'] === 'string';
  } else if (e['type'] === 'highlights.cleared') {
    return typeof e['count'] === 'number';
  }

  return false;
}
