import { describe, expect, it } from 'vitest';

import { mapOAuthGrantList } from '@/shared/oauth/oauth-grants';

describe('mapOAuthGrantList', () => {
  it('maps Supabase OAuthGrant shape (client.id + client.name + scopes)', () => {
    const grants = mapOAuthGrantList([
      {
        client: { id: 'abc-uuid', name: 'Grok', uri: '', logo_uri: '' },
        scopes: ['openid', 'email'],
        granted_at: '2026-08-14T00:00:00.000Z',
      },
    ]);
    expect(grants).toEqual([
      {
        clientId: 'abc-uuid',
        clientName: 'Grok',
        scopes: ['openid', 'email'],
        createdAt: '2026-08-14T00:00:00.000Z',
      },
    ]);
  });

  it('maps nested client_id and client_name legacy shape', () => {
    const grants = mapOAuthGrantList([
      { client: { client_id: 'abc', client_name: 'ChatGPT' }, scope: 'openid email' },
    ]);
    expect(grants).toEqual([
      { clientId: 'abc', clientName: 'ChatGPT', scopes: ['openid', 'email'] },
    ]);
  });

  it('unwraps { grants: [...] } payloads', () => {
    const grants = mapOAuthGrantList({
      grants: [{ client: { id: 'x', name: 'Cursor' }, scopes: [] }],
    });
    expect(grants).toHaveLength(1);
    expect(grants[0]?.clientName).toBe('Cursor');
  });

  it('drops rows without a client id', () => {
    expect(mapOAuthGrantList([{ client: { name: 'x' } }])).toEqual([]);
  });
});
