import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { WEB_APP_ORIGIN_MATCHES } from '@/shared/extension/web-app-origin-matches';

describe('WEB_APP_ORIGIN_MATCHES', () => {
  it('does not match every http(s) page (that reloads all tabs on extension reload)', () => {
    expect(WEB_APP_ORIGIN_MATCHES).not.toContain('http://*/*');
    expect(WEB_APP_ORIGIN_MATCHES).not.toContain('https://*/*');
    expect(WEB_APP_ORIGIN_MATCHES).not.toContain('<all_urls>');
  });
});

describe('presence.content.ts', () => {
  it('does not register document_start on all http(s) URLs', () => {
    const src = readFileSync(
      resolve(__dirname, '../../../src/entrypoints/presence.content.ts'),
      'utf8'
    );
    expect(src).toMatch(/WEB_APP_ORIGIN_MATCHES/);
    expect(src).not.toMatch(/matches:\s*\[\s*'http:\/\/\*\/\*'/);
  });
});
