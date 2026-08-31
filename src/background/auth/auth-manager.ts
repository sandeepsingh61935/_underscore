/**
 * @file auth-manager.ts
 * @description OAuth authentication manager using Supabase GoTrue
 * @architecture Strategy Pattern (multiple OAuth providers)
 * @architecture Observer Pattern (auth state change notifications via EventBus)
 */

import type {
  SupabaseClient as SupabaseSDKClient,
  User as SupabaseUser,
  Session,
} from '@supabase/supabase-js';

import { AuthenticationError, RateLimitError, InvalidProviderError } from './auth-errors';
import type { IAuditLogger } from './interfaces/i-audit-logger';
import type {
  IAuthManager,
  AuthState,
  AuthResult,
  AuthError,
  User,
  OAuthProviderType,
} from './interfaces/i-auth-manager';
import { OAuthProvider } from './interfaces/i-auth-manager';

import {
  mapAuthError,
  isExistingAccountSignup,
  INTERNAL_RATE_LIMIT_CODE,
  EXISTING_ACCOUNT_CODE,
} from '@/shared/auth/auth-error-messages';
import { ORIGIN_SUPABASE } from '@/shared/permissions/ensure-origins';
import type { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';
import { RateLimiter } from '@/shared/utils/rate-limiter';

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
    verificationEmail: null,
  };

  private readonly VERIFICATION_STORAGE_KEY = 'auth_verification_state';
  private readonly VERIFICATION_ALARM_NAME = 'auth_verification_timeout';
  private readonly VERIFICATION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  private initializationPromise: Promise<void> | null = null;
  /** OAuth + email sign-in/sign-up attempts. */
  private authRateLimiter!: RateLimiter;
  /** verifyEmailOtp + verifyRecoveryOtp attempts — separate so a run of
   * mistyped codes can't also exhaust the resend bucket, and vice versa. */
  private otpVerifyRateLimiter!: RateLimiter;
  /** resendEmailOtp + requestPasswordReset attempts. */
  private otpResendRateLimiter!: RateLimiter;

  constructor(
    private readonly supabase: SupabaseSDKClient,
    private readonly eventBus: EventBus,
    private readonly logger: ILogger,
    private readonly auditLogger?: IAuditLogger
  ) {
    // Start initialization immediately
    this.initialize().catch((err) => {
      this.logger.error('Auth initialization failed', err);
    });
  }

  public async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      // Three independent buckets (5 attempts / 15 min each) so spamming
      // one action (e.g. resend) can't lock a user out of a different
      // action (e.g. verifying a code they already received).
      [this.authRateLimiter, this.otpVerifyRateLimiter, this.otpResendRateLimiter] =
        await Promise.all([
          RateLimiter.persistent(
            { maxAttempts: 5, windowMs: 15 * 60 * 1000, storageKey: 'rate_limit:auth' },
            { logger: this.logger }
          ),
          RateLimiter.persistent(
            {
              maxAttempts: 5,
              windowMs: 15 * 60 * 1000,
              storageKey: 'rate_limit:otp_verify',
            },
            { logger: this.logger }
          ),
          RateLimiter.persistent(
            {
              maxAttempts: 5,
              windowMs: 15 * 60 * 1000,
              storageKey: 'rate_limit:otp_resend',
            },
            { logger: this.logger }
          ),
        ]);

      // Setup Alarm Listener for Token Refresh
      chrome.alarms.onAlarm.addListener(this.handleAlarm.bind(this));

      // Supabase host is optional — only hydrate session if already granted
      // (request happens on explicit sign-in; no permission prompt at SW start).
      // In environments without the permissions API (tests), treat as granted.
      let canReachAccount = false;
      try {
        if (typeof chrome.permissions?.contains !== 'function') {
          canReachAccount = true;
        } else {
          canReachAccount = Boolean(
            await chrome.permissions.contains({ origins: [ORIGIN_SUPABASE] })
          );
        }
      } catch {
        canReachAccount = true;
      }

      if (!canReachAccount) {
        this.logger.debug('Account host not granted yet — guest until sign-in');
        await this.restoreVerificationState();
        return;
      }

      // Listen for Supabase auth state changes
      this.supabase.auth.onAuthStateChange((_event, session) => {
        this.handleSupabaseAuthStateChange(session);
      });

      // Initial check
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      if (session) {
        this.handleSupabaseAuthStateChange(session);
      } else {
        this.logger.debug('No active session found on init');
        await this.restoreVerificationState();
      }
    })();

    return this.initializationPromise;
  }

  /**
   * Handle Chrome Alarms
   */
  private async handleAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
    if (alarm.name === this.VERIFICATION_ALARM_NAME) {
      this.logger.debug('Verification timeout alarm triggered');
      await this.clearVerificationState();
    }
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
    await this.initialize();
    this.logger.info('Sign in attempt', { provider });

    if (!Object.values(OAuthProvider).includes(provider)) {
      throw new InvalidProviderError(provider);
    }

    if (!(await this.authRateLimiter.tryAcquire())) {
      return this.rateLimitResult(this.authRateLimiter);
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
          queryParams: {
            prompt: 'select_account',
          },
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

      const { user } = await this.completeOAuthRedirect(responseUrl);
      await this.logAuthSuccess(user.id, provider);
      return { success: true, user };
    } catch (error) {
      await this.logAuthFailure(provider);
      this.logger.error('Sign in failed', error as Error, { provider });

      if (error instanceof RateLimitError) throw error;

      const innerMsg = error instanceof Error ? error.message : String(error);
      const innerCode = (error as unknown as { code?: string })?.code;

      // User-facing message is mapped (never leaks the redirect URL /
      // provider debug info); full detail stays in the logger call above.
      throw new AuthenticationError(
        mapAuthError('oauth', { message: innerMsg, code: innerCode }),
        {
          provider,
          error: innerMsg,
          redirectUrl: redirectUrl || 'Not generated',
        }
      );
    }
  }

  /**
   * Sign in with Email and Password
   */
  async signInWithEmail(email: string, password: string): Promise<AuthResult> {
    await this.initialize();
    this.logger.info('Email sign in attempt', { email });

    if (!(await this.authRateLimiter.tryAcquire())) {
      return this.rateLimitResult(this.authRateLimiter);
    }

    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        this.logger.error('Email sign in failed due to Supabase error', error);
        return {
          success: false,
          error: { code: 'AUTH_ERROR', message: mapAuthError('sign-in', error) },
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: { code: 'AUTH_ERROR', message: mapAuthError('sign-in', null) },
        };
      }

      const user = this.mapSupabaseUser(data.user);
      await this.logAuthSuccess(user.id, 'email');
      return { success: true, user };
    } catch (error) {
      await this.logAuthFailure('email', email);
      this.logger.error('Email sign in threw exception', error as Error, { email });
      return {
        success: false,
        error: { code: 'EXCEPTION', message: mapAuthError('sign-in', null) },
      };
    }
  }

  /**
   * Sign up with Email and Password
   */
  async signUpWithEmail(email: string, password: string): Promise<AuthResult> {
    await this.initialize();
    this.logger.info('Email sign up attempt', { email });

    if (!(await this.authRateLimiter.tryAcquire())) {
      return this.rateLimitResult(this.authRateLimiter);
    }

    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        this.logger.error('Email sign up failed due to Supabase error', error);
        return {
          success: false,
          error: { code: 'AUTH_ERROR', message: mapAuthError('sign-up', error) },
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: { code: 'AUTH_ERROR', message: mapAuthError('sign-up', null) },
        };
      }

      // Supabase's anti-enumeration design: signing up with an
      // already-registered, already-confirmed email does not error —
      // it resolves with identities: [] and no session. Surface that
      // as a distinct, user-facing "already exists" case instead of
      // silently starting a verification flow that can never succeed.
      if (isExistingAccountSignup(data.user, data.session)) {
        this.logger.info('Sign up blocked: account already exists', { email });
        return {
          success: false,
          error: {
            code: EXISTING_ACCOUNT_CODE,
            message: mapAuthError('sign-up', { code: 'user_already_exists' }),
          },
        };
      }

      // Since it's a new sign up and likely requires email confirmation (no session immediately returned),
      // start the verification timer if there is no immediate session.
      const hasSession = !!data.session;
      if (!hasSession) {
        await this.startVerificationTimer(email);
      }

      // State will be updated by onAuthStateChange listener if there is a session,
      // or we just manually updated it with startVerificationTimer.
      return { success: true, user: this.mapSupabaseUser(data.user) };
    } catch (error) {
      this.logger.error('Email sign up threw exception', error as Error, { email });
      return {
        success: false,
        error: { code: 'EXCEPTION', message: mapAuthError('sign-up', null) },
      };
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    const userId = this.currentState.user?.id;
    this.logger.info('Sign out', { userId });
    await this.supabase.auth.signOut();
    if (userId) {
      await this.logAuthEvent('LOGOUT', userId);
    }
    // State update handled by listener
  }

  async setSession(accessToken: string, refreshToken: string): Promise<AuthResult> {
    await this.initialize();

    try {
      const { data, error } = await this.supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        return { success: false, error: { code: 'AUTH_ERROR', message: error.message } };
      }

      if (!data.user) {
        return {
          success: false,
          error: { code: 'AUTH_ERROR', message: 'No user returned from setSession' },
        };
      }

      const user = this.mapSupabaseUser(data.user);
      await this.logAuthSuccess(
        user.id,
        data.user.app_metadata?.provider ?? 'session_bridge'
      );
      return { success: true, user };
    } catch (error) {
      const innerMsg = error instanceof Error ? error.message : String(error);
      return { success: false, error: { code: 'EXCEPTION', message: innerMsg } };
    }
  }

  /**
   * Verify the 6-digit code emailed after signUpWithEmail.
   */
  async verifyEmailOtp(email: string, token: string): Promise<AuthResult> {
    await this.initialize();
    this.logger.info('Verify email OTP attempt', { email });

    if (!(await this.otpVerifyRateLimiter.tryAcquire())) {
      return this.rateLimitResult(this.otpVerifyRateLimiter);
    }

    try {
      const { data, error } = await this.supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) {
        this.logger.error('Email OTP verification failed', error);
        return {
          success: false,
          error: { code: 'AUTH_ERROR', message: mapAuthError('verify-email-otp', error) },
        };
      }
      if (!data.user) {
        return {
          success: false,
          error: { code: 'AUTH_ERROR', message: mapAuthError('verify-email-otp', null) },
        };
      }

      const user = this.mapSupabaseUser(data.user);
      await this.logAuthSuccess(user.id, 'email');
      // Session state (and verification-timer clearing) is applied by the
      // onAuthStateChange listener once Supabase sets the new session.
      return { success: true, user };
    } catch (error) {
      this.logger.error('Email OTP verification threw exception', error as Error, {
        email,
      });
      return {
        success: false,
        error: { code: 'EXCEPTION', message: mapAuthError('verify-email-otp', null) },
      };
    }
  }

  /**
   * Request a new signup confirmation code for a pending signup.
   */
  async resendEmailOtp(email: string): Promise<AuthResult> {
    await this.initialize();
    this.logger.info('Resend email OTP attempt', { email });

    if (!(await this.otpResendRateLimiter.tryAcquire())) {
      return this.rateLimitResult(this.otpResendRateLimiter);
    }

    try {
      const { error } = await this.supabase.auth.resend({ type: 'signup', email });
      if (error) {
        this.logger.error('Resend email OTP failed', error);
        return {
          success: false,
          error: { code: 'AUTH_ERROR', message: mapAuthError('resend-email-otp', error) },
        };
      }

      // Refresh the verification countdown to match the newly-sent code.
      await this.startVerificationTimer(email);
      return { success: true };
    } catch (error) {
      this.logger.error('Resend email OTP threw exception', error as Error, { email });
      return {
        success: false,
        error: { code: 'EXCEPTION', message: mapAuthError('resend-email-otp', null) },
      };
    }
  }

  /**
   * Request a password-reset code be emailed to the given address.
   */
  async requestPasswordReset(email: string): Promise<AuthResult> {
    await this.initialize();
    this.logger.info('Password reset requested', { email });

    if (!(await this.otpResendRateLimiter.tryAcquire())) {
      return this.rateLimitResult(this.otpResendRateLimiter);
    }

    try {
      // Supabase does not reveal whether the account exists; it always
      // resolves without error for valid email input. Do not log or
      // surface anything account-specific here.
      const { error } = await this.supabase.auth.resetPasswordForEmail(email);
      if (error) {
        this.logger.error('Password reset request failed', error);
        return {
          success: false,
          error: {
            code: 'AUTH_ERROR',
            message: mapAuthError('request-password-reset', error),
          },
        };
      }
      return { success: true };
    } catch (error) {
      this.logger.error('Password reset request threw exception', error as Error, {
        email,
      });
      return {
        success: false,
        error: {
          code: 'EXCEPTION',
          message: mapAuthError('request-password-reset', null),
        },
      };
    }
  }

  /**
   * Verify a password-reset code. Establishes a temporary recovery session
   * that must be finalized with updatePassword().
   */
  async verifyRecoveryOtp(email: string, token: string): Promise<AuthResult> {
    await this.initialize();
    this.logger.info('Verify recovery OTP attempt', { email });

    if (!(await this.otpVerifyRateLimiter.tryAcquire())) {
      return this.rateLimitResult(this.otpVerifyRateLimiter);
    }

    try {
      const { data, error } = await this.supabase.auth.verifyOtp({
        email,
        token,
        type: 'recovery',
      });

      if (error) {
        this.logger.error('Recovery OTP verification failed', error);
        return {
          success: false,
          error: {
            code: 'AUTH_ERROR',
            message: mapAuthError('verify-recovery-otp', error),
          },
        };
      }
      if (!data.user) {
        return {
          success: false,
          error: {
            code: 'AUTH_ERROR',
            message: mapAuthError('verify-recovery-otp', null),
          },
        };
      }

      const user = this.mapSupabaseUser(data.user);
      return { success: true, user };
    } catch (error) {
      this.logger.error('Recovery OTP verification threw exception', error as Error, {
        email,
      });
      return {
        success: false,
        error: { code: 'EXCEPTION', message: mapAuthError('verify-recovery-otp', null) },
      };
    }
  }

  /**
   * Set a new password for the currently active (recovery or normal) session.
   */
  async updatePassword(password: string): Promise<AuthResult> {
    await this.initialize();
    this.logger.info('Update password attempt');

    try {
      const { data, error } = await this.supabase.auth.updateUser({ password });
      if (error) {
        this.logger.error('Update password failed', error);
        return {
          success: false,
          error: { code: 'AUTH_ERROR', message: mapAuthError('update-password', error) },
        };
      }
      if (!data.user) {
        return {
          success: false,
          error: { code: 'AUTH_ERROR', message: mapAuthError('update-password', null) },
        };
      }

      const user = this.mapSupabaseUser(data.user);
      return { success: true, user };
    } catch (error) {
      this.logger.error('Update password threw exception', error as Error);
      return {
        success: false,
        error: { code: 'EXCEPTION', message: mapAuthError('update-password', null) },
      };
    }
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
      verificationExpiresAt: null,
      verificationEmail: null,
    };
    this.updateAuthState(newState);
  }

  // ==================== Private Helpers ====================

  /** Build a mapped, user-facing AuthResult for an exhausted rate-limit bucket. */
  private rateLimitResult(limiter: RateLimiter): AuthResult {
    const retryAfterMs = limiter.getRetryAfterMs();
    const error: AuthError = {
      code: INTERNAL_RATE_LIMIT_CODE,
      message: mapAuthError(
        'sign-in',
        { code: INTERNAL_RATE_LIMIT_CODE },
        { retryAfterMs }
      ),
      retryAfterMs,
    };
    return { success: false, error };
  }

  /**
   * Complete OAuth from the chrome.identity redirect URL.
   * Supabase v2 defaults to PKCE (?code=) for extension flows; legacy implicit uses hash tokens.
   */
  private async completeOAuthRedirect(responseUrl: string): Promise<{ user: User }> {
    const url = new URL(responseUrl);

    const queryError =
      url.searchParams.get('error_description') || url.searchParams.get('error');
    if (queryError) {
      throw new Error(queryError);
    }

    const authCode = url.searchParams.get('code');
    if (authCode) {
      this.logger.info('Completing OAuth via PKCE code exchange');
      const { data, error } = await this.supabase.auth.exchangeCodeForSession(authCode);
      if (error) {
        throw error;
      }
      if (!data.user) {
        throw new Error('No user returned after PKCE code exchange');
      }
      return { user: this.mapSupabaseUser(data.user) };
    }

    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
    const hashError = hashParams.get('error_description') || hashParams.get('error');
    if (hashError) {
      throw new Error(hashError);
    }

    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    if (!accessToken || !refreshToken) {
      this.logger.error(
        'OAuth redirect missing code and tokens',
        new Error('Invalid OAuth redirect'),
        {
          hasCode: false,
          hasHash: url.hash.length > 0,
          pathname: url.pathname,
        }
      );
      throw new Error('Missing authentication tokens in OAuth redirect');
    }

    const { data: sessionData, error: sessionError } =
      await this.supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

    if (sessionError) {
      throw sessionError;
    }
    if (!sessionData.user) {
      throw new Error('No user returned after setting session');
    }

    return { user: this.mapSupabaseUser(sessionData.user) };
  }

  private async startVerificationTimer(email: string): Promise<void> {
    const expiresAt = Date.now() + this.VERIFICATION_TIMEOUT_MS;

    await browser.storage.local.set({
      [this.VERIFICATION_STORAGE_KEY]: { expiresAt, email },
    });

    chrome.alarms.create(this.VERIFICATION_ALARM_NAME, {
      when: expiresAt,
    });

    const newState = {
      ...this.currentState,
      verificationStatus: 'awaiting' as const,
      verificationExpiresAt: expiresAt,
      verificationEmail: email,
    };

    this.updateAuthState(newState);
    this.logger.debug('Started verification timer', { expiresAt });
  }

  private async restoreVerificationState(): Promise<void> {
    try {
      const data = await browser.storage.local.get(this.VERIFICATION_STORAGE_KEY);
      const state = data[this.VERIFICATION_STORAGE_KEY] as
        { expiresAt?: number; email?: string } | undefined;

      if (state && state.expiresAt) {
        const now = Date.now();
        if (state.expiresAt > now) {
          // Still valid
          this.logger.debug('Restored verification state, still waiting', {
            expiresAt: state.expiresAt,
          });
          const newState = {
            ...this.currentState,
            verificationStatus: 'awaiting' as const,
            verificationExpiresAt: state.expiresAt,
            verificationEmail: state.email ?? null,
          };
          this.updateAuthState(newState);

          // Ensure alarm is set
          chrome.alarms.create(this.VERIFICATION_ALARM_NAME, {
            when: state.expiresAt,
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
      provider: (session?.user?.app_metadata?.provider as OAuthProviderType) || null,
      lastAuthTime: session ? new Date() : null,
      verificationStatus: 'idle',
      verificationExpiresAt: null,
      verificationEmail: null,
    };

    // If we just got authenticated, clear any pending verification state
    if (session) {
      browser.storage.local.remove(this.VERIFICATION_STORAGE_KEY).catch((err) => {
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

  private async logAuthSuccess(userId: string, provider: string): Promise<void> {
    await this.logAuthEvent('LOGIN', userId, provider);
  }

  private async logAuthFailure(provider: string, userId = 'unknown'): Promise<void> {
    await this.logAuthEvent('LOGIN_FAILED', userId, provider);
  }

  private async logAuthEvent(
    action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED',
    userId: string,
    provider?: string
  ): Promise<void> {
    if (!this.auditLogger) {
      return;
    }

    try {
      await this.auditLogger.logAuthEvent({ action, userId, provider });
    } catch (error) {
      this.logger.error('Failed to write auth audit event', error as Error, {
        action,
        userId,
      });
    }
  }
}
