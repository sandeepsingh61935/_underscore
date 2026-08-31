import type { AuthStatePayload } from '@/shared/auth/auth-state-payload';
import {
  VERIFY_EMAIL_OTP,
  RESEND_EMAIL_OTP,
  REQUEST_PASSWORD_RESET,
  VERIFY_RECOVERY_OTP,
  UPDATE_PASSWORD,
} from '@/shared/auth/constants';
import { useIpcAction } from '@/shared/hooks/useIpcAction';

interface AuthResponse extends AuthStatePayload {}

export interface AuthActionResult {
  success: boolean;
  error?: string;
  code?: string;
  retryAfterMs?: number;
}

export interface UseAuthActionsResult {
  /** Verify the 6-digit code emailed after signup. */
  verifyEmailOtp: (email: string, token: string) => Promise<AuthActionResult>;
  /** Request a new signup confirmation code. */
  resendEmailOtp: (email: string) => Promise<AuthActionResult>;
  /** Request a password-reset code be emailed. */
  requestPasswordReset: (email: string) => Promise<AuthActionResult>;
  /** Verify a password-reset code (establishes a recovery session). */
  verifyRecoveryOtp: (email: string, token: string) => Promise<AuthActionResult>;
  /** Set a new password on the active (recovery or normal) session. */
  updatePassword: (password: string) => Promise<AuthActionResult>;
}

/**
 * Hook exposing the OTP-confirmation / forgot-password / reset-password
 * IPC actions to popup views. Mirrors useCurrentUser.ts's IPC pattern
 * (ADR-004: views never call chrome.runtime.sendMessage directly).
 */
export function useAuthActions(): UseAuthActionsResult {
  const verifyEmailOtpAction = useIpcAction<
    { email: string; token: string },
    AuthResponse
  >(VERIFY_EMAIL_OTP);
  const resendEmailOtpAction = useIpcAction<{ email: string }, AuthResponse>(
    RESEND_EMAIL_OTP
  );
  const requestPasswordResetAction = useIpcAction<
    { email: string },
    Record<string, never>
  >(REQUEST_PASSWORD_RESET);
  const verifyRecoveryOtpAction = useIpcAction<
    { email: string; token: string },
    AuthResponse
  >(VERIFY_RECOVERY_OTP);
  const updatePasswordAction = useIpcAction<{ password: string }, AuthResponse>(
    UPDATE_PASSWORD
  );

  const verifyEmailOtp = async (
    email: string,
    token: string
  ): Promise<AuthActionResult> => {
    const result = await verifyEmailOtpAction({ email, token });
    return result.success
      ? { success: true }
      : {
          success: false,
          error: result.error,
          code: result.code,
          retryAfterMs: result.retryAfterMs,
        };
  };

  const resendEmailOtp = async (email: string): Promise<AuthActionResult> => {
    const result = await resendEmailOtpAction({ email });
    return result.success
      ? { success: true }
      : {
          success: false,
          error: result.error,
          code: result.code,
          retryAfterMs: result.retryAfterMs,
        };
  };

  const requestPasswordReset = async (email: string): Promise<AuthActionResult> => {
    const result = await requestPasswordResetAction({ email });
    return result.success
      ? { success: true }
      : {
          success: false,
          error: result.error,
          code: result.code,
          retryAfterMs: result.retryAfterMs,
        };
  };

  const verifyRecoveryOtp = async (
    email: string,
    token: string
  ): Promise<AuthActionResult> => {
    const result = await verifyRecoveryOtpAction({ email, token });
    return result.success
      ? { success: true }
      : {
          success: false,
          error: result.error,
          code: result.code,
          retryAfterMs: result.retryAfterMs,
        };
  };

  const updatePassword = async (password: string): Promise<AuthActionResult> => {
    const result = await updatePasswordAction({ password });
    return result.success
      ? { success: true }
      : {
          success: false,
          error: result.error,
          code: result.code,
          retryAfterMs: result.retryAfterMs,
        };
  };

  return {
    verifyEmailOtp,
    resendEmailOtp,
    requestPasswordReset,
    verifyRecoveryOtp,
    updatePassword,
  };
}
