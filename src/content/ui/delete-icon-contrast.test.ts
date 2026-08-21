import { describe, expect, it } from 'vitest';

import {
  FALLBACK_DELETE_ICON_CHROME,
  parseCssColor,
  relativeLuminance,
  resolveDeleteIconChrome,
} from './delete-icon-contrast';

describe('parseCssColor', () => {
  it('parses hex and rgb', () => {
    expect(parseCssColor('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseCssColor('rgb(10, 20, 30)')).toEqual({ r: 10, g: 20, b: 30 });
  });

  it('rejects transparent', () => {
    expect(parseCssColor('transparent')).toBeNull();
    expect(parseCssColor('rgba(0,0,0,0)')).toBeNull();
  });
});

describe('resolveDeleteIconChrome', () => {
  it('uses dark chip on light page', () => {
    const c = resolveDeleteIconChrome({ r: 250, g: 250, b: 250 });
    expect(c.tone).toBe('dark');
    expect(relativeLuminance(parseCssColor(c.background)!)).toBeLessThan(0.2);
  });

  it('uses light chip on dark page', () => {
    const c = resolveDeleteIconChrome({ r: 20, g: 20, b: 20 });
    expect(c.tone).toBe('light');
  });

  it('falls back when sample missing', () => {
    expect(resolveDeleteIconChrome(null)).toEqual(FALLBACK_DELETE_ICON_CHROME);
  });
});
