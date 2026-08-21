#!/usr/bin/env node
/**
 * Render AMO marketing frames (1280×800 PNG) via Playwright.
 *
 * Usage: node scripts/generate-amo-screenshots.mjs
 * Out:   store/amo/screenshots/out/*.png
 */
import { chromium } from 'playwright';
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const framesDir = path.join(root, 'store/amo/screenshots/frames');
const outDir = path.join(root, 'store/amo/screenshots/out');
const out1280Dir = path.join(outDir, 'amo-1280');

const WIDTH = 1280;
const HEIGHT = 800;

async function main() {
  await mkdir(outDir, { recursive: true });
  await mkdir(out1280Dir, { recursive: true });
  const files = (await readdir(framesDir))
    .filter((f) => f.endsWith('.html'))
    .sort();

  if (files.length === 0) {
    console.error('No HTML frames in', framesDir);
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 2, // crisp 2560×1600 masters
  });

  for (const file of files) {
    const htmlPath = path.join(framesDir, file);
    const url = pathToFileURL(htmlPath).href;
    const outName = file.replace(/\.html$/, '.png');
    const outPath = path.join(outDir, outName);

    process.stdout.write(`render ${file} → ${outName} ... `);
    await page.goto(url, { waitUntil: 'networkidle' });
    // Fonts from Google may need a beat after networkidle
    await page.waitForTimeout(400);
    await page.screenshot({
      path: outPath,
      type: 'png',
      clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
    });
    console.log('ok');
  }

  await browser.close();

  // Canonical AMO size (1280×800) via ImageMagick when available
  const magick = spawnSync('magick', ['-version'], { encoding: 'utf8' });
  if (magick.status === 0) {
    for (const file of files) {
      const outName = file.replace(/\.html$/, '.png');
      const src = path.join(outDir, outName);
      const dest = path.join(out1280Dir, outName);
      const r = spawnSync('magick', [src, '-resize', `${WIDTH}x${HEIGHT}`, dest], {
        encoding: 'utf8',
      });
      if (r.status !== 0) {
        console.warn('magick resize failed for', outName, r.stderr);
      }
    }
    console.log(`Also wrote ${files.length} × 1280×800 → ${path.relative(root, out1280Dir)}/`);
  } else {
    console.warn('ImageMagick `magick` not found — skipped amo-1280/ exports');
  }

  console.log(`\nMasters: ${path.relative(root, outDir)}/ (2560×1600)`);
  console.log('Upload amo-1280/ to AMO in numeric order (01 → 05).');
  console.log('Copy: store/amo/LISTING-COPY.md · Strategy: store/amo/SCREENSHOT-STRATEGY.md');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
