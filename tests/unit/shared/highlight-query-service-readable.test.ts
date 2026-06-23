/**
 * @file highlight-query-service-readable.test.ts
 * @description Regression test: HighlightQueryService must receive an
 * IReadableHighlightRepository, not the facade itself.
 *
 * Bug (2026-06-23 prod log):
 *   TypeError: this.readable.findAll is not a function
 *   at ki.getHighlightsByDomain
 *
 * Root cause: background.ts constructed the service with
 * `new HighlightQueryService(repositoryFacade as any)`. The facade
 * has no `findAll` method (its cache exposes `getAll()`); only the
 * underlying readable has `findAll()`.
 *
 * Fix: RepositoryFacade.getReadable() exposes the underlying readable.
 * The query service receives that. This test guards the contract.
 */

import { describe, it, expect, vi } from 'vitest';
import { HighlightQueryService } from '@/shared/services/highlight-query-service';
import type { IReadableHighlightRepository } from '@/shared/repositories/i-highlight-repository';

function makeReadable(items: { id: string; url: string; text: string; createdAt: Date }[] = []): IReadableHighlightRepository {
    return {
        findById: vi.fn(),
        findAll: vi.fn(async () => items),
        findByUrl: vi.fn(),
        findByContentHash: vi.fn(),
        findOverlapping: vi.fn(),
        count: vi.fn(),
        exists: vi.fn(),
        clear: vi.fn(),
    };
}

describe('HighlightQueryService (readable contract)', () => {
    it('calls findAll on the readable passed in (not the facade)', async () => {
        const readable = makeReadable([
            {
                id: 'h-1',
                url: 'https://example.com/a',
                text: 'alpha',
                createdAt: new Date('2024-01-01'),
            },
        ]);

        const svc = new HighlightQueryService(readable);
        const result = await svc.getCollections('local');

        expect(readable.findAll).toHaveBeenCalled();
        expect(result).toEqual([{ domain: 'example.com', highlightCount: 1, mode: 'local' }]);
    });

    it('filters by domain using the readable\'s findAll', async () => {
        const readable = makeReadable([
            { id: 'h-1', url: 'https://example.com/a', text: 'a', createdAt: new Date('2024-01-01') },
            { id: 'h-2', url: 'https://other.com/b', text: 'b', createdAt: new Date('2024-01-02') },
        ]);

        const svc = new HighlightQueryService(readable);
        const result = await svc.getHighlightsByDomain('example.com');

        expect(readable.findAll).toHaveBeenCalled();
        expect(result).toHaveLength(1);
        expect(result[0]?.id).toBe('h-1');
    });
});
