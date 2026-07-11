#!/usr/bin/env node
/**
 * Offline audit: load Coursera highlights from the extension IndexedDB
 * (underscore_vault) and measure summarize/synthesize payload budgets.
 *
 * Usage:
 *   node scripts/audit-coursera-highlights.mjs
 *   IDB_DIR=/path/to/leveldb node scripts/audit-coursera-highlights.mjs
 *
 * Does not print full highlight text — stats only.
 */

import { execSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { auditCourseraScale } from '../src/shared/llm/summarization-audit.ts';
import { getSectionKey } from '../src/shared/utils/section-key.ts';

const DEFAULT_IDB_DIRS = [
  join(
    homedir(),
    '.config/google-chrome/Default/IndexedDB/chrome-extension_hecejpjekcgpifnemddfmkjmphmgljlm_0.indexeddb.leveldb',
  ),
  join(
    homedir(),
    '.config/chromium/Default/IndexedDB/chrome-extension_hecejpjekcgpifnemddfmkjmphmgljlm_0.indexeddb.leveldb',
  ),
];

function resolveIdbDir() {
  if (process.env.IDB_DIR && existsSync(process.env.IDB_DIR)) return process.env.IDB_DIR;
  for (const dir of DEFAULT_IDB_DIRS) {
    if (existsSync(dir)) return dir;
  }
  throw new Error('Extension IndexedDB not found. Set IDB_DIR to your leveldb folder.');
}

function readStringsDump(dir) {
  const ldbFiles = readdirSync(dir)
    .filter(f => f.endsWith('.ldb'))
    .map(f => join(dir, f));
  if (!ldbFiles.length) throw new Error(`No .ldb files in ${dir}`);
  return execSync(`strings ${ldbFiles.map(f => JSON.stringify(f)).join(' ')}`, {
    encoding: 'utf8',
    maxBuffer: 120 * 1024 * 1024,
  });
}

/**
 * Chrome IDB values for underscore_vault are not plain JSON on disk.
 * We recover highlight records by pairing url + text fields from strings().
 */
function parseHighlightsFromDump(dump) {
  const highlights = [];
  const idRe = /"id"\s*([a-f0-9-]{36})/gi;
  const urlRe = /url"([hH]?https?:\/\/[^"\s]+)/g;
  const textRe = /text"([^"]{1,5000})/g;

  const ids = [...dump.matchAll(idRe)].map(m => m[1]);
  const urls = [...dump.matchAll(urlRe)].map(m => m[1].replace(/^h/i, ''));
  const texts = [...dump.matchAll(textRe)].map(m => m[1]);

  const courseraUrls = urls.filter(u => u.includes('coursera.org'));
  const courseraTexts = texts.filter(t => !t.startsWith('http') && t.length > 2);

  const n = Math.min(courseraUrls.length, courseraTexts.length, ids.length || courseraUrls.length);
  for (let i = 0; i < n; i += 1) {
    const url = courseraUrls[i];
    if (!url) continue;
    let path = '/';
    try {
      path = new URL(url).pathname;
    } catch {
      // keep default
    }
    highlights.push({
      id: ids[i] ?? `hl-${i}`,
      url,
      text: courseraTexts[i] ?? '',
      path,
    });
  }

  // Dedupe by url+text
  const seen = new Set();
  return highlights.filter(h => {
    const key = `${h.url}\0${h.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return h.text.length > 0;
  });
}

function main() {
  const dir = resolveIdbDir();
  const dump = readStringsDump(dir);
  const highlights = parseHighlightsFromDump(dump);

  if (!highlights.length) {
    console.error('No Coursera highlights parsed from IDB. Vault may be locked (encrypted text).');
    process.exit(1);
  }

  const bySection = new Map();
  for (const h of highlights) {
    const key = getSectionKey({ url: h.url, path: h.path });
    bySection.set(key, (bySection.get(key) ?? 0) + 1);
  }

  const report = auditCourseraScale({
    domain: 'www.coursera.org',
    highlights,
  });

  const textLengths = highlights.map(h => h.text.length);
  const avgLen = Math.round(textLengths.reduce((a, b) => a + b, 0) / textLengths.length);
  const maxLen = Math.max(...textLengths);

  console.log(JSON.stringify({
    source: { idbDir: dir, courseraHighlights: highlights.length },
    highlightStats: {
      uniqueUrls: new Set(highlights.map(h => h.url)).size,
      sections: [...bySection.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([section, count]) => ({ section, count })),
      avgTextChars: avgLen,
      maxTextChars: maxLen,
      totalTextChars: textLengths.reduce((a, b) => a + b, 0),
    },
    sectionSummarize: {
      busiestSection: report.busiestSection.scopeLabel,
      highlights: report.busiestSection.highlightCount,
      estimatedInputTokens: report.busiestSection.estimatedInputTokens,
      maxOutputTokens: report.busiestSection.maxOutputTokens,
      tokensPerHighlight: report.busiestSection.outputTokensPerHighlight,
      issues: report.busiestSection.issues,
    },
    domainSynthesize: {
      highlights: report.domainSynthesis.highlightCount,
      uniqueUrls: report.domainSynthesis.uniqueUrlCount,
      estimatedInputTokens: report.domainSynthesis.estimatedInputTokens,
      maxOutputTokens: report.domainSynthesis.maxOutputTokens,
      tokensPerHighlight: report.domainSynthesis.outputTokensPerHighlight,
      issues: report.domainSynthesis.issues,
    },
  }, null, 2));
}

main();
