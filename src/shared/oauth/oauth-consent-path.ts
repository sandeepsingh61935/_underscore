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

/** Default post-auth landing (retired /mode selection flow). */
export const DEFAULT_AUTH_REDIRECT_PATH = '/home' as const;

/** Map retired web paths still present in bookmarks / old returnTo values. */
function rewriteLegacyAuthPath(path: string): string {
  if (path === '/mode' || path.startsWith('/mode?')) {
    return `/home${path.slice('/mode'.length)}`;
  }
  if (path === '/collections' || path.startsWith('/collections?')) {
    return `/library${path.slice('/collections'.length)}`;
  }
  return path;
}

/** Resolve post-auth redirect target from sign-in query params. */
export function resolveAuthRedirectTarget(
  returnTo: string | null,
  fallbackPath: string = DEFAULT_AUTH_REDIRECT_PATH,
): string {
  if (!returnTo?.trim()) {
    return fallbackPath;
  }
  if (returnTo.startsWith('/') && !returnTo.startsWith('//')) {
    return rewriteLegacyAuthPath(returnTo);
  }
  return fallbackPath;
}
