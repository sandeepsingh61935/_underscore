/**
 * @file domain-from-url.ts
 * @description Derive Library domain keys from highlight URLs.
 */

/** Display label for highlights on file:// and other empty-hostname URLs. */
export const LOCAL_FILES_DOMAIN = 'Local files';

/**
 * Extract the domain key used for Library grouping.
 * Returns null when the URL is missing or unparseable.
 */
export function getDomainFromUrl(url: string): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);

    if (parsed.protocol === 'file:') {
      return LOCAL_FILES_DOMAIN;
    }

    const hostname = parsed.hostname;
    if (!hostname) {
      return LOCAL_FILES_DOMAIN;
    }

    return hostname;
  } catch {
    return null;
  }
}

/** Whether a highlight URL belongs to a Library domain key. */
export function urlMatchesDomain(url: string, domain: string): boolean {
  const urlDomain = getDomainFromUrl(url);
  return urlDomain !== null && urlDomain === domain;
}
