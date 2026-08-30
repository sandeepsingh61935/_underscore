import { describe, expect, it } from 'vitest';

import { resolveSafeReturnTo } from './safe-return-to';

describe('resolveSafeReturnTo', () => {
  it('allows relative product paths', () => {
    expect(resolveSafeReturnTo('/library')).toBe('/library');
    expect(resolveSafeReturnTo('/settings?tab=account')).toBe('/settings?tab=account');
  });

  it('rejects external and protocol-relative URLs', () => {
    expect(resolveSafeReturnTo('https://evil.example/phish')).toBe('/home');
    expect(resolveSafeReturnTo('//evil.example')).toBe('/home');
  });

  it('maps bare / and sign-in to home', () => {
    expect(resolveSafeReturnTo('/')).toBe('/home');
    expect(resolveSafeReturnTo('/sign-in')).toBe('/home');
  });

  it('falls back on empty', () => {
    expect(resolveSafeReturnTo(null)).toBe('/home');
    expect(resolveSafeReturnTo(undefined, '/library')).toBe('/library');
  });
});
