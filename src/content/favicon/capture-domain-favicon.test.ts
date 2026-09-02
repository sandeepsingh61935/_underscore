import { describe, it, expect } from 'vitest';

import { pageFaviconHref } from './capture-domain-favicon';

describe('pageFaviconHref', () => {
  it('reads link rel=icon when present', () => {
    document.head.innerHTML =
      '<link rel="icon" href="https://github.com/favicon.ico" />';
    expect(pageFaviconHref(document)).toBe('https://github.com/favicon.ico');
  });
});
