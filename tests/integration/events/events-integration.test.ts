/**
 * @file events-integration.test.ts
 * @description End-to-end integration tests for event sourcing layer
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { EventStore } from '@/background/events/event-store';
import { EventPublisher } from '@/background/events/event-publisher';
import { EventReplayer } from '@/background/events/event-replayer';
import { InputSanitizer } from '@/background/events/input-sanitizer';
import { SyncEventType } from '@/background/events/interfaces/i-event-store';
import type { SyncEvent } from '@/background/events/interfaces/i-event-store';
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

// Helper to create test event with checksum
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

describe('Events Integration Tests', () => {
    let store: EventStore;
    let publisher: EventPublisher;
    let replayer: EventReplayer;
    let sanitizer: InputSanitizer;
    let logger: ILogger;

    beforeEach(() => {
        logger = createMockLogger();
        store = new EventStore(logger);
        publisher = new EventPublisher(logger);
        replayer = new EventReplayer(logger);
        sanitizer = new InputSanitizer(logger);
    });

    afterEach(async () => {
        await store.clear();
    });

    describe('Full Event Flow', () => {
        it('should handle complete event lifecycle: create → store → publish → replay', async () => {
            // 1. Create highlight with sanitized text
            const rawText = '<script>alert("xss")</script>Important text';
            const sanitizedText = sanitizer.sanitizeText(rawText);

            const highlightData: HighlightDataV2 = {
                id: 'highlight-1',
                text: sanitizedText,
                color: 'yellow',
                createdAt: Date.now(),
                url: 'https://example.com',
            } as any;

            // 2. Create and store event
            const event = await createTestEvent(
                SyncEventType.HIGHLIGHT_CREATED,
                { id: 'highlight-1', data: highlightData },
                Date.now()
            );

            await store.append(event);

            // 3. Publish event
            const publishHandler = vi.fn();
            publisher.subscribe('highlight.created', publishHandler);
            await publisher.publish('highlight.created', highlightData);

            // 4. Retrieve and replay events
            const events = await store.getEvents();
            const state = await replayer.replay(events);

            // Verify complete flow
            expect(sanitizedText).toBe('Important text'); // XSS removed
            expect(events).toHaveLength(1);
            expect(publishHandler).toHaveBeenCalledWith(highlightData);
            expect(state.size).toBe(1);
            expect(state.get('highlight-1')?.text).toBe('Important text');
        });
    });

    describe('Sanitization Integration', () => {
        it('should sanitize malicious input before storage', async () => {
            // Malicious input
            const maliciousText = '<img src=x onerror=alert(1)>Safe text';
            const maliciousURL = 'javascript:alert(1)';

            // Sanitize
            const safeText = sanitizer.sanitizeText(maliciousText);
            const safeURL = sanitizer.sanitizeURL(maliciousURL);

            // Create event with sanitized data
            const highlightData: HighlightDataV2 = {
                id: 'highlight-1',
                text: safeText,
                color: 'yellow',
                createdAt: Date.now(),
                url: safeURL || 'https://example.com', // Fallback if URL blocked
            } as any;

            const event = await createTestEvent(
                SyncEventType.HIGHLIGHT_CREATED,
                { id: 'highlight-1', data: highlightData },
                Date.now()
            );

            await store.append(event);

            // Verify sanitization
            expect(safeText).toBe('Safe text');
            expect(safeURL).toBeNull(); // Dangerous URL blocked

            const events = await store.getEvents();
            const state = await replayer.replay(events);

            expect(state.get('highlight-1')?.text).toBe('Safe text');
            expect(state.get('highlight-1')?.url).toBe('https://example.com');
        });
    });

    describe('DI Container Integration', () => {
        it('should resolve all services correctly', () => {
            // Verify all services are instantiated
            expect(store).toBeInstanceOf(EventStore);
            expect(publisher).toBeInstanceOf(EventPublisher);
            expect(replayer).toBeInstanceOf(EventReplayer);
            expect(sanitizer).toBeInstanceOf(InputSanitizer);

            // Verify they can work together
            expect(store.append).toBeDefined();
            expect(publisher.publish).toBeDefined();
            expect(replayer.replay).toBeDefined();
            expect(sanitizer.sanitizeText).toBeDefined();
        });
    });
});
