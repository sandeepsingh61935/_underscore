import { describe, expect, it } from 'vitest';

import {
  contrastRatio,
  invertRgb,
  parseCssColor,
  relativeLuminance,
  resolveUnderscoreStroke,
} from '@/content/paint/highlight-contrast';

describe('highlight-contrast invert stroke', () => {
  it('parses rgb and hex', () => {
    expect(parseCssColor('rgb(255, 255, 255)')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseCssColor('rgba(0, 0, 0, 0)')).toBeNull();
    expect(parseCssColor('#112233')).toEqual({ r: 0x11, g: 0x22, b: 0x33 });
  });

  it('inverts per channel', () => {
    expect(invertRgb({ r: 255, g: 255, b: 255 })).toEqual({ r: 0, g: 0, b: 0 });
    expect(invertRgb({ r: 0, g: 0, b: 0 })).toEqual({ r: 255, g: 255, b: 255 });
    expect(invertRgb({ r: 0, g: 0, b: 255 })).toEqual({ r: 255, g: 255, b: 0 });
  });

  it('resolveUnderscoreStroke: white bg → dark stroke', () => {
    const stroke = resolveUnderscoreStroke('rgb(255, 255, 255)');
    // pure invert is black; contrast high so keep invert
    expect(stroke).toBe('rgb(0, 0, 0)');
  });

  it('resolveUnderscoreStroke: black bg → light stroke', () => {
    expect(resolveUnderscoreStroke('rgb(0, 0, 0)')).toBe('rgb(255, 255, 255)');
  });

  it('resolveUnderscoreStroke: mid-gray snaps to black or white', () => {
    const stroke = resolveUnderscoreStroke('rgb(128, 128, 128)');
    // invert of 128 is 127 — ratio ~1; should snap
    expect(stroke === '#111111' || stroke === '#f5f5f5').toBe(true);
  });

  it('resolveUnderscoreStroke: blue bg inverts toward yellow-ish', () => {
    const stroke = resolveUnderscoreStroke('rgb(0, 0, 200)');
    expect(stroke).toMatch(/^rgb\(/);
    const inverted = invertRgb({ r: 0, g: 0, b: 200 });
    expect(stroke).toBe(`rgb(${inverted.r}, ${inverted.g}, ${inverted.b})`);
  });

  it('contrast ratio is high for black on white', () => {
    expect(
      contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })
    ).toBeGreaterThan(20);
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeGreaterThan(0.9);
  });
});
