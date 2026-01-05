/**
 * @file provider-drawer.ts
 * @description Sliding provider drawer for OAuth authentication
 * Follows project standards: DI pattern, error handling, logging
 */

import type { ILogger } from '@/shared/interfaces/i-logger';
import type { IEventBus } from '@/shared/interfaces/i-event-bus';
import { GoogleIcon, AppleIcon, XIcon, FacebookIcon, setIcon } from '../utils/icons';

/**
 * OAuth Provider types
 */
export type OAuthProvider = 'google' | 'apple' | 'x' | 'facebook';

/**
 * Provider Drawer Interface
 */
export interface IProviderDrawer {
    show(): void;
    hide(): void;
    onProviderSelect(callback: (provider: OAuthProvider) => void): void;
    initialize(): void;
}

/**
 * Provider Drawer - Sliding OAuth provider selection
 */
export class ProviderDrawer implements IProviderDrawer {
    private drawerElement: HTMLElement | null = null;
    private signInButton: HTMLElement | null = null;
    private isVisible = false;
    private selectCallback: ((provider: OAuthProvider) => void) | null = null;

    constructor(
        private readonly logger: ILogger,
        private readonly eventBus: IEventBus
    ) {
        this.logger.debug('[ProviderDrawer] Initialized');
    }

    /**
     * Initialize drawer (bind DOM, inject icons)
     */
    initialize(): void {
        try {
            this.logger.debug('[ProviderDrawer] Initializing');

            // Bind DOM elements
            this.drawerElement = document.querySelector('.provider-drawer');
            this.signInButton = document.querySelector('.btn-login-small');

            if (!this.drawerElement) {
                this.logger.warn('[ProviderDrawer] Drawer element not found');
                return;
            }

            // Inject provider icons
            this.injectProviderIcons();

            // Setup provider click handlers
            this.setupProviderHandlers();

            // Setup click outside to close
            this.setupClickOutsideHandler();

            this.logger.debug('[ProviderDrawer] Initialization complete');
        } catch (error) {
            this.logger.error('[ProviderDrawer] Initialization failed', error as Error);
            throw error;
        }
    }

    /**
     * Show the drawer with slide animation
     */
    show(): void {
        if (!this.drawerElement || this.isVisible) return;

        try {
            this.logger.debug('[ProviderDrawer] Showing drawer');

            // Fade out "Sign in" text
            if (this.signInButton) {
                this.signInButton.style.opacity = '0';
                this.signInButton.style.pointerEvents = 'none';
            }

            // Slide in drawer
            this.drawerElement.classList.add('visible');
            this.isVisible = true;

            this.logger.info('[ProviderDrawer] Drawer shown');
        } catch (error) {
            this.logger.error('[ProviderDrawer] Failed to show drawer', error as Error);
        }
    }

    /**
     * Hide the drawer with slide animation
     */
    hide(): void {
        if (!this.drawerElement || !this.isVisible) return;

        try {
            this.logger.debug('[ProviderDrawer] Hiding drawer');

            // Slide out drawer
            this.drawerElement.classList.remove('visible');
            this.isVisible = false;

            // Fade in "Sign in" text
            if (this.signInButton) {
                this.signInButton.style.opacity = '1';
                this.signInButton.style.pointerEvents = 'auto';
            }

            this.logger.info('[ProviderDrawer] Drawer hidden');
        } catch (error) {
            this.logger.error('[ProviderDrawer] Failed to hide drawer', error as Error);
        }
    }

    /**
     * Register callback for provider selection
     */
    onProviderSelect(callback: (provider: OAuthProvider) => void): void {
        this.selectCallback = callback;
    }

    /**
     * Inject provider icons into buttons
     */
    private injectProviderIcons(): void {
        const providers: Array<{ name: OAuthProvider; icon: string }> = [
            { name: 'google', icon: GoogleIcon({ size: 20, strokeWidth: 2 }) },
            { name: 'apple', icon: AppleIcon({ size: 20, strokeWidth: 2 }) },
            { name: 'x', icon: XIcon({ size: 20, strokeWidth: 2 }) },
            { name: 'facebook', icon: FacebookIcon({ size: 20, strokeWidth: 2 }) },
        ];

        providers.forEach(({ name, icon }) => {
            const button = document.querySelector(
                `.provider-option[data-provider="${name}"]`
            ) as HTMLElement;

            if (button) {
                setIcon(button, icon);
            }
        });

        this.logger.debug('[ProviderDrawer] Icons injected');
    }

    /**
     * Setup click handlers for provider buttons
     */
    private setupProviderHandlers(): void {
        const providerButtons = document.querySelectorAll('.provider-option');

        providerButtons.forEach((button) => {
            button.addEventListener('click', (event) => {
                const provider = (button as HTMLElement).dataset['provider'] as OAuthProvider;

                if (provider) {
                    this.handleProviderClick(provider, event);
                }
            });
        });

        this.logger.debug('[ProviderDrawer] Provider handlers setup');
    }

    /**
     * Handle provider button click
     */
    private handleProviderClick(provider: OAuthProvider, event: Event): void {
        try {
            this.logger.info('[ProviderDrawer] Provider selected', { provider });

            // Add visual feedback (animation)
            const button = event.target as HTMLElement;
            button.classList.add('provider-selected');

            // Emit event
            this.eventBus.emit('provider:selected', { provider });

            // Call callback
            if (this.selectCallback) {
                this.selectCallback(provider);
            }

            // Hide drawer after selection
            setTimeout(() => {
                this.hide();
                button.classList.remove('provider-selected');
            }, 300);
        } catch (error) {
            this.logger.error('[ProviderDrawer] Provider selection failed', error as Error);
        }
    }

    /**
     * Setup click outside to close drawer
     */
    private setupClickOutsideHandler(): void {
        document.addEventListener('click', (event) => {
            if (!this.isVisible) return;

            const target = event.target as HTMLElement;

            // Check if click is outside drawer and sign-in button
            if (
                this.drawerElement &&
                !this.drawerElement.contains(target) &&
                !target.closest('.btn-login-small')
            ) {
                this.hide();
            }
        });

        this.logger.debug('[ProviderDrawer] Click outside handler setup');
    }
}
