/**
 * @file i-auth-manager.ts
 * @description OAuth authentication manager interface
 * @architecture Interface Segregation Principle (ISP)
 */

/**
 * OAuth provider enumeration
 */
export const OAuthProvider = {
  GOOGLE: 'google',
  APPLE: 'apple',
  FACEBOOK: 'facebook',
  TWITTER: 'twitter',
} as const;

export type OAuthProviderType = (typeof OAuthProvider)[keyof typeof OAuthProvider];

/**
 * Authentication state
 */
export interface AuthState {
  readonly isAuthenticated: boolean;
  readonly user: User | null;
  readonly provider: OAuthProviderType | null;
  readonly lastAuthTime: Date | null;
  readonly verificationStatus?: 'idle' | 'awaiting' | 'failed';
  readonly verificationExpiresAt?: number | null;
  /** Email awaiting confirmation, persisted so it survives popup close/reopen. */
  readonly verificationEmail?: string | null;
}

/**
 * User information
 */
export interface User {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly photoUrl?: string;
  readonly provider?: string;
}

/**
 * Authentication result
 */
export interface AuthResult {
  readonly success: boolean;
  readonly user?: User;
  readonly error?: AuthError;
}

/**
 * Authentication error
 */
export interface AuthError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  /** Milliseconds until the caller may retry, when the error is a rate limit. */
  readonly retryAfterMs?: number;
}

/**
 * Authentication state change callback
 */
export type AuthStateCallback = (state: AuthState) => void | Promise<void>;

/**
 * Unsubscribe function
 */
export type UnsubscribeFn = () => void;

/**
 * OAuth authentication manager interface
 *
 * @responsibility Manages authentication state, OAuth flows, token refresh
 * @pattern Dependency Inversion Principle (DIP)
 * @pattern Observer Pattern (state change notifications)
 */
export interface IAuthManager {
  /**
   * Current authentication state
   */
  readonly isAuthenticated: boolean;

  /**
   * Current authenticated user (null if not authenticated)
   */
  readonly currentUser: User | null;

  /**
   * Sign in with OAuth provider
   *
   * @param provider - OAuth provider to use
   * @returns Authentication result
   * @throws RateLimitError if too many attempts (5 per 15min)
   * @throws AuthenticationError if OAuth flow fails
   */
  signIn(provider: OAuthProviderType): Promise<AuthResult>;

  /**
   * Sign in with Email and Password
   *
   * @param email - User email address
   * @param password - User password
   * @returns Authentication result
   * @throws AuthenticationError on failure
   */
  signInWithEmail(email: string, password: string): Promise<AuthResult>;

  /**
   * Sign up with Email and Password
   *
   * @param email - User email address
   * @param password - User password
   * @returns Authentication result
   * @throws AuthenticationError on failure
   */
  signUpWithEmail(email: string, password: string): Promise<AuthResult>;

  /**
   * Sign out current user
   *
   * @returns Promise that resolves when sign out complete
   */
  signOut(): Promise<void>;

  /**
   * Refresh authentication token
   *
   * @returns Promise that resolves when token refreshed
   * @throws AuthenticationError if refresh fails
   */
  refreshToken(): Promise<void>;

  /**
   * Initialize authentication state (e.g. load from storage)
   */
  initialize(): Promise<void>;

  /**
   * Get current authentication state
   *
   * @returns Current auth state snapshot
   */
  getAuthState(): AuthState;

  /**
   * Subscribe to authentication state changes
   *
   * @param callback - Function to call on state change
   * @returns Unsubscribe function
   */
  onAuthStateChanged(callback: AuthStateCallback): UnsubscribeFn;

  /**
   * Clear the email verification state (e.g., when the UI timer expires)
   */
  clearVerificationState(): Promise<void>;

  /**
   * Apply an existing Supabase session (web → extension bridge).
   */
  setSession(accessToken: string, refreshToken: string): Promise<AuthResult>;

  /**
   * Verify the 6-digit code emailed after signUpWithEmail. On success this
   * establishes a session (handled by the onAuthStateChange listener).
   */
  verifyEmailOtp(email: string, token: string): Promise<AuthResult>;

  /**
   * Request a new signup confirmation code for a pending (unverified) signup.
   */
  resendEmailOtp(email: string): Promise<AuthResult>;

  /**
   * Request a password-reset code be emailed to the given address.
   * Always resolves successfully from Supabase's perspective regardless of
   * whether an account exists, to avoid user-enumeration.
   */
  requestPasswordReset(email: string): Promise<AuthResult>;

  /**
   * Verify a password-reset code. On success this establishes a temporary
   * recovery session that must be finalized with updatePassword().
   */
  verifyRecoveryOtp(email: string, token: string): Promise<AuthResult>;

  /**
   * Set a new password for the currently active (recovery or normal) session.
   */
  updatePassword(password: string): Promise<AuthResult>;
}
