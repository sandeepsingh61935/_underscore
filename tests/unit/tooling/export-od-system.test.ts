/**
 * @file export-od-system.test.ts
 * @description Contract tests for scripts/export-od-system.mjs.
 *
 * The OD mirror must faithfully reproduce the codebase UI. These tests run
 * the exporter against the REAL src/ui-system/theme/global.css and assert
 * the kit keeps every rule class the demo markup (and the manifest) needs.
 */
// @ts-nocheck — the exporter is a plain .mjs tooling script.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  buildTokens,
  componentCss,
  componentsHtml,
  componentsManifest,
  inferType,
  normalizeForDiff,
  stripComments,
} from '../../../scripts/export-od-system.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const GLOBAL_CSS = readFileSync(
  join(ROOT, 'src/ui-system/theme/global.css'),
  'utf8'
);
const compCss = componentCss(GLOBAL_CSS);

describe('export-od-system — base rules survive comment-prefixed selectors', () => {
  const bases = [
    '.btn',
    '.chip',
    '.card',
    '.tabbar',
    '.hl-card',
    '.mode-card',
    '.icon-btn',
    '.popup',
    '.seg-control',
    '.switch',
    '.mode-header',
    '.alert-overlay',
    '.pill-shell',
    '.toolbar-select',
  ];
  for (const base of bases) {
    it(`keeps ${base} (comment above selector must not drop it)`, () => {
      expect(compCss).toMatch(new RegExp(`\\${base}\\s*\\{`));
    });
  }

  it('keeps .u-serif (type helper after a comment)', () => {
    expect(compCss).toMatch(/\.u-serif\s*\{/);
  });
});

describe('export-od-system — keyframes, element selectors, dark mode', () => {
  it('keeps @keyframes ue-spin/ue-pulse/ue-shimmer/ue-slide-up', () => {
    for (const k of ['ue-spin', 'ue-pulse', 'ue-shimmer', 'ue-slide-up']) {
      expect(compCss).toContain(`@keyframes ${k}`);
    }
  });

  it('keeps element-qualified selectors (button.hl-icon)', () => {
    expect(compCss).toContain('button.hl-icon');
  });

  it('keeps descendant selectors (button.hl-icon svg, .seg button.active)', () => {
    expect(compCss).toContain('button.hl-icon svg');
    expect(compCss).toMatch(/\.seg button\.active/);
  });

  it('strips :root/.dark token blocks (they ship in tokens.css)', () => {
    expect(compCss).not.toMatch(/:root\s*\{/);
    expect(compCss).not.toMatch(/\.dark\s*\{/);
  });

  it('keeps .dark overrides so the kit can demo dark mode', () => {
    expect(compCss).toMatch(/\.dark[ .{]/);
  });

  it('keeps the full prefers-reduced-motion guard, not just its head', () => {
    expect(compCss).toContain('prefers-reduced-motion');
    expect(compCss).toContain('*::before');
    expect(compCss).toContain('*::after');
    expect(compCss).toContain('.u-card-row');
  });
});

describe('export-od-system — helpers', () => {
  it('stripComments preserves quoted content strings', () => {
    expect(stripComments('a{content:"/*"}')).toContain('"/*"');
    expect(stripComments('a{/* x */}b{}')).not.toContain('/*');
  });

  it('inferType classifies color/font/dimension', () => {
    expect(inferType('--accent', 'oklch(62% 0.12 45)')).toBe('color');
    expect(inferType('--serif', "'GT Alpina', Georgia, serif")).toBe('fontFamily');
    expect(inferType('--step-0', '13px')).toBe('dimension');
  });

  it('buildTokens parses name/value pairs with sources', () => {
    const entries = buildTokens('\n:root {\n--paper: #f7f5f0;\n}');
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ name: '--paper', value: '#f7f5f0' });
  });

  it('normalizeForDiff ignores generatedAt and CRLF', () => {
    const a = normalizeForDiff('{"generatedAt": "2026-01-01T00:00:00Z"}\r\n');
    const b = normalizeForDiff('{"generatedAt": "2026-09-27T00:00:00Z"}\n');
    expect(a).toBe(b);
  });
});

describe('export-od-system — kit markup covers component states', () => {
  const tokensCss = ':root{--paper:#f7f5f0;}';
  const html = componentsHtml(tokensCss, compCss);

  it('includes a .dark demo toggle hook', () => {
    expect(html).toContain('toggleKitDark');
    expect(html).toContain('od-demo');
    expect(html).toContain('.dark');
  });

  it('demos button loading state', () => {
    expect(html).toMatch(/Loading\.\.\./);
  });

  it('demos chip selected + input/remove variants', () => {
    expect(html).toMatch(/is-selected/);
    expect(html).toMatch(/chip-input-wrap|chip-remove/);
  });

  it('demos highlight link + actions overlay', () => {
    expect(html).toMatch(/hl-link/);
    expect(html).toMatch(/hl-actions/);
  });

  it('demos seg indicator + tabbar current + mode-header back', () => {
    expect(html).toMatch(/seg-option-indicator/);
    expect(html).toMatch(/aria-current/);
    expect(html).toMatch(/mode-header-back/);
  });

  it('demos alert overlay + font-loading note', () => {
    expect(html).toMatch(/alert-overlay/);
    expect(html).toMatch(/GT Alpina|Söhne/);
  });
});

describe('export-od-system — manifest selectors exist in kit CSS', () => {
  it('every manifest class/selector is styled by the exported CSS', () => {
    const manifest = componentsManifest();
    const missing: string[] = [];
    for (const sel of manifest.selectors as string[]) {
      const base = sel.split(':')[0];
      if (base.startsWith('.')) {
        const cls = base.slice(1);
        if (!compCss.includes(`.${cls}`)) missing.push(sel);
      }
    }
    expect(missing).toEqual([]);
  });
});
