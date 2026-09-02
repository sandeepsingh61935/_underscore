/**
 * Library section identity stays domain + path (including query).
 * Display is a short label; Open uses a real https URL.
 */

export function pageHrefForLibrary(
  domain: string,
  section: string | null | undefined
): string | null {
  const host = domain.trim();
  if (!host) return null;

  const raw = (section ?? '/').trim() || '/';
  if (/^https?:\/\//i.test(raw)) {
    try {
      return new URL(raw).href;
    } catch {
      return null;
    }
  }

  const path = raw.startsWith('/') ? raw : `/${raw}`;
  try {
    return new URL(path, `https://${host}`).href;
  } catch {
    return null;
  }
}

/** Cosmetic only. Query strings collapse to `pathname?…`. */
export function displaySectionPath(section: string | null | undefined): string {
  const raw = (section ?? '/').trim() || '/';
  const q = raw.indexOf('?');
  const pathOnly = (q === -1 ? raw : raw.slice(0, q)) || '/';
  if (q !== -1) {
    return pathOnly === '/' ? '/?…' : `${pathOnly}?…`;
  }
  const parts = pathOnly.split('/').filter(Boolean);
  return parts.length ? parts[parts.length - 1]! : pathOnly;
}
