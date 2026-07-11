/**
 * Normalize a page URL for cache lookup (strip hash; preserve origin + path + search).
 */
export function normalizePageUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    return parsed.href;
  } catch {
    return url;
  }
}
