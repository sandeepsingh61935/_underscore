import { describe, expect, it } from 'vitest';

import { mergeHighlightLabels, normalizeHighlightTags } from '@/shared/utils/highlight-metadata';

describe('tag normalization', () => {
  it('normalizes labels to lowercase trimmed unique values', () => {
    expect(normalizeHighlightTags([' Todo ', 'TODO', 'read'])).toEqual(['todo', 'read']);
  });

  it('merges junction labels with legacy metadata tags', () => {
    expect(mergeHighlightLabels(['alpha'], ['Beta', 'alpha'])).toEqual(['alpha', 'beta']);
  });
});
