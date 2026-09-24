import { describe, expect, it } from 'vitest';

import { handheldAuthRedirect } from './handheld-auth-redirect';

describe('handheldAuthRedirect', () => {
  it('null on desktop guest', () => {
    expect(handheldAuthRedirect(false, 'desktop', '/library')).toBeNull();
  });

  it('redirects unsigned phone', () => {
    expect(handheldAuthRedirect(false, 'phone', '/library?domain=a.com')).toBe(
      '/sign-in?returnTo=%2Flibrary%3Fdomain%3Da.com'
    );
  });

  it('null when signed in on tablet', () => {
    expect(handheldAuthRedirect(true, 'tablet', '/home')).toBeNull();
  });
});
