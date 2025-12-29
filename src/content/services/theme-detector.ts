import { argbFromHex } from '@material/material-color-utilities';

/**
 * Interface for Theme Detection
 */
export interface PageTheme {
  isDark: boolean;
  backgroundColor: number; // ARGB
  dominantColor?: number; // ARGB (Future: from image analysis?)
}

export interface IThemeDetector {
  detect(): PageTheme;
  observe(callback: (theme: PageTheme) => void): () => void;
}

/**
 * Detects the current page theme by analyzing the DOM and system preferences
 */
export class ThemeDetector implements IThemeDetector {
  private mediaQuery: MediaQueryList;

  constructor() {
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  }

  /**
   * Detect current theme state
   */
  detect(): PageTheme {
    const isDark = this.isDarkMode();
    const bgColorHex = this.getEffectiveBackgroundColor();
    const backgroundColor = argbFromHex(bgColorHex);

    return {
      isDark,
      backgroundColor,
    };
  }

  /**
   * Observe changes to theme (system preference or potentially DOM mutations)
   */
  observe(callback: (theme: PageTheme) => void): () => void {
    const handler = (): void => {
      callback(this.detect());
    };

    // Listen for system preference changes
    this.mediaQuery.addEventListener('change', handler);

    // TODO: Add MutationObserver for body class changes if needed (e.g. .dark-mode)

    return () => {
      this.mediaQuery.removeEventListener('change', handler);
    };
  }

  private isDarkMode(): boolean {
    // 1. Check system preference
    if (this.mediaQuery.matches) return true;

    // 2. Check common body classes (heuristic)
    if (
      document.body.classList.contains('dark') ||
      document.body.classList.contains('dark-mode')
    ) {
      return true;
    }

    // 3. Check computed background color brightness (most reliable)
    // Simple hex brightness check (if R+G+B < threshold)
    // For now, rely on system pref + basic class check to avoid expensive computed style parsing on every check
    // Real implementation should probably parse the hex from getEffectiveBackgroundColor

    return false;
  }

  /**
   * Traverses DOM to find the actual visible background color
   */
  private getEffectiveBackgroundColor(): string {
    let element: HTMLElement | null = document.body;

    while (element) {
      const style = window.getComputedStyle(element);
      const bgColor = style.backgroundColor;

      // Check if color is not transparent (rgba(0, 0, 0, 0))
      if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
        return this.rgbToHex(bgColor);
      }

      element = element.parentElement;
    }

    // Fallback based on system preference
    return this.mediaQuery.matches ? '#121212' : '#FFFFFF';
  }

  private rgbToHex(rgb: string): string {
    // Handle "rgb(r, g, b)" or "rgba(r, g, b, a)"
    const result = rgb.match(/\d+/g);

    if (!result || result.length < 3) return '#FFFFFF';

    const r = parseInt(result[0]!, 10);
    const g = parseInt(result[1]!, 10);
    const b = parseInt(result[2]!, 10);

    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
}
