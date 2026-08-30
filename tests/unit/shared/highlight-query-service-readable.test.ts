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
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';

function makeReadable(items: HighlightDataV2[] = []): IReadableHighlightRepository {
    const findAll = vi.fn(async (): Promise<HighlightDataV2[]> => items);
    return {
        findById: vi.fn(),
        findAll,
        findByUrl: vi.fn(),
        findByContentHash: vi.fn(),
        findOverlapping: vi.fn(),
        count: vi.fn(),
        exists: vi.fn(),
    };
}

function hl(over: Partial<HighlightDataV2> = {}): HighlightDataV2 {
    return {
        id: 'h-1',
        text: 'alpha',
        contentHash: 'a'.repeat(64),
        colorRole: 'yellow',
        type: 'underscore',
        ranges: [],
        createdAt: new Date('2024-01-01'),
        url: 'https://example.com/a',
        ...over,
    };
}

describe('HighlightQueryService (readable contract)', () => {
    it('calls findAll on the readable passed in (not the facade)', async () => {
        const readable = makeReadable([hl()]);

        const svc = new HighlightQueryService(readable);
        const result = await svc.getCollections('local');

        expect(readable.findAll).toHaveBeenCalled();
        expect(result).toEqual([
            expect.objectContaining({ domain: 'example.com', highlightCount: 1, mode: 'local' }),
        ]);
    });

    it('filters by domain using the readable\'s findAll', async () => {
        const readable = makeReadable([
            hl({ id: 'h-1', url: 'https://example.com/a' }),
            hl({ id: 'h-2', url: 'https://other.com/b' }),
        ]);

        const svc = new HighlightQueryService(readable);
        const result = await svc.getHighlightsByDomain('example.com');

        expect(readable.findAll).toHaveBeenCalled();
        expect(result).toHaveLength(1);
        expect(result[0]?.id).toBe('h-1');
    });

    it('includes notes and tags from highlight metadata', async () => {
        const readable = makeReadable([
            hl({
                id: 'h-meta',
                url: 'https://example.com/a',
                metadata: { source: 'user', notes: 'Key point', tags: ['research'] },
            }),
        ]);

        const svc = new HighlightQueryService(readable);
        const result = await svc.getHighlightsByDomain('example.com');

        expect(result[0]?.notes).toBe('Key point');
        expect(result[0]?.tags).toEqual(['research']);
    });

    it('groups file URLs under Local files', async () => {
        const readable = makeReadable([
            hl({ id: 'h-file', url: 'file:///tmp/page.html' }),
            hl({ id: 'h-web', url: 'https://example.com/a' }),
        ]);

        const svc = new HighlightQueryService(readable);
        const collections = await svc.getCollections('cloud');

        expect(collections).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ domain: 'Local files', highlightCount: 1 }),
                expect.objectContaining({ domain: 'example.com', highlightCount: 1 }),
            ])
        );

        const localHighlights = await svc.getHighlightsByDomain('Local files');
        expect(localHighlights).toHaveLength(1);
        expect(localHighlights[0]?.id).toBe('h-file');
    });

    it('findAllForExport filters by scope', async () => {
        const readable = makeReadable([
            hl({ id: 'h-1', url: 'https://example.com/docs/a' }),
            hl({ id: 'h-2', url: 'https://example.com/docs/b' }),
            hl({ id: 'h-3', url: 'https://other.com/page' }),
        ]);

        const svc = new HighlightQueryService(readable);

        const domainScope = await svc.findAllForExport({ kind: 'domain', domain: 'example.com' });
        expect(domainScope).toHaveLength(2);

        const sectionScope = await svc.findAllForExport({
            kind: 'section',
            domain: 'example.com',
            sectionKey: '/docs/a',
        });
        expect(sectionScope).toHaveLength(1);
        expect(sectionScope[0]?.id).toBe('h-1');

        const highlightScope = await svc.findAllForExport({ kind: 'highlight', highlightId: 'h-3' });
        expect(highlightScope).toHaveLength(1);
        expect(highlightScope[0]?.id).toBe('h-3');
    });
});
