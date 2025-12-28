/**
 * Theme Manager
 * 
 * Detects and manages theme state for reactive CSS theming
 */

import { LoggerFactory } from '@/shared/utils/logger';
import type { ILogger } from '@/shared/utils/logger';

export type Theme = 'light' | 'dark' | 'auto';

export class ThemeManager {
    private currentTheme: Theme = 'auto';
    private logger: ILogger;

    constructor() {
        this.logger = LoggerFactory.getLogger('ThemeManager');
        this.initialize();
    }

    /**
     * Initialize theme system
     */
    private initialize(): void {
        this.applyTheme();
        this.observeSystemTheme();
        this.logger.info('ThemeManager initialized', {
            theme: this.currentTheme,
            resolved: this.resolveTheme()
        });
    }

    /**
     * Apply theme to document
     */
    private applyTheme(): void {
        const theme = this.resolveTheme();

        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            this.logger.debug('Applied dark theme');
        } else {
            document.documentElement.removeAttribute('data-theme');
            this.logger.debug('Applied light theme');
        }
    }

    /**
     * Resolve theme based on preference
     */
    private resolveTheme(): 'light' | 'dark' {
        if (this.currentTheme === 'auto') {
            const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            return isDark ? 'dark' : 'light';
        }
        return this.currentTheme;
    }

    /**
     * Observe system theme changes
     */
    private observeSystemTheme(): void {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        mediaQuery.addEventListener('change', (e) => {
            if (this.currentTheme === 'auto') {
                this.logger.info('System theme changed', { isDark: e.matches });
                this.applyTheme();
            }
        });
    }

    /**
     * Set theme preference
     */
    setTheme(theme: Theme): void {
        this.logger.info('Theme preference changed', {
            from: this.currentTheme,
            to: theme
        });

        this.currentTheme = theme;
        this.applyTheme();
    }

    /**
     * Get current active theme
     */
    getCurrentTheme(): 'light' | 'dark' {
        return this.resolveTheme();
    }

    /**
     * Get theme preference (may be 'auto')
     */
    getThemePreference(): Theme {
        return this.currentTheme;
    }
}
