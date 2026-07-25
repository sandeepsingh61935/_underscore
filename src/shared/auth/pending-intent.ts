const PENDING_INTENDED_MODE_STORAGE_KEY = 'underscore.auth.pending_intended_mode';

/**
 * Stashes `intendedMode` outside the URL while a signup is pending email
 * confirmation. `IntentCatcher` (src/core/routing/AppRoutes.tsx) redirects
 * to /collections as soon as it sees `intendedMode` in the URL on *any*
 * route, including /verify-email — carrying it as a query param there
 * caused the "verify page flashes then jumps to library" bug. Stashing it
 * in sessionStorage keeps it off /verify-email's URL and lets
 * VerifyEmailView apply it only after a successful OTP check.
 */
export function stashIntendedMode(mode: string): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.setItem(PENDING_INTENDED_MODE_STORAGE_KEY, mode);
}

export function readIntendedMode(): string | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  return sessionStorage.getItem(PENDING_INTENDED_MODE_STORAGE_KEY);
}

export function clearIntendedMode(): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.removeItem(PENDING_INTENDED_MODE_STORAGE_KEY);
}
