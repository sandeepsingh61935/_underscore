/**
 * @file syncable-url.ts
 * @description Guard for Page Groups browser tab-group mirroring (ADR-032 §7).
 *
 * Only plain http(s) pages in non-incognito windows may be read or synced.
 * Incognito/private windows, browser-internal schemes, extension pages, and
 * `file:` URLs are never synced.
 */

/**
 * Whether a tab URL may participate in browser tab-group mirroring.
 *
 * @param url - tab URL as reported by the tabs API
 * @param incognito - whether the tab lives in an incognito/private window
 */
export function isSyncableTabUrl(url: string, incognito?: boolean): boolean {
  if (incognito === true) return false;
  if (!url) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  if (!parsed.hostname) return false;
  return true;
}

/** Alias for isSyncableTabUrl */
export const isSyncableUrl = isSyncableTabUrl;
