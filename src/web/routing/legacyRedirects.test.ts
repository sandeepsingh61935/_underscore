import { describe, it, expect } from 'vitest';
import { resolveLegacyRedirect } from './legacyRedirects';

describe('resolveLegacyRedirect', () => {
  it('redirects /collections to /library', () => {
    expect(resolveLegacyRedirect('/collections')).toBe('/library');
  });

  it('redirects /domain/:domain to library with domain query', () => {
    expect(resolveLegacyRedirect('/domain/example.com')).toBe(
      '/library?domain=example.com'
    );
  });

  it('redirects /domain/:domain/section/:section with both params', () => {
    expect(resolveLegacyRedirect('/domain/a.com/section/%2Fdocs')).toBe(
      '/library?domain=a.com&section=%2Fdocs'
    );
  });

  it('uses explicit params when provided for domain routes', () => {
    expect(
      resolveLegacyRedirect('/domain/placeholder', {
        domain: 'real.com',
      })
    ).toBe('/library?domain=real.com');
  });

  it('returns null for unknown pathnames', () => {
    expect(resolveLegacyRedirect('/home')).toBeNull();
    expect(resolveLegacyRedirect('/library')).toBeNull();
    expect(resolveLegacyRedirect('/settings')).toBeNull();
  });
});
