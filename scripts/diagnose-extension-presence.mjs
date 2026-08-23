/**
 * Feedback loop: load unpacked extension + open install page + report detection signals.
 * Pass = data-underscore-ext set OR EXTENSION_PING ok.
 * Usage: node scripts/diagnose-extension-presence.mjs [baseUrl]
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const extPath = path.join(root, '.output/chrome-mv3');
const baseUrl = process.argv[2] || 'http://127.0.0.1:3000';

const userDataDir = path.join(root, '.tmp-diagnose-chrome-profile');

async function main() {
  console.log('[diagnose] extension path:', extPath);
  console.log('[diagnose] baseUrl:', baseUrl);

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${extPath}`,
      `--load-extension=${extPath}`,
      '--no-first-run',
      '--no-default-browser-check',
    ],
  });

  try {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker', { timeout: 15000 });
    }
    const extensionId = background.url().split('/')[2];
    console.log('[diagnose] runtime extensionId:', extensionId);

    const page = await context.newPage();
    page.on('console', (msg) => {
      console.log(`[page.console ${msg.type()}]`, msg.text());
    });

    await page.goto(`${baseUrl}/install`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Allow presence content script + react mount
    await page.waitForTimeout(1500);

    const report = await page.evaluate(async (extId) => {
      const attr = document.documentElement.getAttribute('data-underscore-ext');
      const hasChrome = typeof chrome !== 'undefined';
      const hasSend =
        hasChrome && chrome.runtime && typeof chrome.runtime.sendMessage === 'function';

      let ping = { ok: false, error: 'not_attempted', response: null };
      if (hasSend) {
        ping = await new Promise((resolve) => {
          try {
            chrome.runtime.sendMessage(
              extId,
              { type: 'EXTENSION_PING', payload: {}, timestamp: Date.now() },
              (response) => {
                const err = chrome.runtime.lastError?.message;
                if (err) {
                  resolve({ ok: false, error: err, response: null });
                  return;
                }
                resolve({ ok: true, error: null, response });
              },
            );
          } catch (e) {
            resolve({ ok: false, error: String(e), response: null });
          }
        });
      } else {
        ping = { ok: false, error: 'no_chrome_runtime_sendMessage', response: null };
      }

      return {
        href: location.href,
        attr,
        hasChrome,
        hasSend,
        ping,
      };
    }, extensionId);

    console.log('[diagnose] REPORT', JSON.stringify(report, null, 2));

    const pass = Boolean(report.attr) || (report.ping.ok && report.ping.response);
    if (!pass) {
      console.error('[diagnose] FAIL: extension not detectable on install page');
      process.exitCode = 1;
    } else {
      console.log('[diagnose] PASS: extension detectable');
      process.exitCode = 0;
    }
  } finally {
    await context.close();
  }
}

main().catch((e) => {
  console.error('[diagnose] fatal', e);
  process.exit(2);
});
