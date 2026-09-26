import { describe, expect, it } from 'vitest';

import { classifyWebClient, isHandheldClient } from './classify-web-client';

const desktop = {
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
  maxTouchPoints: 0,
  pointerCoarse: false,
  viewportWidth: 1440,
};

describe('classifyWebClient', () => {
  it('classifies iPhone as phone', () => {
    expect(
      classifyWebClient({
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        maxTouchPoints: 5,
        pointerCoarse: true,
        viewportWidth: 390,
      })
    ).toBe('phone');
  });

  it('classifies iPad (Macintosh + touches) as tablet even when wide', () => {
    expect(
      classifyWebClient({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
        maxTouchPoints: 5,
        pointerCoarse: true,
        viewportWidth: 1024,
      })
    ).toBe('tablet');
  });

  it('classifies Android Mobile as phone', () => {
    expect(
      classifyWebClient({
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile',
        maxTouchPoints: 5,
        pointerCoarse: true,
        viewportWidth: 412,
      })
    ).toBe('phone');
  });

  it('classifies Android tablet (no Mobile token) as tablet', () => {
    expect(
      classifyWebClient({
        userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-X810) AppleWebKit/537.36',
        maxTouchPoints: 5,
        pointerCoarse: true,
        viewportWidth: 800,
      })
    ).toBe('tablet');
  });

  it('classifies desktop Chrome as desktop', () => {
    expect(classifyWebClient(desktop)).toBe('desktop');
  });

  it('does not treat a narrow desktop window as phone', () => {
    expect(classifyWebClient({ ...desktop, viewportWidth: 500 })).toBe('desktop');
  });

  it('does not treat Windows coarse-pointer convertibles as tablet', () => {
    expect(
      classifyWebClient({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
        maxTouchPoints: 10,
        pointerCoarse: true,
        viewportWidth: 1366,
      })
    ).toBe('desktop');
  });

  it('does not treat Macintosh + touches without coarse pointer as tablet', () => {
    expect(
      classifyWebClient({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
        maxTouchPoints: 5,
        pointerCoarse: false,
        viewportWidth: 1440,
      })
    ).toBe('desktop');
  });
});

describe('isHandheldClient', () => {
  it('is true for phone and tablet only', () => {
    expect(isHandheldClient('phone')).toBe(true);
    expect(isHandheldClient('tablet')).toBe(true);
    expect(isHandheldClient('desktop')).toBe(false);
  });
});
