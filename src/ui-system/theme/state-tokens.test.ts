import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const globalCss = readFileSync(
  resolve(__dirname, './global.css'),
  'utf-8'
);

describe('V2 state-color tokens', () => {
  it.each([
    '--ttl-fresh',
    '--ttl-low',
    '--ttl-expired',
    '--ttl-wash',
    '--synced',
  ])('defines %s in :root', (token) => {
    const re = new RegExp(`^\\s*${token}\\s*:`, 'm');
    expect(globalCss).toMatch(re);
  });
});
