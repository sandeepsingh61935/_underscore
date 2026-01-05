/**
 * @file user-menu.ts
 * @description User dropdown menu with theme switcher and logout
 * Follows project standards: DI pattern, error handling, logging
 */

import type { ILogger } from '@/shared/interfaces/i-logger';
import type { ThemeType } from '@/shared/types/theme';

/**
 * User Menu Interface
 */
export interface IUserMenu {
    show(): void;
    hide(): void;
    toggle(): void;
    setActiveTheme(theme: ThemeType): void;
    onThemeChange(callback: (theme: ThemeType) => void): void;
    onLogout(callback: () => void): void;
    initialize(): void;
    deinitialize(): void;
}

/**
 * User Menu - Dropdown menu for theme and logout
 */
export class UserMenu implements IUserMenu {
    private menuElement: HTMLElement | null = null;
    private menuTrigger: HTMLElement | null = null;
    private themeButtons: NodeListOf<HTMLElement> | null = null;
    private logoutButton: HTMLElement | null = null;
    private isVisible = false;
    private themeCallback: ((theme: ThemeType) => void) | null = null;
    private logoutCallback: (() => void) | null = null;
    private isInitialized = false;
    private clickOutsideHandler: ((event: Event) => void) | null = null;

    constructor(private readonly logger: ILogger) {
        this.logger.debug('[UserMenu] Initialized');
    }

    /**
     * Deinitialize (cleanup event listeners)
     */
    deinitialize(): void {
        if (!this.isInitialized) return;

        // Remove click outside handler
        if (this.clickOutsideHandler) {
            document.removeEventListener('click', this.clickOutsideHandler);
        }

        this.isInitialized = false;
        this.logger.debug('[UserMenu] Deinitialized');
    }

    /**
     * Initialize user menu (bind DOM, setup handlers)
     */
    initialize(): void {
        // Prevent duplicate initialization
        if (this.isInitialized) {
            this.logger.debug('[UserMenu] Already initialized, skipping');
            return;
        }

        try {
            this.logger.debug('[UserMenu] Initializing');

            // Bind DOM elements
            this.menuElement = document.querySelector('.user-menu');
            this.menuTrigger = document.querySelector('.menu-trigger');
            this.themeButtons = document.querySelectorAll('.menu-item[data-theme]');
            this.logoutButton = document.querySelector('.menu-logout');

            if (!this.menuElement || !this.menuTrigger) {
                this.logger.warn('[UserMenu] Menu elements not found');
                return;
            }

            // Setup trigger click
            this.menuTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggle();
            });

            // Setup theme button clicks
            this.themeButtons?.forEach((button) => {
                button.addEventListener('click', () => {
                    const theme = button.dataset['theme'] as ThemeType;
                    this.handleThemeClick(theme);
                });
            });

            // Setup logout button click
            this.logoutButton?.addEventListener('click', () => {
                this.logger.info('[UserMenu] Logout button clicked');
                this.handleLogoutClick();
            });

            // Setup click outside to close
            this.setupClickOutsideHandler();

            this.isInitialized = true;
            this.logger.debug('[UserMenu] Initialization complete');
        } catch (error) {
            this.logger.error('[UserMenu] Initialization failed', error as Error);
            throw error;
        }
    }

    /**
     * Show menu with slide-down animation
     */
    show(): void {
        if (!this.menuElement || this.isVisible) return;

        try {
            this.logger.debug('[UserMenu] Showing menu');
            this.menuElement.classList.add('visible');
            this.isVisible = true;
        } catch (error) {
            this.logger.error('[UserMenu] Failed to show menu', error as Error);
        }
    }

    /**
     * Hide menu with slide-up animation
     */
    hide(): void {
        if (!this.menuElement || !this.isVisible) return;

        try {
            this.logger.debug('[UserMenu] Hiding menu');
            this.menuElement.classList.remove('visible');
            this.isVisible = false;
        } catch (error) {
            this.logger.error('[UserMenu] Failed to hide menu', error as Error);
        }
    }

    /**
     * Toggle menu visibility
     */
    toggle(): void {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Set active theme in menu
     */
    setActiveTheme(theme: ThemeType): void {
        this.themeButtons?.forEach((button) => {
            if (button.dataset['theme'] === theme) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    /**
     * Register theme change callback
     */
    onThemeChange(callback: (theme: ThemeType) => void): void {
        this.themeCallback = callback;
    }

    /**
     * Register logout callback
     */
    onLogout(callback: () => void): void {
        this.logoutCallback = callback;
    }

    /**
     * Handle theme button click
     */
    private handleThemeClick(theme: ThemeType): void {
        try {
            this.logger.info('[UserMenu] Theme clicked', { theme });

            // Update active state
            this.setActiveTheme(theme);

            // Call callback
            if (this.themeCallback) {
                this.themeCallback(theme);
            }

            // Hide menu after selection
            setTimeout(() => this.hide(), 150);
        } catch (error) {
            this.logger.error('[UserMenu] Theme click failed', error as Error);
        }
    }

    /**
     * Handle logout button click
     */
    private handleLogoutClick(): void {
        try {
            this.logger.info('[UserMenu] Logout clicked - calling callback');

            // Call callback
            if (this.logoutCallback) {
                this.logger.info('[UserMenu] Firing logout callback');
                this.logoutCallback();
            } else {
                this.logger.warn('[UserMenu] No logout callback registered!');
            }

            // Hide menu
            this.hide();
        } catch (error) {
            this.logger.error('[UserMenu] Logout click failed', error as Error);
        }
    }

    /**
     * Setup click outside to close
     */
    private setupClickOutsideHandler(): void {
        this.clickOutsideHandler = (event: Event) => {
            if (!this.isVisible) return;

            const target = event.target as HTMLElement;

            // Check if click is outside menu and trigger
            if (
                this.menuElement &&
                !this.menuElement.contains(target) &&
                this.menuTrigger &&
                !this.menuTrigger.contains(target)
            ) {
                this.hide();
            }
        };

        document.addEventListener('click', this.clickOutsideHandler);
        this.logger.debug('[UserMenu] Click outside handler setup');
    }
}
