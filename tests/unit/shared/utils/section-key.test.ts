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

  it('derives query-aware path from url when path is omitted', () => {
    expect(
      getSectionKey({
        url: 'https://youtubetotranscript.com/transcript?v=AAA&utm_source=x',
      })
    ).toBe('/transcript?v=AAA');
  });

  it('splits different video ids into different section keys', () => {
    const a = getSectionKey({
      url: 'https://youtubetotranscript.com/transcript?v=AAA',
    });
    const b = getSectionKey({
      url: 'https://youtubetotranscript.com/transcript?v=BBB',
    });
    expect(a).toBe('/transcript?v=AAA');
    expect(b).toBe('/transcript?v=BBB');
    expect(a).not.toBe(b);
  });

  it('does not let pathname-only path clobber query identity on url', () => {
    // Regression: Library callers often pass path from .pathname while url still has ?v=
    expect(
      getSectionKey({
        url: 'https://youtubetotranscript.com/transcript?v=zDY5vuMW90s',
        path: '/transcript',
      })
    ).toBe('/transcript?v=zDY5vuMW90s');
  });

  it('uses path only when url is invalid', () => {
    expect(
      getSectionKey({
        url: 'not-a-url',
        path: '/transcript',
      })
    ).toBe('/transcript');
  });

  it('prefixes subdomain with query-aware path', () => {
    expect(
      getSectionKey({
        url: 'https://blog.example.com/post?id=1',
      })
    ).toBe('blog · /post?id=1');
  });
});
