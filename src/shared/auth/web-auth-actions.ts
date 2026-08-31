import type { Session } from '@supabase/supabase-js';
import { z } from 'zod';

import { mapAuthError, isRateLimitCode } from './auth-error-messages';
import { getWebSupabaseClient } from './supabase-web-client';

export interface WebAuthActionResult {
  success: boolean;
  error?: string;
  /** Supabase (or internal) error code, so callers can branch (e.g. rate limits). */
  code?: string;
  /** Web has no persisted rate limiter, so this is always undefined here;
   * kept for type parity with the extension's AuthActionResult. */
  retryAfterMs?: number;
  session?: Session | null;
}

const EmailSchema = z.string().email();
const OtpSchema = z.string().regex(/^\d{6}$/, 'Code must be 6 digits');
const PasswordSchema = z.string().min(8, 'Password must be at least 8 characters.');

function invalidInput(message: string): WebAuthActionResult {
  return { success: false, error: message };
}

/**
 * Thin wrappers over the web Supabase client for OTP confirmation /
 * forgot-password / reset-password. Mirrors AuthManager's extension-side
 * methods (src/background/auth/auth-manager.ts) so both surfaces share the
 * same Supabase call shapes, validation rules, and error handling.
 *
 * Every Supabase error is routed through mapAuthError() — never render
 * `error.message` directly in a view.
 *
 * Email delivery setup:
 * - Local (`supabase start`): confirmation/recovery emails are captured by
 *   Inbucket (http://127.0.0.1:54324), not delivered to a real inbox. This
 *   is expected — check Inbucket, not Gmail, for the 6-digit code.
 * - Hosted (production): the Supabase Dashboard project must have
 *   Auth -> Email -> "Enable email confirmations" turned on and SMTP
 *   configured (or rely on Supabase's built-in mailer, which has send
 *   limits). See supabase/config.toml for the otp_length/otp_expiry/rate
 *   limit settings that must mirror the dashboard config.
 */

/** Verify the 6-digit code emailed after signUp(). */
export async function verifyEmailOtp(
  email: string,
  token: string
): Promise<WebAuthActionResult> {
  if (!EmailSchema.safeParse(email).success || !OtpSchema.safeParse(token).success) {
    return invalidInput('Enter a valid email and 6-digit code.');
  }

  const supabase = getWebSupabaseClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) {
    return {
      success: false,
      error: mapAuthError('verify-email-otp', error),
      code: error.code,
    };
  }
  return { success: true, session: data.session };
}

/** Request a new signup confirmation code. */
export async function resendEmailOtp(email: string): Promise<WebAuthActionResult> {
  if (!EmailSchema.safeParse(email).success) {
    return invalidInput('Enter a valid email address.');
  }

  const supabase = getWebSupabaseClient();
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) {
    return {
      success: false,
      error: mapAuthError('resend-email-otp', error),
      code: error.code,
    };
  }
  return { success: true };
}

/**
 * Request a password-reset code be emailed. Supabase does not reveal
 * whether an account exists for this address, so callers should render
 * neutral "check your email" copy regardless of the outcome.
 */
export async function requestPasswordReset(email: string): Promise<WebAuthActionResult> {
  if (!EmailSchema.safeParse(email).success) {
    return invalidInput('Enter a valid email address.');
  }

  const supabase = getWebSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) {
    return {
      success: false,
      error: mapAuthError('request-password-reset', error),
      code: error.code,
    };
  }
  return { success: true };
}

/** Verify a password-reset code. Establishes a temporary recovery session. */
export async function verifyRecoveryOtp(
  email: string,
  token: string
): Promise<WebAuthActionResult> {
  if (!EmailSchema.safeParse(email).success || !OtpSchema.safeParse(token).success) {
    return invalidInput('Enter a valid email and 6-digit code.');
  }

  const supabase = getWebSupabaseClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'recovery',
  });
  if (error) {
    return {
      success: false,
      error: mapAuthError('verify-recovery-otp', error),
      code: error.code,
    };
  }
  return { success: true, session: data.session };
}

/** Set a new password for the currently active (recovery or normal) session. */
export async function updatePassword(password: string): Promise<WebAuthActionResult> {
  if (!PasswordSchema.safeParse(password).success) {
    return invalidInput('Password must be at least 8 characters.');
  }

  const supabase = getWebSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      success: false,
      error: mapAuthError('update-password', error),
      code: error.code,
    };
  }
  return { success: true };
}

export { isRateLimitCode };
