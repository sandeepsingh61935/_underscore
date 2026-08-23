/**
 * Minimal presence beacon for the web install gate.
 * Runs at document_start so /install can see data-underscore-ext immediately.
 * Kept separate from the heavy main content script so DI failures cannot block it.
 */
import { browser } from 'wxt/browser';

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_start',
  world: 'ISOLATED',
  main() {
    let version = '1';
    try {
      version = browser.runtime.getManifest().version || '1';
    } catch {
      /* ignore */
    }
    try {
      document.documentElement.setAttribute('data-underscore-ext', version);
    } catch {
      /* ignore */
    }
  },
});
