import { describe, expect, it } from 'vitest';

import { isMobileWebViewport } from './is-mobile-web-viewport';

describe('isMobileWebViewport', () => {
  it('is false without a media query', () => {
    expect(isMobileWebViewport(null)).toBe(false);
    expect(isMobileWebViewport(undefined)).toBe(false);
  });

  it('follows matches', () => {
    expect(isMobileWebViewport({ matches: true })).toBe(true);
    expect(isMobileWebViewport({ matches: false })).toBe(false);
  });
});
