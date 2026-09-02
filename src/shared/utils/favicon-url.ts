/**
 * Public favicon URL for a library domain (no persist; browser-cached).
 * Local/IP hosts have no site icon — callers fall back to a letter.
 */
const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPV6 = /^\[?[0-9a-f:]+\]?$/i;

export function faviconUrlForDomain(domain: string): string | null {
  const host = domain.trim().toLowerCase().replace(/\.$/, '');
  if (!host) return null;
  if (host === 'localhost' || host.endsWith('.localhost')) return null;
  if (IPV4.test(host) || IPV6.test(host)) return null;
  return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host)}`;
}

export function domainInitial(domain: string): string {
  const trimmed = domain.trim();
  if (!trimmed) return '?';
  const bare = trimmed.replace(/^www\./i, '');
  return bare.slice(0, 1).toUpperCase();
}
