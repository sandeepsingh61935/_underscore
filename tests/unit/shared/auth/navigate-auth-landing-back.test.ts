import { describe, expect, it } from 'vitest';

import { resolveAuthLandingBack } from '@/shared/auth/navigate-auth-landing-back';

describe('resolveAuthLandingBack', () => {
  it('uses history when same-origin referrer and history length > 1', () => {
    const target = resolveAuthLandingBack({
      historyLength: 3,
      referrer: 'https://app.example/mode',
      origin: 'https://app.example',
      returnTo: '/library',
    });
    expect(target).toEqual({ kind: 'history' });
  });

  it('ignores history when referrer is cross-origin', () => {
    const target = resolveAuthLandingBack({
      historyLength: 5,
      referrer: 'https://evil.example/',
      origin: 'https://app.example',
      returnTo: '/oauth/continue',
      resolveReturnTo: (r) => `/resolved${r}`,
    });
    expect(target).toEqual({ kind: 'path', path: '/resolved/oauth/continue' });
  });

  it('falls back to returnTo when history is insufficient', () => {
    const target = resolveAuthLandingBack({
      historyLength: 1,
      referrer: 'https://app.example/mode',
      origin: 'https://app.example',
      returnTo: '/collections',
    });
    expect(target).toEqual({ kind: 'path', path: '/collections' });
  });

  it('falls back to /settings when no history and no returnTo', () => {
    const target = resolveAuthLandingBack({
      historyLength: 1,
      referrer: '',
      origin: 'https://app.example',
    });
    expect(target).toEqual({ kind: 'path', path: '/settings' });
  });

  it('treats empty returnTo as missing and falls back to /settings', () => {
    const target = resolveAuthLandingBack({
      historyLength: 1,
      referrer: '',
      origin: 'https://app.example',
      returnTo: '   ',
    });
    expect(target).toEqual({ kind: 'path', path: '/settings' });
  });
});
