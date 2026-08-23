/**
 * Install hub distribution config (PRD 2026-08-23).
 * Mode is flipped by ops/env when store listings go live — no runtime AMO/CWS APIs.
 */

export type InstallDistributionMode = 'manual' | 'stores' | 'hybrid';

export type InstallBrowserId = 'chrome' | 'firefox';

/** How install CTAs appear for one browser. */
export type InstallBrowserAvailability = 'manual' | 'store' | 'both' | 'unavailable';

export type InstallBrowserDetect = InstallBrowserId | 'unknown';

export interface InstallBrowserArtifact {
  id: InstallBrowserId;
  label: string;
  version: string;
  /** Same-origin path under public-web (e.g. /downloads/...). */
  downloadHref: string;
  downloadLabel: string;
  steps: readonly string[];
  availability: InstallBrowserAvailability;
  /** Present only when store CTA is allowed. */
  storeUrl?: string;
  storeLabel?: string;
}

export interface InstallDistributionConfig {
  mode: InstallDistributionMode;
  version: string;
  browsers: readonly InstallBrowserArtifact[];
  helpHref: string;
  statusLine: string;
}

const DEFAULT_VERSION = '0.1.1';

function readMode(env: ImportMetaEnv | undefined): InstallDistributionMode {
  const raw = env?.['VITE_INSTALL_DISTRIBUTION_MODE']?.trim().toLowerCase();
  if (raw === 'stores' || raw === 'hybrid' || raw === 'manual') {
    return raw;
  }
  return 'manual';
}

function readVersion(env: ImportMetaEnv | undefined): string {
  const fromEnv = env?.['VITE_EXTENSION_PACKAGE_VERSION']?.trim();
  return fromEnv || DEFAULT_VERSION;
}

function readStoreUrl(
  env: ImportMetaEnv | undefined,
  key: 'VITE_CHROME_STORE_URL' | 'VITE_FIREFOX_STORE_URL',
): string | undefined {
  const v = env?.[key]?.trim();
  return v || undefined;
}

/**
 * Resolve per-browser availability from global mode + optional store URLs.
 * Store CTAs never render without a configured URL.
 */
export function resolveBrowserAvailability(
  mode: InstallDistributionMode,
  hasStoreUrl: boolean,
): InstallBrowserAvailability {
  if (mode === 'manual') {
    return 'manual';
  }
  if (mode === 'stores') {
    return hasStoreUrl ? 'store' : 'unavailable';
  }
  // hybrid
  if (hasStoreUrl) {
    return 'both';
  }
  return 'manual';
}

export function detectInstallBrowser(
  userAgent: string = typeof navigator !== 'undefined' ? navigator.userAgent : '',
): InstallBrowserDetect {
  const ua = userAgent || '';
  // Firefox first (UA also contains "Chrome" in some builds is rare; Gecko check is safer)
  if (/Firefox\//i.test(ua) && !/Seamonkey/i.test(ua)) {
    return 'firefox';
  }
  // Chromium family (exclude Edge explicit if we only ship chrome zip — still map to chrome package)
  if (/Chrome\//i.test(ua) || /Chromium\//i.test(ua) || /Edg\//i.test(ua)) {
    return 'chrome';
  }
  return 'unknown';
}

/** Order browsers with detected browser first; unknown keeps chrome then firefox. */
export function orderInstallBrowsers<T extends { id: InstallBrowserId }>(
  browsers: readonly T[],
  detected: InstallBrowserDetect,
): T[] {
  if (detected === 'unknown') {
    return [...browsers].sort((a, b) => {
      if (a.id === b.id) return 0;
      if (a.id === 'chrome') return -1;
      if (b.id === 'chrome') return 1;
      return a.id.localeCompare(b.id);
    });
  }
  return [...browsers].sort((a, b) => {
    if (a.id === detected) return -1;
    if (b.id === detected) return 1;
    return 0;
  });
}

export function showManualDownload(availability: InstallBrowserAvailability): boolean {
  return availability === 'manual' || availability === 'both';
}

export function showStoreCta(availability: InstallBrowserAvailability): boolean {
  return availability === 'store' || availability === 'both';
}

const CHROME_STEPS = [
  'Unzip the download',
  'Open chrome://extensions',
  'Turn on Developer mode',
  'Load unpacked and choose the unzipped folder',
  'Pin underscore from the extensions menu',
] as const;

const FIREFOX_STEPS = [
  'Download the Firefox build',
  'Open about:debugging#/runtime/this-firefox',
  'Choose Load Temporary Add-on…',
  'Select the package file (see Help if unsure)',
  'Keep this browser open — temporary adds reset when Firefox quits',
] as const;

/**
 * Build install distribution view-model.
 * @param env - defaults to import.meta.env
 */
export function getInstallDistributionConfig(
  env: ImportMetaEnv = import.meta.env,
): InstallDistributionConfig {
  const mode = readMode(env);
  const version = readVersion(env);
  const chromeStore = readStoreUrl(env, 'VITE_CHROME_STORE_URL');
  const firefoxStore = readStoreUrl(env, 'VITE_FIREFOX_STORE_URL');

  const chromeAvail = resolveBrowserAvailability(mode, Boolean(chromeStore));
  const firefoxAvail = resolveBrowserAvailability(mode, Boolean(firefoxStore));

  const browsers: InstallBrowserArtifact[] = [
    {
      id: 'chrome',
      label: 'Chrome',
      version,
      downloadHref: `/downloads/underscore-highlighter-${version}-chrome.zip`,
      downloadLabel: 'Download for Chrome',
      steps: CHROME_STEPS,
      availability: chromeAvail,
      ...(chromeStore
        ? { storeUrl: chromeStore, storeLabel: 'Get it on the Chrome Web Store' }
        : {}),
    },
    {
      id: 'firefox',
      label: 'Firefox',
      version,
      downloadHref: `/downloads/underscore-highlighter-${version}-firefox.zip`,
      downloadLabel: 'Download for Firefox',
      steps: FIREFOX_STEPS,
      availability: firefoxAvail,
      ...(firefoxStore
        ? { storeUrl: firefoxStore, storeLabel: 'Get it on Firefox Add-ons' }
        : {}),
    },
  ];

  return {
    mode,
    version,
    browsers,
    helpHref: '/help#install',
    statusLine: 'Not in stores yet',
  };
}
