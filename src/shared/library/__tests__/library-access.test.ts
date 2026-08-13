import { describe, expect, it } from 'vitest';

import { MemoryLibraryAccess, type LibraryHighlight } from '../library-access';

const row: LibraryHighlight = {
  id: 'h1',
  url: 'https://example.com/a',
  text: 'quote',
  tags: ['a'],
  notes: '',
  createdAtMs: 1,
  encrypted: false,
};

describe('MemoryLibraryAccess', () => {
  it('lists and gets rows without sharing storage across instances', async () => {
    const lib = new MemoryLibraryAccess([row]);
    expect(await lib.list()).toEqual([row]);
    expect(await lib.get('h1')).toEqual(row);
    expect(await lib.get('missing')).toBeNull();
    expect(await new MemoryLibraryAccess().list()).toEqual([]);
  });
});
