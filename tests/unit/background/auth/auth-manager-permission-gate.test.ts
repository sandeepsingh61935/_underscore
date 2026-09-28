/**
 * @file auth-manager-permission-gate.test.ts
 * @description TDD: Google OAuth must request the optional Supabase host
 * permission at sign-in time (guest-first model), deny with a grant-access
 * error, and hydrate session post-grant on prod builds.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AuthManager } from '@/background/auth/auth-manager';
import { OAuthProvider } from '@/background/auth/interfaces/i-auth-manager';
import { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';
import type { SupabaseClient, Session, User } from '@supabase/supabase-js';

const ORIGIN_SUPABASE = 'https://cuzwaukxagefyvtxbqmi.supabase.co/*';

const { mockPermissions } = vi.hoisted(() => ({
  mockPermissions: { contains: vi.fn(), request: vi.fn() },
}));

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      local: { get: vi.fn(), set: vi.fn(), remove: vi.fn() },
    },
    permissions: mockPermissions,
  },
}));

global.chrome = {
  identity: {
    getRedirectURL: vi.fn(() => 'https://extension-id.chromiumapp.org'),
    launchWebAuthFlow: vi.fn(),
  },
  permissions: { contains: vi.fn().mockResolvedValue(true) },
  alarms: {
    create: vi.fn(),
    clear: vi.fn(),
    onAlarm: { addListener: vi.fn(), removeListener: vi.fn() },
  },
  storage: {
    local: { get: vi.fn().mockResolvedValue({}), set: vi.fn().mockResolvedValue({}) },
  },
} as any;

class MockLogger implements ILogger {
  debug = vi.fn();
  info = vi.fn();
  warn = vi.fn();
  error = vi.fn();
  fatal = vi.fn();
  setLevel = vi.fn();
  getLevel = vi.fn(() => 1);
}

describe('AuthManager Supabase permission gate (Google OAuth)', () => {
  let mockSupabase: any;
  let mockLogger: MockLogger;

  const mockUser = {
    id: 'user-123',
    email: 'user@example.com',
    app_metadata: { provider: 'google' },
    user_metadata: { full_name: 'Test User' },
    aud: 'authenticated',
    created_at: '',
    role: 'authenticated',
    updated_at: '',
  } as unknown as User;

  const mockSession = {
    access_token: 'access-token-123',
    refresh_token: 'refresh-token-123',
    expires_in: 3600,
    token_type: 'bearer',
    user: mockUser,
  } as unknown as Session;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = new MockLogger();
    mockSupabase = {
      auth: {
        signInWithOAuth: vi.fn().mockResolvedValue({
          data: { url: 'https://mock.supabase.co/authorize' },
          error: null,
        }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        setSession: vi.fn().mockResolvedValue({
          data: { user: mockUser, session: mockSession },
          error: null,
        }),
        exchangeCodeForSession: vi.fn().mockResolvedValue({
          data: { user: mockUser, session: mockSession },
          error: null,
        }),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
      },
    };
    // Default: origin already granted
    mockPermissions.contains.mockResolvedValue(true);
    mockPermissions.request.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('requests the Supabase origin during Google sign-in when not granted', async () => {
    mockPermissions.contains.mockResolvedValue(false);
    mockPermissions.request.mockResolvedValue(true);
    const manager = new AuthManager(
      mockSupabase as unknown as SupabaseClient,
      new EventBus(),
      mockLogger
    );
    (global.chrome.identity.launchWebAuthFlow as any).mockResolvedValue(
      'https://extension-id.chromiumapp.org/?code=pkce-code'
    );

    await manager.signIn(OAuthProvider.GOOGLE);

    expect(mockPermissions.request).toHaveBeenCalledWith({
      origins: [ORIGIN_SUPABASE],
    });
  });

  it('denies with a grant-access error and makes no network calls when refused', async () => {
    mockPermissions.contains.mockResolvedValue(false);
    mockPermissions.request.mockResolvedValue(false);
    const manager = new AuthManager(
      mockSupabase as unknown as SupabaseClient,
      new EventBus(),
      mockLogger
    );

    let result: any;
    try {
      result = await manager.signIn(OAuthProvider.GOOGLE);
    } catch (error) {
      result = { thrown: error };
    }

    const message =
      (result?.thrown as Error)?.message ?? (result as any)?.error?.message ?? '';
    expect(message).toMatch(/grant access|permission/i);
    expect(mockSupabase.auth.signInWithOAuth).not.toHaveBeenCalled();
    expect(
      global.chrome.identity.launchWebAuthFlow as unknown as { mock: any }
    ).toBeDefined();
    expect(
      (global.chrome.identity.launchWebAuthFlow as any).mock.calls.length
    ).toBe(0);
  });

  it('registers the auth listener and hydrates session after post-grant init', async () => {
    // SW started as guest (not granted), grant arrives at sign-in time.
    (global.chrome.permissions.contains as any).mockResolvedValue(false);
    mockPermissions.contains.mockResolvedValue(false);
    mockPermissions.request.mockResolvedValue(true);
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
    });
    const manager = new AuthManager(
      mockSupabase as unknown as SupabaseClient,
      new EventBus(),
      mockLogger
    );
    await manager.initialize();
    expect(mockSupabase.auth.onAuthStateChange).not.toHaveBeenCalled();

    (global.chrome.identity.launchWebAuthFlow as any).mockResolvedValue(
      'https://extension-id.chromiumapp.org/?code=pkce-code'
    );
    const result = await manager.signIn(OAuthProvider.GOOGLE);

    expect(result.success).toBe(true);
    expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
    expect(mockSupabase.auth.getSession).toHaveBeenCalled();
  });
});
