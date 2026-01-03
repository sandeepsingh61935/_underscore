import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';

/**
 * Test Helper: Create valid HighlightDataV2 mock
 *
 * Provides properly structured mock data matching the real schema.
 * Prevents test failures from schema mismatches.
 */
export function createMockHighlight(
  overrides?: Partial<HighlightDataV2>
): HighlightDataV2 {
  return {
    version: 2,
    id: crypto.randomUUID(),
    text: 'Mock highlight text',
    contentHash: 'a'.repeat(64), // SHA-256 = 64 hex chars
    colorRole: 'yellow',
    type: 'underscore',
    ranges: [
      {
        xpath: '/html/body/p[1]/text()[1]',
        startOffset: 0,
        endOffset: 10,
        text: 'Mock highl',
        textBefore: '',
        textAfter: 'ight text',
      },
    ],
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Test Helper: Create mock HighlightRecord for storage tests
 */
export function createMockHighlightRecord(
  id: string,
  url: string = 'https://example.com'
) {
  return {
    id,
    url,
    data: createMockHighlight({ id }),
    collectionId: null,
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    synced: false,
    metadata: {
      selectors: {
        xpath: {
          xpath: '/p[1]',
          startOffset: 0,
          endOffset: 10,
          text: 'test',
          textBefore: '',
          textAfter: '',
        },
        position: {
          startOffset: 0,
          endOffset: 10,
          text: 'test',
          textBefore: '',
          textAfter: '',
        },
        fuzzy: { text: 'test', textBefore: '', textAfter: '', threshold: 0.8 },
        contentHash: 'a'.repeat(64),
        createdAt: Date.now(),
      },
    },
  };
}
