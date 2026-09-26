import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { openExternalUrl } from '@/shared/utils/open-external-url';

describe('openExternalUrl', () => {
  const originalChrome = globalThis.chrome;
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.chrome = originalChrome;
    globalThis.window = originalWindow;
  });

  it('calls chrome.tabs.create when chrome.tabs.create is available', () => {
    const createMock = vi.fn();
    (globalThis as unknown as { chrome: unknown }).chrome = {
      tabs: {
        create: createMock,
      },
    };

    openExternalUrl('https://example.com/doc');
    expect(createMock).toHaveBeenCalledWith({ url: 'https://example.com/doc' });
  });

  it('falls back to window.open when chrome is not available', () => {
    (globalThis as unknown as { chrome: unknown }).chrome = undefined;
    const openMock = vi.fn();
    (globalThis as unknown as { window: unknown }).window = {
      open: openMock,
    };

    openExternalUrl('https://example.com/web');
    expect(openMock).toHaveBeenCalledWith(
      'https://example.com/web',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('ignores empty or whitespace URLs', () => {
    const createMock = vi.fn();
    (globalThis as unknown as { chrome: unknown }).chrome = {
      tabs: {
        create: createMock,
      },
    };

    openExternalUrl('   ');
    expect(createMock).not.toHaveBeenCalled();
  });
});
