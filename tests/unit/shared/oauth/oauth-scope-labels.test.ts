import { describe, expect, it } from 'vitest';

import {
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

  it('labels known scopes', () => {
    expect(labelOAuthScope('highlights:read')).toContain('highlight');
  });

  it('falls back to raw scope for unknown values', () => {
    expect(labelOAuthScope('custom:scope')).toBe('custom:scope');
  });

  it('maps scopes to labels', () => {
    const rows = labelOAuthScopes('openid email');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.scope).toBe('openid');
  });
});
