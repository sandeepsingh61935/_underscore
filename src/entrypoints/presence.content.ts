/**
 * Minimal presence beacon for the web install gate.
 * Runs at document_start. Signals via:
 * 1) documentElement attribute (shared DOM)
 * 2) window.postMessage (page JS can hear content-script posts)
 */
import { browser } from 'wxt/browser';

const ATTR = 'data-underscore-ext';
const MSG_SOURCE = 'underscore-extension';

function versionOf(): string {
  try {
    return browser.runtime.getManifest().version || '1';
  } catch {
    return '1';
  }
}

function announce(version: string): void {
  try {
    document.documentElement.setAttribute(ATTR, version);
  } catch {
    /* ignore */
  }
  try {
    window.postMessage(
      { source: MSG_SOURCE, type: 'EXTENSION_PRESENT', version },
      window.location.origin
    );
  } catch {
    /* ignore */
  }
}

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_start',
  world: 'ISOLATED',
  main() {
    const version = versionOf();
    announce(version);
    // SPA navigations keep the document; re-announce on visibility for stubborn cases.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        announce(version);
      }
    });
    // Late listeners on the page
    window.setTimeout(() => announce(version), 0);
    window.setTimeout(() => announce(version), 250);
  },
});
