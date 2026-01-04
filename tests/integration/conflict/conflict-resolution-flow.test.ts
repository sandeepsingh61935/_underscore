/**
 * @file conflict-resolution-flow.test.ts
 * @description Integration test for the full conflict resolution flow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Container } from '../../../src/shared/di/container';
import { registerConflictComponents } from '../../../src/background/conflict/conflict-container-registration';
import { MockLogger } from '../../helpers/mocks/mock-logger';
import { EventBus } from '../../../src/shared/utils/event-bus';
import type { IConflictDetector } from '../../../src/background/conflict/interfaces/i-conflict-detector';
import type { IConflictResolver } from '../../../src/background/conflict/interfaces/i-conflict-resolver';
import { ResolutionStrategy } from '../../../src/background/conflict/interfaces/i-conflict-resolver';
import { SyncEventType, type SyncEvent } from '../../../src/background/events/interfaces/i-event-store';

describe('Conflict Resolution Integration Flow', () => {
    let container: Container;
    let detector: IConflictDetector;
    let resolver: IConflictResolver;
    let eventBus: EventBus;

    beforeEach(() => {
        container = new Container();

        // Register dependencies manually or mocks
        // We use real EventBus for integration
        eventBus = new EventBus();
        container.registerSingleton('logger', () => new MockLogger());
        container.registerSingleton('eventBus', () => eventBus);

        // Register conflict components
        registerConflictComponents(container);

        // Resolve services
        detector = container.resolve<IConflictDetector>('conflictDetector');
        resolver = container.resolve<IConflictResolver>('conflictResolver');
    });

    it('should detect and resolve a conflict end-to-end', async () => {
        // 1. Setup: Create Concurrent Events
        const entityId = 'highlight-123';

        // Device A: Created highlight at t=1000
        // Device A: Updates clock to {A:1}
        const localEvent: SyncEvent = {
            id: 'evt-local-1',
            type: SyncEventType.HIGHLIGHT_UPDATED,
            payload: { id: entityId, changes: { color: 'yellow' } },
            timestamp: 1000,
            deviceId: 'device-A',
            vectorClock: { 'device-A': 1 },
            userId: 'user-1',
            checksum: 'abc'
        };

        // Device B: Created highlight (synced) then updated independently
        // Device B: Updates clock to {B:1}, but knows about {A:0} (implicitly)
        // Wait, concurrent means they didn't see each other.
        // Local: {A:1}
        // Remote: {B:1}
        // Both are concurrent because neither dominates.
        const remoteEvent: SyncEvent = {
            id: 'evt-remote-1',
            type: SyncEventType.HIGHLIGHT_UPDATED,
            payload: { id: entityId, changes: { color: 'green' } },
            timestamp: 2000, // Remote is later
            deviceId: 'device-B',
            vectorClock: { 'device-B': 1 },
            userId: 'user-1',
            checksum: 'xyz'
        };

        // 2. Detection
        const conflicts = await detector.detectConflicts([localEvent], [remoteEvent]);

        expect(conflicts).toHaveLength(1);
        const conflict = conflicts[0];
        expect(conflict.type).toBeDefined();
        expect(conflict.entityId).toBe(entityId);

        // 3. Resolution (Last Write Wins)
        // Spy on event bus
        const eventSpy = vi.spyOn(eventBus, 'emit');

        const resolvedEvent = await resolver.resolve(conflict, ResolutionStrategy.LAST_WRITE_WINS);

        // 4. Verification
        // ID should be remote's ID (remote is newer)
        expect(resolvedEvent.id).toBe(remoteEvent.id);

        // Vector Clock should be merged: {A:1, B:1}
        expect(resolvedEvent.vectorClock).toEqual({
            'device-A': 1,
            'device-B': 1
        });

        // Check payload wins
        expect((resolvedEvent.payload as any).changes.color).toBe('green');

        // 5. Event Emission check
        expect(eventSpy).toHaveBeenCalledWith('conflict:resolved', expect.objectContaining({
            conflictId: conflict.id,
            strategy: ResolutionStrategy.LAST_WRITE_WINS
        }));
    });

    it('should handle complex delete conflict flow', async () => {
        // A deletes, B updates
        const entityId = 'h-del';

        const localEvent: SyncEvent = {
            id: 'l-del',
            type: SyncEventType.HIGHLIGHT_DELETED,
            payload: { id: entityId },
            timestamp: 1000,
            deviceId: 'A',
            vectorClock: { 'A': 2 },
            userId: 'u1',
            checksum: 'c1'
        };

        const remoteEvent: SyncEvent = {
            id: 'r-upd',
            type: SyncEventType.HIGHLIGHT_UPDATED,
            payload: { id: entityId, changes: { note: 'important' } },
            timestamp: 900,
            deviceId: 'B',
            vectorClock: { 'B': 2 },
            userId: 'u1',
            checksum: 'c2'
        };

        const conflicts = await detector.detectConflicts([localEvent], [remoteEvent]);
        expect(conflicts).toHaveLength(1);

        // Resolve: Local Wins (Delete wins)
        const resolved = await resolver.resolve(conflicts[0], ResolutionStrategy.LOCAL_WINS);

        expect(resolved.type).toBe(SyncEventType.HIGHLIGHT_DELETED);
        expect(resolved.vectorClock).toEqual({ 'A': 2, 'B': 2 });
    });
});
