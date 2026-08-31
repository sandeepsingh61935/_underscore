/**
 * Human-readable labels for OAuth scopes on the consent screen.
 * Prefer plain outcomes over protocol tokens (no raw offline_access, etc.).
 */
const SCOPE_LABELS: Record<string, string> = {
  openid: 'Confirm it is you signing in',
  email: 'See the email on your account',
  profile: 'See your name and avatar',
  phone: 'See your phone number',
  offline_access: 'Stay connected until you revoke access',
  'highlights:read': 'Read your synced Pro highlight library',
};

/** Preferred order: library access first, then identity, then long-lived session. */
const SCOPE_ORDER: readonly string[] = [
  'highlights:read',
  'openid',
  'email',
  'profile',
  'phone',
  'offline_access',
];

export function parseOAuthScopeString(scope: string | undefined | null): string[] {
  if (!scope?.trim()) {
    return [];
  }
  return scope.trim().split(/\s+/).filter(Boolean);
}

export function labelOAuthScope(scope: string): string {
  return SCOPE_LABELS[scope] ?? scope.replace(/_/g, ' ');
}

export function labelOAuthScopes(
  scope: string | undefined | null
): { scope: string; label: string }[] {
  const parsed = parseOAuthScopeString(scope);
  const rank = (s: string): number => {
    const i = SCOPE_ORDER.indexOf(s);
    return i === -1 ? SCOPE_ORDER.length + parsed.indexOf(s) : i;
  };
  return [...parsed]
    .sort((a, b) => rank(a) - rank(b))
    .map((item) => ({
      scope: item,
      label: labelOAuthScope(item),
    }));
}

/** Host line for consent UI — never dump full localhost paths as the main signal. */
export function formatOAuthRedirectDisplay(redirectUri: string | undefined | null): {
  primary: string;
  secondary: string | null;
} {
  if (!redirectUri?.trim()) {
    return { primary: 'The requesting app', secondary: null };
  }
  try {
    const u = new URL(redirectUri.trim());
    const host = u.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') {
      return {
        primary: 'Local development app',
        secondary: `${host}${u.port ? `:${u.port}` : ''}`,
      };
    }
    return { primary: host, secondary: null };
  } catch {
    return { primary: 'The requesting app', secondary: redirectUri.trim().slice(0, 80) };
  }
}
