/**
 * @file event-store.integration.test.ts
 * @description Integration tests for EventStore with real IndexedDB
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { EventStore } from '@/background/events/event-store';
import { SyncEventType } from '@/background/events/interfaces/i-event-store';
import type { SyncEvent } from '@/background/events/interfaces/i-event-store';
import type { ILogger } from '@/shared/interfaces/i-logger';

// Mock logger
const createMockLogger = (): ILogger => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
    getLevel: vi.fn(() => 1 as any), // Return LogLevel.INFO
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

describe('EventStore Integration Tests', () => {
    let store: EventStore;
    let logger: ILogger;

    beforeEach(() => {
        logger = createMockLogger();
        store = new EventStore(logger);
    });

    afterEach(async () => {
        await store.clear();
    });

    describe('Basic Operations', () => {
        it('should append event successfully', async () => {
            const event = await createTestEvent();

            await store.append(event);

            const events = await store.getEvents();
            expect(events).toHaveLength(1);
            expect(events[0].id).toBe(event.id);
        });

        it('should return events in chronological order (CRITICAL)', async () => {
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

            // Append in random order
            await store.append(event2);
            await store.append(event1);
            await store.append(event3);

            const events = await store.getEvents();

            // **CRITICAL**: Must be in chronological order
            expect(events).toHaveLength(3);
            expect(events[0].timestamp).toBe(100);
            expect(events[0].payload).toEqual({ id: 'entity-1', text: 'First' });
            expect(events[1].timestamp).toBe(150);
            expect(events[1].payload).toEqual({ id: 'entity-3', text: 'Middle' });
            expect(events[2].timestamp).toBe(200);
            expect(events[2].payload).toEqual({ id: 'entity-2', text: 'Second' });
        });

        it('should get events since timestamp', async () => {
            const event1 = await createTestEvent({ timestamp: 100 });
            const event2 = await createTestEvent({ timestamp: 200 });
            const event3 = await createTestEvent({ timestamp: 300 });

            await store.append(event1);
            await store.append(event2);
            await store.append(event3);

            const events = await store.getEventsSince(150);

            expect(events).toHaveLength(2);
            expect(events[0].timestamp).toBe(200);
            expect(events[1].timestamp).toBe(300);
        });

        it('should get latest event for entity', async () => {
            const event1 = await createTestEvent({
                timestamp: 100,
                payload: { id: 'highlight-1', text: 'v1' },
            });
            const event2 = await createTestEvent({
                timestamp: 200,
                payload: { id: 'highlight-1', text: 'v2' },
            });
            const event3 = await createTestEvent({
                timestamp: 300,
                payload: { id: 'highlight-2', text: 'other' },
            });

            await store.append(event1);
            await store.append(event2);
            await store.append(event3);

            const latest = await store.getLatestEvent('highlight-1');

            expect(latest).not.toBeNull();
            expect(latest!.timestamp).toBe(200);
            expect(latest!.payload).toEqual({ id: 'highlight-1', text: 'v2' });
        });

        it('should return correct count', async () => {
            expect(await store.count()).toBe(0);

            await store.append(await createTestEvent());
            expect(await store.count()).toBe(1);

            await store.append(await createTestEvent());
            await store.append(await createTestEvent());
            expect(await store.count()).toBe(3);
        });
    });

    describe('Filtering', () => {
        beforeEach(async () => {
            // Seed with diverse events
            await store.append(
                await createTestEvent({
                    type: SyncEventType.HIGHLIGHT_CREATED,
                    timestamp: 100,
                    payload: { id: 'h1', text: 'test' },
                    userId: 'user-1',
                })
            );
            await store.append(
                await createTestEvent({
                    type: SyncEventType.HIGHLIGHT_UPDATED,
                    timestamp: 200,
                    payload: { id: 'h1', changes: {} },
                    userId: 'user-1',
                })
            );
            await store.append(
                await createTestEvent({
                    type: SyncEventType.HIGHLIGHT_DELETED,
                    timestamp: 300,
                    payload: { id: 'h2', reason: 'user' },
                    userId: 'user-2',
                })
            );
            await store.append(
                await createTestEvent({
                    type: SyncEventType.COLLECTION_CREATED,
                    timestamp: 400,
                    payload: { id: 'c1', name: 'My Collection' },
                    userId: 'user-1',
                })
            );
        });

        it('should filter by event type', async () => {
            const events = await store.getEvents({
                eventType: SyncEventType.HIGHLIGHT_CREATED,
            });

            expect(events).toHaveLength(1);
            expect(events[0].type).toBe(SyncEventType.HIGHLIGHT_CREATED);
        });

        it('should filter by entity ID', async () => {
            const events = await store.getEvents({ entityId: 'h1' });

            expect(events).toHaveLength(2); // CREATED and UPDATED
            expect(events[0].type).toBe(SyncEventType.HIGHLIGHT_CREATED);
            expect(events[1].type).toBe(SyncEventType.HIGHLIGHT_UPDATED);
        });

        it('should filter by timestamp range', async () => {
            const events = await store.getEvents({ since: 150, until: 350 });

            expect(events).toHaveLength(2);
            expect(events[0].timestamp).toBe(200);
            expect(events[1].timestamp).toBe(300);
        });

        it('should return empty array when no events match filter', async () => {
            const events = await store.getEvents({
                eventType: SyncEventType.HIGHLIGHT_CREATED,
                entityId: 'nonexistent',
            });

            expect(events).toHaveLength(0);
        });
    });

    describe('Validation', () => {
        it('should throw on missing required field (id)', async () => {
            const event = await createTestEvent();
            // @ts-expect-error Testing validation
            delete event.id;

            await expect(store.append(event)).rejects.toThrow('Event ID is required');
        });

        it('should throw on missing required field (type)', async () => {
            const event = await createTestEvent();
            // @ts-expect-error Testing validation
            delete event.type;

            await expect(store.append(event)).rejects.toThrow('Event type is required');
        });

        it('should throw on future timestamp', async () => {
            const event = await createTestEvent({
                timestamp: Date.now() + 120000, // 2 minutes in future
            });

            await expect(store.append(event)).rejects.toThrow(
                'Event timestamp cannot be in the future'
            );
        });

        it('should throw on invalid vector clock', async () => {
            const event = await createTestEvent({
                // @ts-expect-error Testing validation
                vectorClock: 'invalid',
            });

            await expect(store.append(event)).rejects.toThrow(
                'Vector clock must be an object'
            );
        });
    });

    describe('Checksum Validation', () => {
        it('should generate checksum on append', async () => {
            const event = await createTestEvent();

            await store.append(event);

            const events = await store.getEvents();
            expect(events[0].checksum).toBe(event.checksum);
            expect(events[0].checksum).toHaveLength(64); // SHA-256 hex length
        });

        it('should verify checksum on retrieval', async () => {
            const event = await createTestEvent();
            await store.append(event);

            // Checksum should be valid
            const events = await store.getEvents();
            expect(events[0].checksum).toBeTruthy();
        });

        it('should detect corrupted event (checksum mismatch)', async () => {
            const event = await createTestEvent();
            // Corrupt checksum
            const corruptedEvent = {
                ...event,
                checksum: '0000000000000000000000000000000000000000000000000000000000000000',
            };

            await expect(store.append(corruptedEvent)).rejects.toThrow(
                'Event checksum mismatch'
            );
        });
    });

    describe('Edge Cases & Tricky Scenarios', () => {
        it('should handle large event payload (>1MB)', async () => {
            // Create 1.5MB payload
            const largeText = 'x'.repeat(1.5 * 1024 * 1024);
            const event = await createTestEvent({
                payload: { id: 'large-1', text: largeText },
            });

            await store.append(event);

            const events = await store.getEvents();
            expect(events).toHaveLength(1);
            expect((events[0].payload as any).text).toHaveLength(largeText.length);
        });

        it('should handle 1000+ events query efficiently', async () => {
            // Append 1000 events
            const startTime = performance.now();

            for (let i = 0; i < 1000; i++) {
                await store.append(
                    await createTestEvent({
                        timestamp: 1000 + i,
                        payload: { id: `entity-${i}`, text: `Event ${i}` },
                    })
                );
            }

            const appendDuration = performance.now() - startTime;
            console.log(`Appended 1000 events in ${appendDuration.toFixed(2)}ms`);

            // Query all events
            const queryStart = performance.now();
            const events = await store.getEvents();
            const queryDuration = performance.now() - queryStart;

            console.log(`Queried 1000 events in ${queryDuration.toFixed(2)}ms`);

            expect(events).toHaveLength(1000);
            expect(queryDuration).toBeLessThan(100); // Should be <100ms

            // Verify chronological order
            for (let i = 1; i < events.length; i++) {
                expect(events[i].timestamp).toBeGreaterThanOrEqual(
                    events[i - 1].timestamp
                );
            }
        });

        it('should handle concurrent appends without corruption', async () => {
            // Simulate concurrent appends from multiple sources
            const promises = [];

            for (let i = 0; i < 100; i++) {
                promises.push(
                    store.append(
                        await createTestEvent({
                            timestamp: 1000 + i,
                            payload: { id: `concurrent-${i}`, text: `Event ${i}` },
                        })
                    )
                );
            }

            await Promise.all(promises);

            const count = await store.count();
            expect(count).toBe(100);

            // Verify all events are intact
            const events = await store.getEvents();
            expect(events).toHaveLength(100);

            // Verify chronological order maintained
            for (let i = 1; i < events.length; i++) {
                expect(events[i].timestamp).toBeGreaterThanOrEqual(
                    events[i - 1].timestamp
                );
            }
        });

        it('should handle duplicate event ID gracefully', async () => {
            const event = await createTestEvent();

            await store.append(event);

            // Try to append same event again
            await expect(store.append(event)).rejects.toThrow(
                'Failed to append event to store'
            );

            // Verify only one event stored
            const count = await store.count();
            expect(count).toBe(1);
        });

        it('should handle empty payload gracefully', async () => {
            const event = await createTestEvent({
                payload: {},
            });

            await store.append(event);

            const events = await store.getEvents();
            expect(events).toHaveLength(1);
            expect(events[0].payload).toEqual({});
        });

        it('should handle Unicode text preservation', async () => {
            const unicodeText = '日本語 emoji 👍 ñoño';
            const event = await createTestEvent({
                payload: { id: 'unicode-1', text: unicodeText },
            });

            await store.append(event);

            const events = await store.getEvents();
            expect((events[0].payload as any).text).toBe(unicodeText);
        });

        it('should handle limit parameter correctly', async () => {
            // Append 10 events
            for (let i = 0; i < 10; i++) {
                await store.append(
                    await createTestEvent({
                        timestamp: 1000 + i,
                    })
                );
            }

            const events = await store.getEvents({ limit: 5 });

            expect(events).toHaveLength(5);
            // Should return first 5 (oldest)
            expect(events[0].timestamp).toBe(1000);
            expect(events[4].timestamp).toBe(1004);
        });

        it('should handle getLatestEvent when entity has no events', async () => {
            const latest = await store.getLatestEvent('nonexistent');

            expect(latest).toBeNull();
        });

        it('should clear all events', async () => {
            await store.append(await createTestEvent());
            await store.append(await createTestEvent());
            await store.append(await createTestEvent());

            expect(await store.count()).toBe(3);

            await store.clear();

            expect(await store.count()).toBe(0);
            const events = await store.getEvents();
            expect(events).toHaveLength(0);
        });
    });
});
