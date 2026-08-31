/**
 * Map legacy web-app pathnames to their Open Design parity targets.
 * Returns null when the pathname is not a known legacy route.
 */
export function resolveLegacyRedirect(
  pathname: string,
  params?: { domain?: string; section?: string }
): string | null {
  if (pathname === '/collections') {
    return '/library';
  }

  // /domain/:domain/section/:section — check longer pattern first
  const domainSectionMatch = pathname.match(/^\/domain\/([^/]+)\/section\/([^/]+)$/);
  if (domainSectionMatch) {
    const domain = params?.domain ?? decodeURIComponent(domainSectionMatch[1] ?? '');
    const section = params?.section ?? decodeURIComponent(domainSectionMatch[2] ?? '');
    const search = new URLSearchParams();
    search.set('domain', domain);
    search.set('section', section);
    return `/library?${search.toString()}`;
  }

  // /domain/:domain
  const domainMatch = pathname.match(/^\/domain\/([^/]+)$/);
  if (domainMatch) {
    const domain = params?.domain ?? decodeURIComponent(domainMatch[1] ?? '');
    const search = new URLSearchParams();
    search.set('domain', domain);
    return `/library?${search.toString()}`;
  }

  return null;
}
