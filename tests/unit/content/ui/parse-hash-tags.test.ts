import { describe, expect, it } from 'vitest';

import { parseHashTags, tagBoxAction } from '@/content/ui/parse-hash-tags';
import { normalizeHighlightTags } from '@/shared/utils/highlight-metadata';

describe('parseHashTags', () => {
  it('returns two tags before normalize, keeping case', () => {
    expect(parseHashTags('#One #two')).toEqual(['One', 'two']);
  });

  it('keeps duplicate matches for normalize to drop', () => {
    expect(parseHashTags('#css #css')).toEqual(['css', 'css']);
  });

  it('stops a tag at punctuation', () => {
    expect(parseHashTags('#css, #node.js')).toEqual(['css', 'node']);
  });

  it('returns nothing when the text has no hash', () => {
    expect(parseHashTags('hello world')).toEqual([]);
    expect(parseHashTags('')).toEqual([]);
  });
});

describe('tagBoxAction', () => {
  it('replaces with a normalized list', () => {
    expect(tagBoxAction('#One #two #One')).toEqual({
      type: 'replace',
      tags: ['one', 'two'],
    });
  });

  it('caps at 10 lowercase tags', () => {
    const text = Array.from({ length: 11 }, (_, i) => `#T${i}`).join(' ');
    const action = tagBoxAction(text);
    expect(action).toEqual({
      type: 'replace',
      tags: normalizeHighlightTags(parseHashTags(text)),
    });
    if (action.type === 'replace') {
      expect(action.tags).toHaveLength(10);
      expect(action.tags[0]).toBe('t0');
    }
  });

  it('treats an empty box as clearing the list', () => {
    expect(tagBoxAction('   ')).toEqual({ type: 'replace', tags: [] });
  });

  it('does not send when words have no hash', () => {
    expect(tagBoxAction('hello')).toEqual({ type: 'noop' });
  });
});
