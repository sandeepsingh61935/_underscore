/**
 * Resolve absolute web-app URLs for legal docs (Privacy / Terms).
 * Popup auth opens these in a browser tab when a web origin is configured;
 * otherwise callers should render plain text (no broken links).
 */

export type LegalDocPath = '/privacy' | '/terms';

/**
 * Returns a configured web app origin without trailing slash, or null.
 * Prefer VITE_WEB_APP_URL; fall back to current window origin on web SPA only
 * when explicitly requested via useWindowOrigin.
 */
export function getWebAppOrigin(options?: {
  envOrigin?: string | null;
  useWindowOrigin?: boolean;
  windowOrigin?: string;
}): string | null {
  const rawEnv =
    options?.envOrigin !== undefined ? options.envOrigin : readEnvWebAppUrl();
  const fromEnv = rawEnv?.trim();
  if (fromEnv) {
    try {
      const url = new URL(fromEnv.includes('://') ? fromEnv : `https://${fromEnv}`);
      return url.origin;
    } catch {
      return null;
    }
  }

  if (options?.useWindowOrigin) {
    const origin = options.windowOrigin ?? readWindowOrigin();
    return origin || null;
  }

  return null;
}

function readEnvWebAppUrl(): string | null {
  try {
    const value = import.meta.env?.VITE_WEB_APP_URL;
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

function readWindowOrigin(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

/** Absolute URL for a legal path, or null when no web origin is available. */
export function resolveLegalDocUrl(
  path: LegalDocPath,
  options?: {
    envOrigin?: string | null;
    useWindowOrigin?: boolean;
    windowOrigin?: string;
  },
): string | null {
  const origin = getWebAppOrigin(options);
  if (!origin) return null;
  return `${origin}${path}`;
}

/**
 * Open a legal doc in a new browser tab when possible.
 * Returns true if an open was attempted.
 */
export function openLegalDoc(
  path: LegalDocPath,
  options?: {
    envOrigin?: string | null;
    openUrl?: (url: string) => void;
  },
): boolean {
  const url = resolveLegalDocUrl(path, {
    envOrigin: options?.envOrigin,
    // Extension popup has no SPA route for /privacy|/terms — need explicit web origin.
    useWindowOrigin: false,
  });
  if (!url) return false;

  if (options?.openUrl) {
    options.openUrl(url);
    return true;
  }

  if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
    void chrome.tabs.create({ url });
    return true;
  }

  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  }

  return false;
}
