/**
 * @file mock-repository.ts
 * @description Mock implementation of IHighlightRepository for testing
 */

import { vi } from 'vitest';

import type { IHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import type { HighlightDataV2, SerializedRange } from '@/shared/schemas/highlight-schema';

export class MockRepository implements IHighlightRepository {
    private items = new Map<string, HighlightDataV2>();

    // Spies for verifying interactions
    addSpy = vi.fn();
    findByIdSpy = vi.fn();
    removeSpy = vi.fn();
    findAllSpy = vi.fn();
    countSpy = vi.fn();
    clearSpy = vi.fn();
    updateSpy = vi.fn();
    findByContentHashSpy = vi.fn();
    findOverlappingSpy = vi.fn();
    addManySpy = vi.fn();

    async add(item: HighlightDataV2): Promise<void> {
        this.addSpy(item);
        this.items.set(item.id, item);
    }

    async findById(id: string): Promise<HighlightDataV2 | null> {
        this.findByIdSpy(id);
        return this.items.get(id) || null;
    }

    async remove(id: string): Promise<void> {
        this.removeSpy(id);
        this.items.delete(id);
    }

    async findAll(): Promise<HighlightDataV2[]> {
        this.findAllSpy();
        return Array.from(this.items.values());
    }

    count(): number {
        this.countSpy();
        return this.items.size;
    }

    exists(id: string): boolean {
        return this.items.has(id);
    }

    async clear(): Promise<void> {
        this.clearSpy();
        this.items.clear();
    }

    async update(id: string, updates: Partial<HighlightDataV2>): Promise<void> {
        this.updateSpy(id, updates);
        const existing = this.items.get(id);
        if (!existing) {
            throw new Error(`Item ${id} not found`);
        }
        this.items.set(id, { ...existing, ...updates });
    }

    async findByContentHash(hash: string): Promise<HighlightDataV2 | null> {
        this.findByContentHashSpy(hash);
        for (const item of this.items.values()) {
            if (item.contentHash === hash) return item;
        }
        return null;
    }

    async findOverlapping(range: SerializedRange): Promise<HighlightDataV2[]> {
        this.findOverlappingSpy(range);
        // Simple mock logic: returns all for checking interaction, 
        // or specific logic if needed for complex tests.
        // For now, return empty unless pre-configured.
        return [];
    }

    async addMany(highlights: HighlightDataV2[]): Promise<void> {
        this.addManySpy(highlights);
        highlights.forEach(h => this.items.set(h.id, h));
    }

    // Helper to reset state
    reset(): void {
        this.items.clear();
        this.addSpy.mockClear();
        this.findByIdSpy.mockClear();
        this.removeSpy.mockClear();
        this.findAllSpy.mockClear();
        this.countSpy.mockClear();
        this.clearSpy.mockClear();
        this.updateSpy.mockClear();
        this.findByContentHashSpy.mockClear();
        this.findOverlappingSpy.mockClear();
        this.addManySpy.mockClear();
    }
}
