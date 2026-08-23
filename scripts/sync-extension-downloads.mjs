#!/usr/bin/env node
/**
 * Keep public-web/downloads zips in sync for /install.
 *
 * Prefer latest wxt zip artifacts under .output/; otherwise zip
 * .output/chrome-mv3 or .output/firefox-mv3 if present.
 *
 * Dest names must match install-distribution.ts:
 *   /downloads/underscore-highlighter-<version>-chrome.zip
 *   /downloads/underscore-highlighter-<version>-firefox.zip
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outputDir = path.join(root, '.output');
const destDir = path.join(root, 'public-web', 'downloads');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = String(pkg.version || '0.0.0');

/** @param {string} dir */
function newestZip(dir, predicate) {
  if (!fs.existsSync(dir)) return null;
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.zip') && predicate(f))
    .map((f) => {
      const full = path.join(dir, f);
      return { full, mtime: fs.statSync(full).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
  return files[0]?.full ?? null;
}

/**
 * @param {'chrome' | 'firefox'} browser
 * @param {string} unpackedDirName
 */
function syncOne(browser, unpackedDirName) {
  const destName = `underscore-highlighter-${version}-${browser}.zip`;
  const dest = path.join(destDir, destName);

  const artifact = newestZip(
    outputDir,
    (f) =>
      f.includes(browser) &&
      !f.includes('sources') &&
      f.startsWith('underscore-highlighter'),
  );

  fs.mkdirSync(destDir, { recursive: true });

  if (artifact) {
    fs.copyFileSync(artifact, dest);
    console.log(`[sync-downloads] ${browser}: copied ${path.basename(artifact)} → downloads/${destName}`);
    return true;
  }

  const unpacked = path.join(outputDir, unpackedDirName);
  if (fs.existsSync(path.join(unpacked, 'manifest.json'))) {
    // zip contents of unpacked dir (not the parent folder name)
    const tmp = path.join(outputDir, `.tmp-${browser}-${version}.zip`);
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      execFileSync('zip', ['-r', '-q', tmp, '.'], { cwd: unpacked, stdio: 'inherit' });
      fs.copyFileSync(tmp, dest);
      fs.unlinkSync(tmp);
      console.log(`[sync-downloads] ${browser}: zipped ${unpackedDirName} → downloads/${destName}`);
      return true;
    } catch (e) {
      console.warn(`[sync-downloads] ${browser}: zip failed`, e instanceof Error ? e.message : e);
      return false;
    }
  }

  console.warn(
    `[sync-downloads] ${browser}: skip (no .output zip or ${unpackedDirName}/). Run npm run zip:${browser}`,
  );
  return false;
}

function main() {
  const chromeOk = syncOne('chrome', 'chrome-mv3');
  const firefoxOk = syncOne('firefox', 'firefox-mv3');

  const readme = path.join(destDir, 'README.md');
  if (!fs.existsSync(readme)) {
    fs.writeFileSync(
      readme,
      `# Extension downloads\n\nUpdated by \`scripts/sync-extension-downloads.mjs\` (version ${version}).\n`,
    );
  }

  if (!chromeOk && !firefoxOk) {
    console.warn('[sync-downloads] nothing synced — /install downloads may be stale or missing');
    process.exitCode = 0; // do not fail web dev if extension not built yet
  }
}

main();
