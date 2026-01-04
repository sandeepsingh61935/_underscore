/**
 * @file sync-queue.integration.test.ts
 * @description Integration tests for SyncQueue with real IndexedDB
 * Following Testing Strategy v2: Risk-based, realistic scenarios, minimal mocking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { SyncQueue } from '@/background/sync/sync-queue';
import { SyncEventType } from '@/background/events/interfaces/i-event-store';
import type { SyncEvent } from '@/background/events/interfaces/i-event-store';
import type { ILogger } from '@/shared/interfaces/i-logger';
import { EventBus } from '@/shared/utils/event-bus';
import type { INetworkDetector } from '@/background/sync/interfaces/i-network-detector';
import { QueueFullError } from '@/background/sync/sync-errors';

// Mock logger (real implementation, silent mode)
const createMockLogger = (): ILogger => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
    getLevel: vi.fn(() => 1 as any),
});

// Mock network detector
const createMockNetworkDetector = (online = true): INetworkDetector => ({
    isOnline: vi.fn(async () => online),
    subscribe: vi.fn(() => () => { }),
    getConnectionType: vi.fn(async () => 'wifi' as any),
});

// Helper to create test event
const createTestEvent = async (
    overrides?: Partial<SyncEvent>
): Promise<SyncEvent> => {
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

describe('SyncQueue Integration Tests', () => {
    let queue: SyncQueue;
    let logger: ILogger;
    let eventBus: EventBus;
    let networkDetector: INetworkDetector;

    beforeEach(() => {
        logger = createMockLogger();
        eventBus = new EventBus();
        networkDetector = createMockNetworkDetector(false); // Offline to prevent auto-sync
        queue = new SyncQueue(logger, eventBus, networkDetector);
    });

    afterEach(async () => {
        try {
            await queue.clear();
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    describe('Basic Operations', () => {
        it('should enqueue event successfully and persist to IndexedDB', async () => {
            const event = await createTestEvent();

            await queue.enqueue(event);

            const size = await queue.size();
            expect(size).toBe(1);

            const peeked = await queue.peek();
            expect(peeked).not.toBeNull();
            expect(peeked!.id).toBe(event.id);
        });

        it('should dequeue events in FIFO order (oldest first) - CRITICAL: chronological order required', async () => {
            // Create events with specific timestamps
            const event1 = await createTestEvent({
                timestamp: 100,
                payload: { id: 'entity-1', text: 'First' },
            });
            const event2 = await createTestEvent({
                timestamp: 200,
                payload: { id: 'entity-2', text: 'Second' },
            });
            const event3 = await createTestEvent({
                timestamp: 150,
                payload: { id: 'entity-3', text: 'Middle' },
            });

            // Enqueue in random order
            await queue.enqueue(event2);
            await queue.enqueue(event1);
            await queue.enqueue(event3);

            // Dequeue should return in chronological order
            const first = await queue.dequeue();
            expect(first).not.toBeNull();
            expect(first!.timestamp).toBe(100);
            expect(first!.payload).toEqual({ id: 'entity-1', text: 'First' });

            const second = await queue.dequeue();
            expect(second).not.toBeNull();
            expect(second!.timestamp).toBe(150);
            expect(second!.payload).toEqual({ id: 'entity-3', text: 'Middle' });

            const third = await queue.dequeue();
            expect(third).not.toBeNull();
            expect(third!.timestamp).toBe(200);
            expect(third!.payload).toEqual({ id: 'entity-2', text: 'Second' });
        });

        it('should peek without removing event from queue', async () => {
            const event = await createTestEvent();

            await queue.enqueue(event);

            const peeked = await queue.peek();
            expect(peeked).not.toBeNull();
            expect(peeked!.id).toBe(event.id);

            // Size should still be 1
            const size = await queue.size();
            expect(size).toBe(1);

            // Dequeue should still return the event
            const dequeued = await queue.dequeue();
            expect(dequeued!.id).toBe(event.id);
        });
    });

    describe('Priority Queue', () => {
        it('should dequeue DELETE events before CREATE (priority 1 vs 3)', async () => {
            const createEvent = await createTestEvent({
                type: SyncEventType.HIGHLIGHT_CREATED,
                timestamp: 100, // Earlier timestamp
            });
            const deleteEvent = await createTestEvent({
                type: SyncEventType.HIGHLIGHT_DELETED,
                timestamp: 200, // Later timestamp
            });

            // Enqueue CREATE first, then DELETE
            await queue.enqueue(createEvent);
            await queue.enqueue(deleteEvent);

            // DELETE should be dequeued first (higher priority)
            const first = await queue.dequeue();
            expect(first!.type).toBe(SyncEventType.HIGHLIGHT_DELETED);

            const second = await queue.dequeue();
            expect(second!.type).toBe(SyncEventType.HIGHLIGHT_CREATED);
        });

        it('should dequeue same priority by timestamp (oldest first) - CRITICAL: must sort by timestamp', async () => {
            const event1 = await createTestEvent({
                type: SyncEventType.HIGHLIGHT_CREATED,
                timestamp: 300,
            });
            const event2 = await createTestEvent({
                type: SyncEventType.HIGHLIGHT_CREATED,
                timestamp: 100,
            });
            const event3 = await createTestEvent({
                type: SyncEventType.HIGHLIGHT_CREATED,
                timestamp: 200,
            });

            // Enqueue in random order
            await queue.enqueue(event1);
            await queue.enqueue(event2);
            await queue.enqueue(event3);

            // Should dequeue in chronological order (same priority)
            const first = await queue.dequeue();
            expect(first!.timestamp).toBe(100);

            const second = await queue.dequeue();
            expect(second!.timestamp).toBe(200);

            const third = await queue.dequeue();
            expect(third!.timestamp).toBe(300);
        });
    });

    describe('Queue Limits - HIGH RISK', () => {
        it('should throw QueueFullError when max size reached (prevents data loss)', async () => {
            // Create queue with small max size for testing
            const smallQueue = new SyncQueue(logger, eventBus, networkDetector, {
                maxQueueSize: 5,
                batchSize: 50,
                syncInterval: 5000,
                retryAttempts: 3,
            });

            // Fill queue
            for (let i = 0; i < 5; i++) {
                await smallQueue.enqueue(await createTestEvent());
            }

            // 6th event should throw
            await expect(smallQueue.enqueue(await createTestEvent())).rejects.toThrow(
                QueueFullError
            );
            await expect(smallQueue.enqueue(await createTestEvent())).rejects.toThrow(
                'Queue full'
            );

            await smallQueue.clear();
        });

        it('should log warning at 80% capacity and emit event at 90%', async () => {
            const smallQueue = new SyncQueue(logger, eventBus, networkDetector, {
                maxQueueSize: 10,
                batchSize: 50,
                syncInterval: 5000,
                retryAttempts: 3,
            });

            const nearFullEvents: any[] = [];
            eventBus.on('QUEUE_NEAR_FULL', (data) => nearFullEvents.push(data));

            // Fill to 80% (8 events) - should warn on 9th enqueue
            for (let i = 0; i < 9; i++) {
                await smallQueue.enqueue(await createTestEvent());
            }

            expect(logger.warn).toHaveBeenCalledWith(
                'Queue near capacity',
                expect.objectContaining({
                    size: expect.any(Number),
                    percentage: expect.any(Number),
                })
            );

            // 10th event should emit QUEUE_NEAR_FULL
            await smallQueue.enqueue(await createTestEvent());

            expect(nearFullEvents.length).toBeGreaterThan(0);
            expect(nearFullEvents[0]).toMatchObject({
                size: expect.any(Number),
                max: 10,
            });

            await smallQueue.clear();
        });
    });

    describe('Realistic Edge Cases', () => {
        it('should handle 100 concurrent enqueue/dequeue operations without corruption', async () => {
            // Simulates real-world: user creates highlights rapidly while sync is running
            const enqueuePromises: Promise<void>[] = [];
            const events: SyncEvent[] = [];

            // Create 100 events
            for (let i = 0; i < 100; i++) {
                const event = await createTestEvent({
                    timestamp: 1000 + i,
                    payload: { id: `concurrent-${i}`, text: `Event ${i}` },
                });
                events.push(event);
            }

            // Enqueue all concurrently
            for (const event of events) {
                enqueuePromises.push(queue.enqueue(event));
            }

            await Promise.all(enqueuePromises);

            // Verify all events enqueued
            const size = await queue.size();
            expect(size).toBe(100);

            // Dequeue all and verify chronological order
            const dequeuedEvents: SyncEvent[] = [];
            for (let i = 0; i < 100; i++) {
                const event = await queue.dequeue();
                expect(event).not.toBeNull();
                dequeuedEvents.push(event!);
            }

            // Verify chronological order maintained
            for (let i = 1; i < dequeuedEvents.length; i++) {
                expect(dequeuedEvents[i].timestamp).toBeGreaterThanOrEqual(
                    dequeuedEvents[i - 1].timestamp
                );
            }

            // Queue should be empty
            expect(await queue.isEmpty()).toBe(true);
        });

        it('should handle isEmpty correctly', async () => {
            expect(await queue.isEmpty()).toBe(true);

            await queue.enqueue(await createTestEvent());
            expect(await queue.isEmpty()).toBe(false);

            await queue.dequeue();
            expect(await queue.isEmpty()).toBe(true);
        });

        it('should handle clear operation', async () => {
            for (let i = 0; i < 10; i++) {
                await queue.enqueue(await createTestEvent());
            }

            expect(await queue.size()).toBe(10);

            await queue.clear();

            expect(await queue.size()).toBe(0);
            expect(await queue.isEmpty()).toBe(true);
            expect(await queue.peek()).toBeNull();
        });

        it('should return null when dequeueing from empty queue', async () => {
            const event = await queue.dequeue();
            expect(event).toBeNull();
        });

        it('should return null when peeking empty queue', async () => {
            const event = await queue.peek();
            expect(event).toBeNull();
        });

        it('should emit QUEUE_UPDATED event on enqueue', async () => {
            const queueUpdates: any[] = [];
            eventBus.on('QUEUE_UPDATED', (data) => queueUpdates.push(data));

            await queue.enqueue(await createTestEvent());

            expect(queueUpdates).toHaveLength(1);
            expect(queueUpdates[0].size).toBeGreaterThan(0);
        });
    });
});
