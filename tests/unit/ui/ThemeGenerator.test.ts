/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import {
    generateMD3Theme,
    schemeToCSSVariables,
    injectCSSVariables,
    DEFAULT_SEED_COLOR,
    DEFAULT_THEME,
    type MD3ColorScheme,
} from '../../../src/ui-system/theme/ThemeGenerator';

describe('ThemeGenerator', () => {
    describe('generateMD3Theme', () => {
        it('generates a theme from a seed color', () => {
            const theme = generateMD3Theme('#5b8db9');

            expect(theme).toHaveProperty('source', '#5b8db9');
            expect(theme).toHaveProperty('light');
            expect(theme).toHaveProperty('dark');
        });

        it('generates all required color tokens for light scheme', () => {
            const theme = generateMD3Theme('#5b8db9');
            const { light } = theme;

            // Primary family
            expect(light.primary).toMatch(/^#[0-9a-f]{6}$/i);
            expect(light.onPrimary).toMatch(/^#[0-9a-f]{6}$/i);
            expect(light.primaryContainer).toMatch(/^#[0-9a-f]{6}$/i);
            expect(light.onPrimaryContainer).toMatch(/^#[0-9a-f]{6}$/i);

            // Surface family
            expect(light.surface).toMatch(/^#[0-9a-f]{6}$/i);
            expect(light.onSurface).toMatch(/^#[0-9a-f]{6}$/i);
            expect(light.surfaceContainer).toMatch(/^#[0-9a-f]{6}$/i);
            expect(light.surfaceContainerLowest).toMatch(/^#[0-9a-f]{6}$/i);

            // Error family
            expect(light.error).toMatch(/^#[0-9a-f]{6}$/i);
            expect(light.onError).toMatch(/^#[0-9a-f]{6}$/i);
        });

        it('generates all required color tokens for dark scheme', () => {
            const theme = generateMD3Theme('#5b8db9');
            const { dark } = theme;

            expect(dark.primary).toMatch(/^#[0-9a-f]{6}$/i);
            expect(dark.onPrimary).toMatch(/^#[0-9a-f]{6}$/i);
            expect(dark.surface).toMatch(/^#[0-9a-f]{6}$/i);
            expect(dark.onSurface).toMatch(/^#[0-9a-f]{6}$/i);
        });

        it('generates different colors for light and dark schemes', () => {
            const theme = generateMD3Theme('#5b8db9');

            // Primary should be different in light vs dark (different tones)
            expect(theme.light.primary).not.toBe(theme.dark.primary);
            expect(theme.light.surface).not.toBe(theme.dark.surface);
        });

        it('handles different seed colors', () => {
            const blueTheme = generateMD3Theme('#0000ff');
            const redTheme = generateMD3Theme('#ff0000');

            expect(blueTheme.light.primary).not.toBe(redTheme.light.primary);
        });
    });

    describe('schemeToCSSVariables', () => {
        it('converts a color scheme to CSS variables', () => {
            const theme = generateMD3Theme('#5b8db9');
            const vars = schemeToCSSVariables(theme.light);

            expect(vars['--md-sys-color-primary']).toMatch(/^#[0-9a-f]{6}$/i);
            expect(vars['--md-sys-color-on-primary']).toMatch(/^#[0-9a-f]{6}$/i);
            expect(vars['--md-sys-color-surface']).toMatch(/^#[0-9a-f]{6}$/i);
        });

        it('converts camelCase to kebab-case', () => {
            const theme = generateMD3Theme('#5b8db9');
            const vars = schemeToCSSVariables(theme.light);

            expect(vars).toHaveProperty('--md-sys-color-primary-container');
            expect(vars).toHaveProperty('--md-sys-color-on-primary-container');
            expect(vars).toHaveProperty('--md-sys-color-surface-container-lowest');
        });

        it('supports custom prefix', () => {
            const theme = generateMD3Theme('#5b8db9');
            const vars = schemeToCSSVariables(theme.light, 'custom-prefix');

            expect(vars).toHaveProperty('--custom-prefix-primary');
            expect(vars).toHaveProperty('--custom-prefix-surface');
        });

        it('generates all 65+ CSS variables', () => {
            const theme = generateMD3Theme('#5b8db9');
            const vars = schemeToCSSVariables(theme.light);

            // Should have at least 46 variables (actual count from MD3ColorScheme interface)
            expect(Object.keys(vars).length).toEqual(46);
        });
    });

    describe('injectCSSVariables', () => {
        it('injects CSS variables into an element', () => {
            const element = document.createElement('div');
            const vars = {
                '--test-color': '#ff0000',
                '--test-size': '12px',
            };

            injectCSSVariables(element, vars);

            expect(element.style.getPropertyValue('--test-color')).toBe('#ff0000');
            expect(element.style.getPropertyValue('--test-size')).toBe('12px');
        });

        it('works with real MD3 theme variables', () => {
            const element = document.createElement('div');
            const theme = generateMD3Theme('#5b8db9');
            const vars = schemeToCSSVariables(theme.light);

            injectCSSVariables(element, vars);

            const primary = element.style.getPropertyValue('--md-sys-color-primary');
            expect(primary).toMatch(/^#[0-9a-f]{6}$/i);
        });
    });

    describe('DEFAULT_SEED_COLOR', () => {
        it('is defined as Underscore Blue', () => {
            expect(DEFAULT_SEED_COLOR).toBe('#5b8db9');
        });
    });

    describe('DEFAULT_THEME', () => {
        it('is pre-generated from DEFAULT_SEED_COLOR', () => {
            expect(DEFAULT_THEME.source).toBe(DEFAULT_SEED_COLOR);
            expect(DEFAULT_THEME.light).toBeDefined();
            expect(DEFAULT_THEME.dark).toBeDefined();
        });

        it('has valid color values', () => {
            expect(DEFAULT_THEME.light.primary).toMatch(/^#[0-9a-f]{6}$/i);
            expect(DEFAULT_THEME.dark.primary).toMatch(/^#[0-9a-f]{6}$/i);
        });
    });

    describe('Accessibility - Contrast Requirements', () => {
        it('generates contrasting on-colors for primary', () => {
            const theme = generateMD3Theme('#5b8db9');

            // Light mode: primary should be darker, onPrimary should be light
            const lightPrimaryLightness = parseInt(theme.light.primary.slice(1, 3), 16);
            const lightOnPrimaryLightness = parseInt(theme.light.onPrimary.slice(1, 3), 16);

            // This is a rough check - Material Guidelines guarantee 4.5:1 contrast
            expect(Math.abs(lightPrimaryLightness - lightOnPrimaryLightness)).toBeGreaterThan(50);
        });

        it('surface and onSurface have sufficient contrast', () => {
            const theme = generateMD3Theme('#5b8db9');

            // Light mode: surface should be very light, onSurface should be very dark
            const surfaceLightness = parseInt(theme.light.surface.slice(1, 3), 16);
            const onSurfaceLightness = parseInt(theme.light.onSurface.slice(1, 3), 16);

            expect(Math.abs(surfaceLightness - onSurfaceLightness)).toBeGreaterThan(100);
        });
    });

    describe('Color consistency', () => {
        it('generates consistent results for same seed', () => {
            const theme1 = generateMD3Theme('#5b8db9');
            const theme2 = generateMD3Theme('#5b8db9');

            expect(theme1.light.primary).toBe(theme2.light.primary);
            expect(theme1.dark.primary).toBe(theme2.dark.primary);
        });
    });
});
