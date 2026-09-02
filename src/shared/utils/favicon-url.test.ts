import { describe, it, expect } from 'vitest';

import { domainInitial, faviconUrlForDomain } from './favicon-url';

describe('faviconUrlForDomain', () => {
  it('returns a Google s2 URL for a public host', () => {
    const url = faviconUrlForDomain('github.com');
    expect(url).toContain('github.com');
    expect(url).toContain('favicons');
  });

  it('returns null for localhost and IPs', () => {
    expect(faviconUrlForDomain('localhost')).toBeNull();
    expect(faviconUrlForDomain('127.0.0.1')).toBeNull();
    expect(faviconUrlForDomain('')).toBeNull();
  });
});

describe('domainInitial', () => {
  it('skips www and uppercases', () => {
    expect(domainInitial('www.linkedin.com')).toBe('L');
    expect(domainInitial('github.com')).toBe('G');
  });
});
