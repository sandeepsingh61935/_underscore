/**
 * @file conflict-detector.ts
 * @description Implementation of conflict detection using vector clocks
 * @see docs/04-adrs/001-event-sourcing-for-sync.md
 */

import type {
    IConflictDetector,
    Conflict,
    ConflictDetectionMetrics,
} from './interfaces/i-conflict-detector';
import { ConflictType } from './interfaces/i-conflict-detector';
import type { IVectorClockManager } from './interfaces/i-vector-clock-manager';
import type { SyncEvent } from '../events/interfaces/i-event-store';
import { SyncEventType } from '../events/interfaces/i-event-store';
import { ConflictDetectionError } from './conflict-errors';
import type { ILogger } from '../../shared/utils/logger';
import { nanoid } from 'nanoid';
import type {
    HighlightCreatedPayload,
    HighlightUpdatedPayload,
} from '../events/event-types';

/**
 * Conflict Detector Implementation
 * 
 * Detects conflicts between local and remote sync events using vector clocks.
 * A conflict occurs when two events are concurrent (neither happened before the other).
 * 
 * **Detection Algorithm**:
 * 1. Group events by entity ID (highlight ID)
 * 2. For each entity present in both local and remote:
 *    a. Get latest event from each side
 *    b. Compare vector clocks
 *    c. If concurrent → conflict detected
 * 3. Determine conflict type based on event differences
 * 
 * **Performance**: O(n + m) where n = local events, m = remote events
 */
export class ConflictDetector implements IConflictDetector {
    private metrics: ConflictDetectionMetrics = {
        totalConflicts: 0,
        conflictsByType: {
            metadata_conflict: 0,
            delete_conflict: 0,
            position_conflict: 0,
            content_conflict: 0,
        },
        averageDetectionLatency: 0,
        totalDetections: 0,
    };

    constructor(
        private readonly clockManager: IVectorClockManager,
        private readonly logger: ILogger
    ) { }

    /**
     * Detect all conflicts between local and remote events
     */
    async detectConflicts(
        local: SyncEvent[],
        remote: SyncEvent[]
    ): Promise<Conflict[]> {
        const startTime = performance.now();

        try {
            const conflicts: Conflict[] = [];

            // 1. Group events by entity ID
            const localByEntity = this.groupByEntity(local);
            const remoteByEntity = this.groupByEntity(remote);

            // 2. Find entities present in both local and remote
            for (const [entityId, localEvents] of localByEntity) {
                const remoteEvents = remoteByEntity.get(entityId);
                if (!remoteEvents) {
                    // No conflict if only local
                    continue;
                }

                // 3. Check for conflict
                const conflict = await this.checkConflict(
                    entityId,
                    localEvents,
                    remoteEvents
                );
                if (conflict) {
                    conflicts.push(conflict);
                    this.updateMetrics(conflict);
                }
            }

            // Update detection metrics
            const latency = performance.now() - startTime;
            this.updateDetectionMetrics(latency);

            this.logger.info('Conflict detection completed', {
                localEvents: local.length,
                remoteEvents: remote.length,
                conflictsDetected: conflicts.length,
                latencyMs: latency.toFixed(2),
            });

            return conflicts;
        } catch (error) {
            this.logger.error(
                'Conflict detection failed',
                error instanceof Error ? error : undefined,
                {
                    localCount: local.length,
                    remoteCount: remote.length,
                }
            );
            throw new ConflictDetectionError(
                'Failed to detect conflicts',
                {
                    error: error instanceof Error ? error.message : String(error),
                }
            );
        }
    }

    /**
     * Quick check if two events conflict
     */
    hasConflict(localEvent: SyncEvent, remoteEvent: SyncEvent): boolean {
        // Events must be for same entity
        const localEntityId = this.extractEntityId(localEvent);
        const remoteEntityId = this.extractEntityId(remoteEvent);

        if (localEntityId !== remoteEntityId) {
            return false;
        }

        // Compare vector clocks
        const comparison = this.clockManager.compare(
            localEvent.vectorClock,
            remoteEvent.vectorClock
        );

        // Conflict if concurrent
        return comparison === 'concurrent';
    }

    /**
     * Group events by entity ID for efficient comparison
     */
    groupByEntity(events: SyncEvent[]): Map<string, SyncEvent[]> {
        const grouped = new Map<string, SyncEvent[]>();

        for (const event of events) {
            const entityId = this.extractEntityId(event);
            const existing = grouped.get(entityId) || [];
            existing.push(event);
            grouped.set(entityId, existing);
        }

        // Sort each group by timestamp (chronological order)
        for (const [entityId, entityEvents] of grouped) {
            entityEvents.sort((a, b) => a.timestamp - b.timestamp);
            grouped.set(entityId, entityEvents);
        }

        return grouped;
    }

    /**
     * Get conflict detection metrics
     */
    getMetrics(): ConflictDetectionMetrics {
        return { ...this.metrics };
    }

    /**
     * Check if events for a specific entity conflict
     * @private
     */
    private async checkConflict(
        entityId: string,
        localEvents: SyncEvent[],
        remoteEvents: SyncEvent[]
    ): Promise<Conflict | null> {
        // Get latest event from each side
        const latestLocal = localEvents[localEvents.length - 1];
        const latestRemote = remoteEvents[remoteEvents.length - 1];

        if (!latestLocal || !latestRemote) {
            return null;
        }

        // Compare vector clocks
        const comparison = this.clockManager.compare(
            latestLocal.vectorClock,
            latestRemote.vectorClock
        );

        // No conflict if not concurrent
        if (comparison !== 'concurrent') {
            return null;
        }

        // Determine conflict type
        const conflictType = this.determineConflictType(
            latestLocal,
            latestRemote
        );

        // Create conflict object
        const conflict: Conflict = {
            id: nanoid(),
            type: conflictType,
            entityId,
            local: localEvents,
            remote: remoteEvents,
            detectedAt: Date.now(),
        };

        this.logger.warn('Conflict detected', {
            conflictId: conflict.id,
            type: conflictType,
            entityId,
            localEventCount: localEvents.length,
            remoteEventCount: remoteEvents.length,
        });

        return conflict;
    }

    /**
     * Determine the type of conflict based on event differences
     * @private
     */
    private determineConflictType(
        local: SyncEvent,
        remote: SyncEvent
    ): ConflictType {
        // Delete conflict: one side deleted, other modified
        if (local.type === SyncEventType.HIGHLIGHT_DELETED || remote.type === SyncEventType.HIGHLIGHT_DELETED) {
            return ConflictType.DELETE_CONFLICT;
        }

        // Both are updates - check what changed
        if (local.type === SyncEventType.HIGHLIGHT_UPDATED && remote.type === SyncEventType.HIGHLIGHT_UPDATED) {
            const localPayload = local.payload as HighlightUpdatedPayload;
            const remotePayload = remote.payload as HighlightUpdatedPayload;

            // Check if position changed
            const localChanges = localPayload.changes || {};
            const remoteChanges = remotePayload.changes || {};

            if (localChanges.ranges || remoteChanges.ranges) {
                return ConflictType.POSITION_CONFLICT;
            }

            if (localChanges.text || remoteChanges.text) {
                return ConflictType.CONTENT_CONFLICT;
            }

            // Otherwise metadata conflict (color, tags, notes, etc.)
            return ConflictType.METADATA_CONFLICT;
        }

        // Default to metadata conflict
        return ConflictType.METADATA_CONFLICT;
    }

    /**
   * Extract entity ID from event payload
   * All event payloads have an 'id' field
   * @private
   */
    private extractEntityId(event: SyncEvent): string {
        const payload = event.payload as
            | HighlightCreatedPayload
            | HighlightUpdatedPayload
            | { id: string };
        return payload.id;
    }

    /**
     * Update metrics for detected conflict
     * @private
     */
    private updateMetrics(conflict: Conflict): void {
        this.metrics.totalConflicts++;
        this.metrics.conflictsByType[conflict.type]++;
    }

    /**
     * Update detection latency metrics
     * @private
     */
    private updateDetectionMetrics(latency: number): void {
        const total = this.metrics.totalDetections;
        const currentAvg = this.metrics.averageDetectionLatency;

        // Calculate running average
        this.metrics.averageDetectionLatency =
            (currentAvg * total + latency) / (total + 1);
        this.metrics.totalDetections++;
    }
}
