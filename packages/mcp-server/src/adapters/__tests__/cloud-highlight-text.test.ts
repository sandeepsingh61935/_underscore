import { describe, expect, it } from 'vitest';

import {
  displayTextFromCloudRow,
  HIGHLIGHTS_SELECT_COLUMNS,
  notesAndTagsFromCloudRow,
} from '../cloud-highlight-text.js';

describe('cloud-highlight-text', () => {
  it('includes metadata for notes/tags; excludes deprecated columns', () => {
    expect(HIGHLIGHTS_SELECT_COLUMNS.includes('metadata')).toBe(true);
    expect(HIGHLIGHTS_SELECT_COLUMNS.includes('text_encrypted')).toBe(false);
    expect(HIGHLIGHTS_SELECT_COLUMNS.includes('note')).toBe(false);
    expect(HIGHLIGHTS_SELECT_COLUMNS).toContain('text');
  });

  it('reads notes from metadata or legacy note column', () => {
    expect(
      notesAndTagsFromCloudRow({ metadata: { notes: 'from jsonb', tags: ['a'] } }),
    ).toEqual({ notes: 'from jsonb', tags: ['a'] });
    expect(notesAndTagsFromCloudRow({ note: 'legacy note', tags: ['b'] })).toEqual({
      notes: 'legacy note',
      tags: ['b'],
    });
  });

  it('returns plaintext as-is', () => {
    expect(displayTextFromCloudRow('Hello world')).toBe('Hello world');
    expect(displayTextFromCloudRow('')).toBe('');
  });
});
