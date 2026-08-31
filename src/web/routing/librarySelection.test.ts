import { describe, it, expect } from 'vitest';
import { parseLibrarySelection, buildLibrarySearch } from './librarySelection';

describe('parseLibrarySelection', () => {
  it('parses domain and section from search string', () => {
    expect(parseLibrarySelection('?domain=a.com&section=%2Fdocs')).toEqual({
      domain: 'a.com',
      section: '/docs',
      highlight: null,
    });
  });

  it('returns nulls for empty search', () => {
    expect(parseLibrarySelection('')).toEqual({
      domain: null,
      section: null,
      highlight: null,
    });
    expect(parseLibrarySelection('?')).toEqual({
      domain: null,
      section: null,
      highlight: null,
    });
  });

  it('parses domain only', () => {
    expect(parseLibrarySelection('domain=example.com')).toEqual({
      domain: 'example.com',
      section: null,
      highlight: null,
    });
  });

  it('parses highlight id', () => {
    expect(parseLibrarySelection('?highlight=h1&domain=a.com')).toEqual({
      domain: 'a.com',
      section: null,
      highlight: 'h1',
    });
  });
});

describe('buildLibrarySearch', () => {
  it('builds domain-only search without leading ?', () => {
    expect(buildLibrarySearch({ domain: 'a.com', section: null })).toBe('domain=a.com');
  });

  it('builds domain and section search', () => {
    expect(buildLibrarySearch({ domain: 'a.com', section: '/docs' })).toBe(
      'domain=a.com&section=%2Fdocs'
    );
  });

  it('includes highlight when set', () => {
    expect(
      buildLibrarySearch({ domain: 'a.com', section: '/docs', highlight: 'h9' })
    ).toBe('domain=a.com&section=%2Fdocs&highlight=h9');
  });

  it('returns empty string when nothing selected', () => {
    expect(buildLibrarySearch({})).toBe('');
    expect(buildLibrarySearch({ domain: null, section: null, highlight: null })).toBe('');
  });
});
