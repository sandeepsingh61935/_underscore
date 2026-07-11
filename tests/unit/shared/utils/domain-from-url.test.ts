import { describe, it, expect } from 'vitest';

import {
  LOCAL_FILES_DOMAIN,
  getDomainFromUrl,
  urlMatchesDomain,
} from '@/shared/utils/domain-from-url';

describe('domain-from-url', () => {
  it('returns hostname for https URLs', () => {
    expect(getDomainFromUrl('https://www.svgviewer.dev/')).toBe('www.svgviewer.dev');
    expect(getDomainFromUrl('https://example.com/a')).toBe('example.com');
  });

  it('maps file URLs to Local files', () => {
    expect(getDomainFromUrl('file:///tmp/architecture-review-20260614-auth.html')).toBe(
      LOCAL_FILES_DOMAIN
    );
  });

  it('maps empty-hostname URLs to Local files', () => {
    expect(getDomainFromUrl('blob:https://example.com/uuid')).toBe(LOCAL_FILES_DOMAIN);
  });

  it('returns null for missing or invalid URLs', () => {
    expect(getDomainFromUrl('')).toBeNull();
    expect(getDomainFromUrl('not-a-url')).toBeNull();
  });

  it('matches highlights to library domain keys', () => {
    expect(
      urlMatchesDomain(
        'file:///tmp/architecture-review-20260614-auth.html',
        LOCAL_FILES_DOMAIN
      )
    ).toBe(true);
    expect(urlMatchesDomain('https://example.com/a', 'other.com')).toBe(false);
  });
});
