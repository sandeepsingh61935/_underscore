/**
 * URL match patterns for the companion web app only.
 * Keep in sync with wxt.config.ts `externally_connectable.matches`.
 *
 * The document_start presence beacon MUST NOT match every http(s) page.
 * Chrome/WXT reload every matching tab to re-inject document_start scripts
 * when the extension reloads.
 */
export const WEB_APP_ORIGIN_MATCHES = [
  'http://localhost/*',
  'http://127.0.0.1/*',
  'https://underscore-web.pages.dev/*',
  'https://underscore-web-3i0.pages.dev/*',
  'https://underscore-web.vercel.app/*',
  'https://*.vercel.app/*',
] as const;

/**
 * Validates whether a URL or origin string matches allowed companion web app origins.
 */
export function isWebAppOrigin(urlOrOrigin: string): boolean {
  if (!urlOrOrigin || typeof urlOrOrigin !== 'string') {
    return false;
  }
  try {
    const parsed = new URL(urlOrOrigin);
    const { protocol, hostname } = parsed;

    if (protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1')) {
      return true;
    }

    if (protocol === 'https:') {
      if (
        hostname === 'underscore-web.pages.dev' ||
        hostname === 'underscore-web-3i0.pages.dev' ||
        hostname === 'underscore-web.vercel.app' ||
        hostname === 'vercel.app' ||
        hostname.endsWith('.vercel.app')
      ) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

