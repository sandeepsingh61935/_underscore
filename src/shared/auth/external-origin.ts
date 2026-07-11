const LOCAL_ORIGIN_PATTERNS = [
  /^http:\/\/localhost(?::\d+)?\//,
  /^http:\/\/127\.0\.0\.1(?::\d+)?\//,
];

const PRODUCTION_ORIGIN_PATTERNS = [
  /^https:\/\/[a-z0-9-]+\.pages\.dev\//,
];

/** Whether a web page origin may call SYNC_AUTH_SESSION on the extension. */
export function isAllowedExternalAuthOrigin(url: string | undefined): boolean {
  if (!url) {
    return false;
  }

  return [...LOCAL_ORIGIN_PATTERNS, ...PRODUCTION_ORIGIN_PATTERNS].some((pattern) => pattern.test(url));
}
