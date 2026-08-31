import { describe, expect, it } from 'vitest';

import {
  formatOAuthRedirectDisplay,
  labelOAuthScope,
  labelOAuthScopes,
  parseOAuthScopeString,
} from '@/shared/oauth/oauth-scope-labels';

describe('oauth-scope-labels', () => {
  it('parses space-separated scopes', () => {
    expect(parseOAuthScopeString('openid email highlights:read')).toEqual([
      'openid',
      'email',
      'highlights:read',
    ]);
  });

  it('labels known scopes in plain language', () => {
    expect(labelOAuthScope('highlights:read')).toMatch(/highlight/i);
    expect(labelOAuthScope('offline_access')).toMatch(/revoke|connected/i);
    expect(labelOAuthScope('offline_access')).not.toBe('offline_access');
  });

  it('falls back to readable text for unknown values', () => {
    expect(labelOAuthScope('custom:scope')).toBe('custom:scope');
    expect(labelOAuthScope('weird_token')).toBe('weird token');
  });

  it('orders library access before identity and offline', () => {
    const rows = labelOAuthScopes('offline_access openid email highlights:read');
    expect(rows.map((r) => r.scope)).toEqual([
      'highlights:read',
      'openid',
      'email',
      'offline_access',
    ]);
  });

  it('formats localhost redirects as local development', () => {
    expect(formatOAuthRedirectDisplay('http://127.0.0.1:39613/callback')).toEqual({
      primary: 'Local development app',
      secondary: '127.0.0.1:39613',
    });
    expect(
      formatOAuthRedirectDisplay('https://chatgpt.com/connector/oauth/callback').primary
    ).toBe('chatgpt.com');
  });
});
