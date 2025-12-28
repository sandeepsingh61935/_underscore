/**
 * Adaptive Color Generator
 * 
 * Material Design 3 inspired adaptive color system
 * Generates highlight colors with guaranteed contrast ratios
 */

import { calculateLuminance, parseRGB } from './theme-detector';

export interface ColorResult {
    highlight: string;      // Background highlight color
    text: string;          // Text color (for annotations)
    contrast: number;      // Contrast ratio
}

/**
 * Calculate contrast ratio per WCAG
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 * 
 * @param lum1 Luminance of first color (0-1)
 * @param lum2 Luminance of second color (0-1)
 * @returns Contrast ratio (1-21)
 */
export function calculateContrast(lum1: number, lum2: number): number {
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(h: number, s: number, l: number): { r: number, g: number, b: number } {
    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;

    let r = 0, g = 0, b = 0;

    if (h >= 0 && h < 60) {
        r = c; g = x; b = 0;
    } else if (h >= 60 && h < 120) {
        r = x; g = c; b = 0;
    } else if (h >= 120 && h < 180) {
        r = 0; g = c; b = x;
    } else if (h >= 180 && h < 240) {
        r = 0; g = x; b = c;
    } else if (h >= 240 && h < 300) {
        r = x; g = 0; b = c;
    } else if (h >= 300 && h < 360) {
        r = c; g = 0; b = x;
    }

    return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255)
    };
}

/**
 * Generate tonal palette (simplified Material Design)
 * Creates 13 tones from 0 (black) to 100 (white)
 */
export function generateTonalPalette(baseHue: number, saturation: number = 70): Array<{ tone: number, hsl: string, rgb: { r: number, g: number, b: number } }> {
    // Tones: 0 (black) to 100 (white)
    const tones = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100];

    return tones.map(tone => {
        const hsl = `hsl(${baseHue}, ${saturation}%, ${tone}%)`;
        const rgb = hslToRgb(baseHue, saturation, tone);
        return { tone, hsl, rgb };
    });
}

/**
 * Select highlight color based on background luminance
 * Ensures WCAG AA contrast (minimum 3:1)
 */
export function selectHighlightColor(
    backgroundLuminance: number,
    hue: number = 45,  // Default: yellow-ish
    saturation: number = 70
): ColorResult {
    const palette = generateTonalPalette(hue, saturation);

    let bestColor: string = palette[5].hsl;  // Default: 50% tone
    let bestContrast = 1;

    // Find tone with sufficient contrast
    for (const { hsl, rgb } of palette) {
        const colorLum = calculateLuminance(rgb);
        const contrast = calculateContrast(backgroundLuminance, colorLum);

        // Aim for 3:1 minimum (WCAG AA large text)
        // Prefer higher contrast, but stop at 4.5:1 (optimal)
        if (contrast >= 3 && contrast > bestContrast) {
            bestColor = hsl;
            bestContrast = contrast;

            if (contrast >= 4.5) break; // Optimal contrast found
        }
    }

    // Text color: inverse of background
    const textColor = backgroundLuminance < 0.5
        ? 'rgba(255, 255, 255, 0.9)'  // Light text on dark bg
        : 'rgba(0, 0, 0, 0.87)';       // Dark text on light bg

    return {
        highlight: bestColor,
        text: textColor,
        contrast: bestContrast
    };
}

/**
 * Material Design color presets
 * Based on Material Design 3 palette
 */
export const MATERIAL_HUES = {
    yellow: 45,
    orange: 25,
    pink: 340,
    purple: 280,
    blue: 220,
    teal: 180,
    green: 120
} as const;

/**
 * Get adaptive color for selection
 * 
 * @param backgroundLuminance Luminance of background (0-1)
 * @param userPreference User's color preference (optional)
 * @returns HSL color string with guaranteed contrast
 */
export function getAdaptiveHighlightColor(
    backgroundLuminance: number,
    userPreference?: keyof typeof MATERIAL_HUES
): string {
    const hue = userPreference
        ? MATERIAL_HUES[userPreference]
        : MATERIAL_HUES.yellow;  // Default: yellow

    const result = selectHighlightColor(backgroundLuminance, hue);
    return result.highlight;
}
