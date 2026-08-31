/**
 * @file highlight-contrast.ts
 * @description Underscore stroke from inverted page background (+ contrast floor).
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const DEFAULT_BG: Rgb = { r: 255, g: 255, b: 255 };
const STROKE_ON_LIGHT = '#111111';
const STROKE_ON_DARK = '#f5f5f5';
/** WCAG-ish floor; below this invert is treated as unusable (e.g. mid-gray). */
const MIN_CONTRAST_RATIO = 3;

/** Relative luminance (sRGB), 0–1. */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const lin = (c: number): number => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * Parse CSS color strings from getComputedStyle.
 * Supports rgb/rgba and #rgb / #rrggbb.
 */
export function parseCssColor(input: string): Rgb | null {
  const s = input.trim().toLowerCase();
  if (!s || s === 'transparent' || s === 'inherit' || s === 'initial') {
    return null;
  }

  const rgbMatch = s.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/
  );
  if (rgbMatch) {
    const a = rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1;
    if (a <= 0) return null;
    return {
      r: Math.round(parseFloat(rgbMatch[1]!)),
      g: Math.round(parseFloat(rgbMatch[2]!)),
      b: Math.round(parseFloat(rgbMatch[3]!)),
    };
  }

  if (s.startsWith('#')) {
    const hex = s.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0]! + hex[0]!, 16),
        g: parseInt(hex[1]! + hex[1]!, 16),
        b: parseInt(hex[2]! + hex[2]!, 16),
      };
    }
    if (hex.length === 6 || hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
  }

  return null;
}

export function formatRgb({ r, g, b }: Rgb): string {
  return `rgb(${r}, ${g}, ${b})`;
}

/** Per-channel invert. */
export function invertRgb({ r, g, b }: Rgb): Rgb {
  return { r: 255 - r, g: 255 - g, b: 255 - b };
}

/** WCAG 2 contrast ratio between two sRGB colors. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function isLightBackground(rgb: Rgb, threshold = 0.55): boolean {
  return relativeLuminance(rgb) >= threshold;
}

/**
 * Underscore stroke color from sampled page background.
 * 1) Per-channel invert of bg
 * 2) If contrast vs bg is too low (mid-gray case), snap to near-black or near-white
 */
export function resolveUnderscoreStroke(
  backgroundCss: string | null | undefined
): string {
  const bg = (backgroundCss ? parseCssColor(backgroundCss) : null) ?? DEFAULT_BG;
  const inverted = invertRgb(bg);

  if (contrastRatio(inverted, bg) >= MIN_CONTRAST_RATIO) {
    return formatRgb(inverted);
  }

  return isLightBackground(bg) ? STROKE_ON_LIGHT : STROKE_ON_DARK;
}
