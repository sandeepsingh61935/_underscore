import { describe, expect, it } from 'vitest';

import { sortLibraryHighlights, type LibrarySortableHighlight } from './library-sort';

const rows: LibrarySortableHighlight[] = [
  { id: 'a', domain: 'z.com', text: 'Zebra', activityMs: 100 },
  { id: 'b', domain: 'a.com', text: 'Apple', activityMs: 300 },
  { id: 'c', domain: 'm.com', text: 'Mango', activityMs: 200 },
];

describe('sortLibraryHighlights', () => {
  it('newest first', () => {
    expect(sortLibraryHighlights(rows, 'newest').map((r) => r.id)).toEqual([
      'b',
      'c',
      'a',
    ]);
  });

  it('oldest first', () => {
    expect(sortLibraryHighlights(rows, 'oldest').map((r) => r.id)).toEqual([
      'a',
      'c',
      'b',
    ]);
  });

  it('domain alpha', () => {
    expect(sortLibraryHighlights(rows, 'domain').map((r) => r.domain)).toEqual([
      'a.com',
      'm.com',
      'z.com',
    ]);
  });

  it('quote alpha', () => {
    expect(sortLibraryHighlights(rows, 'quote').map((r) => r.text)).toEqual([
      'Apple',
      'Mango',
      'Zebra',
    ]);
  });
});
