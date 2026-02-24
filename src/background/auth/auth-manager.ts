/**
 * @file auth-manager.ts
 * @description OAuth authentication manager using Supabase GoTrue
 * @architecture Strategy Pattern (multiple OAuth providers)
 * @architecture Observer Pattern (auth state change notifications via EventBus)
 */

import { SupabaseClient as SupabaseSDKClient, User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { IAuthManager, AuthState, AuthResult, User, OAuthProviderType } from './interfaces/i-auth-manager';
import type { ILogger } from '@/background/utils/logger';
import { EventBus } from '@/background/utils/event-bus';
import { RateLimiter } from '@/background/utils/rate-limiter';
import { OAuthProvider } from './interfaces/i-auth-manager';
import {
    AuthenticationError,
    RateLimitError,
    InvalidProviderError,
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
        verificationStatus: 'idle',
        verificationExpiresAt: null,
    };

    private readonly VERIFICATION_STORAGE_KEY = 'auth_verification_state';
    private readonly VERIFICATION_ALARM_NAME = 'auth_verification_timeout';
    private readonly VERIFICATION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

    private initializationPromise: Promise<void> | null = null;
    private rateLimiter: RateLimiter;

    constructor(
        private readonly supabase: SupabaseSDKClient,
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
                // Check if we are awaiting verification
                await this.restoreVerificationState();
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
        } else if (alarm.name === this.VERIFICATION_ALARM_NAME) {
            this.logger.debug('Verification timeout alarm triggered');
            await this.clearVerificationState();
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

    private activeAuthPromise: Promise<AuthResult> | null = null;

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

        // Return existing auth flow if one is in progress
        if (this.activeAuthPromise) {
            this.logger.info('Auth flow already in progress, returning existing promise');
            return this.activeAuthPromise;
        }

        this.activeAuthPromise = this._executeSignIn(provider).finally(() => {
            this.activeAuthPromise = null;
        });

        return this.activeAuthPromise;
    }

    private async _executeSignIn(provider: OAuthProviderType): Promise<AuthResult> {
        let redirectUrl: string | undefined;

        try {
            redirectUrl = chrome.identity.getRedirectURL();

            if (provider !== 'google') {
                throw new Error(`Native OAuth flow not implemented for provider: ${provider}`);
            }

            this.logger.info('Initiating Supabase OAuth flow', { provider, redirectUrl });

            // 1. Get the OAuth URL from Supabase (skip browser redirect)
            const { data, error: oauthError } = await this.supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: true,
                },
            });

            if (oauthError) throw oauthError;
            if (!data?.url) throw new Error('No OAuth URL returned from Supabase');

            this.logger.info('Launching Chrome Web Auth Flow');

            // 2. Launch the interactive browser flow
            const responseUrl = await chrome.identity.launchWebAuthFlow({
                url: data.url,
                interactive: true,
            });

            if (!responseUrl) {
                throw new Error('No redirect URL returned from Chrome Web Auth Flow');
            }

            // 3. Parse the hash parameters from the redirect URL
            // Supabase returns access_token and refresh_token in the URL hash
            const url = new URL(responseUrl);
            const hashParams = new URLSearchParams(url.hash.substring(1)); // Remove the leading '#'

            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');

            if (!accessToken || !refreshToken) {
                const errorParams = hashParams.get('error_description') || hashParams.get('error') || 'Unknown error';
                throw new Error(`Missing authentication tokens: ${errorParams}`);
            }

            // 4. Set the session in Supabase
            const { data: sessionData, error: sessionError } = await this.supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
            });

            if (sessionError) throw sessionError;
            if (!sessionData.user) throw new Error('No user returned after setting session');

            // State will be updated by onAuthStateChange listener
            return { success: true, user: this.mapSupabaseUser(sessionData.user) };

        } catch (error) {
            this.logger.error('Sign in failed', error as Error, { provider });

            if (error instanceof RateLimitError) throw error;

            const innerMsg = error instanceof Error ? error.message : String(error);
            const debugInfo = `\nRedirect: ${redirectUrl || 'Not generated'}`;

            throw new AuthenticationError(`OAuth failed: ${innerMsg}${debugInfo}`, {
                provider,
                error: innerMsg,
            });
        }
    }

    /**
     * Sign in with Email and Password
     */
    async signInWithEmail(email: string, password: string): Promise<AuthResult> {
        this.logger.info('Email sign in attempt', { email });

        if (!this.rateLimiter.tryAcquire()) {
            const error = new RateLimitError('Too many login attempts');
            return { success: false, error: { code: 'RATE_LIMIT', message: error.message } };
        }

        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                this.logger.error('Email sign in failed due to Supabase error', error);
                return { success: false, error: { code: 'AUTH_ERROR', message: error.message } };
            }

            if (!data.user) {
                return { success: false, error: { code: 'AUTH_ERROR', message: 'No user returned from sign in' } };
            }

            // State will be updated by onAuthStateChange listener
            return { success: true, user: this.mapSupabaseUser(data.user) };

        } catch (error) {
            this.logger.error('Email sign in threw exception', error as Error, { email });
            const innerMsg = error instanceof Error ? error.message : String(error);
            return { success: false, error: { code: 'EXCEPTION', message: innerMsg } };
        }
    }

    /**
     * Sign up with Email and Password
     */
    async signUpWithEmail(email: string, password: string): Promise<AuthResult> {
        this.logger.info('Email sign up attempt', { email });

        if (!this.rateLimiter.tryAcquire()) {
            const error = new RateLimitError('Too many sign up attempts');
            return { success: false, error: { code: 'RATE_LIMIT', message: error.message } };
        }

        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
            });

            if (error) {
                this.logger.error('Email sign up failed due to Supabase error', error);
                return { success: false, error: { code: 'AUTH_ERROR', message: error.message } };
            }

            if (!data.user) {
                return { success: false, error: { code: 'AUTH_ERROR', message: 'No user returned from sign up' } };
            }

            // Since it's a new sign up and likely requires email confirmation (no session immediately returned),
            // start the verification timer if there is no immediate session.
            const hasSession = !!data.session;
            if (!hasSession) {
                await this.startVerificationTimer();
            }

            // State will be updated by onAuthStateChange listener if there is a session,
            // or we just manually updated it with startVerificationTimer.
            return { success: true, user: this.mapSupabaseUser(data.user) };

        } catch (error) {
            this.logger.error('Email sign up threw exception', error as Error, { email });
            const innerMsg = error instanceof Error ? error.message : String(error);
            return { success: false, error: { code: 'EXCEPTION', message: innerMsg } };
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

    /**
     * Clear the email verification state (e.g., when the UI timer expires)
     */
    async clearVerificationState(): Promise<void> {
        this.logger.debug('Clearing verification state');
        await browser.storage.local.remove(this.VERIFICATION_STORAGE_KEY);
        chrome.alarms.clear(this.VERIFICATION_ALARM_NAME);

        const newState = {
            ...this.currentState,
            verificationStatus: 'failed' as const,
            verificationExpiresAt: null
        };
        this.updateAuthState(newState);
    }

    // ==================== Private Helpers ====================

    private async startVerificationTimer(): Promise<void> {
        const expiresAt = Date.now() + this.VERIFICATION_TIMEOUT_MS;

        await browser.storage.local.set({
            [this.VERIFICATION_STORAGE_KEY]: { expiresAt }
        });

        chrome.alarms.create(this.VERIFICATION_ALARM_NAME, {
            when: expiresAt
        });

        const newState = {
            ...this.currentState,
            verificationStatus: 'awaiting' as const,
            verificationExpiresAt: expiresAt
        };

        this.updateAuthState(newState);
        this.logger.debug('Started verification timer', { expiresAt });
    }

    private async restoreVerificationState(): Promise<void> {
        try {
            const data = await browser.storage.local.get(this.VERIFICATION_STORAGE_KEY);
            const state = data[this.VERIFICATION_STORAGE_KEY] as { expiresAt?: number } | undefined;

            if (state && state.expiresAt) {
                const now = Date.now();
                if (state.expiresAt > now) {
                    // Still valid
                    this.logger.debug('Restored verification state, still waiting', { expiresAt: state.expiresAt });
                    const newState = {
                        ...this.currentState,
                        verificationStatus: 'awaiting' as const,
                        verificationExpiresAt: state.expiresAt
                    };
                    this.updateAuthState(newState);

                    // Ensure alarm is set
                    chrome.alarms.create(this.VERIFICATION_ALARM_NAME, {
                        when: state.expiresAt
                    });
                } else {
                    // Expired while background was asleep
                    this.logger.debug('Restored verification state, already expired');
                    await this.clearVerificationState();
                }
            }
        } catch (error) {
            this.logger.error('Failed to restore verification state', error as Error);
        }
    }

    private handleSupabaseAuthStateChange(session: Session | null): void {
        const newState: AuthState = {
            isAuthenticated: !!session,
            user: session ? this.mapSupabaseUser(session.user) : null,
            provider: session?.user?.app_metadata?.provider as OAuthProviderType || null,
            lastAuthTime: session ? new Date() : null,
            verificationStatus: 'idle',
            verificationExpiresAt: null
        };

        // If we just got authenticated, clear any pending verification state
        if (session) {
            browser.storage.local.remove(this.VERIFICATION_STORAGE_KEY).catch(err => {
                this.logger.error('Failed to remove verification storage', err as Error);
            });
            chrome.alarms.clear(this.VERIFICATION_ALARM_NAME);
        }

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
}

