import { describe, expect, it } from 'vitest';

import { mapOAuthGrantList } from '@/shared/oauth/oauth-grants';

describe('mapOAuthGrantList', () => {
  it('maps client_id and name from nested client', () => {
    const grants = mapOAuthGrantList([
      { client: { client_id: 'abc', client_name: 'ChatGPT' }, scope: 'openid email' },
    ]);
    expect(grants).toEqual([
      { clientId: 'abc', clientName: 'ChatGPT', scopes: ['openid', 'email'] },
    ]);
  });

  it('drops rows without a client id', () => {
    expect(mapOAuthGrantList([{ client: { name: 'x' } }])).toEqual([]);
  });
});
