/**
 * @file multi-device-sync.test.ts
 * @description Logical End-to-End test simulating multi-device synchronization and convergence
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Container } from '../../../src/shared/di/container';
import { registerConflictComponents } from '../../../src/background/conflict/conflict-container-registration';
import { MockLogger } from '../../helpers/mocks/mock-logger';
import { EventBus } from '../../../src/shared/utils/event-bus';
import type { IConflictDetector } from '../../../src/background/conflict/interfaces/i-conflict-detector';
import type { IConflictResolver } from '../../../src/background/conflict/interfaces/i-conflict-resolver';
import { ResolutionStrategy } from '../../../src/background/conflict/interfaces/i-conflict-resolver';
import { SyncEventType, type SyncEvent } from '../../../src/background/events/interfaces/i-event-store';
import type { IVectorClockManager } from '../../../src/background/conflict/interfaces/i-vector-clock-manager';

describe('Multi-Device Sync Simulation (Logical E2E)', () => {
    let container: Container;
    let detector: IConflictDetector;
    let resolver: IConflictResolver;
    let clockManager: IVectorClockManager;

    beforeEach(() => {
        container = new Container();
        const eventBus = new EventBus();
        container.registerSingleton('logger', () => new MockLogger());
        container.registerSingleton('eventBus', () => eventBus);
        registerConflictComponents(container);

        detector = container.resolve<IConflictDetector>('conflictDetector');
        resolver = container.resolve<IConflictResolver>('conflictResolver');
        clockManager = container.resolve<IVectorClockManager>('vectorClockManager');
    });

    it('should converge state across 3 devices (A, B, C) in a complex partition scenario', async () => {
        const entityId = 'h-shared';

        // 1. Initial State (All in sync)
        // t=1000. Clock {A:1, B:1, C:1}
        const baseClock = { 'A': 1, 'B': 1, 'C': 1 };

        // 2. Partition: C gets isolated. A and B communicate.

        // Device A updates: t=2000, Clock {A:2, B:1, C:1}
        const eventA: SyncEvent = {
            id: 'evt-A-2',
            type: SyncEventType.HIGHLIGHT_UPDATED,
            payload: { id: entityId, changes: { color: 'red' } },
            timestamp: 2000,
            deviceId: 'A',
            vectorClock: { ...baseClock, 'A': 2 },
            userId: 'u1',
            checksum: 'hashA'
        };

        // Device B updates: t=2050, Clock {A:1, B:2, C:1} (Concurrent with A)
        const eventB: SyncEvent = {
            id: 'evt-B-2',
            type: SyncEventType.HIGHLIGHT_UPDATED,
            payload: { id: entityId, changes: { color: 'blue' } },
            timestamp: 2050, // B is later
            deviceId: 'B',
            vectorClock: { ...baseClock, 'B': 2 },
            userId: 'u1',
            checksum: 'hashB'
        };

        // Device C updates (isolated): t=2100, Clock {A:1, B:1, C:2} (Concurrent with A and B)
        const eventC: SyncEvent = {
            id: 'evt-C-2',
            type: SyncEventType.HIGHLIGHT_UPDATED,
            payload: { id: entityId, changes: { color: 'green' } },
            timestamp: 2100, // C is latest
            deviceId: 'C',
            vectorClock: { ...baseClock, 'C': 2 },
            userId: 'u1',
            checksum: 'hashC'
        };

        // 3. A and B sync first
        const conflictsAB = await detector.detectConflicts([eventA], [eventB]);
        expect(conflictsAB).toHaveLength(1);
        const conflictAB = conflictsAB[0];
        if (!conflictAB) throw new Error('No conflict found');

        // Resolve A vs B (B wins due to LWW t=2050 > t=2000)
        const resolvedAB = await resolver.resolve(conflictAB, ResolutionStrategy.LAST_WRITE_WINS);

        expect((resolvedAB.payload as any).changes.color).toBe('blue');
        // Merged clock should be {A:2, B:2, C:1}
        expect(resolvedAB.vectorClock).toEqual({ 'A': 2, 'B': 2, 'C': 1 });

        // 4. Now sync merged(AB) with C
        // local = resolvedAB, remote = eventC
        const conflictsABC = await detector.detectConflicts([resolvedAB], [eventC]);
        expect(conflictsABC).toHaveLength(1);
        const conflictABC = conflictsABC[0];
        if (!conflictABC) throw new Error('No conflict found');

        // Resolve (AB) vs C (C wins due to LWW t=2100 > t=2050 (from B))
        const resolvedFinal = await resolver.resolve(conflictABC, ResolutionStrategy.LAST_WRITE_WINS);

        // 5. Verification
        // Final state should be Green (C's update)
        expect((resolvedFinal.payload as any).changes.color).toBe('green');

        // Final clock should dominate all: {A:2, B:2, C:2}
        expect(resolvedFinal.vectorClock).toEqual({ 'A': 2, 'B': 2, 'C': 2 });

        // Verify causality
        const finalClock = resolvedFinal.vectorClock;
        expect(clockManager.compare(finalClock, eventA.vectorClock)).toBe('after');
        expect(clockManager.compare(finalClock, eventB.vectorClock)).toBe('after');
        expect(clockManager.compare(finalClock, eventC.vectorClock)).toBe('after');
    });
});
