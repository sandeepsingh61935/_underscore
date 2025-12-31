/**
 * @file i-storage.ts
 * @description Storage interface abstractions for event sourcing and persistence
 *
 * Provides abstraction over storage mechanisms (IndexedDB, chrome.storage, etc.)
 * Implements Repository Pattern for storage layer
 */

import type { AnyHighlightEvent } from '@/shared/types/storage';

/**
 * Event storage interface for highlight events
 *
 * @remarks
 * Used for event sourcing pattern
 * Stores immutable event log
 * Enables replay and audit trail
 */
export interface IStorage {
    /**
     * Save a highlight event to storage
     *
     * @param event - The highlight event to save
     * @returns Promise that resolves when event is saved
     *
     * @remarks
     * Events are append-only (immutable)
     * Each event has unique eventId
     */
    saveEvent(event: AnyHighlightEvent): Promise<void>;

    /**
     * Load all highlight events from storage
     *
     * @returns Promise resolving to array of events
     *
     * @remarks
     * Returns in chronological order (oldest first)
     * Used for event replay on initialization
     */
    loadEvents(): Promise<AnyHighlightEvent[]>;

    /**
     * Clear all events from storage
     *
     * @returns Promise that resolves when storage is cleared
     *
     * @remarks
     * Destructive operation - cannot be undone
     * Use with caution!
     */
    clear(): Promise<void>;
}

/**
 * Generic persistent storage interface
 *
 * @remarks
 * Abstraction over chrome.storage, IndexedDB, etc.
 * Type-safe key-value storage
 * Supports serialization/deserialization
 */
export interface IPersistentStorage {
    /**
     * Save value to storage
     *
     * @template T - Type of value to save
     * @param key - Storage key
     * @param value - Value to save (must be serializable)
     * @returns Promise that resolves when saved
     *
     * @remarks
     * Overwrites existing value if key exists
     * Value must be JSON-serializable
     */
    save<T>(key: string, value: T): Promise<void>;

    /**
     * Load value from storage
     *
     * @template T - Expected type of loaded value
     * @param key - Storage key
     * @returns Promise resolving to value or null if not found
     *
     * @remarks
     * Returns null if key doesn't exist
     * Caller responsible for type assertion
     */
    load<T>(key: string): Promise<T | null>;

    /**
     * Delete value from storage
     *
     * @param key - Storage key to delete
     * @returns Promise that resolves when deleted
     *
     * @remarks
     * Idempotent - no error if key doesn't exist
     */
    delete(key: string): Promise<void>;
}
