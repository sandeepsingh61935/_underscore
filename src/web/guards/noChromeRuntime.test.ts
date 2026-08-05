/**
 * Platform guard: product web modules must never reference extension IPC.
 * Fail if the contiguous forbidden token appears under src/web (including comments).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Built without a contiguous literal so this file does not trip the scan. */
const FORBIDDEN = ['chrome', 'runtime'].join('.');

const WEB_ROOT = join(process.cwd(), 'src', 'web');

const TEXT_EXT = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.css',
  '.json',
  '.md',
  '.html',
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, out);
      continue;
    }
    const dot = name.lastIndexOf('.');
    const ext = dot >= 0 ? name.slice(dot) : '';
    if (TEXT_EXT.has(ext)) out.push(full);
  }
  return out;
}

describe('platform guard: no extension IPC under src/web', () => {
  it(`fails if any src/web file contains ${FORBIDDEN}`, () => {
    const files = walk(WEB_ROOT);
    expect(files.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      if (text.includes(FORBIDDEN)) {
        const rel = relative(process.cwd(), file);
        const lines = text.split(/\r?\n/);
        lines.forEach((line, i) => {
          if (line.includes(FORBIDDEN)) {
            offenders.push(`${rel}:${i + 1}: ${line.trim().slice(0, 120)}`);
          }
        });
      }
    }

    expect(
      offenders,
      offenders.length
        ? `Forbidden ${FORBIDDEN} in:\n${offenders.join('\n')}`
        : undefined,
    ).toEqual([]);
  });
});
