import { describe, expect, it } from 'vitest';

import {
  buildOAuthConsentReturnPath,
  buildSignInReturnUrl,
  resolveAuthRedirectTarget,
} from '@/shared/oauth/oauth-consent-path';

describe('oauth-consent-path', () => {
  it('builds consent path with authorization_id', () => {
    expect(buildOAuthConsentReturnPath('abc-123')).toBe('/oauth/consent?authorization_id=abc-123');
  });

  it('builds sign-in URL preserving consent return', () => {
    const url = buildSignInReturnUrl('abc-123', 'https://underscore.pages.dev');
    expect(url).toContain('/sign-in?');
    expect(url).toContain('returnTo=%2Foauth%2Fconsent%3Fauthorization_id%3Dabc-123');
  });

  it('resolves safe relative return paths', () => {
    expect(resolveAuthRedirectTarget('/oauth/consent?authorization_id=x')).toBe(
      '/oauth/consent?authorization_id=x',
    );
  });

  it('rejects protocol-relative return paths', () => {
    expect(resolveAuthRedirectTarget('//evil.example.com')).toBe('/home');
  });

  it('defaults empty returnTo to /home', () => {
    expect(resolveAuthRedirectTarget(null)).toBe('/home');
    expect(resolveAuthRedirectTarget('')).toBe('/home');
  });

  it('rewrites retired /mode and /collections return paths', () => {
    expect(resolveAuthRedirectTarget('/mode')).toBe('/home');
    expect(resolveAuthRedirectTarget('/mode?x=1')).toBe('/home?x=1');
    expect(resolveAuthRedirectTarget('/collections')).toBe('/library');
    expect(resolveAuthRedirectTarget('/collections?domain=a.com')).toBe(
      '/library?domain=a.com',
    );
  });
});
