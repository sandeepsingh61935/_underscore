/**
 * @file section-key.ts
 * @description Build consistent section keys for Library domain drill-down.
 */

import { parse } from 'tldts';

export interface SectionKeyInput {
  url: string;
  path?: string;
}

/**
 * Section key for grouping and filtering highlights within a domain.
 * Non-www subdomains are prefixed (e.g. "blog · /docs").
 */
export function getSectionKey(highlight: SectionKeyInput): string {
  let sectionKey = highlight.path || '/';

  try {
    const url = new URL(highlight.url);
    const parsedTld = parse(url.hostname);
    const subdomain = parsedTld.subdomain;

    if (subdomain && subdomain !== 'www') {
      sectionKey = `${subdomain} · ${sectionKey}`;
    }
  } catch {
    // ignore invalid urls
  }

  return sectionKey;
}
