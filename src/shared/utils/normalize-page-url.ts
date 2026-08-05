/**
 * Normalize a page URL for storage, cache lookup, and page identity.
 * Strips hash; drops tracking/noise query params; sorts remaining params.
 */

const TRACKING_PARAM_NAMES = new Set([
  'gclid',
  'fbclid',
  'msclkid',
  'dclid',
  'twclid',
  'ttclid',
  'mc_eid',
  'mc_cid',
  'igshid',
  '_ga',
  '_gl',
  '_',
  'cache',
  'cachebuster',
  'cb',
  'x-amz-signature',
  'x-amz-credential',
  'x-amz-date',
  'x-amz-expires',
  'x-amz-security-token',
  'signature',
  'expires',
]);

function isDroppedSearchParam(name: string): boolean {
  const lower = name.toLowerCase();
  if (lower.startsWith('utm_')) return true;
  return TRACKING_PARAM_NAMES.has(lower);
}

/**
 * Clean and sort search params for stable page identity.
 * Exported for section-path composition; prefer normalizePageUrl / getSectionPath at call sites.
 */
export function cleanSearchParams(searchParams: URLSearchParams): URLSearchParams {
  const kept = new Map<string, string[]>();

  for (const [key, value] of searchParams.entries()) {
    if (isDroppedSearchParam(key)) continue;
    const list = kept.get(key) ?? [];
    list.push(value);
    kept.set(key, list);
  }

  const sortedKeys = [...kept.keys()].sort((a, b) => a.localeCompare(b));
  const out = new URLSearchParams();
  for (const key of sortedKeys) {
    const values = (kept.get(key) ?? []).slice().sort((a, b) => a.localeCompare(b));
    for (const value of values) {
      out.append(key, value);
    }
  }
  return out;
}

export function normalizePageUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    const cleaned = cleanSearchParams(parsed.searchParams);
    const search = cleaned.toString();
    parsed.search = search ? `?${search}` : '';
    return parsed.href;
  } catch {
    return url;
  }
}

/**
 * Pathname + cleaned search for Library section grouping.
 * e.g. "/transcript?v=AAA" or "/docs" when no meaningful search remains.
 */
export function getSectionPath(url: string): string {
  try {
    const parsed = new URL(url);
    const cleaned = cleanSearchParams(parsed.searchParams);
    const search = cleaned.toString();
    return search ? `${parsed.pathname}?${search}` : parsed.pathname || '/';
  } catch {
    return '/';
  }
}

/** origin + pathname + search (never drop query the way some callers drop search). */
function hrefFromLocation(loc: Location): string {
  return `${loc.origin}${loc.pathname}${loc.search}`;
}

/**
 * Walk same-origin parent frames outward (self → … → top).
 * Cross-origin parents stop the walk (SecurityError).
 * Injectable for tests.
 */
export function collectSameOriginFrameHrefs(
  start: Window = window,
): string[] {
  const hrefs: string[] = [];
  let current: Window = start;
  try {
    hrefs.push(hrefFromLocation(current.location));
    while (current.parent && current.parent !== current) {
      // Access throws if parent is cross-origin.
      hrefs.push(hrefFromLocation(current.parent.location));
      current = current.parent;
    }
  } catch {
    // Keep outermost same-origin href collected so far.
  }
  return hrefs;
}

/**
 * Page identity at highlight capture time.
 * Prefer the outermost same-origin frame URL so highlights made inside an
 * iframe still key to the tab page (e.g. parent has ?v= while iframe is /transcript).
 *
 * @param getFrameHrefs - ordered self→top hrefs; defaults to live window walk
 */
export function getCapturePageUrl(
  getFrameHrefs: () => string[] = collectSameOriginFrameHrefs,
): string {
  const hrefs = getFrameHrefs().filter((h) => typeof h === 'string' && h.length > 0);
  const outermost = hrefs.length > 0 ? hrefs[hrefs.length - 1]! : '';
  if (!outermost) {
    try {
      return normalizePageUrl(window.location.href);
    } catch {
      return '';
    }
  }
  return normalizePageUrl(outermost);
}

function isHttpUrl(url: string): boolean {
  try {
    const protocol = new URL(url).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Canonical page URL for a highlight at persist time.
 * Prefer the browser tab URL (address bar) over content-script location —
 * content scripts often run in iframes that lack query identity params.
 */
export function resolveHighlightPageUrl(options: {
  contentUrl?: string | null;
  tabUrl?: string | null;
}): string {
  const tab =
    options.tabUrl && options.tabUrl.length > 0
      ? normalizePageUrl(options.tabUrl)
      : '';
  const content =
    options.contentUrl && options.contentUrl.length > 0
      ? normalizePageUrl(options.contentUrl)
      : '';

  if (tab && isHttpUrl(tab)) {
    return tab;
  }
  return content;
}
