import type { TonalPalette, Theme, Scheme } from '@material/material-color-utilities';
import {
  argbFromHex,
  hexFromArgb,
  themeFromSourceColor,
} from '@material/material-color-utilities';

/**
 * Represents a set of tonal palettes for a theme
 */
export interface ColorPalettes {
  primary: TonalPalette;
  secondary: TonalPalette;
  tertiary: TonalPalette;
  neutral: TonalPalette;
  error: TonalPalette;
}

/**
 * Represents a complete accessible theme
 */
export interface GeneratedTheme {
  sourceColor: string;
  isDark: boolean;
  palettes: ColorPalettes;
  scheme: Scheme; // Material Scheme (light or dark)
}

/**
 * Service to generate accessible color schemes using Material Design 3 algorithms
 */
export class DynamicColorService {
  /**
   * Generate a complete theme from a single source color
   * @param sourceColorHex - The seed color (e.g. from page background or logo)
   * @param isDark - Whether to generate for Dark Mode
   */
  generateTheme(sourceColorHex: string, isDark: boolean): GeneratedTheme {
    const sourceArgb = argbFromHex(sourceColorHex);

    // Generate the full Material Design 3 theme
    // This includes both light and dark schemes, and all tonal palettes
    const theme: Theme = themeFromSourceColor(sourceArgb);

    return {
      sourceColor: sourceColorHex,
      isDark,
      palettes: theme.palettes,
      // Select the appropriate scheme based on mode
      scheme: isDark ? theme.schemes.dark : theme.schemes.light,
    };
  }

  /**
   * Get a specific color role from a palette with guaranteed contrast
   * @param palette - The TonalPalette to extract from
   * @param tone - The target tone (0-100)
   */
  getTone(palette: TonalPalette, tone: number): string {
    return hexFromArgb(palette.tone(tone));
  }

  /**
   * Calculate a safe "On" color (text color) for a given background tone
   * Rule of thumb: Differential of 60 tone units is usually checking contrast,
   * but MD3 simplifies this:
   * - If bg > 60 (Light), text should be 10 or 20
   * - If bg < 40 (Dark), text should be 90 or 95
   */
  getOnTone(bgTone: number): number {
    return bgTone > 50 ? 10 : 95;
  }
}
