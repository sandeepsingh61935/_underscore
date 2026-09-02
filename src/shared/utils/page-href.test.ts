import { describe, it, expect } from 'vitest';

import { displaySectionPath, pageHrefForLibrary } from './page-href';

describe('pageHrefForLibrary', () => {
  it('joins https + host + path and query', () => {
    expect(
      pageHrefForLibrary(
        'www.google.com',
        '/search?q=char+at&udm=50'
      )
    ).toBe('https://www.google.com/search?q=char+at&udm=50');
  });

  it('adds a leading slash when missing', () => {
    expect(pageHrefForLibrary('github.com', 'docs')).toBe(
      'https://github.com/docs'
    );
  });

  it('returns null for an empty host', () => {
    expect(pageHrefForLibrary('', '/x')).toBeNull();
  });
});

describe('displaySectionPath', () => {
  it('keeps the last pathname segment when there is no query', () => {
    expect(displaySectionPath('/docs')).toBe('docs');
  });

  it('collapses a query to pathname?…', () => {
    expect(
      displaySectionPath('/search?aep=10&q=char+at+in+c%2B%2B')
    ).toBe('/search?…');
  });
});
