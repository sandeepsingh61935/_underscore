/** Human-readable labels for OAuth scopes shown on the consent screen. */
const SCOPE_LABELS: Record<string, string> = {
  openid: 'Verify your identity',
  email: 'View your email address',
  profile: 'View your profile name and avatar',
  phone: 'View your phone number',
  'highlights:read': 'Read your synced Pro highlight library',
};

export function parseOAuthScopeString(scope: string | undefined | null): string[] {
  if (!scope?.trim()) {
    return [];
  }
  return scope.trim().split(/\s+/).filter(Boolean);
}

export function labelOAuthScope(scope: string): string {
  return SCOPE_LABELS[scope] ?? scope;
}

export function labelOAuthScopes(scope: string | undefined | null): { scope: string; label: string }[] {
  return parseOAuthScopeString(scope).map((item) => ({
    scope: item,
    label: labelOAuthScope(item),
  }));
}
