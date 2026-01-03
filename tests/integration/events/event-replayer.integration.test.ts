/**
 * @file event-replayer.integration.test.ts
 * @description Integration tests for EventReplayer
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventReplayer } from '@/background/events/event-replayer';
import type { SyncEvent } from '@/background/events/interfaces/i-event-store';
import { SyncEventType } from '@/background/events/interfaces/i-event-store';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';

const createMockLogger = (): ILogger => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
    getLevel: vi.fn(() => 1 as any),
});

// Helper to create test event
const createTestEvent = async (
    type: SyncEventType,
    payload: any,
    timestamp: number
): Promise<SyncEvent> => {
    const payloadStr = JSON.stringify(payload);
    const encoder = new TextEncoder();
    const data = encoder.encode(payloadStr);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const checksum = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    return {
        id: crypto.randomUUID(),
        type,
        payload,
        timestamp,
        deviceId: 'device-1',
        vectorClock: { 'device-1': 1 },
        checksum,
        userId: 'user-123',
    };
};

describe('EventReplayer Integration Tests', () => {
    let replayer: EventReplayer;
    let logger: ILogger;

    beforeEach(() => {
        logger = createMockLogger();
        replayer = new EventReplayer(logger);
    });

    describe('Basic Replay', () => {
        it('should return empty state for empty event log', async () => {
            const state = await replayer.replay([]);

            expect(state.size).toBe(0);
        });

        it('should reconstruct highlight from single CREATE event', async () => {
            const highlightData: HighlightDataV2 = {
                id: 'highlight-1',
                text: 'Test highlight',
                color: 'yellow',
                createdAt: Date.now(),
                url: 'https://example.com',
            } as any;

            const event = await createTestEvent(
                SyncEventType.HIGHLIGHT_CREATED,
                { id: 'highlight-1', data: highlightData },
                100
            );

            const state = await replayer.replay([event]);

            expect(state.size).toBe(1);
            expect(state.get('highlight-1')).toEqual(highlightData);
        });

        it('should apply CREATE → UPDATE sequence correctly', async () => {
            const initialData: HighlightDataV2 = {
                id: 'highlight-1',
                text: 'Original text',
                color: 'yellow',
                createdAt: Date.now(),
                url: 'https://example.com',
            } as any;

            const createEvent = await createTestEvent(
                SyncEventType.HIGHLIGHT_CREATED,
                { id: 'highlight-1', data: initialData },
                100
            );

            const updateEvent = await createTestEvent(
                SyncEventType.HIGHLIGHT_UPDATED,
                {
                    id: 'highlight-1',
                    changes: { text: 'Updated text', color: 'green' },
                    previousVersion: 100,
                },
                200
            );

            const state = await replayer.replay([createEvent, updateEvent]);

            expect(state.size).toBe(1);
            const highlight = state.get('highlight-1');
            expect(highlight?.text).toBe('Updated text');
            expect(highlight?.color).toBe('green');
        });

        it('should apply CREATE → DELETE sequence (remove from state)', async () => {
            const highlightData: HighlightDataV2 = {
                id: 'highlight-1',
                text: 'Test highlight',
                color: 'yellow',
                createdAt: Date.now(),
                url: 'https://example.com',
            } as any;

            const createEvent = await createTestEvent(
                SyncEventType.HIGHLIGHT_CREATED,
                { id: 'highlight-1', data: highlightData },
                100
            );

            const deleteEvent = await createTestEvent(
                SyncEventType.HIGHLIGHT_DELETED,
                { id: 'highlight-1', reason: 'user', deletedAt: 200 },
                200
            );

            const state = await replayer.replay([createEvent, deleteEvent]);

            expect(state.size).toBe(0);
            expect(state.get('highlight-1')).toBeUndefined();
        });
    });

    describe('Complex Sequences', () => {
        it('should handle multiple CREATEs for different entities', async () => {
            const event1 = await createTestEvent(
                SyncEventType.HIGHLIGHT_CREATED,
                {
                    id: 'highlight-1',
                    data: { id: 'highlight-1', text: 'First', color: 'yellow' } as any,
                },
                100
            );

            const event2 = await createTestEvent(
                SyncEventType.HIGHLIGHT_CREATED,
                {
                    id: 'highlight-2',
                    data: { id: 'highlight-2', text: 'Second', color: 'green' } as any,
                },
                200
            );

            const event3 = await createTestEvent(
                SyncEventType.HIGHLIGHT_CREATED,
                {
                    id: 'highlight-3',
                    data: { id: 'highlight-3', text: 'Third', color: 'blue' } as any,
                },
                300
            );

            const state = await replayer.replay([event1, event2, event3]);

            expect(state.size).toBe(3);
            expect(state.get('highlight-1')?.text).toBe('First');
            expect(state.get('highlight-2')?.text).toBe('Second');
            expect(state.get('highlight-3')?.text).toBe('Third');
        });

        it('should handle CREATE → UPDATE → UPDATE chain', async () => {
            const createEvent = await createTestEvent(
                SyncEventType.HIGHLIGHT_CREATED,
                {
                    id: 'highlight-1',
                    data: { id: 'highlight-1', text: 'v1', color: 'yellow' } as any,
                },
                100
            );

            const update1 = await createTestEvent(
                SyncEventType.HIGHLIGHT_UPDATED,
                { id: 'highlight-1', changes: { text: 'v2' }, previousVersion: 100 },
                200
            );

            const update2 = await createTestEvent(
                SyncEventType.HIGHLIGHT_UPDATED,
                { id: 'highlight-1', changes: { color: 'green' }, previousVersion: 200 },
                300
            );

            const state = await replayer.replay([createEvent, update1, update2]);

            expect(state.size).toBe(1);
            const highlight = state.get('highlight-1');
            expect(highlight?.text).toBe('v2');
            expect(highlight?.color).toBe('green');
        });

        it('should handle CREATE → DELETE → CREATE (same ID)', async () => {
            const create1 = await createTestEvent(
                SyncEventType.HIGHLIGHT_CREATED,
                {
                    id: 'highlight-1',
                    data: { id: 'highlight-1', text: 'First version', color: 'yellow' } as any,
                },
                100
            );

            const deleteEvent = await createTestEvent(
                SyncEventType.HIGHLIGHT_DELETED,
                { id: 'highlight-1', reason: 'user', deletedAt: 200 },
                200
            );

            const create2 = await createTestEvent(
                SyncEventType.HIGHLIGHT_CREATED,
                {
                    id: 'highlight-1',
                    data: { id: 'highlight-1', text: 'Second version', color: 'green' } as any,
                },
                300
            );

            const state = await replayer.replay([create1, deleteEvent, create2]);

            expect(state.size).toBe(1);
            expect(state.get('highlight-1')?.text).toBe('Second version');
            expect(state.get('highlight-1')?.color).toBe('green');
        });

        it('should handle interleaved events for multiple entities', async () => {
            const events = [
                await createTestEvent(
                    SyncEventType.HIGHLIGHT_CREATED,
                    { id: 'h1', data: { id: 'h1', text: 'H1 v1' } as any },
                    100
                ),
                await createTestEvent(
                    SyncEventType.HIGHLIGHT_CREATED,
                    { id: 'h2', data: { id: 'h2', text: 'H2 v1' } as any },
                    200
                ),
                await createTestEvent(
                    SyncEventType.HIGHLIGHT_UPDATED,
                    { id: 'h1', changes: { text: 'H1 v2' }, previousVersion: 100 },
                    300
                ),
                await createTestEvent(
                    SyncEventType.HIGHLIGHT_UPDATED,
                    { id: 'h2', changes: { text: 'H2 v2' }, previousVersion: 200 },
                    400
                ),
            ];

            const state = await replayer.replay(events);

            expect(state.size).toBe(2);
            expect(state.get('h1')?.text).toBe('H1 v2');
            expect(state.get('h2')?.text).toBe('H2 v2');
        });
    });

    describe('Incremental Replay', () => {
        it('should replay from checkpoint with new events only', async () => {
            // Existing state
            const existingState = new Map<string, HighlightDataV2>();
            existingState.set('highlight-1', {
                id: 'highlight-1',
                text: 'Existing',
                color: 'yellow',
            } as any);

            // New events
            const newEvent = await createTestEvent(
                SyncEventType.HIGHLIGHT_CREATED,
                {
                    id: 'highlight-2',
                    data: { id: 'highlight-2', text: 'New', color: 'green' } as any,
                },
                200
            );

            const state = await replayer.replayFrom(existingState, [newEvent]);

            expect(state.size).toBe(2);
            expect(state.get('highlight-1')?.text).toBe('Existing');
            expect(state.get('highlight-2')?.text).toBe('New');
        });

        it('should update existing entity in incremental replay', async () => {
            const existingState = new Map<string, HighlightDataV2>();
            existingState.set('highlight-1', {
                id: 'highlight-1',
                text: 'Old text',
                color: 'yellow',
            } as any);

            const updateEvent = await createTestEvent(
                SyncEventType.HIGHLIGHT_UPDATED,
                { id: 'highlight-1', changes: { text: 'New text' }, previousVersion: 100 },
                200
            );

            const state = await replayer.replayFrom(existingState, [updateEvent]);

            expect(state.size).toBe(1);
            expect(state.get('highlight-1')?.text).toBe('New text');
        });

        it('should not modify original state map', async () => {
            const existingState = new Map<string, HighlightDataV2>();
            existingState.set('highlight-1', {
                id: 'highlight-1',
                text: 'Original',
                color: 'yellow',
            } as any);

            const newEvent = await createTestEvent(
                SyncEventType.HIGHLIGHT_CREATED,
                {
                    id: 'highlight-2',
                    data: { id: 'highlight-2', text: 'New', color: 'green' } as any,
                },
                200
            );

            await replayer.replayFrom(existingState, [newEvent]);

            // Original state should be unchanged
            expect(existingState.size).toBe(1);
            expect(existingState.get('highlight-2')).toBeUndefined();
        });
    });

    describe('Edge Cases', () => {
        it('should handle UPDATE event for non-existent entity gracefully', async () => {
            const updateEvent = await createTestEvent(
                SyncEventType.HIGHLIGHT_UPDATED,
                { id: 'nonexistent', changes: { text: 'Update' }, previousVersion: 100 },
                200
            );

            const state = await replayer.replay([updateEvent]);

            expect(state.size).toBe(0);
            expect(logger.warn).toHaveBeenCalledWith(
                'UPDATE event for non-existent entity',
                { id: 'nonexistent' }
            );
        });

        it('should handle malformed event gracefully', async () => {
            const malformedEvent = {
                id: crypto.randomUUID(),
                type: 'unknown.type' as any,
                payload: {},
                timestamp: 100,
                deviceId: 'device-1',
                vectorClock: {},
                checksum: 'fake',
                userId: 'user-123',
            };

            const state = await replayer.replay([malformedEvent]);

            expect(state.size).toBe(0);
            expect(logger.warn).toHaveBeenCalledWith('Unknown event type', {
                type: 'unknown.type',
            });
        });
    });
});
