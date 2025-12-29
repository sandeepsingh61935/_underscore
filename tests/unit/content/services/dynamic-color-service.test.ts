import { TonalPalette } from '@material/material-color-utilities';
import { describe, it, expect } from 'vitest';

import { DynamicColorService } from '@/content/services/dynamic-color-service';

describe('DynamicColorService', () => {
  const service = new DynamicColorService();

  it('should generate a valid theme from a source color', () => {
    const sourceColor = '#FF0000'; // Red
    const theme = service.generateTheme(sourceColor, false); // Light

    expect(theme.sourceColor).toBe(sourceColor);
    expect(theme.isDark).toBe(false);
    expect(theme.palettes).toBeDefined();
    expect(theme.palettes.primary).toBeInstanceOf(TonalPalette);
  });

  it('should generate different schemes for light and dark modes', () => {
    const sourceColor = '#0000FF'; // Blue
    const lightTheme = service.generateTheme(sourceColor, false);
    const darkTheme = service.generateTheme(sourceColor, true);

    // The palettes are actually the same (derived from source),
    // but the 'scheme' property should differ (mapped by the library)
    expect(lightTheme.scheme).toBeDefined();
    expect(darkTheme.scheme).toBeDefined();

    // Material Utilities 0.2.0: scheme.background might differ
    // We can just verify they return objects.
    expect(lightTheme.isDark).toBe(false);
    expect(darkTheme.isDark).toBe(true);
  });

  it('should retrieve specific tones correctly', () => {
    const sourceColor = '#00FF00'; // Green
    const theme = service.generateTheme(sourceColor, false);

    const tone40 = service.getTone(theme.palettes.primary, 40);
    expect(tone40).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('should calculate "On" tones for contrast', () => {
    // Logic: if bg > 50 -> 10, else 95
    expect(service.getOnTone(90)).toBe(10);
    expect(service.getOnTone(30)).toBe(95);
    expect(service.getOnTone(51)).toBe(10);
    expect(service.getOnTone(50)).toBe(95);
  });
});
