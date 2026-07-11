import { describe, it, expect } from 'vitest';

import {
  buildHighlightMetadataUpdate,
  normalizeHighlightTags,
  sanitizeHighlightNote,
} from '@/shared/utils/highlight-metadata';

describe('highlight-metadata', () => {
  describe('normalizeHighlightTags', () => {
    it('trims, lowercases, and deduplicates tags', () => {
      expect(normalizeHighlightTags([' Research ', 'research', 'Comedy'])).toEqual([
        'research',
        'comedy',
      ]);
    });

    it('drops empty tags', () => {
      expect(normalizeHighlightTags(['', '  ', 'valid'])).toEqual(['valid']);
    });

    it('keeps at most ten tags', () => {
      const tags = Array.from({ length: 12 }, (_, i) => `tag-${i}`);
      expect(normalizeHighlightTags(tags)).toHaveLength(10);
      expect(normalizeHighlightTags(tags)).toEqual(tags.slice(0, 10).map(String));
    });
  });

  describe('sanitizeHighlightNote', () => {
    it('trims surrounding whitespace', () => {
      expect(sanitizeHighlightNote('  Key definition  ')).toBe('Key definition');
    });

    it('truncates notes longer than two thousand characters', () => {
      const long = 'a'.repeat(2001);
      expect(sanitizeHighlightNote(long)).toHaveLength(2000);
      expect(sanitizeHighlightNote(long)).toBe('a'.repeat(2000));
    });
  });

  describe('buildHighlightMetadataUpdate', () => {
    it('sanitizes notes and normalizes tags for persistence', () => {
      expect(
        buildHighlightMetadataUpdate({
          notes: '  Key definition  ',
          tags: [' Comedy ', 'comedy'],
        }),
      ).toEqual({
        source: 'user',
        notes: 'Key definition',
        tags: ['comedy'],
      });
    });

    it('omits empty notes and tags', () => {
      expect(
        buildHighlightMetadataUpdate({
          notes: '   ',
          tags: [],
        }),
      ).toBeUndefined();
    });
  });
});
