/**
 * @file theme-manager.ts
 * @description Theme management with Light/Dark/System support
 * Follows project standards: DI pattern, error handling, logging
 */

import type { ILogger } from '@/shared/interfaces/i-logger';
import { Theme, type ThemeType, isValidTheme } from '@/shared/types/theme';

/**
 * Theme Manager Interface
 */
export interface IThemeManager {
    setTheme(theme: ThemeType): Promise<void>;
    getTheme(): ThemeType;
    detectSystemTheme(): ThemeType;
    initialize(): Promise<void>;
}

/**
 * Storage key for theme preference
 */
const THEME_STORAGE_KEY = 'app:theme';

/**
 * Theme Manager - Manages Light/Dark/System theming
 */
export class ThemeManager implements IThemeManager {
    private currentTheme: ThemeType = Theme.SYSTEM;
    private systemMediaQuery: MediaQueryList;

    constructor(private readonly logger: ILogger) {
        this.systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this.setupSystemThemeListener();
    }

    /**
     * Initialize theme from storage
     */
    async initialize(): Promise<void> {
        try {
            this.logger.debug('Initializing theme manager');

            // Load saved theme preference
            const result = await chrome.storage.local.get(THEME_STORAGE_KEY);
            const savedTheme = result[THEME_STORAGE_KEY];

            if (savedTheme && isValidTheme(savedTheme)) {
                this.currentTheme = savedTheme;
                this.logger.info('Loaded saved theme', { theme: savedTheme });
            } else {
                this.currentTheme = Theme.SYSTEM;
                this.logger.debug('No saved theme, using system default');
            }

            // Apply theme
            this.applyTheme(this.currentTheme);
        } catch (error) {
            this.logger.error('Failed to initialize theme', error as Error);
            // Fallback to system theme
            this.currentTheme = Theme.SYSTEM;
            this.applyTheme(this.currentTheme);
        }
    }

    /**
     * Set theme and persist preference
     */
    async setTheme(theme: ThemeType): Promise<void> {
        try {
            if (!isValidTheme(theme)) {
                throw new Error(`Invalid theme: ${theme}`);
            }

            this.logger.info('Setting theme', { theme });
            this.currentTheme = theme;

            // Apply theme to DOM
            this.applyTheme(theme);

            // Persist preference
            await chrome.storage.local.set({ [THEME_STORAGE_KEY]: theme });
            this.logger.debug('Theme saved to storage');
        } catch (error) {
            this.logger.error('Failed to set theme', error as Error, { theme });
            throw error;
        }
    }

    /**
     * Get current theme
     */
    getTheme(): ThemeType {
        return this.currentTheme;
    }

    /**
     * Detect system theme preference
     */
    detectSystemTheme(): ThemeType {
        const prefersDark = this.systemMediaQuery.matches;
        return prefersDark ? Theme.DARK : Theme.LIGHT;
    }

    /**
     * Apply theme to DOM
     */
    private applyTheme(theme: ThemeType): void {
        const effectiveTheme = theme === Theme.SYSTEM ? this.detectSystemTheme() : theme;

        document.body.dataset['theme'] = effectiveTheme;
        this.logger.debug('Applied theme to DOM', { theme, effectiveTheme });
    }

    /**
     * Setup listener for system theme changes
     */
    private setupSystemThemeListener(): void {
        this.systemMediaQuery.addEventListener('change', (event) => {
            // Only apply if current theme is 'system'
            if (this.currentTheme === Theme.SYSTEM) {
                const newTheme = event.matches ? Theme.DARK : Theme.LIGHT;
                this.logger.info('System theme changed', { newTheme });
                this.applyTheme(Theme.SYSTEM);
            }
        });

        this.logger.debug('System theme listener setup complete');
    }
}
