/**
 * Theme Detector
 * 
 * Detects website background color and luminance for adaptive theming
 * Based on Material Design 3 principles
 */

export interface SiteTheme {
    backgroundColor: string;  // RGB hex
    luminance: number;        // 0-1 (0=black, 1=white)
    isDark: boolean;          // luminance < 0.5
}

/**
 * Get effective background color at a point
 * Walks up the DOM tree to find first opaque background
 */
export function getBackgroundColorAt(element: Element): string {
    let current: Element | null = element;

    while (current) {
        const style = window.getComputedStyle(current);
        const bgColor = style.backgroundColor;

        // Check if opaque (not transparent)
        if (bgColor && !bgColor.includes('rgba(0, 0, 0, 0)') && bgColor !== 'transparent') {
            return bgColor;
        }

        current = current.parentElement;
    }

    // Default: white background
    return 'rgb(255, 255, 255)';
}

/**
 * Calculate relative luminance per WCAG 2.1 formula
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 * 
 * @param rgb RGB color values (0-255)
 * @returns Luminance value (0-1)
 */
export function calculateLuminance(rgb: { r: number, g: number, b: number }): number {
    // Convert to 0-1 range and apply gamma correction
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
        val = val / 255;
        return val <= 0.03928
            ? val / 12.92
            : Math.pow((val + 0.055) / 1.055, 2.4);
    });

    // WCAG formula: weighted sum
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Parse RGB color string to components
 */
export function parseRGB(color: string): { r: number, g: number, b: number } {
    // Handle rgb() format
    const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
        return {
            r: parseInt(rgbMatch[1]),
            g: parseInt(rgbMatch[2]),
            b: parseInt(rgbMatch[3])
        };
    }

    // Handle rgba() format
    const rgbaMatch = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
    if (rgbaMatch) {
        return {
            r: parseInt(rgbaMatch[1]),
            g: parseInt(rgbaMatch[2]),
            b: parseInt(rgbaMatch[3])
        };
    }

    // Handle hex format
    const hexMatch = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (hexMatch) {
        return {
            r: parseInt(hexMatch[1], 16),
            g: parseInt(hexMatch[2], 16),
            b: parseInt(hexMatch[3], 16)
        };
    }

    // Default: white
    return { r: 255, g: 255, b: 255 };
}

/**
 * Detect site theme at selection point
 * 
 * @param selection Current user selection
 * @returns SiteTheme with background color and luminance
 */
export function detectSiteTheme(selection: Selection): SiteTheme {
    if (selection.rangeCount === 0) {
        // Fallback: use body background
        const bgColor = getBackgroundColorAt(document.body);
        const rgb = parseRGB(bgColor);
        const luminance = calculateLuminance(rgb);

        return {
            backgroundColor: bgColor,
            luminance,
            isDark: luminance < 0.5
        };
    }

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const element = container.nodeType === Node.ELEMENT_NODE
        ? container as Element
        : container.parentElement!;

    const bgColor = getBackgroundColorAt(element);
    const rgb = parseRGB(bgColor);
    const luminance = calculateLuminance(rgb);

    return {
        backgroundColor: bgColor,
        luminance,
        isDark: luminance < 0.5
    };
}
