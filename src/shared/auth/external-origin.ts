/** Whether a web page origin may call the extension (auth sync / EXTENSION_PING). */
export function isAllowedExternalAuthOrigin(url: string | undefined): boolean {
  if (!url) {
    return false;
  }

  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();

    if (u.protocol === 'http:' || u.protocol === 'https:') {
      if (host === 'localhost' || host === '127.0.0.1') {
        return true;
      }
    }

    if (u.protocol === 'https:') {
      if (host.endsWith('.pages.dev') || host === 'pages.dev') {
        return true;
      }
      if (host === 'underscore-web.vercel.app' || host.endsWith('.vercel.app')) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}
