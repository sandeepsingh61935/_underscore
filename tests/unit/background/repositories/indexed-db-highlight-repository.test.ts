
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { openDB, deleteDB } from 'idb';
import { IndexedDBHighlightRepository } from '@/background/repositories/indexed-db-highlight-repository';
import type { ILogger } from '@/shared/interfaces/i-logger';
import { HighlightDataV2 } from '@/background/schemas/highlight-schema';

describe('IndexedDBHighlightRepository', () => {
    let repo: IndexedDBHighlightRepository;
    let mockLogger: any;

    const DB_NAME = 'underscore_vault';
    const STORE_NAME = 'highlights';

    const mockHighlight: HighlightDataV2 = {
        id: 'hl-1',
        url: 'https://example.com',
        text: 'Test Highlight',
        ranges: [],
        contentHash: 'hash-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user-1'
    };

    beforeEach(async () => {
        await deleteDB(DB_NAME);

        mockLogger = {
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn()
        };

        repo = new IndexedDBHighlightRepository(mockLogger as unknown as ILogger);
    });

    afterEach(async () => {
        await repo.close();
        await deleteDB(DB_NAME);
    });

    it('should add and retrieve a highlight', async () => {
        await repo.add(mockHighlight);

        const found = await repo.findById('hl-1');
        expect(found).toEqual(mockHighlight);

        const count = await repo.count();
        expect(count).toBe(1);
    });

    it('should find by URL', async () => {
        await repo.add(mockHighlight);
        await repo.add({ ...mockHighlight, id: 'hl-2', url: 'https://other.com' });

        const results = await repo.findByUrl('https://example.com');
        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('hl-1');
    });

    it('should update a highlight', async () => {
        await repo.add(mockHighlight);

        const updates = { text: 'Updated Text' };
        await repo.update('hl-1', updates);

        const found = await repo.findById('hl-1');
        expect(found?.text).toBe('Updated Text');
        expect(found?.updatedAt).not.toEqual(mockHighlight.updatedAt);
    });

    it('should remove a highlight', async () => {
        await repo.add(mockHighlight);
        await repo.remove('hl-1');

        const found = await repo.findById('hl-1');
        expect(found).toBeNull();

        const exists = await repo.exists('hl-1');
        expect(exists).toBe(false);
    });

    it('should handle findByContentHash', async () => {
        await repo.add(mockHighlight);

        const found = await repo.findByContentHash('hash-1');
        expect(found).toBeDefined();
        expect(found?.id).toBe('hl-1');
    });
});
