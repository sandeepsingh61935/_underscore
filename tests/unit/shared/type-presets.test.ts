import { describe, expect, it } from 'vitest';

import {
  BUILTIN_TYPE_PRESET_LIST,
  BUILTIN_TYPE_PRESETS,
  DEFAULT_MARGINS,
  DEFAULT_SCALE,
  DEFAULT_SPACING,
  applyTypeTypography,
  buildCustomGoogleFontsUrl,
  parseTypePresetStorage,
  resolveBuiltinTokens,
  resolveCustomTypeFonts,
  resolveTypography,
  resolveTypographyTokens,
  selectionsEqual,
  toFontFamilyCss,
  validateGoogleFontName,
  validateTypographyTokens,
  type TypographyTokens,
} from '@/shared/constants/type-presets';

describe('type-presets', () => {
  it('parses builtin selection', () => {
    expect(parseTypePresetStorage({ kind: 'builtin', id: 'modern' })).toEqual({
      kind: 'builtin',
      id: 'modern',
    });
  });

  it('parses legacy builtin shape', () => {
    expect(parseTypePresetStorage({ id: 'classic' })).toEqual({
      kind: 'builtin',
      id: 'classic',
    });
  });

  it('migrates legacy custom fonts-only preset', () => {
    const parsed = parseTypePresetStorage({
      kind: 'custom',
      preset: { serif: 'Lora', sans: 'Work Sans', mono: 'Roboto Mono' },
    });
    expect(parsed.kind).toBe('custom');
    if (parsed.kind === 'custom') {
      expect(parsed.preset.fonts).toEqual({
        serif: 'Lora',
        sans: 'Work Sans',
        mono: 'Roboto Mono',
      });
      expect(parsed.preset.scale).toEqual(DEFAULT_SCALE);
      expect(parsed.preset.spacing).toEqual(DEFAULT_SPACING);
      expect(parsed.preset.margins).toEqual(DEFAULT_MARGINS);
    }
  });

  it('falls back to editorial default', () => {
    expect(parseTypePresetStorage(null)).toEqual({ kind: 'builtin', id: 'editorial' });
  });

  it('resolves builtin fonts with google bundle', () => {
    const fonts = resolveTypography({ kind: 'builtin', id: 'editorial' });
    expect(fonts.serif).toContain('Source Serif 4');
    expect(fonts.google).toContain('Source+Serif+4');
  });

  it('builds custom google fonts url', () => {
    const url = buildCustomGoogleFontsUrl('Lora', 'Work Sans', 'Roboto Mono');
    expect(url).toContain('family=Lora');
    expect(url).toContain('family=Work+Sans');
    expect(url).toContain('family=Roboto+Mono');
  });

  it('resolves custom font css stacks', () => {
    const tokens: TypographyTokens = {
      fonts: { serif: 'Lora', sans: 'Work Sans', mono: 'Roboto Mono' },
      scale: DEFAULT_SCALE,
      spacing: DEFAULT_SPACING,
      margins: DEFAULT_MARGINS,
    };
    const fonts = resolveCustomTypeFonts(tokens.fonts);
    expect(fonts.serif).toBe('"Lora", Georgia, serif');
    expect(fonts.sans).toBe('"Work Sans", -apple-system, Arial, sans-serif');
    expect(fonts.mono).toBe('"Roboto Mono", ui-monospace, monospace');
  });

  it('validates google font names', () => {
    expect(validateGoogleFontName('Source Serif 4').valid).toBe(true);
    expect(validateGoogleFontName('').valid).toBe(false);
    expect(validateGoogleFontName('Bad!').valid).toBe(false);
  });

  it('validates typography token bundle', () => {
    expect(
      validateTypographyTokens({
        fonts: { serif: 'Lora', sans: 'Work Sans', mono: 'Roboto Mono' },
        scale: DEFAULT_SCALE,
        spacing: DEFAULT_SPACING,
        margins: DEFAULT_MARGINS,
      }).valid
    ).toBe(true);
    expect(
      validateTypographyTokens({
        fonts: { serif: '', sans: 'Inter', mono: 'Mono' },
        scale: DEFAULT_SCALE,
        spacing: DEFAULT_SPACING,
        margins: DEFAULT_MARGINS,
      }).valid
    ).toBe(false);
  });

  it('compares selections', () => {
    const tokens: TypographyTokens = {
      fonts: { serif: 'A', sans: 'B', mono: 'C' },
      scale: DEFAULT_SCALE,
      spacing: DEFAULT_SPACING,
      margins: DEFAULT_MARGINS,
    };
    expect(
      selectionsEqual(
        { kind: 'builtin', id: 'modern' },
        { kind: 'builtin', id: 'modern' }
      )
    ).toBe(true);
    expect(
      selectionsEqual(
        { kind: 'custom', preset: tokens },
        { kind: 'custom', preset: tokens }
      )
    ).toBe(true);
    expect(
      selectionsEqual(
        { kind: 'builtin', id: 'modern' },
        { kind: 'builtin', id: 'classic' }
      )
    ).toBe(false);
  });

  it('maps css family from google name', () => {
    expect(toFontFamilyCss('Playfair Display', 'serif')).toBe(
      '"Playfair Display", serif'
    );
    expect(toFontFamilyCss('  ', 'serif')).toBe('serif');
  });

  it('ships twenty built-in presets', () => {
    expect(BUILTIN_TYPE_PRESET_LIST).toHaveLength(20);
    expect(BUILTIN_TYPE_PRESETS.editorial.name).toBe('Editorial');
    expect(BUILTIN_TYPE_PRESETS['space-tech'].fonts.mono).toBe('Space Mono');
  });

  it('resolves builtin tokens with scale bundle', () => {
    const tokens = resolveBuiltinTokens('montserrat-geo');
    expect(tokens.scale['step-3']).toBe('24px');
    expect(tokens.scale['step-2']).toBe('19px');
  });

  it('resolves typography tokens for custom selection', () => {
    const custom = resolveTypographyTokens({
      kind: 'custom',
      preset: resolveBuiltinTokens('editorial'),
    });
    expect(custom.fonts.serif).toBe('Source Serif 4');
  });

  it('applies typography css variables to document root', () => {
    const resolved = resolveTypography({ kind: 'builtin', id: 'editorial' });
    applyTypeTypography(resolved);
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--serif')).toContain('Source Serif 4');
    expect(root.style.getPropertyValue('--step-3')).toBe('22px');
    expect(root.style.getPropertyValue('--type-body-lh')).toBe('1.45');
    expect(root.style.getPropertyValue('--type-row-height')).toBe('44px');
  });
});
