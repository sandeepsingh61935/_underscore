/** IPC / runtime message types for authentication. */
export const AUTH_STATE_CHANGED = 'AUTH_STATE_CHANGED' as const;
export const AUTH_SESSION_CLEARED = 'AUTH_SESSION_CLEARED' as const;
export const SYNC_AUTH_SESSION = 'SYNC_AUTH_SESSION' as const;
/** Web page → extension presence probe (externally_connectable). */
export const EXTENSION_PING = 'EXTENSION_PING' as const;
export const CLEAR_VERIFICATION_STATE = 'CLEAR_VERIFICATION_STATE' as const;

/** Verify the 6-digit code emailed after REGISTER_EMAIL. Payload: { email, token }. */
export const VERIFY_EMAIL_OTP = 'VERIFY_EMAIL_OTP' as const;
/** Request a new signup confirmation code. Payload: { email }. */
export const RESEND_EMAIL_OTP = 'RESEND_EMAIL_OTP' as const;
/** Request a password-reset code be emailed. Payload: { email }. */
export const REQUEST_PASSWORD_RESET = 'REQUEST_PASSWORD_RESET' as const;
/** Verify a password-reset code (establishes a recovery session). Payload: { email, token }. */
export const VERIFY_RECOVERY_OTP = 'VERIFY_RECOVERY_OTP' as const;
/** Set a new password on the active (recovery or normal) session. Payload: { password }. */
export const UPDATE_PASSWORD = 'UPDATE_PASSWORD' as const;

export const AUTH_IPC = {
  LOGIN: 'LOGIN',
  LOGIN_EMAIL: 'LOGIN_EMAIL',
  REGISTER_EMAIL: 'REGISTER_EMAIL',
  LOGOUT: 'LOGOUT',
  GET_AUTH_STATE: 'GET_AUTH_STATE',
  SYNC_AUTH_SESSION,
  CLEAR_VERIFICATION_STATE,
  AUTH_STATE_CHANGED,
  AUTH_SESSION_CLEARED,
  VERIFY_EMAIL_OTP,
  RESEND_EMAIL_OTP,
  REQUEST_PASSWORD_RESET,
  VERIFY_RECOVERY_OTP,
  UPDATE_PASSWORD,
} as const;
