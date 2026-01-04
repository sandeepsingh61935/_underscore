/**
 * @file i-conflict-detector.ts
 * @description Interface for detecting conflicts between local and remote sync events
 * @see docs/04-adrs/001-event-sourcing-for-sync.md
 */

import type { SyncEvent } from '../../events/event-types';
import type { VectorClock } from './i-vector-clock-manager';

/**
 * Types of conflicts that can occur during sync
 */
export enum ConflictType {
    /**
     * Metadata conflict - different metadata (color, tags, notes) on same highlight
     * Resolution: Usually safe to merge or use last-write-wins
     */
    METADATA_CONFLICT = 'metadata_conflict',

    /**
     * Delete conflict - one device deleted while another modified
     * Resolution: Requires user decision or delete-wins policy
     */
    DELETE_CONFLICT = 'delete_conflict',

    /**
     * Position conflict - highlight moved to different position on same page
     * Resolution: Keep both or use last-write-wins
     */
    POSITION_CONFLICT = 'position_conflict',

    /**
     * Content conflict - different text selected (rare, but possible if page changed)
     * Resolution: Requires manual resolution
     */
    CONTENT_CONFLICT = 'content_conflict',
}

/**
 * Represents a detected conflict between local and remote events
 */
export interface Conflict {
    /** Unique identifier for this conflict */
    readonly id: string;

    /** Type of conflict detected */
    readonly type: ConflictType;

    /** Entity ID (highlight ID) that has the conflict */
    readonly entityId: string;

    /** Local events for this entity (chronologically ordered) */
    readonly local: SyncEvent[];

    /** Remote events for this entity (chronologically ordered) */
    readonly remote: SyncEvent[];

    /** Timestamp when conflict was detected (milliseconds since epoch) */
    readonly detectedAt: number;
}

/**
 * Conflict Detector Interface
 * 
 * Detects conflicts between local and remote sync events using vector clocks.
 * A conflict occurs when two events are **concurrent** (neither happened before the other).
 * 
 * **Detection Algorithm**:
 * 1. Group events by entity ID (highlight ID)
 * 2. For each entity present in both local and remote:
 *    a. Get latest event from each side
 *    b. Compare vector clocks
 *    c. If concurrent → conflict detected
 * 3. Determine conflict type based on event differences
 * 
 * **Causality Rules**:
 * - If A happened before B (A → B): No conflict, B is newer
 * - If B happened before A (B → A): No conflict, A is newer
 * - If A || B (concurrent): CONFLICT - both are valid, need resolution
 * 
 * @see IVectorClockManager for causality detection
 */
export interface IConflictDetector {
    /**
     * Detect all conflicts between local and remote events
     * 
     * @param local - Local sync events (from local device)
     * @param remote - Remote sync events (from server)
     * @returns Array of detected conflicts (empty if no conflicts)
     * @throws {ConflictDetectionError} If detection fails
     * 
     * @example
     * const conflicts = await detector.detectConflicts(localEvents, remoteEvents);
     * if (conflicts.length > 0) {
     *   // Handle conflicts
     * }
     */
    detectConflicts(local: SyncEvent[], remote: SyncEvent[]): Promise<Conflict[]>;

    /**
     * Quick check if two events conflict (for single event pairs)
     * 
     * @param localEvent - Local sync event
     * @param remoteEvent - Remote sync event
     * @returns true if events conflict, false otherwise
     * 
     * @example
     * if (detector.hasConflict(localEvent, remoteEvent)) {
     *   // Resolve conflict
     * }
     */
    hasConflict(localEvent: SyncEvent, remoteEvent: SyncEvent): boolean;

    /**
     * Group events by entity ID for efficient comparison
     * 
     * @param events - Array of sync events
     * @returns Map of entity ID to events (sorted by timestamp)
     * 
     * **Implementation Note**:
     * - Events for same entity must be sorted chronologically
     * - Used internally by detectConflicts()
     */
    groupByEntity(events: SyncEvent[]): Map<string, SyncEvent[]>;

    /**
     * Get conflict detection metrics
     * 
     * @returns Metrics snapshot
     */
    getMetrics(): ConflictDetectionMetrics;
}

/**
 * Metrics for conflict detection
 */
export interface ConflictDetectionMetrics {
    /** Total conflicts detected */
    totalConflicts: number;

    /** Conflicts by type */
    conflictsByType: Record<ConflictType, number>;

    /** Average detection latency (ms) */
    averageDetectionLatency: number;

    /** Total detection operations */
    totalDetections: number;
}
