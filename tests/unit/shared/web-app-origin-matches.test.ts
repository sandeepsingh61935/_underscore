import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  isWebAppOrigin,
  WEB_APP_ORIGIN_MATCHES,
} from '@/shared/extension/web-app-origin-matches';

describe('WEB_APP_ORIGIN_MATCHES', () => {
  it('does not match every http(s) page (that reloads all tabs on extension reload)', () => {
    expect(WEB_APP_ORIGIN_MATCHES).not.toContain('http://*/*');
    expect(WEB_APP_ORIGIN_MATCHES).not.toContain('https://*/*');
    expect(WEB_APP_ORIGIN_MATCHES).not.toContain('<all_urls>');
  });
});

describe('isWebAppOrigin', () => {
  it('accepts valid localhost and 127.0.0.1 origins on any port', () => {
    expect(isWebAppOrigin('http://localhost')).toBe(true);
    expect(isWebAppOrigin('http://localhost:3000')).toBe(true);
    expect(isWebAppOrigin('http://localhost:5173/library')).toBe(true);
    expect(isWebAppOrigin('http://127.0.0.1')).toBe(true);
    expect(isWebAppOrigin('http://127.0.0.1:8080')).toBe(true);
  });

  it('accepts production and preview web app domains', () => {
    expect(isWebAppOrigin('https://underscore-web.pages.dev')).toBe(true);
    expect(isWebAppOrigin('https://underscore-web-3i0.pages.dev')).toBe(true);
    expect(isWebAppOrigin('https://underscore-web.vercel.app')).toBe(true);
    expect(isWebAppOrigin('https://preview-123.vercel.app')).toBe(true);
    expect(isWebAppOrigin('https://vercel.app')).toBe(true);
  });

  it('rejects foreign, untrusted, or insecure domains', () => {
    expect(isWebAppOrigin('https://malicious.com')).toBe(false);
    expect(isWebAppOrigin('https://evil-vercel.app.attacker.com')).toBe(false);
    expect(isWebAppOrigin('https://notvercel.app')).toBe(false);
    expect(isWebAppOrigin('http://underscore-web.pages.dev')).toBe(false); // Insecure HTTP
    expect(isWebAppOrigin('http://example.com')).toBe(false);
  });

  it('rejects empty, invalid, or malformed inputs safely', () => {
    expect(isWebAppOrigin('')).toBe(false);
    expect(isWebAppOrigin('not a url')).toBe(false);
    expect(isWebAppOrigin(null as unknown as string)).toBe(false);
    expect(isWebAppOrigin(undefined as unknown as string)).toBe(false);
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

