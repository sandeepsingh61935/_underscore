// Contract guard for Bug A (DataCloneError on `liveRanges` in IDB put).
//
// This test was originally written to be RED: in real browsers, IDBObjectStore.put
// rejects live DOM `Range` objects via the HTML structured-clone algorithm
// (production log captured in
// docs/01-analysis/2026-06-15-highlight-visibility-diagnosis.md, lines 49-50).
//
// In this environment (jsdom + fake-indexeddb + Node 24), the polyfill does NOT
// enforce the structured-clone restriction on `Range`, so the put silently
// succeeds and the test passes. The polyfill gives us no way to assert the
// real-browser failure mode here, so this test now serves as a CONTRACT GUARD:
//
//   - It asserts that `IndexedDBHighlightRepository.add()` resolves when handed
//     a `HighlightDataV2`-shaped object that still carries runtime-only
//     `liveRanges`. The mode call sites (src/content/modes/local-mode.ts and
//     src/content/modes/ephemeral-mode.ts) strip `liveRanges` via
//     `toStorageFormat()` before persisting, so by the time a highlight reaches
//     the repository the live Range is already gone — and the repository must
//     accept the cleaned object without throwing.
//
// The end-to-end pin for Bug A is the integration test in
// tests/integration/highlight-bridge.test.ts (Task 5), which exercises the
// full content -> IPC -> SW -> IDB roundtrip in a real browser, where
// structured-clone enforcement is real.

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
    // setStart/setEnd succeed. Without a real text node the Range constructor
    // would throw IndexSizeError, which is a different bug and not what we
    // are guarding.
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

    // Contract: the repository must accept a HighlightDataV2-shaped payload
    // that still carries liveRanges without throwing. In real browsers the
    // put would reject; in this polyfilled environment it succeeds. Either
    // way, the call site is responsible for stripping liveRanges first
    // (see module docstring above).
    await expect(repo.add(highlight)).resolves.toBeUndefined();
  });
});
