/**
 * @file auth-manager.test.ts
 * @description Comprehensive unit tests for AuthManager
 * @testing 15 tests covering OAuth flows, token refresh, rate limiting, edge cases
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AuthManager } from '@/background/auth/auth-manager';
import type { ITokenStore, AuthToken } from '@/background/auth/interfaces/i-token-store';
import type { ILogger } from '@/shared/utils/logger';
import { EventBus } from '@/shared/utils/event-bus';
import { OAuthProvider } from '@/background/auth/interfaces/i-auth-manager';
import { RateLimitError, OAuthRedirectError } from '@/background/auth/auth-errors';

// Mock chrome.identity API
global.chrome = {
    identity: {
        getRedirectURL: vi.fn((provider: string) => `https://extension-id.chromiumapp.org/${provider}`),
        launchWebAuthFlow: vi.fn(),
    },
    storage: {
        local: {
            get: vi.fn(),
            set: vi.fn(),
            remove: vi.fn(),
        },
    },
} as any;

/**
 * Mock TokenStore
 */
class MockTokenStore implements ITokenStore {
    private tokens = new Map<string, AuthToken>();

    async saveToken(token: AuthToken): Promise<void> {
        this.tokens.set(token.userId, token);
    }

    async getToken(userId: string): Promise<AuthToken | null> {
        return this.tokens.get(userId) ?? null;
    }

    async removeToken(userId: string): Promise<void> {
        this.tokens.delete(userId);
    }

    async clear(): Promise<void> {
        this.tokens.clear();
    }

    async hasToken(userId: string): Promise<boolean> {
        return this.tokens.has(userId);
    }

    // Test helper
    getStoredTokens() {
        return this.tokens;
    }
}

/**
 * Mock Logger
 */
class MockLogger implements ILogger {
    debug = vi.fn();
    info = vi.fn();
    warn = vi.fn();
    error = vi.fn();
    setLevel = vi.fn();
    getLevel = vi.fn(() => 1);
}

describe('AuthManager Unit Tests', () => {
    let authManager: AuthManager;
    let mockTokenStore: MockTokenStore;
    let mockEventBus: EventBus;
    let mockLogger: MockLogger;

    beforeEach(() => {
        mockTokenStore = new MockTokenStore();
        mockEventBus = new EventBus();
        mockLogger = new MockLogger();
        authManager = new AuthManager(mockTokenStore, mockEventBus, mockLogger);

        // Reset chrome.identity mock
        vi.mocked(chrome.identity.launchWebAuthFlow).mockReset();
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    /**
     * Test 1: BASIC - Successful Google OAuth sign in
     */
    it('should successfully sign in with Google OAuth', async () => {
        // Arrange: Mock successful OAuth flow
        vi.mocked(chrome.identity.launchWebAuthFlow).mockResolvedValue(
            'https://extension-id.chromiumapp.org/google?code=auth_code_123'
        );

        // Act: Sign in
        const result = await authManager.signIn(OAuthProvider.GOOGLE);

        // Assert: Success
        expect(result.success).toBe(true);
        expect(result.user).toBeDefined();
        expect(result.user?.email).toBe('user@example.com');
        expect(authManager.isAuthenticated).toBe(true);
        expect(authManager.currentUser).toBeDefined();
    });

    /**
     * Test 2: TRICKY - Rate limiting kicks in after 5 attempts
     */
    it('should enforce rate limiting after 5 failed sign-in attempts', async () => {
        // Arrange: Mock OAuth failure
        vi.mocked(chrome.identity.launchWebAuthFlow).mockRejectedValue(
            new Error('User cancelled')
        );

        // Act: Try to sign in 5 times
        const attempts = [];
        for (let i = 0; i < 5; i++) {
            attempts.push(authManager.signIn(OAuthProvider.GOOGLE).catch(() => { }));
        }
        await Promise.all(attempts);

        // Act: 6th attempt should be rate limited
        const result = await authManager.signIn(OAuthProvider.GOOGLE);

        // Assert: Rate limited
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe('RATE_LIMIT');
        expect(mockLogger.warn).toHaveBeenCalledWith(
            expect.stringContaining('Rate limit exceeded'),
            expect.any(Object)
        );
    });

    /**
     * Test 3: REALISTIC - Token auto-refresh 15min before expiry
     */
    it('should automatically refresh token 15 minutes before expiry', async () => {
        // Arrange: Sign in with token expiring in 16 minutes
        vi.useFakeTimers();
        vi.mocked(chrome.identity.launchWebAuthFlow).mockResolvedValue(
            'https://extension-id.chromiumapp.org/google?code=auth_code_123'
        );

        await authManager.signIn(OAuthProvider.GOOGLE);

        // Spy on refreshToken
        const refreshSpy = vi.spyOn(authManager, 'refreshToken');

        // Act: Advance time by 1 minute (should trigger refresh at 15min mark)
        vi.advanceTimersByTime(1 * 60 * 1000 + 100); // 1min + buffer

        // Wait for async refresh
        await vi.runAllTimersAsync();

        // Assert: Refresh was called
        expect(refreshSpy).toHaveBeenCalled();
    });

    /**
     * Test 4: TRICKY - Concurrent sign-in attempts for same provider
     */
    it('should handle concurrent sign-in attempts gracefully', async () => {
        // Arrange: Mock OAuth flow with delay
        let callCount = 0;
        vi.mocked(chrome.identity.launchWebAuthFlow).mockImplementation(async () => {
            callCount++;
            await new Promise((resolve) => setTimeout(resolve, 100));
            return `https://extension-id.chromiumapp.org/google?code=auth_code_${callCount}`;
        });

        // Act: Trigger 3 concurrent sign-ins
        const results = await Promise.all([
            authManager.signIn(OAuthProvider.GOOGLE),
            authManager.signIn(OAuthProvider.GOOGLE),
            authManager.signIn(OAuthProvider.GOOGLE),
        ]);

        // Assert: All succeeded (rate limiter allows 5)
        expect(results.every((r) => r.success)).toBe(true);
        expect(callCount).toBe(3);
    });

    /**
     * Test 5: REALISTIC - Sign out clears token and stops refresh timer
     */
    it('should clear token and stop refresh timer on sign out', async () => {
        // Arrange: Sign in first
        vi.mocked(chrome.identity.launchWebAuthFlow).mockResolvedValue(
            'https://extension-id.chromiumapp.org/google?code=auth_code_123'
        );
        await authManager.signIn(OAuthProvider.GOOGLE);

        expect(authManager.isAuthenticated).toBe(true);
        const userId = authManager.currentUser!.id;

        // Act: Sign out
        await authManager.signOut();

        // Assert: State cleared
        expect(authManager.isAuthenticated).toBe(false);
        expect(authManager.currentUser).toBeNull();
        expect(await mockTokenStore.hasToken(userId)).toBe(false);
    });

    /**
     * Test 6: TRICKY - OAuth redirect without authorization code
     */
    it('should handle OAuth redirect without code gracefully', async () => {
        // Arrange: Mock redirect without code
        vi.mocked(chrome.identity.launchWebAuthFlow).mockResolvedValue(
            'https://extension-id.chromiumapp.org/google?error=access_denied'
        );

        // Act & Assert: Should throw OAuthRedirectError
        await expect(authManager.signIn(OAuthProvider.GOOGLE)).rejects.toThrow();
    });

    /**
     * Test 7: REALISTIC - Auth state change events emitted
     */
    it('should emit AUTH_STATE_CHANGED event on sign in and sign out', async () => {
        // Arrange: Listen to events
        const stateChanges: any[] = [];
        mockEventBus.on('AUTH_STATE_CHANGED', (state) => stateChanges.push(state));

        vi.mocked(chrome.identity.launchWebAuthFlow).mockResolvedValue(
            'https://extension-id.chromiumapp.org/google?code=auth_code_123'
        );

        // Act: Sign in
        await authManager.signIn(OAuthProvider.GOOGLE);

        // Act: Sign out
        await authManager.signOut();

        // Assert: 2 events emitted
        expect(stateChanges).toHaveLength(2);
        expect(stateChanges[0].isAuthenticated).toBe(true);
        expect(stateChanges[1].isAuthenticated).toBe(false);
    });

    /**
     * Test 8: TRICKY - Invalid OAuth provider
     */
    it('should reject invalid OAuth provider', async () => {
        // Act & Assert
        await expect(
            authManager.signIn('invalid_provider' as any)
        ).rejects.toThrow('Invalid OAuth provider');
    });

    /**
     * Test 9: REALISTIC - Multiple providers can be used
     */
    it('should support all 4 OAuth providers', async () => {
        // Arrange
        const providers = [
            OAuthProvider.GOOGLE,
            OAuthProvider.APPLE,
            OAuthProvider.FACEBOOK,
            OAuthProvider.TWITTER,
        ];

        vi.mocked(chrome.identity.launchWebAuthFlow).mockImplementation(
            async (options) => {
                const url = new URL(options.url);
                const provider = url.hostname.split('.')[0];
                return `https://extension-id.chromiumapp.org/${provider}?code=code_123`;
            }
        );

        // Act: Try each provider
        for (const provider of providers) {
            await authManager.signOut(); // Reset between providers
            const result = await authManager.signIn(provider);

            // Assert
            expect(result.success).toBe(true);
        }
    });

    /**
     * Test 10: TRICKY - Token refresh failure triggers sign out
     */
    it('should sign out user if token refresh fails', async () => {
        // Arrange: Sign in first
        vi.mocked(chrome.identity.launchWebAuthFlow).mockResolvedValue(
            'https://extension-id.chromiumapp.org/google?code=auth_code_123'
        );
        await authManager.signIn(OAuthProvider.GOOGLE);

        // Mock refresh failure by removing token
        await mockTokenStore.clear();

        // Act: Try to refresh
        await expect(authManager.refreshToken()).rejects.toThrow();

        // Assert: User signed out
        expect(authManager.isAuthenticated).toBe(false);
    });

    /**
     * Test 11: REALISTIC - getAuthState returns immutable snapshot
     */
    it('should return immutable auth state snapshot', async () => {
        // Arrange: Sign in
        vi.mocked(chrome.identity.launchWebAuthFlow).mockResolvedValue(
            'https://extension-id.chromiumapp.org/google?code=auth_code_123'
        );
        await authManager.signIn(OAuthProvider.GOOGLE);

        // Act: Get state
        const state1 = authManager.getAuthState();
        const state2 = authManager.getAuthState();

        // Assert: Different objects (not same reference)
        expect(state1).not.toBe(state2);
        expect(state1).toEqual(state2);
    });

    /**
     * Test 12: TRICKY - onAuthStateChanged returns working unsubscribe function
     */
    it('should allow unsubscribing from auth state changes', async () => {
        // Arrange
        const callback = vi.fn();
        const unsubscribe = authManager.onAuthStateChanged(callback);

        vi.mocked(chrome.identity.launchWebAuthFlow).mockResolvedValue(
            'https://extension-id.chromiumapp.org/google?code=auth_code_123'
        );

        // Act: Sign in (should trigger callback)
        await authManager.signIn(OAuthProvider.GOOGLE);
        expect(callback).toHaveBeenCalledTimes(1);

        // Act: Unsubscribe
        unsubscribe();

        // Act: Sign out (should NOT trigger callback)
        await authManager.signOut();

        // Assert: Callback only called once (before unsubscribe)
        expect(callback).toHaveBeenCalledTimes(1);
    });

    /**
     * Test 13: REALISTIC - Chrome identity API unavailable
     */
    it('should handle chrome.identity API unavailable', async () => {
        // Arrange: Remove chrome.identity
        const originalIdentity = chrome.identity;
        (chrome as any).identity = undefined;

        // Act & Assert: Should throw
        await expect(authManager.signIn(OAuthProvider.GOOGLE)).rejects.toThrow();

        // Cleanup
        (chrome as any).identity = originalIdentity;
    });

    /**
     * Test 14: TRICKY - User cancels OAuth flow
     */
    it('should handle user cancelling OAuth flow', async () => {
        // Arrange: Mock user cancellation (null return)
        vi.mocked(chrome.identity.launchWebAuthFlow).mockResolvedValue(undefined as any);

        // Act & Assert
        await expect(authManager.signIn(OAuthProvider.GOOGLE)).rejects.toThrow(
            OAuthRedirectError
        );
    });

    /**
     * Test 15: REALISTIC - Token stored with correct expiry
     */
    it('should store token with correct expiration time', async () => {
        // Arrange
        vi.mocked(chrome.identity.launchWebAuthFlow).mockResolvedValue(
            'https://extension-id.chromiumapp.org/google?code=auth_code_123'
        );

        const beforeSignIn = Date.now();

        // Act
        await authManager.signIn(OAuthProvider.GOOGLE);

        // Assert: Token stored with ~1 hour expiry
        const userId = authManager.currentUser!.id;
        const token = await mockTokenStore.getToken(userId);

        expect(token).toBeDefined();
        expect(token!.expiresAt.getTime()).toBeGreaterThan(beforeSignIn + 3500 * 1000); // ~58min
        expect(token!.expiresAt.getTime()).toBeLessThan(beforeSignIn + 3700 * 1000); // ~62min
    });
});
