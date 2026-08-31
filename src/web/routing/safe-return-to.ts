/**
 * Allow only same-origin relative app paths for post-auth redirects.
 * Rejects protocol-relative, absolute external, and empty values.
 */
export function resolveSafeReturnTo(
  candidate: string | null | undefined,
  fallback = '/home'
): string {
  if (!candidate || typeof candidate !== 'string') return fallback;
  const trimmed = candidate.trim();
  if (!trimmed.startsWith('/')) return fallback;
  if (trimmed.startsWith('//')) return fallback;
  if (trimmed.includes('://')) return fallback;
  // Auth marketing stays on product home after session restore
  if (trimmed === '/' || trimmed.startsWith('/sign-in')) return fallback;
  return trimmed;
}
