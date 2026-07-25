/**
 * @file highlight-query-service.search.test.ts
 * @description Unit tests for `HighlightQueryService.search` — library-wide,
 * domain-scoped, and section-scoped substring search over highlight
 * summaries, delegating matching to the shared `searchHighlights` util.
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

describe('HighlightQueryService.search', () => {
  it('returns [] immediately for an empty/whitespace query without calling findAll', async () => {
    const readable = makeReadable([hl()]);
    const svc = new HighlightQueryService(readable);

    expect(await svc.search('')).toEqual([]);
    expect(await svc.search('   ')).toEqual([]);
    expect(readable.findAll).not.toHaveBeenCalled();
  });

  it('searches across the whole library when no domain/section is given', async () => {
    const readable = makeReadable([
      hl({ id: 'h-1', text: 'the quick fox', url: 'https://example.com/a' }),
      hl({ id: 'h-2', text: 'lazy dog', url: 'https://other.com/b' }),
    ]);
    const svc = new HighlightQueryService(readable);

    const results = await svc.search('quick');

    expect(readable.findAll).toHaveBeenCalled();
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('h-1');
    expect(results[0]?.domain).toBe('example.com');
    expect(results[0]?.matchedFields).toEqual(['text']);
  });

  it('scopes search to a single domain', async () => {
    const readable = makeReadable([
      hl({ id: 'h-1', text: 'matching text', url: 'https://example.com/a' }),
      hl({ id: 'h-2', text: 'matching text', url: 'https://other.com/b' }),
    ]);
    const svc = new HighlightQueryService(readable);

    const results = await svc.search('matching', { domain: 'example.com' });

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('h-1');
    expect(results[0]?.domain).toBe('example.com');
  });

  it('scopes search to a domain + section', async () => {
    const readable = makeReadable([
      hl({ id: 'h-1', text: 'matching text', url: 'https://example.com/docs/a' }),
      hl({ id: 'h-2', text: 'matching text', url: 'https://example.com/blog/b' }),
      hl({ id: 'h-3', text: 'matching text', url: 'https://other.com/docs/a' }),
    ]);
    const svc = new HighlightQueryService(readable);

    const results = await svc.search('matching', { domain: 'example.com', section: '/docs/a' });

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('h-1');
    expect(results[0]?.path).toBe('/docs/a');
  });

  it('restricts matching to the requested fields', async () => {
    const readable = makeReadable([
      hl({
        id: 'h-1',
        text: 'unrelated text',
        url: 'https://example.com/a',
        metadata: { source: 'user', notes: 'contains needle' },
      }),
      hl({ id: 'h-2', text: 'contains needle', url: 'https://example.com/b' }),
    ]);
    const svc = new HighlightQueryService(readable);

    const textOnly = await svc.search('needle', { fields: ['text'] });
    expect(textOnly.map((r) => r.id)).toEqual(['h-2']);

    const notesOnly = await svc.search('needle', { fields: ['notes'] });
    expect(notesOnly.map((r) => r.id)).toEqual(['h-1']);
  });

  it('passes through matchedFields for tag/label matches', async () => {
    const readable = makeReadable([
      hl({
        id: 'h-1',
        text: 'no match here',
        url: 'https://example.com/a',
        metadata: { source: 'user', tags: ['research', 'important'] },
      }),
    ]);
    const svc = new HighlightQueryService(readable);

    const results = await svc.search('research');

    expect(results).toHaveLength(1);
    expect(results[0]?.matchedFields).toEqual(['tags']);
    expect(results[0]?.tags).toEqual(['research', 'important']);
  });

  it('returns no results when the query does not match any field', async () => {
    const readable = makeReadable([hl({ id: 'h-1', text: 'alpha', url: 'https://example.com/a' })]);
    const svc = new HighlightQueryService(readable);

    const results = await svc.search('zzz-no-match');

    expect(results).toEqual([]);
  });
});
