import { describe, it, expect } from 'vitest';
import { HighlightQueryService } from './highlight-query-service';
import type { IReadableHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';

function hl(over: Partial<HighlightDataV2> & { id: string; text: string }): HighlightDataV2 {
  return {
    contentHash: over.id.padEnd(64, 'a'),
    colorRole: 'yellow',
    type: 'underscore',
    ranges: [
      {
        xpath: '/p',
        startOffset: 0,
        endOffset: 4,
        text: over.text,
        textBefore: '',
        textAfter: '',
      },
    ],
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    url: 'https://example.com/a',
    ...over,
  };
}

function readable(highlights: HighlightDataV2[]): IReadableHighlightRepository {
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

describe('HighlightQueryService activity sort', () => {
  it('getHighlightsByDomain lists newest update first', async () => {
    const service = new HighlightQueryService(
      readable([
        hl({
          id: 'old',
          text: 'older create',
          createdAt: new Date('2024-06-01T00:00:00.000Z'),
        }),
        hl({
          id: 'edited',
          text: 'old create, new edit',
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-12-01T00:00:00.000Z'),
        }),
      ]),
    );

    const list = await service.getHighlightsByDomain('example.com');
    expect(list.map((h) => h.id)).toEqual(['edited', 'old']);
  });

  it('getDashboardData recentHighlights lists newest update first', async () => {
    const service = new HighlightQueryService(
      readable([
        hl({
          id: 'old',
          text: 'older',
          createdAt: new Date('2024-06-01T00:00:00.000Z'),
        }),
        hl({
          id: 'edited',
          text: 'edited',
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-12-01T00:00:00.000Z'),
        }),
      ]),
    );

    const dash = await service.getDashboardData();
    expect(dash.recentHighlights.map((h) => h.id)).toEqual(['edited', 'old']);
  });

  it('getCollections sorts domains by last activity', async () => {
    const service = new HighlightQueryService(
      readable([
        hl({
          id: 'a',
          text: 'a',
          url: 'https://old.com/x',
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
        }),
        hl({
          id: 'b',
          text: 'b',
          url: 'https://new.com/y',
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-12-01T00:00:00.000Z'),
        }),
      ]),
    );

    const collections = await service.getCollections();
    expect(collections.map((c) => c.domain)).toEqual(['new.com', 'old.com']);
  });
});
