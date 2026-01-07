/**
 * @file auth-manager.ts
 * @description OAuth authentication manager using Supabase GoTrue
 * @architecture Strategy Pattern (multiple OAuth providers)
 * @architecture Observer Pattern (auth state change notifications via EventBus)
 */

import { SupabaseClient as SupabaseSDKClient, User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { IAuthManager, AuthState, AuthResult, User, OAuthProviderType } from './interfaces/i-auth-manager';
import type { ITokenStore } from './interfaces/i-token-store';
import type { ILogger } from '@/background/utils/logger';
import { EventBus } from '@/background/utils/event-bus';
import { RateLimiter } from '@/background/utils/rate-limiter';
import { OAuthProvider } from './interfaces/i-auth-manager';
import {
    AuthenticationError,
    RateLimitError,
    InvalidProviderError,
    OAuthRedirectError,
} from './auth-errors';

/**
 * Authentication manager implementation using Supabase Auth
 */
export class AuthManager implements IAuthManager {
    private currentState: AuthState = {
        isAuthenticated: false,
        user: null,
        provider: null,
        lastAuthTime: null,
    };

    private initializationPromise: Promise<void> | null = null;
    private rateLimiter: RateLimiter;

    constructor(
        private readonly supabase: SupabaseSDKClient,
        // @deprecated TokenStore is replaced by SupabaseStorageAdapter but kept for interface compatibility if needed
        private readonly _tokenStore: ITokenStore,
        private readonly eventBus: EventBus,
        private readonly logger: ILogger
    ) {
        // Initialize rate limiter: 5 attempts per 15 minutes
        this.rateLimiter = new RateLimiter(
            {
                maxAttempts: 5,
                windowMs: 15 * 60 * 1000,
            },
            logger
        );

        // Start initialization immediately
        this.initialize().catch(err => {
            this.logger.error('Auth initialization failed', err);
        });
    }

    public async initialize(): Promise<void> {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = (async () => {
            // Setup Alarm Listener for Token Refresh
            chrome.alarms.onAlarm.addListener(this.handleAlarm.bind(this));

            // Listen for Supabase auth state changes
            this.supabase.auth.onAuthStateChange((_event, session) => {
                this.handleSupabaseAuthStateChange(session);
                this.scheduleRefresh(session);
            });

            // Initial check
            const { data: { session } } = await this.supabase.auth.getSession();
            if (session) {
                this.handleSupabaseAuthStateChange(session);
                this.scheduleRefresh(session);
            } else {
                this.logger.debug('No active session found on init');
            }
        })();

        return this.initializationPromise;
    }

    /**
     * Handle Chrome Alarms
     */
    private async handleAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
        if (alarm.name === 'auth_refresh_token') {
            this.logger.debug('Refresh token alarm triggered');
            try {
                await this.refreshToken();
            } catch (error) {
                this.logger.error('Scheduled token refresh failed', error as Error);
            }
        }
    }

    /**
     * Schedule token refresh alarm
     * Uses chrome.alarms to wake up service worker
     */
    private scheduleRefresh(session: Session | null): void {
        const ALARM_NAME = 'auth_refresh_token';

        if (!session?.expires_at) {
            chrome.alarms.clear(ALARM_NAME);
            return;
        }

        // Supabase provides expires_at in seconds, Date.now() is ms
        const expiresAtMs = session.expires_at * 1000;
        const now = Date.now();

        // Refresh 5 minutes before expiration to be safe
        const refreshTime = expiresAtMs - (5 * 60 * 1000);

        // If already expired or close to expiring (within 1 min), refresh immediately
        if (refreshTime <= now) {
            this.logger.debug('Token executing immediate refresh');
            this.refreshToken().catch(err => this.logger.error('Immediate refresh failed', err));
            return;
        }

        // Schedule alarm
        this.logger.debug('Scheduling refresh alarm', {
            refreshTime: new Date(refreshTime).toISOString()
        });

        chrome.alarms.create(ALARM_NAME, {
            when: refreshTime
        });
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

        if (!Object.values(OAuthProvider).includes(provider)) {
            throw new InvalidProviderError(provider);
        }

        if (!this.rateLimiter.tryAcquire()) {
            const error = new RateLimitError('Too many login attempts');
            return { success: false, error: { code: 'RATE_LIMIT', message: error.message } };
        }

        let redirectUrl: string | undefined;
        let authUrl: string | undefined;

        try {
            redirectUrl = chrome.identity.getRedirectURL();

            // 1. Get the OAuth URL from Supabase
            this.logger.debug('Generated redirect URL', { redirectUrl });

            const { data, error } = await this.supabase.auth.signInWithOAuth({
                provider: provider as any,
                options: {
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: true,
                },
            });

            if (error) throw error;
            if (!data.url) throw new Error('No OAuth URL returned');

            authUrl = data.url;
            this.logger.info('Launching Web Auth Flow', { url: authUrl });

            // 2. Launch browser flow
            const browserResponseUrl = await chrome.identity.launchWebAuthFlow({
                url: authUrl,
                interactive: true,
            });

            if (!browserResponseUrl) {
                throw new OAuthRedirectError('No URL returned from identity provider');
            }

            // 3. Parse session from URL
            if (browserResponseUrl.includes('#error=')) {
                throw new Error('Identity provider returned an error');
            }

            // Extract access_token/refresh_token from hash
            const session = await this.extractSessionFromUrl(browserResponseUrl);

            // 4. Set session in Supabase (persists automatically via adapter)
            const { error: sessionError } = await this.supabase.auth.setSession(session);
            if (sessionError) throw sessionError;

            // State will be updated by onAuthStateChange listener
            return { success: true, user: this.currentState.user! };

        } catch (error) {
            this.logger.error('Sign in failed', error as Error, { provider });

            if (error instanceof RateLimitError) throw error;

            const innerMsg = error instanceof Error ? error.message : String(error);
            const debugInfo = `\nURL: ${authUrl || 'Not generated'}\nRedirect: ${redirectUrl || 'Not generated'}`;

            throw new AuthenticationError(`OAuth failed: ${innerMsg}${debugInfo}`, {
                provider,
                error: innerMsg,
            });
        }
    }

    /**
     * Sign out current user
     */
    async signOut(): Promise<void> {
        this.logger.info('Sign out', { userId: this.currentState.user?.id });
        await this.supabase.auth.signOut();
        // State update handled by listener
    }

    /**
     * Refresh authentication token
     * Handled automatically by Supabase client, but exposed for manual trigger
     */
    async refreshToken(): Promise<void> {
        const { error } = await this.supabase.auth.refreshSession();
        if (error) throw error;
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
        return () => this.eventBus.off('AUTH_STATE_CHANGED', callback);
    }

    // ==================== Private Helpers ====================

    private handleSupabaseAuthStateChange(session: Session | null): void {
        const newState: AuthState = {
            isAuthenticated: !!session,
            user: session ? this.mapSupabaseUser(session.user) : null,
            provider: session?.user?.app_metadata?.provider as OAuthProviderType || null,
            lastAuthTime: session ? new Date() : null
        };

        // Only emit if state changed or initially setting it
        this.updateAuthState(newState);
    }

    private updateAuthState(newState: AuthState): void {
        this.currentState = newState;
        this.eventBus.emit('AUTH_STATE_CHANGED', newState);

        this.logger.debug('Auth state updated', {
            isAuthenticated: newState.isAuthenticated,
            userId: newState.user?.id,
        });
    }

    private mapSupabaseUser(sbUser: SupabaseUser): User {
        return {
            id: sbUser.id,
            email: sbUser.email || '',
            displayName: sbUser.user_metadata?.['full_name'] || sbUser.email || 'User',
            photoUrl: sbUser.user_metadata?.['avatar_url'],
        };
    }

    private async extractSessionFromUrl(url: string): Promise<{ access_token: string; refresh_token: string }> {
        // URL format: https://<id>.chromiumapp.org/callback#access_token=...&refresh_token=...&...
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.hash.substring(1)); // Remove leading #

        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (!accessToken || !refreshToken) {
            throw new Error('Tokens not found in redirect URL');
        }

        return { access_token: accessToken, refresh_token: refreshToken };
    }
}

