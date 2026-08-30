import { describe, expect, it } from 'vitest';

import {
  buildWebSupabaseAuthOptions,
  resolveWebAuthStorageKey,
} from './web-supabase-auth-options';

describe('resolveWebAuthStorageKey', () => {
  it('derives sb-<project-ref>-auth-token from Supabase URL host', () => {
    expect(resolveWebAuthStorageKey('https://cuzwaukxagefyvtxbqmi.supabase.co')).toBe(
      'sb-cuzwaukxagefyvtxbqmi-auth-token',
    );
  });

  it('falls back safely on invalid URL', () => {
    expect(resolveWebAuthStorageKey('not-a-url')).toBe('sb-underscore-auth-token');
  });
});

describe('buildWebSupabaseAuthOptions', () => {
  it('pins durable session + PKCE OAuth options for Google SPA flow', () => {
    const opts = buildWebSupabaseAuthOptions('https://proj.supabase.co');
    expect(opts).toEqual({
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storageKey: 'sb-proj-auth-token',
    });
  });
});
