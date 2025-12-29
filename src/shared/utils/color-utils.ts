/**
 * @file color-utils.ts
 * @description Color manipulation utilities for contrast-aware highlighting
 */

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1]!, 16),
            g: parseInt(result[2]!, 16),
            b: parseInt(result[3]!, 16),
        }
        : null;
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map((x) => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

/**
 * Calculate relative luminance (WCAG formula)
 * Returns value between 0 (darkest) and 1 (lightest)
 */
export function getLuminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r, g, b].map((c) => {
        const val = c / 255;
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs! + 0.7152 * gs! + 0.0722 * bs!;
}

/**
 * Check if a color is dark (luminance < 0.5)
 */
export function isDarkColor(hex: string): boolean {
    const rgb = hexToRgb(hex);
    if (!rgb) return false;
    return getLuminance(rgb.r, rgb.g, rgb.b) < 0.5;
}

/**
 * Lighten a color by a percentage (0-100)
 */
export function lightenColor(hex: string, percent: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const amount = percent / 100;
    const r = Math.min(255, rgb.r + (255 - rgb.r) * amount);
    const g = Math.min(255, rgb.g + (255 - rgb.g) * amount);
    const b = Math.min(255, rgb.b + (255 - rgb.b) * amount);

    return rgbToHex(r, g, b);
}

/**
 * Darken a color by a percentage (0-100)
 */
export function darkenColor(hex: string, percent: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const amount = 1 - percent / 100;
    const r = Math.max(0, rgb.r * amount);
    const g = Math.max(0, rgb.g * amount);
    const b = Math.max(0, rgb.b * amount);

    return rgbToHex(r, g, b);
}

/**
 * Get computed background color of an element
 * Walks up DOM tree until non-transparent background is found
 */
export function getBackgroundColor(element: Element): string {
    let currentElement: Element | null = element;

    while (currentElement && currentElement !== document.body) {
        const bg = window.getComputedStyle(currentElement).backgroundColor;

        // Check if background is not transparent
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
            // Convert rgba to hex
            const match = bg.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/);
            if (match) {
                return rgbToHex(parseInt(match[1]!, 10), parseInt(match[2]!, 10), parseInt(match[3]!, 10));
            }
        }

        currentElement = currentElement.parentElement;
    }

    // Default to white if no background found
    return '#FFFFFF';
}

/**
 * Adjust color for optimal contrast against background
 * - Dark background → Lighten color
 * - Light background → Keep or slightly darken
 */
export function getContrastAdjustedColor(color: string, backgroundColor: string): string {
    const bgIsDark = isDarkColor(backgroundColor);

    if (bgIsDark) {
        // Dark background - lighten the color significantly
        return lightenColor(color, 40);
    } else {
        // Light background - darken slightly for better visibility
        return darkenColor(color, 10);
    }
}
