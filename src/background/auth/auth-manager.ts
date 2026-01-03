/**
 * @file auth-manager.ts
 * @description OAuth authentication manager with automatic token refresh
 * @architecture Strategy Pattern (multiple OAuth providers)
 * @architecture Observer Pattern (auth state change notifications via EventBus)
 */

import type { IAuthManager, AuthState, AuthResult, User, OAuthProviderType } from './interfaces/i-auth-manager';
import type { ITokenStore, AuthToken } from './interfaces/i-token-store';
import type { ILogger } from '@/shared/utils/logger';
import { EventBus } from '@/shared/utils/event-bus';
import { RateLimiter } from '@/shared/utils/rate-limiter';
import { OAuthProvider } from './interfaces/i-auth-manager';
import {
    AuthenticationError,
    RateLimitError,
    InvalidProviderError,
    OAuthRedirectError,
} from './auth-errors';

/**
 * OAuth provider configuration
 */
interface OAuthConfig {
    readonly authUrl: string;
    readonly clientId: string;
    readonly scopes: string[];
    readonly redirectUrl: string;
}

/**
 * OAuth provider configurations
 * NOTE: In production, these would be environment variables
 */
const OAUTH_CONFIGS: Record<OAuthProviderType, OAuthConfig> = {
    [OAuthProvider.GOOGLE]: {
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        clientId: 'YOUR_GOOGLE_CLIENT_ID',
        scopes: ['profile', 'email'],
        redirectUrl: chrome.identity.getRedirectURL('google'),
    },
    [OAuthProvider.APPLE]: {
        authUrl: 'https://appleid.apple.com/auth/authorize',
        clientId: 'YOUR_APPLE_CLIENT_ID',
        scopes: ['name', 'email'],
        redirectUrl: chrome.identity.getRedirectURL('apple'),
    },
    [OAuthProvider.FACEBOOK]: {
        authUrl: 'https://www.facebook.com/v12.0/dialog/oauth',
        clientId: 'YOUR_FACEBOOK_APP_ID',
        scopes: ['public_profile', 'email'],
        redirectUrl: chrome.identity.getRedirectURL('facebook'),
    },
    [OAuthProvider.TWITTER]: {
        authUrl: 'https://twitter.com/i/oauth2/authorize',
        clientId: 'YOUR_TWITTER_CLIENT_ID',
        scopes: ['tweet.read', 'users.read'],
        redirectUrl: chrome.identity.getRedirectURL('twitter'),
    },
};

/**
 * Authentication manager implementation
 */
export class AuthManager implements IAuthManager {
    private currentState: AuthState = {
        isAuthenticated: false,
        user: null,
        provider: null,
        lastAuthTime: null,
    };

    private refreshTimer?: NodeJS.Timeout;
    private rateLimiter: RateLimiter;

    constructor(
        private readonly tokenStore: ITokenStore,
        private readonly eventBus: EventBus,
        private readonly logger: ILogger
    ) {
        // Initialize rate limiter: 5 attempts per 15 minutes
        this.rateLimiter = new RateLimiter(
            {
                maxAttempts: 5,
                windowMs: 15 * 60 * 1000, // 15 minutes
            },
            logger
        );

        // Try to restore auth state from stored token
        this.restoreAuthState();
    }

    /**
     * Current authentication status
     */
    get isAuthenticated(): boolean {
        return this.currentState.isAuthenticated;
    }

    /**
     * Current authenticated user
     */
    get currentUser(): User | null {
        return this.currentState.user;
    }

    /**
     * Sign in with OAuth provider
     */
    async signIn(provider: OAuthProviderType): Promise<AuthResult> {
        this.logger.info('Sign in attempt', { provider });

        // Validate provider
        if (!Object.values(OAuthProvider).includes(provider)) {
            throw new InvalidProviderError(provider);
        }

        // Rate limiting check
        if (!this.rateLimiter.tryAcquire()) {
            const error = new RateLimitError('Too many login attempts', {
                provider,
                attempts: this.rateLimiter.getAttempts(),
            });
            this.logger.warn('Rate limit exceeded for sign in', { provider });
            return { success: false, error: { code: 'RATE_LIMIT', message: error.message } };
        }

        try {
            // Get OAuth configuration
            const config = OAUTH_CONFIGS[provider];

            // Launch OAuth flow
            const redirectUrl = await this.launchOAuthFlow(config);

            // Parse tokens from redirect URL
            const { accessToken, refreshToken, expiresIn, userId } = this.parseOAuthRedirect(
                redirectUrl,
                provider
            );

            // Fetch user info
            const user = await this.fetchUserInfo(accessToken, provider);

            // Create auth token
            const authToken: AuthToken = {
                accessToken,
                refreshToken,
                expiresAt: new Date(Date.now() + expiresIn * 1000),
                userId: user.id,
                provider,
                scopes: config.scopes,
            };

            // Save encrypted token
            await this.tokenStore.saveToken(authToken);

            // Update state
            this.updateAuthState({
                isAuthenticated: true,
                user,
                provider,
                lastAuthTime: new Date(),
            });

            // Start auto-refresh timer
            this.startTokenRefresh(authToken.expiresAt);

            this.logger.info('Sign in successful', { userId: user.id, provider });

            return { success: true, user };
        } catch (error) {
            this.logger.error('Sign in failed', error as Error, { provider });

            if (error instanceof RateLimitError || error instanceof OAuthRedirectError) {
                throw error;
            }

            throw new AuthenticationError('OAuth sign in failed', {
                provider,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * Sign out current user
     */
    async signOut(): Promise<void> {
        this.logger.info('Sign out', { userId: this.currentState.user?.id });

        // Stop refresh timer
        this.stopTokenRefresh();

        // Remove stored token
        if (this.currentState.user) {
            await this.tokenStore.removeToken(this.currentState.user.id);
        }

        // Update state
        this.updateAuthState({
            isAuthenticated: false,
            user: null,
            provider: null,
            lastAuthTime: null,
        });

        this.logger.info('Sign out complete');
    }

    /**
     * Refresh authentication token
     */
    async refreshToken(): Promise<void> {
        if (!this.currentState.user) {
            throw new AuthenticationError('No user to refresh token for');
        }

        this.logger.debug('Refreshing token', { userId: this.currentState.user.id });

        try {
            // Load current token
            const currentToken = await this.tokenStore.getToken(this.currentState.user.id);

            if (!currentToken) {
                throw new AuthenticationError('No token found for user');
            }

            // Call OAuth provider's token refresh endpoint
            const newToken = await this.callTokenRefreshEndpoint(
                currentToken.refreshToken,
                currentToken.provider as OAuthProviderType
            );

            // Save new token
            await this.tokenStore.saveToken(newToken);

            // Reschedule next refresh
            this.startTokenRefresh(newToken.expiresAt);

            this.logger.info('Token refreshed successfully', {
                userId: this.currentState.user.id,
            });
        } catch (error) {
            this.logger.error('Token refresh failed', error as Error, {
                userId: this.currentState.user.id,
            });

            // On refresh failure, sign out user
            await this.signOut();

            throw new AuthenticationError('Token refresh failed', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * Get current authentication state
     */
    getAuthState(): AuthState {
        return { ...this.currentState };
    }

    /**
     * Subscribe to authentication state changes
     */
    onAuthStateChanged(callback: (state: AuthState) => void | Promise<void>): () => void {
        this.eventBus.on('AUTH_STATE_CHANGED', callback);

        // Return unsubscribe function
        return () => this.eventBus.off('AUTH_STATE_CHANGED', callback);
    }

    /**
     * Launch OAuth flow using chrome.identity API
     */
    private async launchOAuthFlow(config: OAuthConfig): Promise<string> {
        // Build OAuth URL
        const authUrl = new URL(config.authUrl);
        authUrl.searchParams.set('client_id', config.clientId);
        authUrl.searchParams.set('redirect_uri', config.redirectUrl);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', config.scopes.join(' '));

        try {
            // Launch interactive OAuth flow
            const redirectUrl = await chrome.identity.launchWebAuthFlow({
                url: authUrl.toString(),
                interactive: true,
            });

            if (!redirectUrl) {
                throw new OAuthRedirectError('No redirect URL returned from OAuth flow');
            }

            return redirectUrl;
        } catch (error) {
            throw new OAuthRedirectError('OAuth flow failed', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * Parse OAuth redirect URL to extract tokens
     */
    private parseOAuthRedirect(
        redirectUrl: string,
        provider: OAuthProviderType
    ): {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        userId: string;
    } {
        try {
            const url = new URL(redirectUrl);

            // For demonstration, we're assuming the redirect URL contains tokens
            // In production, you'd exchange the auth code for tokens via backend
            const code = url.searchParams.get('code');

            if (!code) {
                throw new Error('No authorization code in redirect URL');
            }

            // MOCK: In production, exchange code for tokens via OAuth provider's token endpoint
            return {
                accessToken: `access_${code}_${provider}`,
                refreshToken: `refresh_${code}_${provider}`,
                expiresIn: 3600, // 1 hour
                userId: `user_${code}`,
            };
        } catch (error) {
            throw new OAuthRedirectError('Failed to parse OAuth redirect', {
                provider,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * Fetch user information from OAuth provider
     */
    private async fetchUserInfo(
        accessToken: string,
        provider: OAuthProviderType
    ): Promise<User> {
        // MOCK: In production, call the provider's user info endpoint
        // For now, return mock user data
        return {
            id: `user_${accessToken.slice(0, 10)}`,
            email: `user@example.com`,
            displayName: `User from ${provider}`,
            photoUrl: undefined,
        };
    }

    /**
     * Call OAuth provider's token refresh endpoint
     */
    private async callTokenRefreshEndpoint(
        refreshToken: string,
        provider: OAuthProviderType
    ): Promise<AuthToken> {
        // MOCK: In production, call the provider's token refresh endpoint
        // For now, return mock refreshed token
        return {
            accessToken: `refreshed_access_${Date.now()}`,
            refreshToken: refreshToken, // Usually stays the same
            expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
            userId: this.currentState.user!.id,
            provider,
            scopes: OAUTH_CONFIGS[provider].scopes,
        };
    }

    /**
     * Start automatic token refresh timer
     * Refreshes 15 minutes before expiry
     */
    private startTokenRefresh(expiresAt: Date): void {
        // Stop existing timer
        this.stopTokenRefresh();

        // Calculate when to refresh (15min before expiry)
        const refreshTime = expiresAt.getTime() - 15 * 60 * 1000; // 15min before
        const delay = refreshTime - Date.now();

        // Only schedule if delay is positive
        if (delay > 0) {
            this.refreshTimer = setTimeout(() => {
                this.refreshToken().catch((error) => {
                    this.logger.error('Auto token refresh failed', error);
                });
            }, delay);

            this.logger.debug('Token refresh scheduled', {
                expiresAt: expiresAt.toISOString(),
                refreshIn: Math.floor(delay / 1000) + 's',
            });
        } else {
            // Token already expired or about to expire, refresh immediately
            this.refreshToken().catch((error) => {
                this.logger.error('Immediate token refresh failed', error);
            });
        }
    }

    /**
     * Stop automatic token refresh timer
     */
    private stopTokenRefresh(): void {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = undefined;
        }
    }

    /**
     * Update authentication state and emit event
     */
    private updateAuthState(newState: AuthState): void {
        this.currentState = newState;

        // Emit state change event
        this.eventBus.emit('AUTH_STATE_CHANGED', newState);

        this.logger.debug('Auth state updated', {
            isAuthenticated: newState.isAuthenticated,
            userId: newState.user?.id,
        });
    }

    /**
     * Restore authentication state from stored token
     * Called on initialization to maintain session across extension restarts
     */
    private async restoreAuthState(): Promise<void> {
        // This is a placeholder - in production, we'd need to:
        // 1. Get the last known user ID from somewhere (e.g., chrome.storage.local)
        // 2. Load their token
        // 3. Validate it's not expired
        // 4. Restore the auth state

        this.logger.debug('Auth state restoration skipped (no stored user ID)');
    }
}
