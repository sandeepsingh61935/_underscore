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
