/**
 * @file sync-status.test.ts
 * @description Unit tests for SyncStatus
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncStatus, SyncState } from '@/background/sync/sync-status';
import type { ILogger } from '@/shared/interfaces/i-logger';
import { EventBus } from '@/shared/utils/event-bus';

const createMockLogger = (): ILogger => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
    getLevel: vi.fn(() => 1 as any),
});

describe('SyncStatus Unit Tests', () => {
    let status: SyncStatus;
    let logger: ILogger;
    let eventBus: EventBus;

    beforeEach(() => {
        logger = createMockLogger();
        eventBus = new EventBus();
        status = new SyncStatus(logger, eventBus);
    });

    describe('State Management', () => {
        it('should start in IDLE state', () => {
            expect(status.getState()).toBe(SyncState.IDLE);
        });

        it('should change state and emit event', () => {
            const events: any[] = [];
            eventBus.on('SYNC_STATUS_CHANGED', (data) => events.push(data));

            status.setState(SyncState.SYNCING);

            expect(status.getState()).toBe(SyncState.SYNCING);
            expect(events).toHaveLength(1);
            expect(events[0].state).toBe(SyncState.SYNCING);
        });

        it('should track last sync time when returning to IDLE', () => {
            status.setState(SyncState.SYNCING);
            status.setState(SyncState.IDLE);

            const lastSync = status.getLastSyncTime();
            expect(lastSync).not.toBeNull();
            expect(lastSync).toBeInstanceOf(Date);
        });

        it('should track error message', () => {
            status.setState(SyncState.ERROR, 'Network timeout');

            expect(status.getState()).toBe(SyncState.ERROR);
            expect(status.getErrorMessage()).toBe('Network timeout');
        });
    });

    describe('Progress Tracking', () => {
        it('should track sync progress', () => {
            const events: any[] = [];
            eventBus.on('SYNC_PROGRESS_UPDATED', (data) => events.push(data));

            status.setSyncProgress(50);

            expect(status.getSyncProgress()).toBe(50);
            expect(events).toHaveLength(1);
            expect(events[0].progress).toBe(50);
        });

        it('should clamp progress to 0-100 range', () => {
            status.setSyncProgress(150);
            expect(status.getSyncProgress()).toBe(100);

            status.setSyncProgress(-10);
            expect(status.getSyncProgress()).toBe(0);
        });

        it('should set progress to 100 when IDLE', () => {
            status.setState(SyncState.SYNCING);
            status.setSyncProgress(50);

            status.setState(SyncState.IDLE);

            expect(status.getSyncProgress()).toBe(100);
        });

        it('should set progress to 0 when starting sync', () => {
            status.setSyncProgress(50);

            status.setState(SyncState.SYNCING);

            expect(status.getSyncProgress()).toBe(0);
        });
    });
});
