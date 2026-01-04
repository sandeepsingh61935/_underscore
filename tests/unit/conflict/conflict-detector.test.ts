/**
 * @file conflict-detector.test.ts
 * @description Unit tests for ConflictDetector
 * @see docs/vault-phase-dev-2/component5_task.md (Task 5.3)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictDetector } from '../../../src/background/conflict/conflict-detector';
import { VectorClockManager } from '../../../src/background/conflict/vector-clock-manager';
import { ConflictType } from '../../../src/background/conflict/interfaces/i-conflict-detector';
import { MockLogger } from '../../helpers/mocks/mock-logger';
import type { SyncEvent } from '../../../src/background/events/interfaces/i-event-store';
import { SyncEventType } from '../../../src/background/events/interfaces/i-event-store';
import type { VectorClock } from '../../../src/background/conflict/interfaces/i-vector-clock-manager';
import type {
    HighlightUpdatedPayload
} from '../../../src/background/events/event-types';

describe('ConflictDetector', () => {
    let detector: ConflictDetector;
    let clockManager: VectorClockManager;
    let logger: MockLogger;

    beforeEach(() => {
        logger = new MockLogger();
        clockManager = new VectorClockManager(logger);
        detector = new ConflictDetector(clockManager, logger);
    });

    // Helper to create test events
    const createEvent = (
        id: string,
        entityId: string,
        clock: VectorClock,
        type: SyncEventType = SyncEventType.HIGHLIGHT_UPDATED,
        payload: any = {}
    ): SyncEvent => ({
        id,
        type,
        payload: { id: entityId, ...payload },
        timestamp: Date.now(),
        deviceId: 'test-device',
        vectorClock: clock,
        checksum: 'checksum',
        userId: 'user-1',
    });

    describe('Detection Logic', () => {
        it('should NOT detect conflict if clocks are equal', async () => {
            const entityId = 'highlight-1';
            const clock = { 'device-A': 1 };

            const localEvent = createEvent('evt-1', entityId, clock);
            const remoteEvent = createEvent('evt-2', entityId, clock); // Same clock

            const conflicts = await detector.detectConflicts([localEvent], [remoteEvent]);

            expect(conflicts).toHaveLength(0);
        });

        it('should fail gracefully if event payload is missing ID', async () => {
            const localEvent = createEvent('evt-1', 'h-1', { 'A': 1 });
            // Malformed event with no payload
            const badEvent = { ...localEvent, payload: null } as any;

            await expect(
                detector.detectConflicts([badEvent], [])
            ).rejects.toThrow();
        });

        it('should detect concurrent events as conflict', async () => {
            const entityId = 'highlight-1';

            // Local: { A: 1, B: 0 }
            const localEvent = createEvent(
                'evt-1',
                entityId,
                { 'device-A': 1 },
                SyncEventType.HIGHLIGHT_UPDATED,
                { changes: { color: 'yellow' } }
            );

            // Remote: { A: 0, B: 1 }
            const remoteEvent = createEvent(
                'evt-2',
                entityId,
                { 'device-B': 1 },
                SyncEventType.HIGHLIGHT_UPDATED,
                { changes: { color: 'green' } }
            );

            const conflicts = await detector.detectConflicts([localEvent], [remoteEvent]);

            expect(conflicts).toHaveLength(1);
            expect(conflicts[0]).toBeDefined();
            expect(conflicts[0]!.entityId).toBe(entityId);
            expect(conflicts[0]!.type).toBe(ConflictType.METADATA_CONFLICT);
        });

        it('should NOT detect conflict if remote is after local', async () => {
            const entityId = 'highlight-1';

            // Local: { A: 1 }
            const localEvent = createEvent('evt-1', entityId, { 'device-A': 1 });

            // Remote: { A: 1, B: 1 } (After local)
            const remoteEvent = createEvent('evt-2', entityId, { 'device-A': 1, 'device-B': 1 });

            const conflicts = await detector.detectConflicts([localEvent], [remoteEvent]);

            expect(conflicts).toHaveLength(0);
        });

        it('should NOT detect conflict if local is after remote', async () => {
            const entityId = 'highlight-1';

            // Remote: { A: 1 }
            const remoteEvent = createEvent('evt-1', entityId, { 'device-A': 1 });

            // Local: { A: 1, B: 1 } (After remote)
            const localEvent = createEvent('evt-2', entityId, { 'device-A': 1, 'device-B': 1 });

            const conflicts = await detector.detectConflicts([localEvent], [remoteEvent]);

            expect(conflicts).toHaveLength(0);
        });

        it('should ignore entities not present in remote', async () => {
            const localEvent = createEvent('evt-1', 'highlight-1', { 'device-A': 1 });

            // No remote events
            const conflicts = await detector.detectConflicts([localEvent], []);

            expect(conflicts).toHaveLength(0);
        });

        it('should handle large event batches efficiently', async () => {
            const localEvents = [];
            const remoteEvents = [];

            for (let i = 0; i < 100; i++) {
                localEvents.push(createEvent(`l-${i}`, `h-${i}`, { 'device-A': 1 }));
                remoteEvents.push(createEvent(`r-${i}`, `h-${i}`, { 'device-B': 1 })); // Concurrent
            }

            const startTime = performance.now();
            const conflicts = await detector.detectConflicts(localEvents, remoteEvents);
            const duration = performance.now() - startTime;

            expect(conflicts).toHaveLength(100);
            expect(duration).toBeLessThan(100); // Should be fast (< 1ms per item)
        });

        it('should ignore events with mismatching entity IDs in hasConflict', () => {
            const localEvent = createEvent('evt-1', 'h-1', { 'A': 1 });
            const remoteEvent = createEvent('evt-2', 'h-2', { 'B': 1 }); // Different entity

            const result = detector.hasConflict(localEvent, remoteEvent);

            expect(result).toBe(false);
        });

        it('should handle detection errors gracefully', async () => {
            // Mock clock manager to throw error
            vi.spyOn(clockManager, 'compare').mockImplementation(() => {
                throw new Error('Clock error');
            });

            const localEvent = createEvent('evt-1', 'h-1', { 'A': 1 });
            const remoteEvent = createEvent('evt-2', 'h-1', { 'B': 1 });

            await expect(
                detector.detectConflicts([localEvent], [remoteEvent])
            ).rejects.toThrow('Failed to detect conflicts');
        });

        it('should group events correctly by entity ID', () => {
            const events = [
                createEvent('e1', 'h-1', { 'A': 1 }, undefined, undefined), // timestamp: now
                createEvent('e2', 'h-2', { 'A': 1 }, undefined, undefined),
                createEvent('e3', 'h-1', { 'A': 2 }, undefined, undefined), // Same entity as e1
            ];

            // Mutate timestamps to ensure sorting
            (events[0] as any).timestamp = 1000;
            (events[2] as any).timestamp = 2000;

            const grouped = detector.groupByEntity(events);

            expect(grouped.size).toBe(2);
            expect(grouped.get('h-1')).toHaveLength(2);
            expect(grouped.get('h-1')![0].id).toBe('e1'); // Sorted by time
            expect(grouped.get('h-1')![1].id).toBe('e3');
        });
    });

    describe('Conflict Types', () => {
        it('should detect DELETE_CONFLICT', async () => {
            const entityId = 'highlight-1';
            const clockA = { 'device-A': 1 };
            const clockB = { 'device-B': 1 };

            const localEvent = createEvent(
                'evt-1',
                entityId,
                clockA,
                SyncEventType.HIGHLIGHT_UPDATED // Modified locally
            );

            const remoteEvent = createEvent(
                'evt-2',
                entityId,
                clockB,
                SyncEventType.HIGHLIGHT_DELETED // Deleted remotely
            );

            const conflicts = await detector.detectConflicts([localEvent], [remoteEvent]);

            expect(conflicts).toHaveLength(1);
            expect(conflicts[0]).toBeDefined();
            expect(conflicts[0]!.type).toBe(ConflictType.DELETE_CONFLICT);
        });

        it('should detect POSITION_CONFLICT', async () => {
            const entityId = 'highlight-1';
            const clockA = { 'device-A': 1 };
            const clockB = { 'device-B': 1 };

            const localEvent = createEvent(
                'evt-1',
                entityId,
                clockA,
                SyncEventType.HIGHLIGHT_UPDATED,
                { changes: { ranges: [{ startOffset: 10 }] } } as HighlightUpdatedPayload // Changed range
            );

            const remoteEvent = createEvent(
                'evt-2',
                entityId,
                clockB,
                SyncEventType.HIGHLIGHT_UPDATED,
                { changes: { color: 'green' } } as HighlightUpdatedPayload
            );

            const conflicts = await detector.detectConflicts([localEvent], [remoteEvent]);

            expect(conflicts).toHaveLength(1);
            expect(conflicts[0]).toBeDefined();
            expect(conflicts[0]!.type).toBe(ConflictType.POSITION_CONFLICT);
        });

        it('should detect CONTENT_CONFLICT', async () => {
            const entityId = 'highlight-1';
            const clockA = { 'device-A': 1 };
            const clockB = { 'device-B': 1 };

            const localEvent = createEvent(
                'evt-1',
                entityId,
                clockA,
                SyncEventType.HIGHLIGHT_UPDATED,
                { changes: { text: 'new text' } } // Changed text
            );

            const remoteEvent = createEvent(
                'evt-2',
                entityId,
                clockB,
                SyncEventType.HIGHLIGHT_UPDATED,
                { changes: { color: 'green' } }
            );

            const conflicts = await detector.detectConflicts([localEvent], [remoteEvent]);

            expect(conflicts).toHaveLength(1);
            expect(conflicts[0]).toBeDefined();
            expect(conflicts[0]!.type).toBe(ConflictType.CONTENT_CONFLICT);
        });

        it('should default to METADATA_CONFLICT for other changes', async () => {
            const entityId = 'highlight-1';
            const clockA = { 'device-A': 1 };
            const clockB = { 'device-B': 1 };

            const localEvent = createEvent(
                'evt-1',
                entityId,
                clockA,
                SyncEventType.HIGHLIGHT_UPDATED,
                { changes: { color: 'yellow' } }
            );

            const remoteEvent = createEvent(
                'evt-2',
                entityId,
                clockB,
                SyncEventType.HIGHLIGHT_UPDATED,
                { changes: { note: 'new note' } }
            );

            const conflicts = await detector.detectConflicts([localEvent], [remoteEvent]);

            expect(conflicts).toHaveLength(1);
            expect(conflicts[0]).toBeDefined();
            expect(conflicts[0]!.type).toBe(ConflictType.METADATA_CONFLICT);
        });
    });

    describe('Metrics', () => {
        it('should track conflict metrics', async () => {
            const entityId = 'highlight-1';
            const localEvent = createEvent('evt-1', entityId, { 'device-A': 1 });
            const remoteEvent = createEvent('evt-2', entityId, { 'device-B': 1 });

            await detector.detectConflicts([localEvent], [remoteEvent]);

            const metrics = detector.getMetrics();
            expect(metrics.totalConflicts).toBe(1);
            expect(metrics.conflictsByType[ConflictType.METADATA_CONFLICT]).toBe(1);
            expect(metrics.totalDetections).toBe(1);
            expect(metrics.averageDetectionLatency).toBeGreaterThan(0);
        });
    });
});
