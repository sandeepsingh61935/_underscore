/**
 * S5: Library collections only count highlights that have a url.
 */
import { describe, it, expect } from 'vitest';
import { HighlightQueryService } from './highlight-query-service';
import type { IReadableHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';

function makeHighlight(over: Partial<HighlightDataV2> = {}): HighlightDataV2 {
  return {
    id: crypto.randomUUID(),
    text: 'sample text',
    contentHash: 'b'.repeat(64),
    colorRole: 'yellow',
    type: 'underscore',
    ranges: [
      {
        xpath: '/html/body/p',
        startOffset: 0,
        endOffset: 5,
        text: 'sample',
        textBefore: '',
        textAfter: '',
      },
    ],
    createdAt: new Date(),
    ...over,
  };
}

function readableFrom(highlights: HighlightDataV2[]): IReadableHighlightRepository {
  return {
    findAll: async () => highlights,
    findById: async () => null,
    findByUrl: async () => [],
    findByContentHash: async () => null,
    findOverlapping: async () => [],
    count: async () => highlights.length,
    exists: async () => false,
  };
}

describe('HighlightQueryService.getCollections url filter', () => {
  it('excludes highlights without url from domain collections', async () => {
    const withUrl = makeHighlight({ url: 'https://example.com/article' });
    const withoutUrl = makeHighlight({ url: undefined });
    delete (withoutUrl as { url?: string }).url;

    const service = new HighlightQueryService(readableFrom([withUrl, withoutUrl]));
    const collections = await service.getCollections();

    expect(collections).toHaveLength(1);
    expect(collections[0]?.domain).toBe('example.com');
    expect(collections[0]?.highlightCount).toBe(1);
  });

  it('returns empty collections when every highlight lacks url', async () => {
    const orphan = makeHighlight();
    delete (orphan as { url?: string }).url;

    const service = new HighlightQueryService(readableFrom([orphan]));
    const collections = await service.getCollections();

    expect(collections).toEqual([]);
  });
});
