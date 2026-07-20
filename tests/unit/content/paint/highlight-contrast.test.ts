import { describe, expect, it } from 'vitest';

import {
  isLightBackground,
  parseCssColor,
  relativeLuminance,
  surfaceToneFromBackground,
  resolveOverlaySurface,
} from '@/content/paint/highlight-contrast';

describe('highlight-contrast', () => {
  it('parses rgb and hex', () => {
    expect(parseCssColor('rgb(255, 255, 255)')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseCssColor('rgba(0, 0, 0, 0)')).toBeNull();
    expect(parseCssColor('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseCssColor('#112233')).toEqual({ r: 0x11, g: 0x22, b: 0x33 });
  });

  it('classifies white as light and near-black as dark', () => {
    expect(isLightBackground({ r: 255, g: 255, b: 255 })).toBe(true);
    expect(isLightBackground({ r: 20, g: 20, b: 20 })).toBe(false);
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeGreaterThan(0.9);
  });

  it('surfaceToneFromBackground defaults to light', () => {
    expect(surfaceToneFromBackground(null)).toBe('light');
    expect(surfaceToneFromBackground('rgb(255,255,255)')).toBe('light');
    expect(surfaceToneFromBackground('rgb(10,10,10)')).toBe('dark');
  });

  it('resolveOverlaySurface normalizes role + surface', () => {
    expect(resolveOverlaySurface('yellow', 'rgb(255,255,255)')).toEqual({
      color: 'yellow',
      surface: 'light',
    });
    expect(resolveOverlaySurface('#ff0', 'rgb(0,0,0)')).toEqual({
      color: 'yellow',
      surface: 'dark',
    });
  });
});
