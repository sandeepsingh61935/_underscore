import { describe, it, expect } from 'vitest';

import {
  getCapturePageUrl,
  getSectionPath,
  normalizePageUrl,
  resolveHighlightPageUrl,
} from '@/shared/utils/normalize-page-url';

describe('normalizePageUrl', () => {
  it('treats same resource with utm params as equal to resource without them', () => {
    const withUtm =
      'https://example.com/article?id=1&utm_source=twitter&utm_campaign=x';
    const clean = 'https://example.com/article?id=1';

    expect(normalizePageUrl(withUtm)).toBe(normalizePageUrl(clean));
  });

  it('strips hash so in-page anchors do not change identity', () => {
    expect(normalizePageUrl('https://example.com/page#section-2')).toBe(
      normalizePageUrl('https://example.com/page')
    );
  });

  it('keeps resource identity query params', () => {
    expect(normalizePageUrl('https://youtubetotranscript.com/transcript?v=AAA')).toBe(
      'https://youtubetotranscript.com/transcript?v=AAA'
    );
  });

  it('strips click ids (gclid, fbclid)', () => {
    const noisy =
      'https://example.com/item?v=1&gclid=abc&fbclid=def';
    expect(normalizePageUrl(noisy)).toBe(
      normalizePageUrl('https://example.com/item?v=1')
    );
  });

  it('sorts query params so order does not change identity', () => {
    expect(normalizePageUrl('https://example.com/x?b=2&a=1')).toBe(
      normalizePageUrl('https://example.com/x?a=1&b=2')
    );
  });

  it('strips signed URL noise params', () => {
    const signed =
      'https://cdn.example.com/file?id=9&X-Amz-Signature=sig&X-Amz-Expires=3600';
    expect(normalizePageUrl(signed)).toBe(
      normalizePageUrl('https://cdn.example.com/file?id=9')
    );
  });

  it('merges landing pages that only differ by tracking params', () => {
    expect(
      normalizePageUrl('https://example.com/landing?utm_source=ad')
    ).toBe(normalizePageUrl('https://example.com/landing'));
  });

  it('returns invalid input without throwing', () => {
    expect(normalizePageUrl('not-a-url')).toBe('not-a-url');
    expect(normalizePageUrl('')).toBe('');
  });

  it('strips cache-buster param names', () => {
    expect(
      normalizePageUrl('https://example.com/p?id=1&_=123&cachebuster=9')
    ).toBe(normalizePageUrl('https://example.com/p?id=1'));
  });
});

describe('getSectionPath', () => {
  it('includes cleaned search for resource identity', () => {
    expect(
      getSectionPath('https://youtubetotranscript.com/transcript?v=zDY5vuMW90s')
    ).toBe('/transcript?v=zDY5vuMW90s');
  });

  it('drops tracking from section path', () => {
    expect(
      getSectionPath('https://example.com/transcript?v=AAA&utm_source=x')
    ).toBe('/transcript?v=AAA');
  });

  it('returns pathname only when no meaningful search remains', () => {
    expect(getSectionPath('https://example.com/docs#top')).toBe('/docs');
    expect(getSectionPath('https://example.com/landing?utm_source=x')).toBe(
      '/landing'
    );
  });

  it('splits different resource ids on the same path shell', () => {
    expect(getSectionPath('https://example.com/transcript?v=AAA')).not.toBe(
      getSectionPath('https://example.com/transcript?v=BBB')
    );
  });

  it('keeps pagination, lang, and tab as distinct paths', () => {
    expect(getSectionPath('https://example.com/list?page=1')).toBe('/list?page=1');
    expect(getSectionPath('https://example.com/list?page=2')).toBe('/list?page=2');
    expect(getSectionPath('https://example.com/doc?lang=en')).toBe('/doc?lang=en');
    expect(getSectionPath('https://example.com/doc?lang=de')).toBe('/doc?lang=de');
    expect(getSectionPath('https://example.com/p?tab=a')).toBe('/p?tab=a');
  });

  it('returns / for invalid urls', () => {
    expect(getSectionPath('not-a-url')).toBe('/');
  });
});

describe('getCapturePageUrl', () => {
  it('prefers outermost same-origin frame href so iframe path does not drop query identity', () => {
    // Transcript text often lives in an iframe at /transcript while the tab has ?v=
    const href = getCapturePageUrl(() => [
      'https://youtubetotranscript.com/transcript',
      'https://youtubetotranscript.com/transcript?v=0F8REGux8qs',
    ]);
    expect(href).toBe(
      'https://youtubetotranscript.com/transcript?v=0F8REGux8qs'
    );
    expect(getSectionPath(href)).toBe('/transcript?v=0F8REGux8qs');
  });

  it('uses the only available frame when there is no parent chain', () => {
    expect(
      getCapturePageUrl(() => [
        'https://youtubetotranscript.com/transcript?v=AAA&utm_source=x',
      ])
    ).toBe('https://youtubetotranscript.com/transcript?v=AAA');
  });
});

describe('resolveHighlightPageUrl', () => {
  it('prefers tab address-bar url over content-script frame url without query', () => {
    expect(
      resolveHighlightPageUrl({
        contentUrl: 'https://youtubetotranscript.com/transcript',
        tabUrl: 'https://youtubetotranscript.com/transcript?v=0F8REGux8qs',
      })
    ).toBe('https://youtubetotranscript.com/transcript?v=0F8REGux8qs');
  });

  it('falls back to content url when tab url is missing', () => {
    expect(
      resolveHighlightPageUrl({
        contentUrl: 'https://example.com/docs?id=1',
        tabUrl: undefined,
      })
    ).toBe('https://example.com/docs?id=1');
  });

  it('strips tracking from tab url', () => {
    expect(
      resolveHighlightPageUrl({
        contentUrl: 'https://example.com/a',
        tabUrl: 'https://example.com/a?id=1&utm_source=x',
      })
    ).toBe('https://example.com/a?id=1');
  });
});
