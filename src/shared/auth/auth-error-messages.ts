/**
 * @file auth-error-messages.ts
 * @description Central mapping from Supabase Auth (GoTrue) errors — and our
 * own internal auth codes — to stable, user-facing copy.
 *
 * Both surfaces (web SPA via web-auth-actions.ts, extension via
 * auth-manager.ts) route every auth failure through mapAuthError() before it
 * reaches a view. Views never render `error.message` from Supabase directly.
 *
 * Reference: Supabase Auth error codes
 * https://supabase.com/docs/guides/auth/debugging/error-codes
 */

/** Contexts in which an auth error can occur; each has a sensible fallback. */
export type AuthErrorContext =
    | 'oauth'
    | 'sign-in'
    | 'sign-up'
    | 'verify-email-otp'
    | 'resend-email-otp'
    | 'request-password-reset'
    | 'verify-recovery-otp'
    | 'update-password';

export interface MappableAuthError {
    code?: string | null;
    message?: string | null;
}

export interface MapAuthErrorOptions {
    /** Milliseconds until the caller may retry, when known (rate limits). */
    retryAfterMs?: number;
}

/** Internal code used by AuthManager's own RateLimiter (not a Supabase code). */
export const INTERNAL_RATE_LIMIT_CODE = 'RATE_LIMIT';

/** Internal code for the "signUp resolved but account already exists" case. */
export const EXISTING_ACCOUNT_CODE = 'EXISTING_ACCOUNT';

const RATE_LIMIT_CODES = new Set([
    INTERNAL_RATE_LIMIT_CODE,
    'over_email_send_rate_limit',
    'over_request_rate_limit',
    'over_sms_send_rate_limit',
]);

/** True if the given auth result code represents a rate limit (any bucket, either surface). */
export function isRateLimitCode(code?: string | null): boolean {
    return !!code && RATE_LIMIT_CODES.has(code);
}

/**
 * Some Supabase deployments (notably local `supabase start`, which trails
 * hosted GoTrue releases) return AuthApiErrors without a populated `.code`.
 * Fall back to matching the well-known message text so the mapping still
 * works everywhere.
 */
const MESSAGE_FALLBACK_PATTERNS: Array<{ test: RegExp; code: string }> = [
    { test: /token has expired or is invalid/i, code: 'otp_expired' },
    { test: /invalid login credentials/i, code: 'invalid_credentials' },
    { test: /user already registered/i, code: 'user_already_exists' },
    { test: /password should be at least/i, code: 'weak_password' },
    { test: /email rate limit exceeded/i, code: 'over_email_send_rate_limit' },
    { test: /email not confirmed/i, code: 'email_not_confirmed' },
    { test: /new password should be different/i, code: 'same_password' },
];

function resolveCode(error: MappableAuthError): string | undefined {
    if (error.code) return error.code;
    const message = error.message ?? '';
    for (const { test, code } of MESSAGE_FALLBACK_PATTERNS) {
        if (test.test(message)) return code;
    }
    return undefined;
}

function formatRetryAfter(ms: number): string {
    const totalSeconds = Math.max(1, Math.ceil(ms / 1000));
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function rateLimitMessage(retryAfterMs?: number): string {
    return retryAfterMs
        ? `Too many attempts. Try again in ${formatRetryAfter(retryAfterMs)}.`
        : 'Too many attempts. Please wait a moment and try again.';
}

const DEFAULT_MESSAGES: Record<AuthErrorContext, string> = {
    oauth: 'Google sign-in failed. Please try again.',
    'sign-in': 'Email or password is incorrect.',
    'sign-up': 'Something went wrong creating your account. Please try again.',
    'verify-email-otp': 'That code is incorrect or has expired. Try again or resend a new code.',
    'resend-email-otp': 'Failed to resend code. Please try again.',
    'request-password-reset': 'Unable to send a reset code right now. Please try again.',
    'verify-recovery-otp': 'That code is incorrect or has expired. Try again or resend a new code.',
    'update-password': 'Failed to update password. Please try again.',
};

/**
 * Map a Supabase/internal auth error to stable, user-facing copy.
 *
 * `sign-in` deliberately ignores the underlying code (besides rate limits)
 * and always returns the same "Email or password is incorrect" message —
 * this project does not distinguish "no such account" from "wrong password"
 * to avoid leaking account existence (anti-enumeration).
 */
export function mapAuthError(
    context: AuthErrorContext,
    error: MappableAuthError | string | null | undefined,
    options: MapAuthErrorOptions = {}
): string {
    if (!error) return DEFAULT_MESSAGES[context];

    const normalized: MappableAuthError = typeof error === 'string' ? { message: error } : error;
    const code = resolveCode(normalized);

    if (isRateLimitCode(code)) {
        return rateLimitMessage(options.retryAfterMs);
    }

    if (context === 'sign-in') {
        // Anti-enumeration: never distinguish invalid_credentials / user_not_found /
        // email_not_confirmed on sign-in. See decision log in auth hardening plan.
        return DEFAULT_MESSAGES['sign-in'];
    }

    switch (code) {
        case 'user_already_exists':
        case 'email_exists':
        case 'identity_already_exists':
            return 'An account with this email already exists. Sign in instead.';
        case 'weak_password':
            return 'Password must be at least 8 characters.';
        case 'otp_expired':
            return DEFAULT_MESSAGES[context] ?? 'That code is incorrect or has expired. Try again or resend a new code.';
        case 'email_not_confirmed':
            return 'Confirm your email before signing in. Check your inbox for the code.';
        case 'same_password':
            return 'New password must be different from your current password.';
        case 'email_address_invalid':
            return 'Enter a valid email address.';
        case 'signup_disabled':
        case 'email_provider_disabled':
            return 'Sign up is temporarily unavailable. Please try again later.';
        case 'permission_denied':
        case 'permissions_denied':
            return 'Permission to access the account service was denied. Please grant access and try again.';
        default:
            // Fallback: permission keyword in message (ensureSupabaseOrigin throw)
            if (/permission/i.test(normalized.message ?? '')) {
                return 'Permission to access the account service was denied. Please grant access and try again.';
            }
            return DEFAULT_MESSAGES[context];
    }
}

interface ExistingAccountUser {
    identities?: unknown[] | null;
}

/**
 * Detect Supabase's "sign up with an already-registered, already-confirmed
 * email" case. Per Supabase's anti-enumeration design, `auth.signUp()` does
 * NOT return an error for this case — it resolves with a user object whose
 * `identities` array is empty and no session.
 *
 * https://supabase.com/docs/reference/javascript/auth-signup
 */
export function isExistingAccountSignup(
    user: ExistingAccountUser | null | undefined,
    session: unknown
): boolean {
    return !session && Array.isArray(user?.identities) && user.identities.length === 0;
}
