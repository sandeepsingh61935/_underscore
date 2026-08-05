/**
 * @file section-key.ts
 * @description Build consistent section keys for Library domain drill-down.
 */

import { parse } from 'tldts';

import { getSectionPath } from '@/shared/utils/normalize-page-url';

export interface SectionKeyInput {
  url: string;
  /**
   * Optional fallback only when `url` is missing or unparseable.
   * Never used to override a valid url — callers often pass pathname-only
   * values that would clobber query identity (e.g. `/transcript` vs `?v=`).
   */
  path?: string;
}

/**
 * Section key for grouping and filtering highlights within a domain.
 * Non-www subdomains are prefixed (e.g. "blog · /docs").
 *
 * Identity always comes from the url (pathname + cleaned search) when the url
 * is valid. `path` is fallback only.
 */
export function getSectionKey(highlight: SectionKeyInput): string {
  let sectionKey: string;

  try {
    // Validate url; getSectionPath also parses but we need catch for fallback.
    // eslint-disable-next-line no-new
    new URL(highlight.url);
    sectionKey = getSectionPath(highlight.url);
  } catch {
    sectionKey =
      highlight.path !== undefined && highlight.path !== ''
        ? highlight.path
        : '/';
  }

  if (!sectionKey) {
    sectionKey = '/';
  }

  try {
    const url = new URL(highlight.url);
    const parsedTld = parse(url.hostname);
    const subdomain = parsedTld.subdomain;

    if (subdomain && subdomain !== 'www') {
      sectionKey = `${subdomain} · ${sectionKey}`;
    }
  } catch {
    // ignore invalid urls for subdomain prefix
  }

  return sectionKey;
}
