/**
 * @file highlight-contrast.ts
 * @description Binary light/dark overlay packs from sampled page background.
 */

import type { ColorRole } from '@/shared/schemas/highlight-schema';
import { resolveColorRoleForPaint } from '@/content/styles/highlight-styles';

export type SurfaceTone = 'light' | 'dark';

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

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

/** True when background is light enough to need dark-tint wash. */
export function isLightBackground(rgb: Rgb, threshold = 0.55): boolean {
  return relativeLuminance(rgb) >= threshold;
}

export function surfaceToneFromBackground(cssColor: string | null | undefined): SurfaceTone {
  const rgb = cssColor ? parseCssColor(cssColor) : null;
  if (!rgb) return 'light';
  return isLightBackground(rgb) ? 'light' : 'dark';
}

/**
 * Resolve data attributes for overlay CSS packs.
 * Packs live in highlight-paint.css as [data-color][data-surface].
 */
export function resolveOverlaySurface(
  colorRole: string,
  backgroundCss: string | null | undefined
): { color: ColorRole; surface: SurfaceTone } {
  return {
    color: resolveColorRoleForPaint(colorRole),
    surface: surfaceToneFromBackground(backgroundCss),
  };
}
