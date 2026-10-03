import { describe, expect, it } from 'vitest';

import { isSyncableTabUrl } from '@/shared/utils/syncable-url';

describe('isSyncableTabUrl', () => {
  it('accepts plain http and https page urls', () => {
    expect(isSyncableTabUrl('https://example.com/a?b=1')).toBe(true);
    expect(isSyncableTabUrl('http://example.com/')).toBe(true);
    expect(isSyncableTabUrl('https://example.com/', false)).toBe(true);
  });

  it('rejects incognito tabs even for https urls', () => {
    expect(isSyncableTabUrl('https://example.com/', true)).toBe(false);
  });

  it('rejects browser-internal schemes', () => {
    expect(isSyncableTabUrl('chrome://newtab/')).toBe(false);
    expect(isSyncableTabUrl('chrome-extension://abcdef/page.html')).toBe(false);
    expect(isSyncableTabUrl('moz-extension://uuid/page.html')).toBe(false);
    expect(isSyncableTabUrl('about:config')).toBe(false);
    expect(isSyncableTabUrl('edge://settings/')).toBe(false);
  });

  it('rejects file:, view-source:, and other non-http(s) urls', () => {
    expect(isSyncableTabUrl('file:///home/user/notes.html')).toBe(false);
    expect(isSyncableTabUrl('view-source:https://example.com/')).toBe(false);
    expect(isSyncableTabUrl('data:text/plain,hello')).toBe(false);
    expect(isSyncableTabUrl('javascript:void(0)')).toBe(false);
  });

  it('rejects empty and unparseable urls', () => {
    expect(isSyncableTabUrl('')).toBe(false);
    expect(isSyncableTabUrl('not a url')).toBe(false);
  });
});
