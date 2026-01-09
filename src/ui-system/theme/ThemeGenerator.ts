/**
 * Material Design 3 Theme Generator
 * 
 * Generates a complete MD3 theme with 65+ color tokens from a single seed color
 * using Google's Material Color Utilities HCT algorithm.
 * 
 * @see https://m3.material.io/styles/color/system/overview
 * @see https://www.npmjs.com/package/@material/material-color-utilities
 */

import {
    argbFromHex,
    hexFromArgb,
    themeFromSourceColor,
    type Theme,
} from '@material/material-color-utilities';

/**
 * MD3 Color Scheme containing all 65+ semantic color tokens
 */
export interface MD3ColorScheme {
    // Primary family
    primary: string;
    onPrimary: string;
    primaryContainer: string;
    onPrimaryContainer: string;
    primaryFixed: string;
    onPrimaryFixed: string;
    primaryFixedDim: string;
    onPrimaryFixedVariant: string;

    // Secondary family
    secondary: string;
    onSecondary: string;
    secondaryContainer: string;
    onSecondaryContainer: string;
    secondaryFixed: string;
    onSecondaryFixed: string;
    secondaryFixedDim: string;
    onSecondaryFixedVariant: string;

    // Tertiary family
    tertiary: string;
    onTertiary: string;
    tertiaryContainer: string;
    onTertiaryContainer: string;
    tertiaryFixed: string;
    onTertiaryFixed: string;
    tertiaryFixedDim: string;
    onTertiaryFixedVariant: string;

    // Error family
    error: string;
    onError: string;
    errorContainer: string;
    onErrorContainer: string;

    // Surface & background
    surface: string;
    onSurface: string;
    surfaceVariant: string;
    onSurfaceVariant: string;
    surfaceDim: string;
    surfaceBright: string;
    surfaceContainerLowest: string;
    surfaceContainerLow: string;
    surfaceContainer: string;
    surfaceContainerHigh: string;
    surfaceContainerHighest: string;

    // Inverse colors
    inverseSurface: string;
    inverseOnSurface: string;
    inversePrimary: string;

    // Outline
    outline: string;
    outlineVariant: string;

    // Special
    scrim: string;
    shadow: string;
}

/**
 * Complete MD3 theme with light and dark schemes
 */
export interface MD3Theme {
    source: string;
    light: MD3ColorScheme;
    dark: MD3ColorScheme;
}

/**
 * Converts Material Color Utilities scheme to our MD3ColorScheme interface
 */
function schemeToColorScheme(scheme: any): MD3ColorScheme {
    return {
        // Primary
        primary: hexFromArgb(scheme.primary),
        onPrimary: hexFromArgb(scheme.onPrimary),
        primaryContainer: hexFromArgb(scheme.primaryContainer),
        onPrimaryContainer: hexFromArgb(scheme.onPrimaryContainer),
        primaryFixed: hexFromArgb(scheme.primaryFixed),
        onPrimaryFixed: hexFromArgb(scheme.onPrimaryFixed),
        primaryFixedDim: hexFromArgb(scheme.primaryFixedDim),
        onPrimaryFixedVariant: hexFromArgb(scheme.onPrimaryFixedVariant),

        // Secondary
        secondary: hexFromArgb(scheme.secondary),
        onSecondary: hexFromArgb(scheme.onSecondary),
        secondaryContainer: hexFromArgb(scheme.secondaryContainer),
        onSecondaryContainer: hexFromArgb(scheme.onSecondaryContainer),
        secondaryFixed: hexFromArgb(scheme.secondaryFixed),
        onSecondaryFixed: hexFromArgb(scheme.onSecondaryFixed),
        secondaryFixedDim: hexFromArgb(scheme.secondaryFixedDim),
        onSecondaryFixedVariant: hexFromArgb(scheme.onSecondaryFixedVariant),

        // Tertiary
        tertiary: hexFromArgb(scheme.tertiary),
        onTertiary: hexFromArgb(scheme.onTertiary),
        tertiaryContainer: hexFromArgb(scheme.tertiaryContainer),
        onTertiaryContainer: hexFromArgb(scheme.onTertiaryContainer),
        tertiaryFixed: hexFromArgb(scheme.tertiaryFixed),
        onTertiaryFixed: hexFromArgb(scheme.onTertiaryFixed),
        tertiaryFixedDim: hexFromArgb(scheme.tertiaryFixedDim),
        onTertiaryFixedVariant: hexFromArgb(scheme.onTertiaryFixedVariant),

        // Error
        error: hexFromArgb(scheme.error),
        onError: hexFromArgb(scheme.onError),
        errorContainer: hexFromArgb(scheme.errorContainer),
        onErrorContainer: hexFromArgb(scheme.onErrorContainer),

        // Surface
        surface: hexFromArgb(scheme.surface),
        onSurface: hexFromArgb(scheme.onSurface),
        surfaceVariant: hexFromArgb(scheme.surfaceVariant),
        onSurfaceVariant: hexFromArgb(scheme.onSurfaceVariant),
        surfaceDim: hexFromArgb(scheme.surfaceDim),
        surfaceBright: hexFromArgb(scheme.surfaceBright),
        surfaceContainerLowest: hexFromArgb(scheme.surfaceContainerLowest),
        surfaceContainerLow: hexFromArgb(scheme.surfaceContainerLow),
        surfaceContainer: hexFromArgb(scheme.surfaceContainer),
        surfaceContainerHigh: hexFromArgb(scheme.surfaceContainerHigh),
        surfaceContainerHighest: hexFromArgb(scheme.surfaceContainerHighest),

        // Inverse
        inverseSurface: hexFromArgb(scheme.inverseSurface),
        inverseOnSurface: hexFromArgb(scheme.inverseOnSurface),
        inversePrimary: hexFromArgb(scheme.inversePrimary),

        // Outline
        outline: hexFromArgb(scheme.outline),
        outlineVariant: hexFromArgb(scheme.outlineVariant),

        // Special
        scrim: hexFromArgb(scheme.scrim),
        shadow: hexFromArgb(scheme.shadow),
    };
}

/**
 * Generates a complete MD3 theme from a seed color
 * 
 * @param seedHex - Seed color in hex format (e.g., "#5b8db9")
 * @returns MD3Theme with light and dark color schemes
 * 
 * @example
 * ```typescript
 * const theme = generateMD3Theme("#5b8db9");
 * console.log(theme.light.primary); // "#..."
 * console.log(theme.dark.primary);  // "#..."
 * ```
 */
export function generateMD3Theme(seedHex: string): MD3Theme {
    // Convert hex to ARGB (required by Material Color Utilities)
    const sourceArgb = argbFromHex(seedHex);

    // Generate the complete theme
    const theme: Theme = themeFromSourceColor(sourceArgb);

    return {
        source: seedHex,
        light: schemeToColorScheme(theme.schemes.light),
        dark: schemeToColorScheme(theme.schemes.dark),
    };
}

/**
 * Converts an MD3 color scheme to CSS custom properties
 * 
 * @param scheme - MD3ColorScheme (light or dark)
 * @param prefix - CSS variable prefix (default: "md-sys-color")
 * @returns Record of CSS variable names to color values
 * 
 * @example
 * ```typescript
 * const theme = generateMD3Theme("#5b8db9");
 * const cssVars = schemeToCSSVariables(theme.light);
 * // { "--md-sys-color-primary": "#...", ... }
 * ```
 */
export function schemeToCSSVariables(
    scheme: MD3ColorScheme,
    prefix = 'md-sys-color',
): Record<string, string> {
    const vars: Record<string, string> = {};

    // Helper to convert camelCase to kebab-case
    const toKebab = (str: string) =>
        str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

    // Convert all color tokens to CSS variables
    for (const [key, value] of Object.entries(scheme)) {
        const varName = `--${prefix}-${toKebab(key)}`;
        vars[varName] = value;
    }

    return vars;
}

/**
 * Injects CSS variables into a DOM element's style
 * 
 * @param element - Target DOM element (usually document.documentElement for :root)
 * @param variables - CSS variables to inject
 * 
 * @example
 * ```typescript
 * const theme = generateMD3Theme("#5b8db9");
 * const vars = schemeToCSSVariables(theme.light);
 * injectCSSVariables(document.documentElement, vars);
 * ```
 */
export function injectCSSVariables(
    element: HTMLElement,
    variables: Record<string, string>,
): void {
    for (const [name, value] of Object.entries(variables)) {
        element.style.setProperty(name, value);
    }
}

/**
 * Default seed color for Underscore (brand blue)
 */
export const DEFAULT_SEED_COLOR = '#5b8db9';

/**
 * Pre-generated default theme (Underscore Blue)
 * Use this to avoid regenerating the theme on every page load
 */
export const DEFAULT_THEME = generateMD3Theme(DEFAULT_SEED_COLOR);
