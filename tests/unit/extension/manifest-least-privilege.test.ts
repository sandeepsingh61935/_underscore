import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * WP-3: least-privilege extension surface for billing security.
 * Reads wxt.config.ts as text so we catch broad wildcards without building.
 */
describe('extension manifest least privilege (WP-3)', () => {
  const src = readFileSync(
    resolve(process.cwd(), 'wxt.config.ts'),
    'utf8'
  );

  it('does not use wildcard supabase host permission string', () => {
    expect(src).not.toMatch(/['"]https:\/\/\*\.supabase\.co\//);
  });

  it('does not use wildcard pages.dev external connect string', () => {
    expect(src).not.toMatch(/['"]https:\/\/\*\.pages\.dev\//);
  });

  it('pins project Supabase host', () => {
    expect(src).toMatch(/cuzwaukxagefyvtxbqmi\.supabase\.co/);
  });

  it('pins underscore-web.pages.dev for external connect', () => {
    expect(src).toMatch(/underscore-web\.pages\.dev/);
  });
});
