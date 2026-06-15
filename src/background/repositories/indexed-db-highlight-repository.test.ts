import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { IndexedDBHighlightRepository } from './indexed-db-highlight-repository';
import { LoggerFactory } from '@/shared/utils/logger';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';

const logger = LoggerFactory.getLogger('Test');

describe('IndexedDBHighlightRepository.add', () => {
  let repo: IndexedDBHighlightRepository;

  beforeEach(() => {
    // fake-indexeddb uses a fresh in-memory store per test
    repo = new IndexedDBHighlightRepository(logger);
  });

  it('persists a highlight that includes a liveRanges field (no DataCloneError)', async () => {
    // jsdom's document.body is empty by default; seed it with a text node so
    // setStart/setEnd succeed and we exercise the real bug (structured-clone
    // rejection of live DOM Range) rather than an IndexSizeError.
    const seed = document.createTextNode('sample');
    document.body.appendChild(seed);

    const liveRange = document.createRange();
    liveRange.setStart(seed, 0);
    liveRange.setEnd(seed, seed.length);

    const highlight = {
      id: 'h-1',
      text: 'sample',
      contentHash: 'hash-1',
      colorRole: 'yellow' as const,
      type: 'underscore' as const,
      ranges: [],
      liveRanges: [liveRange], // runtime-only; structured-clone rejects it
      createdAt: new Date(),
      url: 'https://example.com',
    } as unknown as HighlightDataV2;

    // The bug: this throws DataCloneError because liveRanges is a live Range.
    await expect(repo.add(highlight)).resolves.toBeUndefined();
  });
});
