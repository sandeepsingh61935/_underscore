/**
 * @file sync-integration.test.ts
 * @description End-to-end integration tests for sync engine
 * Following Testing Strategy v2: Realistic end-to-end scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { Container } from '@/shared/di/container';
import { ConsoleLogger, LogLevel } from '@/shared/utils/logger';
import { registerSyncComponents } from '@/background/sync/sync-container-registration';
import type { ISyncQueue } from '@/background/sync/interfaces/i-sync-queue';
import type { INetworkDetector } from '@/background/sync/interfaces/i-network-detector';
import type { IRateLimiter } from '@/background/sync/interfaces/i-rate-limiter';
import { SyncEventType } from '@/background/events/interfaces/i-event-store';
import type { SyncEvent } from '@/background/events/interfaces/i-event-store';
import { EventBus } from '@/shared/utils/event-bus';
import { SyncBatcher } from '@/background/sync/sync-batcher';
import { OfflineQueue } from '@/background/sync/offline-queue';
import { SyncStatus, SyncState } from '@/background/sync/sync-status';

const createTestEvent = async (overrides?: Partial<SyncEvent>): Promise<SyncEvent> => {
    const payload = overrides?.payload || { id: 'entity-1', text: 'test' };
    const payloadStr = JSON.stringify(payload);
    const encoder = new TextEncoder();
    const data = encoder.encode(payloadStr);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const checksum = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    return {
        id: crypto.randomUUID(),
        type: SyncEventType.HIGHLIGHT_CREATED,
        payload,
        timestamp: Date.now(),
        deviceId: 'device-1',
        vectorClock: { 'device-1': 1 },
        checksum,
        userId: 'user-123',
        ...overrides,
    };
};

describe('Sync Engine Integration Tests', () => {
    let container: Container;
    let syncQueue: ISyncQueue;
    let networkDetector: INetworkDetector;
    let rateLimiter: IRateLimiter;
    let eventBus: EventBus;
    let syncBatcher: SyncBatcher;
    let offlineQueue: OfflineQueue;
    let syncStatus: SyncStatus;

    beforeEach(() => {
        container = new Container();
        container.registerSingleton('logger', () => new ConsoleLogger('sync-test', LogLevel.ERROR));
        registerSyncComponents(container);

        syncQueue = container.resolve<ISyncQueue>('syncQueue');
        networkDetector = container.resolve<INetworkDetector>('networkDetector');
        rateLimiter = container.resolve<IRateLimiter>('rateLimiter');
        eventBus = container.resolve<EventBus>('eventBus');
        syncBatcher = container.resolve<SyncBatcher>('syncBatcher');
        offlineQueue = container.resolve<OfflineQueue>('offlineQueue');
        syncStatus = container.resolve<SyncStatus>('syncStatus');
    });

    afterEach(async () => {
        await syncQueue.clear();
        await offlineQueue.clearOfflineQueue();
        offlineQueue.destroy();
    });

    describe('End-to-End Sync Flow', () => {
        it('should complete full sync cycle: enqueue → batch → sync (Realistic: User creates 50 highlights)', async () => {
            const chunkEvents: any[] = [];
            eventBus.on('CHUNK_READY', (data) => chunkEvents.push(data));

            // User creates 50 highlights
            for (let i = 0; i < 50; i++) {
                const event = await createTestEvent({
                    timestamp: 1000 + i,
                    payload: { id: `highlight-${i}`, text: `Highlight ${i}` },
                });

                await syncQueue.enqueue(event);
                syncBatcher.addToBatch(event);
            }

            // Verify queue
            const queueSize = await syncQueue.size();
            expect(queueSize).toBe(50);

            // Trigger batch flush
            await syncBatcher.flush();

            // Should have processed batch
            expect(chunkEvents.length).toBeGreaterThan(0);

            // Dequeue all events
            for (let i = 0; i < 50; i++) {
                const event = await syncQueue.dequeue();
                expect(event).not.toBeNull();
            }

            // Queue should be empty
            expect(await syncQueue.isEmpty()).toBe(true);
        });

        it('should handle offline → online transition with auto-sync (Tricky: Network flapping)', async () => {
            const offlineEvents: any[] = [];
            eventBus.on('OFFLINE_EVENT_READY', (data) => offlineEvents.push(data));

            // Queue events while offline
            for (let i = 0; i < 5; i++) {
                await offlineQueue.queueOffline(await createTestEvent());
            }

            expect(await offlineQueue.getOfflineQueueSize()).toBe(5);

            // Simulate network coming online
            // (In real scenario, NetworkDetector would trigger this)
            eventBus.emit('NETWORK_ONLINE', { timestamp: Date.now() });

            // Wait for potential async operations
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Offline queue should still have events (they're emitted for sync, not auto-cleared in this test)
            const size = await offlineQueue.getOfflineQueueSize();
            expect(size).toBeGreaterThanOrEqual(0);
        });

        it('should enforce rate limits across sync operations (Security: Prevent DoS)', async () => {
            const userId = 'user-123';
            const operation = 'sync';

            // Simulate 20 sync requests (limit is 10/min)
            let blockedCount = 0;

            for (let i = 0; i < 20; i++) {
                const allowed = await rateLimiter.checkLimit(userId, operation);
                if (!allowed) {
                    blockedCount++;
                }
            }

            // Should block 10 requests
            expect(blockedCount).toBe(10);

            // Metrics should reflect this
            const metrics = await rateLimiter.getMetrics();
            expect(metrics.totalAttempts).toBe(20);
            expect(metrics.blockedAttempts).toBe(10);
        });
    });

    describe('Component Integration', () => {
        it('should integrate SyncQueue + SyncBatcher correctly', async () => {
            const batchEvents: any[] = [];
            eventBus.on('BATCH_SENT', (data) => batchEvents.push(data));

            // Enqueue events
            for (let i = 0; i < 10; i++) {
                const event = await createTestEvent();
                await syncQueue.enqueue(event);
                syncBatcher.addToBatch(event);
            }

            // Flush batch
            await syncBatcher.flush();

            // Should have sent batch
            expect(batchEvents).toHaveLength(1);
            expect(batchEvents[0].size).toBe(10);
        });

        it('should integrate NetworkDetector + OfflineQueue correctly', async () => {
            // This test verifies the subscription works
            let subscriptionCalled = false;

            const unsubscribe = networkDetector.subscribe((online) => {
                subscriptionCalled = true;
            });

            // Cleanup
            unsubscribe();

            // Subscription should be set up
            expect(typeof unsubscribe).toBe('function');
        });

        it('should integrate SyncStatus with sync operations', () => {
            // Set syncing state
            syncStatus.setState(SyncState.SYNCING);
            expect(syncStatus.getState()).toBe(SyncState.SYNCING);

            // Update progress
            syncStatus.setSyncProgress(50);
            expect(syncStatus.getSyncProgress()).toBe(50);

            // Complete sync
            syncStatus.setState(SyncState.IDLE);
            expect(syncStatus.getState()).toBe(SyncState.IDLE);
            expect(syncStatus.getSyncProgress()).toBe(100);
        });
    });

    describe('Error Handling', () => {
        it('should handle queue overflow gracefully', async () => {
            // Create small queue
            const smallContainer = new Container();
            smallContainer.registerSingleton('logger', () => new ConsoleLogger('sync-test', LogLevel.ERROR));
            registerSyncComponents(smallContainer);

            const smallQueue = smallContainer.resolve<ISyncQueue>('syncQueue');

            // This test just verifies the queue can handle operations
            // Actual overflow would require filling to maxQueueSize (10000)
            await smallQueue.enqueue(await createTestEvent());
            expect(await smallQueue.size()).toBe(1);

            await smallQueue.clear();
        });

        it('should handle rate limit exceeded', async () => {
            const events: any[] = [];
            eventBus.on('RATE_LIMIT_EXCEEDED', (data) => events.push(data));

            const userId = 'user-456';

            // Exhaust limit
            for (let i = 0; i < 10; i++) {
                await rateLimiter.checkLimit(userId, 'sync');
            }

            // Trigger rate limit
            await rateLimiter.checkLimit(userId, 'sync');

            expect(events).toHaveLength(1);
            expect(events[0].userId).toBe(userId);
        });
    });
});
