/**
 * @file highlight-store.test.ts
 * @description Unit tests for HighlightStore
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { HighlightStore, type Highlight } from '@/content/highlight-store';
import { EventName } from '@/shared/types/events';
import { EventBus } from '@/shared/utils/event-bus';

describe('HighlightStore', () => {
    let store: HighlightStore;
    let eventBus: EventBus;

    beforeEach(() => {
        eventBus = new EventBus();
        store = new HighlightStore(eventBus);
    });

    const createMockHighlight = (id: string = 'test-1'): Highlight => ({
        id,
        text: 'test text',
        color: '#FFEB3B',
        element: document.createElement('span'),
        createdAt: new Date(),
    });

    describe('add', () => {
        it('should add highlight to storage', () => {
            const highlight = createMockHighlight();

            store.add(highlight);

            expect(store.count()).toBe(1);
            expect(store.has(highlight.id)).toBe(true);
        });

        it('should add multiple highlights', () => {
            store.add(createMockHighlight('h1'));
            store.add(createMockHighlight('h2'));
            store.add(createMockHighlight('h3'));

            expect(store.count()).toBe(3);
        });

        it('should overwrite existing highlight with same ID', () => {
            const highlight1 = createMockHighlight('same-id');
            const highlight2 = { ...createMockHighlight('same-id'), text: 'different text' };

            store.add(highlight1);
            store.add(highlight2);

            expect(store.count()).toBe(1);
            expect(store.get('same-id')?.text).toBe('different text');
        });
    });

    describe('remove', () => {
        it('should remove highlight by ID', () => {
            const highlight = createMockHighlight();
            store.add(highlight);

            const removed = store.remove(highlight.id);

            expect(removed).toBe(true);
            expect(store.count()).toBe(0);
            expect(store.has(highlight.id)).toBe(false);
        });

        it('should return false when removing non-existent highlight', () => {
            const removed = store.remove('non-existent');
            expect(removed).toBe(false);
        });
    });

    describe('get', () => {
        it('should return highlight by ID', () => {
            const highlight = createMockHighlight();
            store.add(highlight);

            const retrieved = store.get(highlight.id);

            expect(retrieved).toEqual(highlight);
        });

        it('should return undefined for non-existent ID', () => {
            expect(store.get('non-existent')).toBeUndefined();
        });
    });

    describe('getAll', () => {
        it('should return empty array when no highlights', () => {
            expect(store.getAll()).toEqual([]);
        });

        it('should return all highlights', () => {
            store.add(createMockHighlight('h1'));
            store.add(createMockHighlight('h2'));
            store.add(createMockHighlight('h3'));

            const all = store.getAll();

            expect(all).toHaveLength(3);
            expect(all.map(h => h.id)).toEqual(['h1', 'h2', 'h3']);
        });
    });

    describe('count', () => {
        it('should return 0 when empty', () => {
            expect(store.count()).toBe(0);
        });

        it('should return correct count', () => {
            store.add(createMockHighlight('h1'));
            expect(store.count()).toBe(1);

            store.add(createMockHighlight('h2'));
            expect(store.count()).toBe(2);

            store.remove('h1');
            expect(store.count()).toBe(1);
        });
    });

    describe('clear', () => {
        it('should clear all highlights', () => {
            store.add(createMockHighlight('h1'));
            store.add(createMockHighlight('h2'));
            store.add(createMockHighlight('h3'));

            store.clear();

            expect(store.count()).toBe(0);
            expect(store.getAll()).toEqual([]);
        });

        it('should emit HIGHLIGHTS_CLEARED event', () => {
            const emitSpy = vi.spyOn(eventBus, 'emit');

            store.add(createMockHighlight('h1'));
            store.add(createMockHighlight('h2'));

            store.clear();

            expect(emitSpy).toHaveBeenCalledWith(
                EventName.HIGHLIGHTS_CLEARED,
                expect.objectContaining({
                    type: EventName.HIGHLIGHTS_CLEARED,
                    count: 2,
                })
            );
        });
    });

    describe('has', () => {
        it('should return true for existing highlight', () => {
            const highlight = createMockHighlight();
            store.add(highlight);

            expect(store.has(highlight.id)).toBe(true);
        });

        it('should return false for non-existent highlight', () => {
            expect(store.has('non-existent')).toBe(false);
        });
    });

    describe('getByColor', () => {
        it('should return highlights with matching color', () => {
            store.add({ ...createMockHighlight('h1'), color: '#FFEB3B' });
            store.add({ ...createMockHighlight('h2'), color: '#64B5F6' });
            store.add({ ...createMockHighlight('h3'), color: '#FFEB3B' });

            const yellowHighlights = store.getByColor('#FFEB3B');

            expect(yellowHighlights).toHaveLength(2);
            expect(yellowHighlights.map(h => h.id)).toEqual(['h1', 'h3']);
        });

        it('should return empty array when no matches', () => {
            store.add({ ...createMockHighlight('h1'), color: '#FFEB3B' });

            expect(store.getByColor('#000000')).toEqual([]);
        });
    });

    describe('Event Listeners', () => {
        it('should add highlight when HIGHLIGHT_CREATED event is emitted', () => {
            eventBus.emit(EventName.HIGHLIGHT_CREATED, {
                type: EventName.HIGHLIGHT_CREATED,
                highlight: {
                    id: 'event-1',
                    text: 'test',
                    color: '#FFEB3B',
                },
                timestamp: new Date(),
            });

            expect(store.count()).toBe(1);
            expect(store.has('event-1')).toBe(true);
        });

        it('should remove highlight when HIGHLIGHT_REMOVED event is emitted', () => {
            store.add(createMockHighlight('remove-me'));

            eventBus.emit(EventName.HIGHLIGHT_REMOVED, {
                type: EventName.HIGHLIGHT_REMOVED,
                highlightId: 'remove-me',
                timestamp: new Date(),
            });

            expect(store.count()).toBe(0);
        });
    });
});
