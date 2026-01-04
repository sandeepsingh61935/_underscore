/**
 * @file offline-queue.integration.test.ts
 * @description Integration tests for OfflineQueue
 * Following Testing Strategy v2: Realistic offline scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { OfflineQueue } from '@/background/sync/offline-queue';
import { SyncEventType } from '@/background/events/interfaces/i-event-store';
import type { SyncEvent } from '@/background/events/interfaces/i-event-store';
import type { ILogger } from '@/shared/interfaces/i-logger';
import { EventBus } from '@/shared/utils/event-bus';
import type { INetworkDetector } from '@/background/sync/interfaces/i-network-detector';

const createMockLogger = (): ILogger => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
    getLevel: vi.fn(() => 1 as any),
});

const createMockNetworkDetector = (initialOnline = false): INetworkDetector & { setOnline: (online: boolean) => void } => {
    let isOnlineValue = initialOnline;
    let callback: ((online: boolean) => void) | null = null;

    return {
        isOnline: vi.fn(async () => isOnlineValue),
        subscribe: vi.fn((cb) => {
            callback = cb;
            return () => { callback = null; };
        }),
        getConnectionType: vi.fn(async () => 'wifi' as any),
        setOnline: (online: boolean) => {
            isOnlineValue = online;
            if (callback) callback(online);
        },
    };
};

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

describe('OfflineQueue Integration Tests', () => {
    let queue: OfflineQueue;
    let logger: ILogger;
    let eventBus: EventBus;
    let networkDetector: ReturnType<typeof createMockNetworkDetector>;

    beforeEach(() => {
        logger = createMockLogger();
        eventBus = new EventBus();
        networkDetector = createMockNetworkDetector(false); // Start offline
        queue = new OfflineQueue(logger, eventBus, networkDetector);
    });

    afterEach(async () => {
        queue.destroy();
        await queue.clearOfflineQueue();
    });

    describe('Offline Queueing', () => {
        it('should queue events when offline', async () => {
            const event = await createTestEvent();

            await queue.queueOffline(event);

            const size = await queue.getOfflineQueueSize();
            expect(size).toBe(1);

            const oldest = await queue.getOldestOfflineEvent();
            expect(oldest).not.toBeNull();
            expect(oldest!.id).toBe(event.id);
        });

        it('should maintain chronological order (Realistic: User creates 10 highlights offline)', async () => {
            const events: SyncEvent[] = [];

            // User creates 10 highlights while offline
            for (let i = 0; i < 10; i++) {
                const event = await createTestEvent({
                    timestamp: 1000 + i,
                    payload: { id: `highlight-${i}`, text: `Event ${i}` },
                });
                events.push(event);
                await queue.queueOffline(event);
            }

            const size = await queue.getOfflineQueueSize();
            expect(size).toBe(10);

            // Oldest should be first event
            const oldest = await queue.getOldestOfflineEvent();
            expect(oldest!.timestamp).toBe(1000);
        });

        it('should emit OFFLINE_EVENT_QUEUED event', async () => {
            const queuedEvents: any[] = [];
            eventBus.on('OFFLINE_EVENT_QUEUED', (data) => queuedEvents.push(data));

            const event = await createTestEvent();
            await queue.queueOffline(event);

            expect(queuedEvents).toHaveLength(1);
            expect(queuedEvents[0].eventId).toBe(event.id);
        });

        it('should warn when queue exceeds 1000 events', async () => {
            // Queue 1001 events
            for (let i = 0; i < 1001; i++) {
                await queue.queueOffline(await createTestEvent());
            }

            expect(logger.warn).toHaveBeenCalledWith(
                'Offline queue exceeds limit',
                expect.objectContaining({ size: expect.any(Number) })
            );
        });
    });

    describe('Auto-Sync on Reconnection', () => {
        it('should sync events when network comes back online', async () => {
            const syncEvents: any[] = [];
            eventBus.on('OFFLINE_EVENT_READY', (data) => syncEvents.push(data));
            eventBus.on('OFFLINE_SYNC_STARTED', (data) => syncEvents.push(data));
            eventBus.on('OFFLINE_SYNC_COMPLETE', (data) => syncEvents.push(data));

            // Queue 5 events while offline
            for (let i = 0; i < 5; i++) {
                await queue.queueOffline(await createTestEvent());
            }

            expect(await queue.getOfflineQueueSize()).toBe(5);

            // Network comes back online
            networkDetector.setOnline(true);

            // Wait for sync
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Should have emitted sync events
            expect(syncEvents.length).toBeGreaterThan(0);
        });

        it('should clear queue after successful sync', async () => {
            // Queue events
            for (let i = 0; i < 3; i++) {
                await queue.queueOffline(await createTestEvent());
            }

            expect(await queue.getOfflineQueueSize()).toBe(3);

            // Network comes back online
            networkDetector.setOnline(true);

            // Wait for sync
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Queue should be empty
            const size = await queue.getOfflineQueueSize();
            expect(size).toBe(0);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty queue gracefully', async () => {
            const size = await queue.getOfflineQueueSize();
            expect(size).toBe(0);

            const oldest = await queue.getOldestOfflineEvent();
            expect(oldest).toBeNull();
        });

        it('should handle clear operation', async () => {
            for (let i = 0; i < 5; i++) {
                await queue.queueOffline(await createTestEvent());
            }

            expect(await queue.getOfflineQueueSize()).toBe(5);

            await queue.clearOfflineQueue();

            expect(await queue.getOfflineQueueSize()).toBe(0);
        });

        it('should emit OFFLINE_MODE_ENABLED when going offline', async () => {
            const offlineEvents: any[] = [];
            eventBus.on('OFFLINE_MODE_ENABLED', (data) => offlineEvents.push(data));

            // Start online, then go offline
            const onlineQueue = new OfflineQueue(
                logger,
                eventBus,
                createMockNetworkDetector(true)
            );

            const detector = createMockNetworkDetector(true);
            const queue2 = new OfflineQueue(logger, eventBus, detector);

            detector.setOnline(false);

            await new Promise((resolve) => setTimeout(resolve, 50));

            expect(offlineEvents.length).toBeGreaterThan(0);

            onlineQueue.destroy();
            queue2.destroy();
        });
    });
});
