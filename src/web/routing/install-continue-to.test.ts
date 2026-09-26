import { describe, expect, it } from 'vitest';

import { readInstallContinueFrom, resolveInstallContinueTo } from './install-continue-to';

describe('resolveInstallContinueTo', () => {
  it('returns product routes including query strings', () => {
    expect(resolveInstallContinueTo('/home')).toBe('/home');
    expect(resolveInstallContinueTo('/library?domain=ex.com')).toBe(
      '/library?domain=ex.com'
    );
    expect(resolveInstallContinueTo('/settings?tab=data')).toBe('/settings?tab=data');
  });

  it('maps missing, marketing, and install back to home', () => {
    expect(resolveInstallContinueTo(null)).toBe('/home');
    expect(resolveInstallContinueTo('/')).toBe('/home');
    expect(resolveInstallContinueTo('/install')).toBe('/home');
    expect(resolveInstallContinueTo('/sign-in')).toBe('/home');
    expect(resolveInstallContinueTo('https://evil.example')).toBe('/home');
  });

  it('readInstallContinueFrom only accepts a string from', () => {
    expect(readInstallContinueFrom({ from: '/library' })).toBe('/library');
    expect(readInstallContinueFrom({ from: 1 })).toBeUndefined();
    expect(readInstallContinueFrom(null)).toBeUndefined();
    expect(readInstallContinueFrom({ gateOpen: true })).toBeUndefined();
  });
});
