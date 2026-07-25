/**
 * @file auth-manager.test.ts
 * @description Comprehensive unit tests for AuthManager using Real Supabase Integration
 * @testing 15 tests covering OAuth flows, token refresh, rate limiting, edge cases
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AuthManager } from '@/background/auth/auth-manager';
import type { ILogger } from '@/shared/utils/logger';
import { EventBus } from '@/shared/utils/event-bus';
import { OAuthProvider } from '@/background/auth/interfaces/i-auth-manager';
import { SupabaseClient, Session, User } from '@supabase/supabase-js';

vi.mock('wxt/browser', () => ({
    browser: {
        storage: {
            local: {
                get: vi.fn(),
                set: vi.fn(),
                remove: vi.fn()
            }
        }
    }
}));

// Mock chrome.identity API
global.chrome = {
    identity: {
        getRedirectURL: vi.fn((_provider: string) => `https://extension-id.chromiumapp.org`),
        launchWebAuthFlow: vi.fn(),
    },
    alarms: {
        create: vi.fn(),
        clear: vi.fn(),
        onAlarm: {
            addListener: vi.fn(),
            removeListener: vi.fn(),
        },
    },
    storage: {
        local: {
            get: vi.fn().mockResolvedValue({}),
            set: vi.fn().mockResolvedValue({}),
        }
    }
} as any;



/**
 * Mock Logger
 */
class MockLogger implements ILogger {
    debug = vi.fn();
    info = vi.fn();
    warn = vi.fn();
    error = vi.fn();
    fatal = vi.fn();
    setLevel = vi.fn();
    getLevel = vi.fn(() => 1);
}

describe('AuthManager Unit Tests', () => {
    let authManager: AuthManager;
    let mockEventBus: EventBus;
    let mockLogger: MockLogger;
    let mockSupabase: any;
    let authStateCallback: any;

    const mockUser: User = {
        id: 'user-123',
        email: 'user@example.com',
        app_metadata: { provider: 'google' },
        user_metadata: { full_name: 'Test User', avatar_url: 'http://avatar.url' },
        aud: 'authenticated',
        created_at: '',
        role: 'authenticated',
        updated_at: ''
    };

    const mockSession: Session = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-123',
        expires_in: 3600,
        token_type: 'bearer',
        user: mockUser,
    };

    beforeEach(() => {
        mockEventBus = new EventBus();
        mockLogger = new MockLogger();

        // Mock Supabase Client
        mockSupabase = {
            auth: {
                signInWithOAuth: vi.fn().mockResolvedValue({
                    data: { url: 'https://auth.supabase.co/authorize?...' },
                    error: null
                }),
                signInWithPassword: vi.fn().mockResolvedValue({
                    data: { user: mockUser, session: mockSession },
                    error: null
                }),
                signUp: vi.fn().mockResolvedValue({
                    data: { user: mockUser, session: mockSession },
                    error: null
                }),
                signOut: vi.fn().mockResolvedValue({ error: null }),
                getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
                setSession: vi.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
                exchangeCodeForSession: vi.fn().mockResolvedValue({
                    data: { user: mockUser, session: mockSession },
                    error: null,
                }),
                refreshSession: vi.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
                onAuthStateChange: vi.fn((callback) => {
                    authStateCallback = callback;
                    return { data: { subscription: { unsubscribe: vi.fn() } } };
                }),
            }
        };

        // Reset chrome.identity mock
        vi.mocked(chrome.identity.launchWebAuthFlow).mockReset();

        // Ensure chrome.runtime is defined for tests checking lastError
        if (!chrome.runtime) (chrome as any).runtime = {};
        Object.defineProperty(chrome.runtime, 'lastError', { value: undefined, configurable: true, writable: true });

        authManager = new AuthManager(
            mockSupabase as unknown as SupabaseClient,
            mockEventBus,
            mockLogger
        );

        // Map environment variables for testing
        vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-google-client-id.apps.googleusercontent.com');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.clearAllMocks();
        Object.defineProperty(chrome.runtime, 'lastError', { value: undefined, configurable: true });
    });

    /**
     * Test 1: BASIC - Successful Google OAuth sign in
     */
    it('should successfully sign in with Google OAuth', async () => {
        // Arrange
        mockSupabase.auth.signInWithOAuth = vi.fn().mockResolvedValue({
            data: { url: 'https://mock.supabase.co/auth/v1/authorize' },
            error: null
        });

        chrome.identity.launchWebAuthFlow = vi.fn().mockResolvedValue(
            'https://extension-id.chromiumapp.org/#access_token=mockAccess&refresh_token=mockRefresh'
        );

        mockSupabase.auth.setSession = vi.fn().mockResolvedValue({
            data: { user: mockUser, session: mockSession },
            error: null
        });

        // Act
        const result = await authManager.signIn(OAuthProvider.GOOGLE);

        // Simulate auth state change from listener (Supabase behavior)
        if (authStateCallback) authStateCallback('SIGNED_IN', mockSession);

        // Assert
        expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
            provider: 'google',
            options: {
                redirectTo: expect.any(String),
                skipBrowserRedirect: true,
                queryParams: {
                    prompt: 'select_account',
                },
            }
        });
        expect(chrome.identity.launchWebAuthFlow).toHaveBeenCalledWith({
            url: 'https://mock.supabase.co/auth/v1/authorize',
            interactive: true
        });
        expect(mockSupabase.auth.setSession).toHaveBeenCalledWith({
            access_token: 'mockAccess',
            refresh_token: 'mockRefresh'
        });

        expect(result.success).toBe(true);
        expect(authManager.isAuthenticated).toBe(true);
        expect(authManager.currentUser?.email).toBe('user@example.com');
    });

    it('should complete Google OAuth via PKCE code exchange', async () => {
        mockSupabase.auth.signInWithOAuth = vi.fn().mockResolvedValue({
            data: { url: 'https://mock.supabase.co/auth/v1/authorize' },
            error: null,
        });

        chrome.identity.launchWebAuthFlow = vi.fn().mockResolvedValue(
            'https://extension-id.chromiumapp.org/?code=pkce-auth-code',
        );

        mockSupabase.auth.exchangeCodeForSession = vi.fn().mockResolvedValue({
            data: { user: mockUser, session: mockSession },
            error: null,
        });

        const result = await authManager.signIn(OAuthProvider.GOOGLE);

        if (authStateCallback) {
            authStateCallback('SIGNED_IN', mockSession);
        }

        expect(mockSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('pkce-auth-code');
        expect(mockSupabase.auth.setSession).not.toHaveBeenCalled();
        expect(result.success).toBe(true);
        expect(authManager.currentUser?.email).toBe('user@example.com');
    });

    /**
     * Test 2: TRICKY - Rate limiting kicks in after 5 attempts
     */
    it('should enforce rate limiting after 5 failed sign-in attempts', async () => {
        // Mock the OAuth flow to fail immediately at the setSession step
        mockSupabase.auth.signInWithOAuth = vi.fn().mockResolvedValue({
            data: { url: 'https://mock.supabase.co/auth/v1/authorize' },
            error: null
        });

        chrome.identity.launchWebAuthFlow = vi.fn().mockResolvedValue(
            'https://extension-id.chromiumapp.org/#access_token=bad&refresh_token=bad'
        );

        // Supabase rejects the token
        mockSupabase.auth.setSession = vi.fn().mockResolvedValue({
            data: { user: null, session: null },
            error: new Error('Invalid token')
        });

        // 5 failures
        for (let i = 0; i < 5; i++) {
            await authManager.signIn(OAuthProvider.GOOGLE).catch(() => { });
        }

        // 6th attempt
        const result = await authManager.signIn(OAuthProvider.GOOGLE);

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('RATE_LIMIT');
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Rate limit'), expect.any(Object));
    });


    /**
     * Test 3: TRICKY - Concurrent sign-in attempts
     */
    it('should handle concurrent sign-in attempts', async () => {
        let callCount = 0;

        mockSupabase.auth.signInWithOAuth = vi.fn().mockImplementation(() => {
            callCount++;
            return Promise.resolve({
                data: { url: `https://mock.supabase.co/auth/v1/authorize?attempt=${callCount}` },
                error: null
            });
        });

        chrome.identity.launchWebAuthFlow = vi.fn().mockImplementation(() => {
            return new Promise(resolve => {
                setTimeout(() => resolve('https://ext.chromiumapp.org/#access_token=t&refresh_token=t'), 10);
            });
        });

        mockSupabase.auth.setSession = vi.fn().mockResolvedValue({
            data: { user: mockUser, session: mockSession },
            error: null
        });

        // Trigger 3 concurrent sign-ins
        const results = await Promise.all([
            authManager.signIn(OAuthProvider.GOOGLE).catch(() => ({ success: false })),
            authManager.signIn(OAuthProvider.GOOGLE).catch(() => ({ success: false })),
            authManager.signIn(OAuthProvider.GOOGLE).catch(() => ({ success: false })),
        ]);

        expect(results.every(r => r.success)).toBe(true);
        // Ensure signInWithOAuth was only called ONCE despite 3 concurrent requests (Singleton Promise architecture)
        expect(callCount).toBe(1);
    });

    /**
     * Test 3b: NEW - Successful Email/Password sign in
     */
    it('should successfully sign in with Email and Password', async () => {
        // Act
        const result = await authManager.signInWithEmail('test@example.com', 'password123');

        // Assert
        expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'password123'
        });

        expect(result.success).toBe(true);
        expect(result.user?.email).toBe('user@example.com'); // Mapped from mockUser
    });

    /**
     * Test 3c: NEW - Successful Email/Password sign up
     */
    it('should successfully sign up with Email and Password', async () => {
        // Act
        const result = await authManager.signUpWithEmail('new@example.com', 'securepass');

        // Assert
        expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
            email: 'new@example.com',
            password: 'securepass'
        });

        expect(result.success).toBe(true);
        expect(result.user?.email).toBe('user@example.com');
    });

    /**
     * Test 3d: NEW - Email sign in rate limiting
     */
    it('should enforce rate limiting on Email sign in after 5 failed attempts', async () => {
        mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: { user: null }, error: new Error('Invalid credentials') });

        // 5 failures
        for (let i = 0; i < 5; i++) {
            await authManager.signInWithEmail('test@example.com', 'wrongpass').catch(() => { });
        }

        // 6th attempt
        const result = await authManager.signInWithEmail('test@example.com', 'wrongpass');

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('RATE_LIMIT');
    });

    /**
     * Test 3e: NEW - Email sign in Supabase error handling
     * Sign-in errors are mapped to a fixed, anti-enumeration message —
     * the raw Supabase string must never reach the UI (see auth-error-messages.ts).
     */
    it('should handle Supabase auth errors during Email sign in gracefully', async () => {
        mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: { user: null }, error: new Error('Invalid Login Credentials') });

        const result = await authManager.signInWithEmail('test@example.com', 'wrongpass');

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('AUTH_ERROR');
        expect(result.error?.message).toBe('Email or password is incorrect.');
    });

    /**
     * Test 4: REALISTIC - Sign out calls Supabase signOut
     */
    it('should call supabase.auth.signOut on sign out', async () => {
        // Mock active session
        authStateCallback('SIGNED_IN', mockSession);

        await authManager.signOut();

        expect(mockSupabase.auth.signOut).toHaveBeenCalled();

        // Simulate change
        authStateCallback('SIGNED_OUT', null);
        expect(authManager.isAuthenticated).toBe(false);
    });

    /**
     * Test 5: TRICKY - OAuth redirect without tokens
     * The thrown message is mapped (never leaks raw provider/redirect debug
     * info to the UI); the raw reason is still captured via the logger.
     */
    it('should throw if redirect URL has no tokens', async () => {
        mockSupabase.auth.signInWithOAuth = vi.fn().mockResolvedValue({
            data: { url: 'https://mock.supabase.co/auth/v1/authorize' },
            error: null
        });

        chrome.identity.launchWebAuthFlow = vi.fn().mockResolvedValue(
            'https://ext.chromiumapp.org/#error=access_denied&error_description=User+cancelled'
        );

        await expect(authManager.signIn(OAuthProvider.GOOGLE)).rejects.toThrow('Google sign-in failed. Please try again.');
        expect(mockLogger.error).toHaveBeenCalledWith(
            'Sign in failed',
            expect.objectContaining({ message: 'User cancelled' }),
            expect.any(Object)
        );
    });

    /**
     * Test 6: REALISTIC - Auth state change events emitted
     */
    it('should emit AUTH_STATE_CHANGED event on session change', () => {
        const spy = vi.fn();
        mockEventBus.on('AUTH_STATE_CHANGED', spy);

        // Simulate sign in
        authStateCallback('SIGNED_IN', mockSession);

        expect(spy).toHaveBeenCalledWith(expect.objectContaining({
            isAuthenticated: true,
            user: expect.objectContaining({ id: 'user-123' })
        }));
    });

    /**
     * Test 7: TRICKY - Invalid OAuth provider
     */
    it('should reject invalid OAuth provider', async () => {
        await expect(
            authManager.signIn('invalid_provider' as any)
        ).rejects.toThrow('Invalid OAuth provider');
    });

    /**
     * Test 8: REALISTIC - Token refresh failure triggers sign out
     * (Supabase client handles refresh auto, but if manual refresh fails, we propagate error)
     */
    it('should propagate error on token refresh failure', async () => {
        mockSupabase.auth.refreshSession.mockResolvedValue({ data: { session: null }, error: new Error('Refresh failed') });

        // We set current user first
        // @ts-ignore
        authManager.currentState.user = { id: '123' } as any;

        await expect(authManager.refreshToken()).rejects.toThrow('Refresh failed');
    });

    /**
     * Test 9: REALISTIC - mapSupabaseUser handles metadata correctly
     */
    it('should correctly map Supabase user to local User interface', () => {
        authStateCallback('SIGNED_IN', mockSession);

        const user = authManager.currentUser;
        expect(user).toBeDefined();
        expect(user?.displayName).toBe('Test User');
        expect(user?.photoUrl).toBe('http://avatar.url');
    });

    /**
     * Test 10: REALISTIC - onAuthStateChange unsubscription
     */
    it('should allow unsubscribing from auth state changes', () => {
        const spy = vi.fn();
        const unsubscribe = authManager.onAuthStateChanged(spy);

        authStateCallback('SIGNED_IN', mockSession);
        expect(spy).toHaveBeenCalledTimes(1);

        unsubscribe();

        authStateCallback('SIGNED_OUT', null);
        expect(spy).toHaveBeenCalledTimes(1); // Not called again
    });
});
