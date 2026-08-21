/**
 * Whether email/password auth controls are shown on auth landings.
 *
 * Default: hidden (Google OAuth only). Email APIs and routes remain;
 * set VITE_AUTH_EMAIL_UI=true at build time to re-expose the form.
 */
export function isAuthEmailUiEnabled(): boolean {
  return import.meta.env.VITE_AUTH_EMAIL_UI === 'true';
}
