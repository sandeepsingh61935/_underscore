/**
 * @file check-legacy-ds.test.ts
 * @description RED tests for scripts/check-legacy-ds.sh.
 *
 * Each test exercises one of the 11 categories. The script doesn't exist yet —
 * these tests will fail at the `runHarness` step (file-not-found or non-zero
 * exit on the wrong condition). As the script is implemented category by
 * category, the corresponding test goes green.
 *
 * Categories (per docs/superpowers/specs/2026-06-04-full-legacy-ds-purge.md):
 *   1. MD3 — var(--md-sys-*)
 *   2. Ink & Glass — var(--ink-*)
 *   3. Style C Hybrid — var(--bg|accent|text-primary|border|radius|shadow-hover)
 *   4. Legacy accent-tint — var(--accent-tint-*)
 *   5. Logo vars — var(--logo-*)
 *   6. Hardcoded hex in .tsx — #[0-9a-fA-F]{3,8}
 *   7. Arbitrary motion duration — duration-[XXXms]
 *   8. Undersized touch targets — h-{7,8,9,10} on <button>/role=button
 *   9. Emoji in source
 *  10. V1 mode names (walk/sprint/vault/neural) in .ts/.tsx/.md
 *  11. Banned Tailwind utilities (text-muted-foreground, bg-primary, etc.)
 */
import { describe, it, expect } from 'vitest';

import { runHarness } from './run-script';

describe('check-legacy-ds.sh — 11 categories', () => {
  it('1. MD3: detects var(--md-sys-color-primary)', async () => {
    const result = await runHarness({ fixture: 'cat-1-md3' });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toMatch(/cat-1|md3/i);
    expect(result.stdout).toMatch(/--md-sys-color-primary/);
  });

  it('2. Ink & Glass: detects var(--ink-1) and var(--ink-text-secondary)', async () => {
    const result = await runHarness({ fixture: 'cat-2-ink' });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toMatch(/cat-2|ink/i);
    expect(result.stdout).toMatch(/--ink-1/);
    expect(result.stdout).toMatch(/--ink-text-secondary/);
  });

  it('3. Style C Hybrid: detects var(--bg), --accent, --text-primary, --border, --radius, --shadow-hover', async () => {
    const result = await runHarness({ fixture: 'cat-3-style-c' });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toMatch(/cat-3|style-c/i);
    expect(result.stdout).toMatch(/--bg/);
    expect(result.stdout).toMatch(/--accent/);
    expect(result.stdout).toMatch(/--text-primary/);
    expect(result.stdout).toMatch(/--border/);
    expect(result.stdout).toMatch(/--radius/);
    expect(result.stdout).toMatch(/--shadow-hover/);
  });

  it('4. Legacy accent-tint: detects var(--accent-tint-08) and --accent-tint-35', async () => {
    const result = await runHarness({ fixture: 'cat-4-accent-tint' });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toMatch(/cat-4|accent-tint/i);
    expect(result.stdout).toMatch(/--accent-tint-08/);
    expect(result.stdout).toMatch(/--accent-tint-35/);
  });

  it('5. Logo vars: detects --logo-bg, --logo-text, --logo-ambient-reflection', async () => {
    const result = await runHarness({ fixture: 'cat-5-logo' });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toMatch(/cat-5|logo/i);
    expect(result.stdout).toMatch(/--logo-bg/);
    expect(result.stdout).toMatch(/--logo-text/);
    expect(result.stdout).toMatch(/--logo-ambient-reflection/);
  });

  it('6. Hardcoded hex: detects #3B82F6, #ffffff, #abc in .tsx', async () => {
    const result = await runHarness({ fixture: 'cat-6-hex' });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toMatch(/cat-6|hex/i);
    expect(result.stdout).toMatch(/#3B82F6/);
    expect(result.stdout).toMatch(/#ffffff/);
    expect(result.stdout).toMatch(/#abc/);
  });

  it('7. Arbitrary motion: detects duration-[220ms], [280ms], [180ms]', async () => {
    const result = await runHarness({ fixture: 'cat-7-motion' });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toMatch(/cat-7|motion|duration/i);
    expect(result.stdout).toMatch(/duration-\[220ms\]/);
    expect(result.stdout).toMatch(/duration-\[280ms\]/);
    expect(result.stdout).toMatch(/duration-\[180ms\]/);
  });

  it('8. Undersized touch target: detects <button className="h-10">', async () => {
    const result = await runHarness({ fixture: 'cat-8-touch' });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toMatch(/cat-8|touch/i);
    expect(result.stdout).toMatch(/h-10/);
  });

  it('9. Emoji: detects 🔒 and ✓ in .tsx', async () => {
    const result = await runHarness({ fixture: 'cat-9-emoji' });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toMatch(/cat-9|emoji/i);
    // Match the codepoints, not the rendered glyph (terminal/font may not have it)
    expect(result.stdout).toMatch(/U\+1F512|U\+2713|🔒|✓/);
  });

  it('10. V1 mode names: detects walk/sprint/vault/neural in .ts/.tsx/.md', async () => {
    const result = await runHarness({ fixture: 'cat-10-mode-names' });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toMatch(/cat-10|mode/i);
    expect(result.stdout).toMatch(/walk/);
    expect(result.stdout).toMatch(/sprint/);
    expect(result.stdout).toMatch(/vault/);
    expect(result.stdout).toMatch(/neural/);
  });

  it('11. Banned Tailwind utilities: detects text-muted-foreground, bg-primary, text-on-surface, border-outline-variant, shadow-elevation-2', async () => {
    const result = await runHarness({ fixture: 'cat-11-tailwind-banned' });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toMatch(/cat-11|tailwind/i);
    expect(result.stdout).toMatch(/text-muted-foreground/);
    expect(result.stdout).toMatch(/bg-primary/);
    expect(result.stdout).toMatch(/text-on-surface/);
    expect(result.stdout).toMatch(/border-outline-variant/);
    expect(result.stdout).toMatch(/shadow-elevation-2/);
  });
});

describe('check-legacy-ds.sh — clean state', () => {
  it('exits 0 on an empty directory (no violations to report)', async () => {
    const result = await runHarness({});
    expect(result.exitCode).toBe(0);
  });
});

describe('check-legacy-ds.sh — flags', () => {
  it('--soft reports violations but exits 0 (transition mode for CI)', async () => {
    // We need the scratch dir as the path, but also pass --soft. The helper builds
    // args as [...scriptArgs, scratch], so we pass --soft as the first scriptArg
    // and rely on the helper to append the scratch as the path.
    const result = await runHarness({
      fixture: 'cat-1-md3',
      scriptArgs: ['--soft'],
    });
    // --soft + scratch as the path arg: violations present but exit 0
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/--soft mode/);
  });

  it('--help prints usage and exits 0', async () => {
    const result = await runHarness({ scriptArgs: ['--help'] });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/Detects legacy design-system references/);
  });
});
