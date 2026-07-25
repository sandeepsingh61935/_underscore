import type { AuthState, User } from '@/background/auth/interfaces/i-auth-manager';

/** Serializable auth state for IPC and runtime broadcasts. */
export interface AuthStatePayload {
  isAuthenticated: boolean;
  user: User | null;
  provider: AuthState['provider'];
  lastAuthTime: string | null;
  verificationStatus: NonNullable<AuthState['verificationStatus']>;
  verificationExpiresAt: number | null;
  /** Email awaiting confirmation; survives popup close/reopen via storage. */
  verificationEmail: string | null;
}

export function toAuthStatePayload(state: AuthState): AuthStatePayload {
  return {
    isAuthenticated: state.isAuthenticated,
    user: state.user,
    provider: state.provider,
    lastAuthTime: state.lastAuthTime ? state.lastAuthTime.toISOString() : null,
    verificationStatus: state.verificationStatus ?? 'idle',
    verificationExpiresAt: state.verificationExpiresAt ?? null,
    verificationEmail: state.verificationEmail ?? null,
  };
}

export function authStateResponseData(state: AuthState): AuthStatePayload {
  return toAuthStatePayload(state);
}
