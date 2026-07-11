/**
 * Reads real Coursera highlights from local extension IndexedDB and audits
 * summarize/synthesize budgets. Run manually:
 *   npm test -- --run tests/audit/coursera-real-idb.audit.test.ts
 */

import { execSync } from 'node:child_process';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { describe, it, expect } from 'vitest';

import { auditCourseraScale, type AuditHighlight } from '@/shared/llm/summarization-audit';
import { getSectionKey } from '@/shared/utils/section-key';

const DEFAULT_IDB_DIRS = [
  join(
    homedir(),
    '.config/google-chrome/Default/IndexedDB/chrome-extension_hecejpjekcgpifnemddfmkjmphmgljlm_0.indexeddb.leveldb',
  ),
];

function resolveIdbDir(): string | null {
  const idbDir = process.env['IDB_DIR'];
  if (idbDir && existsSync(idbDir)) return idbDir;
  for (const dir of DEFAULT_IDB_DIRS) {
    if (existsSync(dir)) return dir;
  }
  return null;
}

function readStringsDump(dir: string): string {
  const ldbFiles = readdirSync(dir)
    .filter(f => f.endsWith('.ldb'))
    .map(f => join(dir, f));
  return execSync(`strings ${ldbFiles.map(f => JSON.stringify(f)).join(' ')}`, {
    encoding: 'utf8',
    maxBuffer: 120 * 1024 * 1024,
  });
}

function parseHighlightsFromDump(dump: string): {
  highlights: AuditHighlight[];
  encryptedCount: number;
  courseraUrlCount: number;
  courseraUrlOccurrences: number;
  exactCount: number;
  plainTextCount: number;
} {
  const urlRe = /https?:\/\/www\.coursera\.org[^\s"\\]+/g;
  const exactRe = /exact"([^"]{1,5000})/g;
  const textRe = /text"([^"]{1,5000})/g;
  const idRe = /"id"\s*([a-f0-9-]{36})/gi;

  const courseraUrlOccurrences = [...dump.matchAll(urlRe)].map(m => m[0]!);
  const courseraUrlsUnique = [...new Set(courseraUrlOccurrences)];
  const exacts = [...dump.matchAll(exactRe)].map(m => m[1]!.trim()).filter(Boolean);
  const plainTexts = [...dump.matchAll(textRe)]
    .map(m => m[1]!.trim())
    .filter(t => !t.startsWith('http') && t.length > 2);
  const ids = [...dump.matchAll(idRe)].map(m => m[1]!);

  const texts = exacts.length > 0 ? exacts : plainTexts;
  const encryptedCount = (dump.match(/textEncrypted/g) ?? []).length
    + (dump.match(/ciphertext/g) ?? []).length;

  const highlights: AuditHighlight[] = [];
  const urlList = courseraUrlOccurrences.length >= texts.length
    ? courseraUrlOccurrences
    : texts.map((_, i) => courseraUrlsUnique[i % courseraUrlsUnique.length]!);
  const pairCount = Math.min(urlList.length, texts.length);

  for (let i = 0; i < pairCount; i += 1) {
    const url = urlList[i]!;
    const text = texts[i]!;
    if (!url || !text) continue;
    let path = '/';
    try {
      path = new URL(url).pathname;
    } catch {
      // ignore
    }
    highlights.push({
      id: ids[i] ?? `hl-${i}`,
      url,
      text,
      path,
    });
  }

  const seen = new Set<string>();
  const deduped = highlights.filter(h => {
    const key = `${h.url}\0${h.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    highlights: deduped,
    encryptedCount,
    courseraUrlCount: courseraUrlsUnique.length,
    courseraUrlOccurrences: courseraUrlOccurrences.length,
    exactCount: exacts.length,
    plainTextCount: plainTexts.length,
  };
}

describe('Coursera real IDB audit', () => {
  it('audits summarize/synthesize budgets from extension storage', () => {
    const dir = resolveIdbDir();
    if (!dir) {
      console.warn('Skipping: extension IDB not found (set IDB_DIR to run)');
      return;
    }

    const parsed = parseHighlightsFromDump(readStringsDump(dir));
    const { highlights, encryptedCount, courseraUrlCount, courseraUrlOccurrences, exactCount, plainTextCount } = parsed;
    expect(highlights.length).toBeGreaterThan(0);

    const bySection = new Map<string, number>();
    for (const h of highlights) {
      const key = getSectionKey({ url: h.url, path: h.path });
      bySection.set(key, (bySection.get(key) ?? 0) + 1);
    }

    const report = auditCourseraScale({ domain: 'www.coursera.org', highlights });
    const textLengths = highlights.map(h => h.text.length);

    const snapshot = {
      source: {
        idbDir: dir,
        courseraHighlights: highlights.length,
        courseraUrlsInDb: courseraUrlCount,
        courseraUrlOccurrences,
        selectorExactFields: exactCount,
        plaintextTextFields: plainTextCount,
        encryptedMarkers: encryptedCount,
      },
      highlightStats: {
        uniqueUrls: new Set(highlights.map(h => h.url)).size,
        sections: [...bySection.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([section, count]) => ({ section, count })),
        avgTextChars: Math.round(textLengths.reduce((a, b) => a + b, 0) / textLengths.length),
        maxTextChars: Math.max(...textLengths),
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
    };

    writeFileSync(
      join(process.cwd(), 'tests/integration/coursera-real-idb-report.json'),
      `${JSON.stringify(snapshot, null, 2)}\n`,
    );
    console.info('[coursera-real-idb-audit]\n', JSON.stringify(snapshot, null, 2));
    expect(snapshot.sectionSummarize.issues.length).toBeGreaterThan(0);
  });
});
