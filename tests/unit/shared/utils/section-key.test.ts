import { describe, it, expect } from 'vitest';

import { getSectionKey } from '@/shared/utils/section-key';

describe('section-key', () => {
  it('uses pathname for apex domains', () => {
    expect(
      getSectionKey({
        url: 'https://example.com/docs/api',
        path: '/docs/api',
      })
    ).toBe('/docs/api');
  });

  it('prefixes non-www subdomains', () => {
    expect(
      getSectionKey({
        url: 'https://blog.example.com/docs',
        path: '/docs',
      })
    ).toBe('blog · /docs');
  });

  it('does not prefix www subdomain', () => {
    expect(
      getSectionKey({
        url: 'https://www.example.com/',
        path: '/',
      })
    ).toBe('/');
  });
});
