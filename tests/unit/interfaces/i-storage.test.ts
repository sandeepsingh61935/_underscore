/**
 * IStorage Interface Tests (4 tests)
 * 
 * Verifies storage implementations work correctly
 * Uses fake-indexeddb for real persistence testing
 */
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto'; // ✅ Real IndexedDB, just in-memory
import { StorageService } from '@/shared/services/storage-service';
import type { HighlightCreatedEvent } from '@/shared/types/storage';
import { createTestHighlight } from '../../helpers/test-fixtures';

describe('IStorage Interface (4 tests)', () => {
    let storage: StorageService;

    beforeEach(async () => {
        // ✅ Real implementation with fake-indexeddb
        storage = new StorageService();

        // Clear storage from previous tests
        await storage.clear();

        // Also clear browser.storage mock
        if (global.browser?.storage?.local?.clear) {
            await global.browser.storage.local.clear();
        }
    });

    it('1. can save and load events', async () => {
        // Arrange
        const highlight = createTestHighlight({ text: 'Test event' });
        const event: HighlightCreatedEvent = {
            type: 'highlight.created',
            timestamp: Date.now(),
            eventId: crypto.randomUUID(),
            data: highlight,
        };

        // Act
        await storage.saveEvent(event);
        const events = await storage.loadEvents();

        // Assert
        expect(events).toHaveLength(1);
        expect(events[0]?.eventId).toBe(event.eventId);
        // Cast to HighlightCreatedEvent to access data safely
        const loadedEvent = events[0] as HighlightCreatedEvent;
        expect(loadedEvent?.data?.text).toBe('Test event');
    });

    it('2. clear() removes all events', async () => {
        // Arrange: Add multiple events
        const event1: HighlightCreatedEvent = {
            type: 'highlight.created',
            timestamp: Date.now(),
            eventId: crypto.randomUUID(),
            data: createTestHighlight(),
        };
        const event2: HighlightCreatedEvent = {
            type: 'highlight.created',
            timestamp: Date.now() + 1,
            eventId: crypto.randomUUID(),
            data: createTestHighlight(),
        };

        await storage.saveEvent(event1);
        await storage.saveEvent(event2);
        expect((await storage.loadEvents()).length).toBe(2);

        // Act
        await storage.clear();

        // Assert
        const events = await storage.loadEvents();
        expect(events).toHaveLength(0);
    });

    it('3. events retrieved in chronological order', async () => {
        // Arrange: Add events with different timestamps
        const event1: HighlightCreatedEvent = {
            type: 'highlight.created',
            timestamp: 100,
            eventId: crypto.randomUUID(),
            data: createTestHighlight({ text: 'First' }),
        };
        const event2: HighlightCreatedEvent = {
            type: 'highlight.created',
            timestamp: 200,
            eventId: crypto.randomUUID(),
            data: createTestHighlight({ text: 'Second' }),
        };
        const event3: HighlightCreatedEvent = {
            type: 'highlight.created',
            timestamp: 150,
            eventId: crypto.randomUUID(),
            data: createTestHighlight({ text: 'Middle' }),
        };

        // Act: Add in random order
        await storage.saveEvent(event2);
        await storage.saveEvent(event1);
        await storage.saveEvent(event3);

        const events = await storage.loadEvents();

        // Assert: Should be ordered by timestamp (oldest first)
        // Helper to get text from event
        const getText = (e: any) => e.data?.text;

        expect(getText(events[0])).toBe('First');   // timestamp: 100
        expect(getText(events[1])).toBe('Middle');  // timestamp: 150
        expect(getText(events[2])).toBe('Second');  // timestamp: 200
        // ✅ Event sourcing requires chronological replay for correctness
    });

    it('4. works with fake-indexeddb', async () => {
        // Arrange
        const event: HighlightCreatedEvent = {
            type: 'highlight.created',
            timestamp: Date.now(),
            eventId: crypto.randomUUID(),
            data: createTestHighlight(),
        };

        // Act: Save with one instance
        await storage.saveEvent(event);

        // Create new instance (simulates page reload)
        const newStorage = new StorageService();
        const events = await newStorage.loadEvents();

        // Assert: Data persists across instances
        expect(events).toHaveLength(1);
        expect(events[0]?.eventId).toBe(event.eventId);
        // ✅ Proves we're using real persistence, not in-memory only
    });
});
