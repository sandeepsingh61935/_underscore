import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const globalCss = readFileSync(
  resolve(__dirname, './global.css'),
  'utf-8'
);

/**
 * Wireframe contract: ui_kits/extension/v2/tokens.css
 * - .u-sans: font-family: var(--sans)
 * - .qmark: font-family: var(--serif); font-style: italic; font-weight: 400;
 *          color: var(--accent); opacity: 0.6
 */
describe('V2 utility class aliases', () => {
  it('defines .u-sans with var(--sans) family', () => {
    const re = /^\s*\.u-sans\s*\{[^}]*font-family:\s*var\(--sans\)[^}]*\}/m;
    expect(globalCss).toMatch(re);
  });

  it('defines .qmark with var(--accent) color and 0.6 opacity', () => {
    const re = /^\s*\.qmark\s*\{[^}]*color:\s*var\(--accent\)[^}]*opacity:\s*0\.6[^}]*\}/m;
    expect(globalCss).toMatch(re);
  });
});
