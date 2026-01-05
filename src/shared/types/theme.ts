/**
 * Theme Type Definitions
 * Minimal theme system for Light/Dark/System support
 */

export const Theme = {
    LIGHT: 'light',
    DARK: 'dark',
    SYSTEM: 'system',
} as const;

export type ThemeType = (typeof Theme)[keyof typeof Theme];

/**
 * Type guard for ThemeType
 */
export function isValidTheme(value: unknown): value is ThemeType {
    return (
        typeof value === 'string' &&
        Object.values(Theme).includes(value as ThemeType)
    );
}
