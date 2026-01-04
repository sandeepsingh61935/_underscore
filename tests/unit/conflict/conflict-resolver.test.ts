/**
 * @file conflict-resolver.test.ts
 * @description Unit tests for ConflictResolver
 * @see docs/vault-phase-dev-2/component5_task.md (Task 5.4)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictResolver } from '../../../src/background/conflict/conflict-resolver';
import { VectorClockManager } from '../../../src/background/conflict/vector-clock-manager';
import {
    ResolutionStrategy,
} from '../../../src/background/conflict/interfaces/i-conflict-resolver';
import {
    ConflictType,
    type Conflict
} from '../../../src/background/conflict/interfaces/i-conflict-detector';
import { MockLogger } from '../../helpers/mocks/mock-logger';
import { EventBus } from '../../../src/shared/utils/event-bus';
import { SyncEventType, type SyncEvent } from '../../../src/background/events/interfaces/i-event-store';

describe('ConflictResolver', () => {
    let resolver: ConflictResolver;
    let clockManager: VectorClockManager;
    let eventBus: EventBus;
    let logger: MockLogger;

    beforeEach(() => {
        logger = new MockLogger();
        clockManager = new VectorClockManager(logger);
        eventBus = new EventBus();
        resolver = new ConflictResolver(clockManager, eventBus, logger);
    });

    // Helper to create test conflict
    const createConflict = (
        type: ConflictType = ConflictType.METADATA_CONFLICT,
        localTimestamp = 1000,
        remoteTimestamp = 2000
    ): Conflict => {
        const localEvent: SyncEvent = {
            id: 'l-1',
            type: SyncEventType.HIGHLIGHT_UPDATED,
            payload: { id: 'h-1', changes: { color: 'yellow' } },
            timestamp: localTimestamp,
            deviceId: 'A',
            vectorClock: { 'A': 1 },
            checksum: 'c1',
            userId: 'u1'
        };

        const remoteEvent: SyncEvent = {
            id: 'r-1',
            type: SyncEventType.HIGHLIGHT_UPDATED,
            payload: { id: 'h-1', changes: { color: 'green' } },
            timestamp: remoteTimestamp,
            deviceId: 'B',
            vectorClock: { 'B': 1 },
            checksum: 'c2',
            userId: 'u1'
        };

        return {
            id: 'c-1',
            type,
            entityId: 'h-1',
            local: [localEvent],
            remote: [remoteEvent],
            detectedAt: Date.now()
        };
    };

    describe('Strategy Validations - canResolve', () => {
        it('should allow applicable strategies for METADATA_CONFLICT', () => {
            const conflict = createConflict(ConflictType.METADATA_CONFLICT);

            expect(resolver.canResolve(conflict, ResolutionStrategy.LAST_WRITE_WINS)).toBe(true);
            expect(resolver.canResolve(conflict, ResolutionStrategy.MERGE)).toBe(true);
            expect(resolver.canResolve(conflict, ResolutionStrategy.KEEP_BOTH)).toBe(false); // Can't keep both metadata
        });

        it('should restrict strategies for DELETE_CONFLICT', () => {
            const conflict = createConflict(ConflictType.DELETE_CONFLICT);

            expect(resolver.canResolve(conflict, ResolutionStrategy.LOCAL_WINS)).toBe(true);
            expect(resolver.canResolve(conflict, ResolutionStrategy.REMOTE_WINS)).toBe(true);
            expect(resolver.canResolve(conflict, ResolutionStrategy.MERGE)).toBe(false); // Can't merge delete
        });
    });

    describe('Resolution Execution', () => {
        it('should resolve using LAST_WRITE_WINS (remote newer)', async () => {
            const conflict = createConflict(ConflictType.METADATA_CONFLICT, 1000, 2000); // Remote newer
            const resolved = await resolver.resolve(conflict, ResolutionStrategy.LAST_WRITE_WINS);

            expect(resolved.id).toBe('r-1');
            expect(resolved.vectorClock).toEqual({ 'A': 1, 'B': 1 }); // Merged clock
        });

        it('should resolve using LAST_WRITE_WINS (local newer)', async () => {
            const conflict = createConflict(ConflictType.METADATA_CONFLICT, 3000, 2000); // Local newer
            const resolved = await resolver.resolve(conflict, ResolutionStrategy.LAST_WRITE_WINS);

            expect(resolved.id).toBe('l-1');
            expect(resolved.vectorClock).toEqual({ 'A': 1, 'B': 1 });
        });

        it('should resolve using LOCAL_WINS', async () => {
            const conflict = createConflict(ConflictType.METADATA_CONFLICT, 1000, 2000); // Remote newer, but force local
            const resolved = await resolver.resolve(conflict, ResolutionStrategy.LOCAL_WINS);

            expect(resolved.id).toBe('l-1');
        });

        it('should resolve using REMOTE_WINS', async () => {
            const conflict = createConflict(ConflictType.METADATA_CONFLICT, 3000, 2000); // Local newer, force remote
            const resolved = await resolver.resolve(conflict, ResolutionStrategy.REMOTE_WINS);

            expect(resolved.id).toBe('r-1');
        });

        it('should throw error for MANUAL resolution without UI', async () => {
            const conflict = createConflict(ConflictType.CONTENT_CONFLICT);

            await expect(
                resolver.resolve(conflict, ResolutionStrategy.MANUAL)
            ).rejects.toThrow('Manual resolution requires user input');
        });

        it('should throw error for incompatible strategy', async () => {
            const conflict = createConflict(ConflictType.DELETE_CONFLICT);

            await expect(
                resolver.resolve(conflict, ResolutionStrategy.MERGE)
            ).rejects.toThrow(/cannot resolve conflict type/);
        });

        it('should resolve using KEEP_BOTH (keeps local, warns)', async () => {
            const conflict = createConflict(ConflictType.POSITION_CONFLICT);
            const spy = vi.spyOn(logger, 'warn');

            const resolved = await resolver.resolve(conflict, ResolutionStrategy.KEEP_BOTH);

            expect(resolved.id).toBe('l-1'); // Keeps local
            expect(spy).toHaveBeenCalledWith(expect.stringContaining('KEEP_BOTH'), expect.any(Object));
        });
    });

    describe('Event Emission and Metrics', () => {
        it('should emit conflict:resolved event', async () => {
            const spy = vi.spyOn(eventBus, 'emit');
            const conflict = createConflict();

            await resolver.resolve(conflict, ResolutionStrategy.LOCAL_WINS); // Simple resolve

            expect(spy).toHaveBeenCalledWith('conflict:resolved', expect.objectContaining({
                conflictId: conflict.id,
                strategy: ResolutionStrategy.LOCAL_WINS
            }));
        });

        it('should update metrics', async () => {
            const conflict = createConflict();
            await resolver.resolve(conflict, ResolutionStrategy.LOCAL_WINS);

            const metrics = resolver.getMetrics();
            expect(metrics.totalResolved).toBe(1);
            expect(metrics.resolutionsByStrategy[ResolutionStrategy.LOCAL_WINS]).toBe(1);
        });
    });

    describe('Merge Strategy', () => {
        it('should merge payloads for MERGE strategy', async () => {
            const conflict = createConflict(ConflictType.METADATA_CONFLICT);
            // Setup distinct payloads
            (conflict.local[0] as any).payload = { id: 'h-1', tags: ['local'], color: 'yellow' };
            (conflict.remote[0] as any).payload = { id: 'h-1', tags: ['remote'], note: 'note' };

            const resolved = await resolver.resolve(conflict, ResolutionStrategy.MERGE);
            const payload = resolved.payload as any;

            expect(payload.color).toBe('yellow'); // Local overwrite
            expect(payload.note).toBe('note'); // Remote kept
            expect(payload.tags).toEqual(['local']); // Shallow merge (local wins collision)
        });
    });
});
