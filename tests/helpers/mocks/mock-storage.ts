/**
 * @file mock-storage.ts
 * @description Mock implementation of IStorage for testing
 */

import { vi } from 'vitest';

import type { IStorage } from '@/shared/interfaces/i-storage';
import type { AnyHighlightEvent } from '@/shared/types/storage';

export class MockStorage implements IStorage {
    private events: AnyHighlightEvent[] = [];

    // Spies
    saveEventSpy = vi.fn();
    loadEventsSpy = vi.fn();
    clearSpy = vi.fn();

    async saveEvent(event: AnyHighlightEvent): Promise<void> {
        this.saveEventSpy(event);
        this.events.push(event);
    }

    async loadEvents(): Promise<AnyHighlightEvent[]> {
        this.loadEventsSpy();
        // Return copy to prevent mutation bugs
        return [...this.events];
    }

    async clear(): Promise<void> {
        this.clearSpy();
        this.events = [];
    }

    // Testing helpers
    getSavedEvents(): AnyHighlightEvent[] {
        return this.events;
    }

    reset(): void {
        this.events = [];
        this.saveEventSpy.mockClear();
        this.loadEventsSpy.mockClear();
        this.clearSpy.mockClear();
    }
}
