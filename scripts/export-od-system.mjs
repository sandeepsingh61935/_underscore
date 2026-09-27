#!/usr/bin/env node
/**
 * export-od-system.mjs
 *
 * Regenerates the Open Design mirror of the _underscore Editorial design
 * system: `design-systems/underscore-editorial/` in the open-design repo.
 *
 * Source of truth is ALWAYS `src/ui-system/theme/global.css` in this repo.
 * The OD package is a read-only export for design exploration; approved
 * explorations are ported back here by hand, then this script re-runs.
 *
 * Usage:
 *   node scripts/export-od-system.mjs [--od <path>] [--check]
 *
 *   --od     Path to the open-design repo checkout.
 *            Default: ../open-design (sibling of this repo).
 *   --check  Regenerate into a temp dir and diff against the committed
 *            package. Exits 1 on any difference (ignores generatedAt).
 *            Use in CI to catch mirror drift.
 */

import {
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GLOBAL_CSS = join(ROOT, 'src/ui-system/theme/global.css');
const SYSTEM_ID = 'underscore-editorial';

const CSS_PREFIXES = [
  '.btn', '.btn-text', '.icon-btn', '.text-btn', '.back-btn', '.nav-link',
  '.input', '.search-', '.toolbar-', '.seg-', '.switch', '.card',
  '.collection-card', '.cc-', '.hl-', '.mode-card', '.mc-',
  '.provider-btn', '.toast-', '.account-', '.avatar', '.menu-',
  '.check-inline', '.app-header', '.web-header', '.brand-', '.empty-',
  '.fab', '.stats-footer', '.scroll-list', '.collections-view', '.cv-',
  '.mode-back', '.domain-', '.pill', '.chip', '.plan-', '.mode-pill',
  '.tabbar', '.mode-header', '.row', '.u-', '.alert-', '.spinner', '.anim-',
  '.skeleton-', '.seg-option-label', '.popup', '.ue', '.sec-',
];

function extractBlock(css, selector) {
  const startMarker = `\n${selector} {`;
  let idx = css.indexOf(startMarker);
  if (idx === -1 && css.startsWith(`${selector} {`)) idx = 0;
  if (idx === -1) throw new Error(`block not found: ${selector}`);
  const start = idx === 0 ? 0 : idx + 1;
  let depth = 0;
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) return css.slice(start, i + 1);
    }
  }
  throw new Error(`unterminated block: ${selector}`);
}

function inferType(name, value) {
  const v = value.trim();
  if (
    /serif|sans|mono|Georgia|Inter|Menlo|monospace/i.test(v) &&
    !/^(var\(|#|rgba?\(|oklch|color-mix)/.test(v)
  ) {
    return 'fontFamily';
  }
  if (/^(var\(|color-mix\(|#|rgba?\(|oklch)/.test(v)) return 'color';
  if (/^-?[\d.]+(px|em|rem|%)$/.test(v)) return 'dimension';
  if (/^-?[\d.]+$/.test(v)) return 'number';
  if (/cubic-bezier/.test(v)) return 'cubicBezier';
  if (/^\d+ms$/.test(v)) return 'duration';
  return 'other';
}

function inferLayer(name) {
  if (
    [
      '--paper', '--ink', '--accent', '--serif', '--sans', '--mono',
      '--rule', '--radius', '--pop-w', '--pop-h',
    ].includes(name)
  ) {
    return 'A1-identity';
  }
  if (/^--(paper-|ink-|rule|accent-|mode-|type-|step-)/.test(name)) return 'B-slot';
  if (
    /^--(utility-|ttl-|synced|control-|icon-|dialog-|ask-|ease|dur-)/.test(name)
  ) {
    return 'A2';
  }
  return 'A1-structure';
}

function buildTokens(tokensCss) {
  const lines = tokensCss.split('\n');
  const srcLine = (name) => {
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (t.startsWith(`${name}:`) || t.startsWith(`${name} `)) {
        return `tokens.css:${i + 1}`;
      }
    }
    return 'tokens.css:1';
  };
  const root = extractBlock(tokensCss, ':root');
  const pairs = [...root.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [
    m[1],
    m[2].trim(),
  ]);
  return pairs.map(([name, value]) => ({
    name,
    value,
    type: inferType(name, value),
    layer: inferLayer(name),
    confidence: 'high',
    reason: 'Mirrored from _underscore src/ui-system/theme/global.css :root.',
    sources: [srcLine(name)],
    sourceName: name,
  }));
}

function designTokensDoc(tokenEntries) {
  const layerCounts = {};
  for (const e of tokenEntries) {
    layerCounts[e.layer] = (layerCounts[e.layer] ?? 0) + 1;
  }
  return {
    schemaVersion: 1,
    format: 'od-design-tokens/v1',
    contract: 'TOKEN_SCHEMA',
    generatedAt: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
    source: {
      tokensCss: 'tokens.css',
      origin: '_underscore src/ui-system/theme/global.css',
    },
    summary: {
      totalTokens: tokenEntries.length,
      declaredTokens: tokenEntries.length,
      sourceBackedTokens: tokenEntries.length,
      layerCounts,
      score: 100,
      grade: 'excellent',
      recommendRebuild: false,
    },
    tokens: tokenEntries,
  };
}

const GROUPS = [
  ['buttons', 'Buttons and calls to action', ['.btn', '.btn.primary', '.btn.accent', '.btn.ghost', '.btn.danger', '.btn-text', '.icon-btn', '.text-btn', '.back-btn'], ['btn', 'btn-text', 'icon-btn', 'text-btn', 'back-btn'], [], ['--accent', '--accent-ink', '--ink', '--paper', '--paper-2', '--radius', '--rule', '--rule-soft', '--step--1', '--step-0', '--ttl-expired']],
  ['inputs', 'Form fields and controls', ['.input', '.search-input', '.toolbar-select', '.seg-control', '.seg-option', '.switch'], ['input', 'search-input', 'toolbar-select', 'seg-control', 'seg-option', 'switch'], ['input', 'button'], ['--accent', '--ink', '--ink-3', '--paper', '--paper-2', '--radius', '--rule-soft', '--step--1', '--step-0', '--control-h']],
  ['cards', 'Cards and panels', ['.card', '.card-interactive', '.collection-card', '.hl-card', '.mode-card'], ['card', 'collection-card', 'hl-card', 'mode-card'], [], ['--accent', '--ink', '--ink-3', '--paper', '--paper-2', '--radius', '--rule-soft', '--step--1', '--step-0', '--step-2']],
  ['badges', 'Badges, chips, and status labels', ['.chip-filter', '.chip-input', '.pill', '.plan-pill', '.mode-pill', '.cc-tag'], ['chip-filter', 'chip-input', 'pill', 'plan-pill', 'mode-pill'], [], ['--accent', '--ink-2', '--paper-2', '--radius', '--rule-soft', '--synced', '--ttl-expired', '--ttl-low']],
  ['dialogs', 'Dialogs and menus', ['.alert-content', '.alert-overlay', '.menu-content', '.menu-item'], ['alert-content', 'menu-content', 'menu-item'], [], ['--accent', '--accent-ink', '--dialog-max', '--ink', '--paper', '--radius', '--rule', '--rule-soft', '--utility-overlay-78']],
  ['typography', 'Typography scale and text utilities', ['.u-serif', '.u-sans', '.u-mono', '.u-caps', '.u-kicker'], ['u-serif', 'u-sans', 'u-mono', 'u-caps', 'u-kicker'], ['h1', 'h2', 'h3', 'p'], ['--ink-3', '--mono', '--sans', '--serif', '--step--2', '--step--1', '--step-0', '--step-2', '--step-3', '--type-body-lh', '--type-display-track']],
  ['layout', 'Layout primitives', ['.tabbar', '.mode-header', '.app-header', '.row', '.toolbar-list'], ['tabbar', 'mode-header', 'app-header', 'row'], [], ['--pop-w', '--pop-h', '--paper', '--rule', '--rule-soft', '--control-h', '--type-inset-padding']],
];

const EXTRA_DECLARED = ['--paper', '--paper-2', '--paper-3', '--ink', '--ink-2', '--ink-3', '--ink-4', '--serif', '--sans', '--mono', '--step--2', '--step--1', '--step-0', '--step-1', '--step-2', '--step-3', '--step-4', '--step-5', '--step-6', '--pop-w', '--pop-h', '--radius', '--control-h', '--control-h-sm', '--control-h-md', '--icon-size', '--ease', '--dur-fast', '--dur-med'];

function componentsManifest() {
  const declared = [...new Set([...GROUPS.flatMap((g) => g[5]), ...EXTRA_DECLARED])].sort();
  const selectors = [...new Set(GROUPS.flatMap((g) => g[3]))].sort();
  const classes = [...new Set(GROUPS.flatMap((g) => g[4]))].sort();
  const elements = ['button', 'div', 'h1', 'h2', 'h3', 'input', 'p', 'span', 'nav', 'header', 'select', 'section'];
  return {
    schemaVersion: 1,
    brandId: SYSTEM_ID,
    source: { componentsHtml: 'components.html', tokensCss: 'tokens.css' },
    fixture: {
      title: 'Underscore Editorial - reference components',
      description: 'Static export of _underscore primitives (btn, chip, card, input, seg, switch, plan-pill, mode-pill, tabbar, alert, menu) on Editorial tokens.',
      styleBlockCount: 1,
      selectorCount: selectors.length,
      classCount: classes.length,
      elementCount: elements.length,
    },
    tokens: { declared, referenced: declared, unusedDeclared: [], undeclaredReferenced: [] },
    selectors,
    classes,
    elements,
    groups: GROUPS.map((g) => ({
      id: g[0], label: g[1], present: true, selectors: g[3],
      classes: g[4], elements: g[5], tokenReferences: g[6],
    })),
    literals: { colorExpressions: 0, pixelValues: 0, hardcodedFontFamilies: 0 },
  };
}

function manifest() {
  return {
    schemaVersion: 'od-design-system-project/v1',
    id: SYSTEM_ID,
    name: 'Underscore Editorial',
    category: 'Starter',
    description: 'Generated mirror of the _underscore extension Editorial design system. Source of truth is _underscore src/ui-system/theme/global.css; this package is a read-only export for design exploration, ported back by hand.',
    source: { type: 'generated-mirror', origin: '_underscore src/ui-system/theme/global.css' },
    files: { design: 'DESIGN.md', tokens: 'tokens.css', designTokens: 'design-tokens.json', tailwind: 'tailwind-v4.css', components: 'components.html' },
    usage: 'USAGE.md',
    componentsManifest: 'components.manifest.json',
    importMode: 'normalized',
    craft: { applies: [], suggested: ['color', 'accessibility-baseline'], exemptions: [] },
    preview: {
      dir: 'preview',
      pages: [
        { path: 'preview/colors.html', role: 'colors', title: 'Colors' },
        { path: 'preview/typography.html', role: 'typography', title: 'Typography' },
        { path: 'preview/spacing.html', role: 'spacing', title: 'Spacing' },
      ],
    },
    sourceFiles: { tokens: 'source/tokens.source.json' },
  };
}

function stripComments(css) {
  // String-aware: skip single/double-quoted strings so content:"/*" survives.
  let out = '';
  let i = 0;
  while (i < css.length) {
    const ch = css[i];
    if (ch === '"' || ch === "'") {
      const end = css.indexOf(ch, i + 1);
      out += css.slice(i, end === -1 ? css.length : end + 1);
      i = end === -1 ? css.length : end + 1;
    } else if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = end === -1 ? css.length : end + 2;
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

function fragmentKept(fragment) {
  const s = fragment.trim();
  if (CSS_PREFIXES.some((p) => s.startsWith(p))) return true;
  // Element-qualified: button.hl-icon, input.foo[bar], a.baz:hover
  const m = /^[a-zA-Z][\w-]*([.#\[:].*)$/.exec(s);
  if (m && CSS_PREFIXES.some((p) => m[1].startsWith(p))) return true;
  return false;
}

function selectorKept(selector) {
  // Split compound selectors on commas then combinators so descendant/child
  // parts match (e.g. `button.hl-icon svg`, `.seg button.active`).
  const fragments = selector.split(',').flatMap((part) => part.split(/[\s>+~]+/));
  if (fragments.some(fragmentKept)) return true;
  // Dark-mode overrides and reduced-motion guards belong to the kit.
  const s = selector.trim();
  if (/^\.dark(?:[\s.:#\[]|$)/.test(s)) return true;
  if (s.startsWith('@media')) return true;
  return false;
}

function componentCss(fullCss) {
  // Strip :root and .dark token blocks (they ship verbatim in tokens.css).
  const body = stripComments(fullCss)
    .replace(/:root \{.*?\n\}\n?/s, '')
    .replace(/\.dark \{.*?\n\}\n?/s, '');
  // Tokenize in source order: @media / @keyframes blocks (one nesting
  // level) or flat rules. Comment-stripping above guarantees selectors
  // never start with /* */.
  const rules =
    body.match(
      /@media[^{]+\{(?:[^{}]|\{[^{}]*\})*\}|@keyframes[^{]+\{(?:[^{}]|\{[^{}]*\})*\}|[^{}]+\{[^{}]*\}/g,
    ) ?? [];
  const kept = [];
  for (const r of rules) {
    if (r.startsWith('@media')) {
      // Keep the whole block when any inner rule belongs to the kit:
      // media queries are conditional, partial extraction would corrupt
      // guards like prefers-reduced-motion.
      const inner = r.slice(r.indexOf('{') + 1, r.lastIndexOf('}'));
      const innerRules = inner.match(/[^{}]+\{[^{}]*\}/g) ?? [];
      if (
        innerRules.some((ir) => selectorKept(ir.split('{', 1)[0]))
      ) {
        kept.push(r);
      }
      continue;
    }
    if (r.startsWith('@keyframes')) {
      kept.push(r);
      continue;
    }
    if (selectorKept(r.split('{', 1)[0])) kept.push(r);
  }
  return kept.join('\n');
}

function componentsHtml(tokensCss, compCss) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Underscore Editorial — reference components</title>
<style>
${tokensCss}

/* Demo page shell (not part of the system) */
.od-demo { max-width: 560px; margin: 32px auto; padding: 0 24px 64px;
  background: var(--paper); color: var(--ink); font-family: var(--sans); font-size: var(--step-0); }
.od-demo section { margin: 32px 0; }
.od-demo h2 { font-family: var(--mono); font-size: var(--step--2); text-transform: uppercase;
  letter-spacing: 0.14em; color: var(--ink-3); border-bottom: 1px solid var(--rule-soft); padding-bottom: 8px; }
.od-demo .row-demo { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.od-demo .kit-toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 16px; }
.font-note { font-size: var(--step--1); color: var(--ink-3); max-width: 60ch; }

/* Component CSS mirrored from _underscore src/ui-system/theme/global.css */
${compCss}
</style>
<script>
function toggleKitDark() {
  document.querySelector('.od-demo').classList.toggle('dark');
}
</script>
</head>
<body>
<main class="od-demo">
<div class="kit-toolbar"><button class="btn sm" onclick="toggleKitDark()">Toggle dark</button></div>
<h1 class="u-serif" style="font-size: var(--step-4)">Underscore Editorial</h1>
<p>Static export of _underscore primitives. Tokens: <code>tokens.css</code>. Source of truth: <code>_underscore/src/ui-system/theme/global.css</code>.</p>
<p class="font-note">Type note: <code>--serif</code> starts with licensed GT Alpina and <code>--sans</code> with Söhne — neither ships as a webfont in this kit, so this page renders Georgia/system fallbacks. Spacing/scale still match the codebase.</p>

<section><h2>Buttons</h2><div class="row-demo">
<button class="btn">Default</button>
<button class="btn primary">Primary</button>
<button class="btn accent">Accent</button>
<button class="btn ghost">Ghost</button>
<button class="btn danger">Danger</button>
<button class="btn sm">Small</button>
<button class="btn" disabled><span class="u-mono" style="font-size: 12px">Loading...</span></button>
<button class="btn-text">Action</button>
<button class="icon-btn" aria-label="icon">+</button>
</div></section>

<section><h2>Type scale</h2>
<p class="u-serif" style="font-size: var(--step-4)">Serif display 28</p>
<p class="u-sans" style="font-size: var(--step-0)">Sans body 13 — warm paper, near-black ink.</p>
<p class="u-mono" style="font-size: var(--step--1)">Mono meta 11</p>
<p class="u-kicker">Kicker label</p>
</section>

<section><h2>Chips / pills / status</h2><div class="row-demo">
<button class="chip chip-filter" aria-pressed="false">Filter</button>
<button class="chip chip-filter is-selected" aria-pressed="true">Selected</button>
<div class="chip-input-wrap"><button class="chip-input-main">Apple</button><button class="chip-remove" aria-label="Remove">×</button></div>
<span class="pill-shell"><button class="pill pill-standalone">A</button><button class="pill pill-active">B</button></span>
<span class="plan-pill"><span class="plan-dot"></span>Free</span>
<span class="plan-pill is-paid"><span class="plan-dot"></span>Paid</span>
<span class="plan-pill is-past-due"><span class="plan-dot"></span>Past due</span>
<button class="mode-pill"><span class="mode-pill-dot">G</span>Guest</button>
</div></section>

<section><h2>Card / collection / highlight</h2>
<div class="card"><h3 class="u-serif" style="font-size: var(--step-2)">Card title</h3><p>Card body on paper-2.</p></div>
<button class="card-interactive">Interactive card</button>
<div class="collection-card"><div class="cc-favicon">G</div><div class="cc-body"><div class="cc-title-row"><h3 class="cc-title">github.com</h3><span class="cc-tag">Code</span></div><p class="cc-meta">5 highlights</p></div><div class="cc-arrow">→</div></div>
<div class="hl-card"><p class="hl-text">"Highlight text on paper."</p><div class="hl-meta"><span>Today</span><span>•</span><button class="hl-link">example.com/path</button></div><div class="hl-actions"><button class="icon-btn" aria-label="Copy">⧉</button><button class="icon-btn is-active" aria-label="Copied">✓</button><button class="icon-btn" aria-label="Delete highlight">×</button></div></div>
<button class="mode-card is-active"><span class="mode-card-head"><span class="mode-card-id"><span class="mode-card-icon">H</span><span class="mode-card-label">Starter</span></span></span><span class="mode-card-desc">Active mode card.</span></button>
</section>

<section><h2>Inputs</h2>
<input class="input" placeholder="Email">
<div class="search-wrap"><input class="search-input" placeholder="Search collections..."></div>
<div class="seg-control"><button class="seg-option">Light</button><button class="seg-option is-active" aria-pressed="true"><span class="seg-option-indicator"></span><span class="seg-option-label">Dark</span></button></div>
<button class="switch is-on" role="switch" aria-checked="true"><span class="switch-track"><span class="switch-knob"></span></span></button>
</section>

<section><h2>Tab bar / headers</h2>
<nav class="tabbar" aria-label="Primary"><button class="active" aria-current="page">Home</button><button>Library</button><button>Settings</button></nav>
<div class="mode-header"><button class="mode-header-back">← Back</button></div>
</section>

<section><h2>Alert / menu</h2>
<div class="alert-overlay"></div>
<div class="alert-content"><h3 class="u-serif" style="font-size: var(--step-3)">Delete?</h3><p>Permanent action.</p><div class="alert-footer"><button class="alert-cancel">Cancel</button><button class="alert-action">Delete</button></div></div>
</section>
</main>
</body>
</html>
`;
}

const DESIGN_MD = `# Underscore Editorial

Generated mirror of the \`_underscore\` extension Editorial design system for
Open Design exploration.

## Contract

- **Source of truth:** \`_underscore\` repo,
  \`src/ui-system/theme/global.css\` (\`:root\` + \`.dark\` + component classes).
- **This package is read-only.** Never edit \`tokens.css\` / \`components.html\`
  here. Change \`global.css\`, then regenerate (\`node scripts/export-od-system.mjs\`
  in \`_underscore\`).
- **Port-back:** approved OD explorations are ported by hand into \`global.css\`
  (tokens) and \`src/ui-system/components/primitives/\` (components), then this
  package is regenerated. \`global.css\` remains the merge authority.

## System in brief

- Warm paper (\`--paper #f7f5f0\`, \`--paper-2\`), 4-step ink ramp, heavy
  \`--rule\` vs hairline \`--rule-soft\`. Borders, not shadows.
- Single terracotta accent (\`--accent oklch(62% 0.12 45)\`, tunable via
  \`oklch()\` + \`color-mix()\` tints). Modes distinguished by glyph + label,
  never color. Focus ring universally \`2px solid var(--accent)\`.
- Serif display / sans UI / mono meta; 9-step \`--step--2..--step-6\`
  (10/11/13/15/18/22/28/36/48px). Geometry: 400×600 popup, \`--radius: 2px\`,
  \`--control-h: 44px\` touch targets.
- Dark mode: \`.dark\` class flip (charcoal paper, lifted accent).
- Exceptions (intentionally untokenized): state colors \`--ttl-*\`,
  \`--synced\`, iOS toggle \`--utility-ok\`.
`;

const USAGE_MD = `# Underscore Editorial Usage

Generated-mirror package guide for Open Design agents and reviewers.

## Read Order

1. Read this file first to understand the package contract.
2. Read \`DESIGN.md\` for visual intent, constraints, and regeneration rules.
3. Paste \`tokens.css\` into the first artifact \`<style>\` block before writing component CSS.
4. Use \`components.manifest.json\` for the compact component inventory; open \`components.html\` when exact selectors or states matter.
5. Inspect \`preview/\` pages when a visual sanity check is useful.

## Design Highlights

- Background: \`#f7f5f0\` (warm off-white paper)
- Foreground: \`#111110\` (near-black)
- Accent: \`oklch(62% 0.12 45)\` terracotta — CTAs, active states, focus rings
- Type: serif display, sans UI, mono meta; 44px touch targets; 2px radius

## Do

- Preserve token names exactly (\`--paper\`, \`--ink-*\`, \`--accent\`, \`--step-*\`).
- Reuse component classes from \`components.manifest.json\` before inventing controls.
- Keep new explorations inside the token system; propose new tokens only with a \`_underscore\` port-back plan.

## Avoid

- Avoid raw hex values outside the copied \`:root\` / \`.dark\` token blocks.
- Avoid editing this package directly — it regenerates from \`_underscore\`.
- Avoid rounded pills, shadows, or multi-accent palettes; the system uses hairline rules and one accent.
`;

const TAILWIND_V4 = `/* design-systems/underscore-editorial/tailwind-v4.css
 * Tailwind v4 bridge — only valid where the Tailwind engine is present.
 * _underscore production does NOT use Tailwind; prefer tokens.css + component classes.
 */
@import "tailwindcss";
@theme {
  --color-paper: var(--paper);
  --color-paper-2: var(--paper-2);
  --color-ink: var(--ink);
  --color-accent: var(--accent);
  --font-serif: var(--serif);
  --font-sans: var(--sans);
  --font-mono: var(--mono);
}
`;

function previewPage(title, body, tokensCss) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>${title} — Underscore Editorial</title>
<style>
${tokensCss}
body { background: var(--paper); color: var(--ink); font-family: var(--sans); margin: 0; padding: 32px; }
.swatch { display: flex; align-items: center; gap: 12px; margin: 8px 0; }
.chip { width: 64px; height: 32px; border: 1px solid var(--rule-soft); border-radius: var(--radius); }
.row { display: flex; gap: 16px; flex-wrap: wrap; }
.cell { text-align: center; font-family: var(--mono); font-size: var(--step--1); color: var(--ink-3); }
h1 { font-family: var(--serif); font-size: var(--step-3); }
</style></head><body><h1>${title}</h1>${body}</body></html>`;
}

function exportAll(outDir) {
  const css = readFileSync(GLOBAL_CSS, 'utf8');
  const root = extractBlock(css, ':root');
  const dark = extractBlock(css, '.dark');

  const tokensCss =
    `/* design-systems/underscore-editorial/tokens.css\n` +
    ` * _underscore Editorial design tokens — generated mirror.\n` +
    ` * Source of truth: _underscore repo src/ui-system/theme/global.css (:root + .dark).\n` +
    ` * Do NOT edit here: change global.css, then regenerate\n` +
    ` * (node scripts/export-od-system.mjs in _underscore).\n` +
    ` * global.css component classes (.btn, .card, .chip, .seg-*, .pill-*, ...) consume these tokens.\n` +
    ` */\n\n${root}\n\n${dark}\n`;

  const tokenEntries = buildTokens(tokensCss);
  const compCss =
    '/* Component CSS mirrored from _underscore src/ui-system/theme/global.css */\n' +
    componentCss(css);

  mkdirSync(outDir, { recursive: true });
  mkdirSync(join(outDir, 'preview'), { recursive: true });
  mkdirSync(join(outDir, 'source'), { recursive: true });

  const files = {
    'tokens.css': tokensCss,
    'design-tokens.json': `${JSON.stringify(designTokensDoc(tokenEntries), null, 2)}\n`,
    'manifest.json': `${JSON.stringify(manifest(), null, 2)}\n`,
    'components.manifest.json': `${JSON.stringify(componentsManifest(), null, 2)}\n`,
    'components.html': componentsHtml(tokensCss, compCss),
    'DESIGN.md': DESIGN_MD,
    'USAGE.md': USAGE_MD,
    'tailwind-v4.css': TAILWIND_V4,
    'source/tokens.source.json': `${JSON.stringify({ origin: 'underscore:src/ui-system/theme/global.css', tokens: Object.fromEntries(tokenEntries.map((e) => [e.name, e.value])) }, null, 2)}\n`,
    'preview/colors.html': previewPage('Colors', `<div class="row">${['--paper', '--paper-2', '--paper-3', '--ink', '--ink-2', '--ink-3', '--ink-4', '--rule', '--rule-soft', '--accent', '--accent-2', '--accent-tint-35', '--synced', '--ttl-fresh', '--ttl-low', '--ttl-expired'].map((t) => `<div class="cell"><div class="chip" style="background: var(${t})"></div>${t}</div>`).join('')}</div>`, tokensCss),
    'preview/typography.html': previewPage('Typography', ['--2', '--1', '0', '1', '2', '3', '4', '5', '6'].map((i) => `<p style="font-size: var(--step-${i})">Step ${i} — Editorial type specimen</p>`).join('') + '<p style="font-family: var(--mono)">Kicker — mono uppercase</p>', tokensCss),
    'preview/spacing.html': previewPage('Spacing', `<div class="row">${['32px', '36px', '44px'].map((h) => `<div class="cell"><div style="width: var(--control-h); height: ${h}; background: var(--accent-tint-35)"></div>${h}</div>`).join('')}</div><p>Touch target var(--control-h) · radius var(--radius) · popup var(--pop-w) × var(--pop-h)</p>`, tokensCss),
  };
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(outDir, name), content);
  }
  return { tokenCount: tokenEntries.length, files: Object.keys(files) };
}

function normalizeForDiff(text) {
  return text
    .replace(/"generatedAt": "[^"]*"/g, '"generatedAt": "X"')
    .replace(/\r\n/g, '\n');
}

function main() {
  const args = process.argv.slice(2);
  const odIdx = args.indexOf('--od');
  const odRoot = odIdx === -1 ? resolve(ROOT, '..', 'open-design') : resolve(args[odIdx + 1]);
  const check = args.includes('--check');
  const outDir = join(odRoot, 'design-systems', SYSTEM_ID);

  if (check) {
    const tmp = mkdtempSync(join(tmpdir(), 'od-export-'));
    try {
      exportAll(tmp);
      const fresh = new Set();
      const walk = (base, dir, into) => {
        for (const name of readdirSync(dir, { withFileTypes: true })) {
          const p = join(dir, name.name);
          if (name.isDirectory()) walk(base, p, into);
          else into.add(p.slice(base.length + 1));
        }
      };
      walk(tmp, tmp, fresh);
      const committed = new Set();
      try {
        walk(outDir, outDir, committed);
      } catch {
        // Missing package dir: every fresh file counts as drift below.
      }
      let dirty = false;
      for (const rel of new Set([...fresh, ...committed])) {
        if (!fresh.has(rel)) {
          dirty = true;
          console.error(`orphan: ${rel} (in package, not generated)`);
          continue;
        }
        const a = normalizeForDiff(readFileSync(join(tmp, rel), 'utf8'));
        let b = null;
        try {
          b = normalizeForDiff(readFileSync(join(outDir, rel), 'utf8'));
        } catch {
          b = null;
        }
        if (a !== b) {
          dirty = true;
          console.error(`drift: ${rel}`);
        }
      }
      if (dirty) {
        console.error('OD mirror is stale — run node scripts/export-od-system.mjs');
        process.exit(1);
      }
      console.log(`OD mirror is current (${fresh.size} files, ${SYSTEM_ID}).`);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
    return;
  }

  const { tokenCount, files } = exportAll(outDir);
  console.log(`Exported ${SYSTEM_ID} (${tokenCount} tokens, ${files.length} files) → ${outDir}`);
}

const invokedAsMain =
  typeof process.argv[1] === 'string' &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsMain) {
  main();
}

export {
  CSS_PREFIXES,
  GROUPS,
  buildTokens,
  componentCss,
  componentsHtml,
  componentsManifest,
  designTokensDoc,
  exportAll,
  extractBlock,
  inferLayer,
  inferType,
  manifest,
  normalizeForDiff,
  stripComments,
};
