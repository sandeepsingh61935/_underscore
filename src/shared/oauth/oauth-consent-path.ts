export const OAUTH_CONSENT_PATH = '/oauth/consent' as const;

const PENDING_AUTHORIZATION_STORAGE_KEY = 'underscore.oauth.pending_authorization_id';

export function stashPendingAuthorizationId(authorizationId: string): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.setItem(PENDING_AUTHORIZATION_STORAGE_KEY, authorizationId);
}

export function readPendingAuthorizationId(): string | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  return sessionStorage.getItem(PENDING_AUTHORIZATION_STORAGE_KEY);
}

export function clearPendingAuthorizationId(): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.removeItem(PENDING_AUTHORIZATION_STORAGE_KEY);
}

export function buildOAuthConsentReturnPath(authorizationId: string): string {
  const params = new URLSearchParams({ authorization_id: authorizationId });
  return `${OAUTH_CONSENT_PATH}?${params.toString()}`;
}

export function buildSignInReturnUrl(authorizationId: string, origin = ''): string {
  stashPendingAuthorizationId(authorizationId);
  const consentPath = buildOAuthConsentReturnPath(authorizationId);
  const params = new URLSearchParams({ returnTo: consentPath });
  return `${origin}/sign-in?${params.toString()}`;
}

/** Resolve post-auth redirect target from sign-in query params. */
export function resolveAuthRedirectTarget(
  returnTo: string | null,
  fallbackPath = '/mode',
): string {
  if (!returnTo?.trim()) {
    return fallbackPath;
  }
  if (returnTo.startsWith('/') && !returnTo.startsWith('//')) {
    return returnTo;
  }
  return fallbackPath;
}
