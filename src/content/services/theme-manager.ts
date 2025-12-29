import type { GeneratedTheme } from './dynamic-color-service';
import { DynamicColorService } from './dynamic-color-service';
import type { IThemeDetector } from './theme-detector';
import { ThemeDetector } from './theme-detector';

import { EventName } from '@/shared/types/events';
import { eventBus } from '@/shared/utils/event-bus';
import { ConsoleLogger } from '@/shared/utils/logger';

/**
 * Orchestrates the application of the dynamic theme.
 * Acts as a Mediator between ThemeDetector, DynamicColorService, and the DOM.
 */
export class ThemeManager {
  private detector: IThemeDetector;
  private colorService: DynamicColorService;
  private logger: ConsoleLogger;
  private stopObserving?: () => void;

  constructor() {
    this.detector = new ThemeDetector();
    this.colorService = new DynamicColorService();
    this.logger = new ConsoleLogger('ThemeManager');
  }

  /**
   * Initialize the theme manager and start observing changes
   */
  initialize(): void {
    // Initial detection
    this.applyTheme();

    // Observe changes
    this.stopObserving = this.detector.observe(() => {
      this.logger.debug('Theme change detected, reapplying colors...');
      this.applyTheme();
    });
  }

  /**
   * Cleanup observers
   */
  destroy(): void {
    if (this.stopObserving) {
      this.stopObserving();
    }
  }

  /**
   * Detects, generates, and applies the theme
   */
  private applyTheme(): void {
    try {
      const pageTheme = this.detector.detect();
      const theme = this.colorService.generateTheme(
        // Use ARGB to Hex conversion if needed, but detector returns ARGB number?
        // Wait, detector returns ARGB number, service takes Hex string.
        // Let's allow detector to return the hex string it calculated internally for efficiency
        // or convert back. For now, let's fix the type flow.
        // ThemeDetector.detect() returns { backgroundColor: number } (ARGB)
        // DynamicColorService.generateTheme() takes (sourceColorHex: string)

        // We need to convert ARGB number back to Hex string or update Service to take ARGB.
        // Material Utilities usually work with ARGB.
        // Let's simply hex string from the detector for now to match the service.
        this.argbToHex(pageTheme.backgroundColor),
        pageTheme.isDark
      );

      this.injectThemeVariables(theme);
      this.emitThemeEvent(theme);
    } catch (error) {
      this.logger.error('Failed to apply dynamic theme', error as Error);
    }
  }

  /**
   * Injects CSS variables into the document root
   */
  private injectThemeVariables(theme: GeneratedTheme): void {
    const root = document.documentElement;
    const { palettes } = theme;

    // Need to use computed style or style object directly on root
    const style = root.style;

    // Helper to set variable
    const setVar = (name: string, hex: string): void => {
      style.setProperty(name, hex);
    };

    // 1. Primary Colors
    // Use Tone 40 (Light) / 80 (Dark) for Primary
    const primaryTone = theme.isDark ? 80 : 40;
    const onPrimaryTone = theme.isDark ? 20 : 100;

    setVar(
      '--md-sys-color-primary',
      this.colorService.getTone(palettes.primary, primaryTone)
    );
    setVar(
      '--md-sys-color-on-primary',
      this.colorService.getTone(palettes.primary, onPrimaryTone)
    );

    // 2. Primary Container (Highlight Background)
    // Use Tone 90 (Light) / 30 (Dark)
    const containerTone = theme.isDark ? 30 : 90;
    const onContainerTone = theme.isDark ? 90 : 10;

    setVar(
      '--md-sys-color-primary-container',
      this.colorService.getTone(palettes.primary, containerTone)
    );
    setVar(
      '--md-sys-color-on-primary-container',
      this.colorService.getTone(palettes.primary, onContainerTone)
    );

    // 3. Surface
    const surfaceTone = theme.isDark ? 10 : 99;
    const onSurfaceTone = theme.isDark ? 90 : 10;

    setVar(
      '--md-sys-color-surface',
      this.colorService.getTone(palettes.neutral, surfaceTone)
    );
    setVar(
      '--md-sys-color-on-surface',
      this.colorService.getTone(palettes.neutral, onSurfaceTone)
    );

    // 4. Legacy/Compatibility Variables (mapped to new dynamic roles)
    // Map --highlight-yellow to the dynamic primary container for backward compatibility
    setVar('--highlight-yellow', `var(--md-sys-color-primary-container)`);
    setVar('--highlight-yellow-contrast', `var(--md-sys-color-on-primary-container)`);
  }

  private emitThemeEvent(theme: GeneratedTheme): void {
    eventBus.emit(EventName.THEME_CHANGED, {
      type: EventName.THEME_CHANGED,
      timestamp: new Date(),
      isDark: theme.isDark,
      sourceColor: theme.sourceColor,
    });
  }

  private argbToHex(argb: number): string {
    return '#' + (argb & 0x00ffffff).toString(16).padStart(6, '0');
  }
}
