/**
 * @file caution-panel.ts
 * @description Caution panel for logout confirmation when switching modes
 * Follows project standards: DI pattern, error handling, logging
 */

import type { ILogger } from '@/shared/interfaces/i-logger';
import type { ModeType } from '@/content/modes/mode-state-manager';

/**
 * Caution Panel Interface
 */
export interface ICautionPanel {
    show(targetMode: ModeType): void;
    hide(): void;
    onConfirm(callback: () => void): void;
    onCancel(callback: () => void): void;
    initialize(): void;
}

/**
 * Caution Panel - Warning for switching to local modes from Vault
 */
export class CautionPanel implements ICautionPanel {
    private panelElement: HTMLElement | null = null;
    private confirmButton: HTMLElement | null = null;
    private cancelButton: HTMLElement | null = null;
    private messageElement: HTMLElement | null = null;
    private isVisible = false;
    private confirmCallback: (() => void) | null = null;
    private cancelCallback: (() => void) | null = null;
    private currentTargetMode: ModeType | null = null;

    constructor(private readonly logger: ILogger) {
        this.logger.debug('[CautionPanel] Initialized');
    }

    /**
     * Initialize caution panel (bind DOM, setup handlers)
     */
    initialize(): void {
        try {
            this.logger.debug('[CautionPanel] Initializing');

            // Bind DOM elements
            this.panelElement = document.querySelector('.caution-panel');
            this.confirmButton = document.querySelector('.caution-confirm');
            this.cancelButton = document.querySelector('.caution-cancel');
            this.messageElement = document.querySelector('.caution-message');

            if (!this.panelElement) {
                this.logger.warn('[CautionPanel] Panel element not found');
                return;
            }

            // Setup button handlers
            this.setupButtonHandlers();

            // Setup click outside to cancel
            this.setupClickOutsideHandler();

            this.logger.debug('[CautionPanel] Initialization complete');
        } catch (error) {
            this.logger.error('[CautionPanel] Initialization failed', error as Error);
            throw error;
        }
    }

    /**
     * Show caution panel with slide-up animation
     */
    show(targetMode: ModeType): void {
        if (!this.panelElement || this.isVisible) return;

        try {
            this.logger.info('[CautionPanel] Showing caution panel', { targetMode });

            this.currentTargetMode = targetMode;

            // Update message
            if (this.messageElement) {
                const modeName = targetMode.charAt(0).toUpperCase() + targetMode.slice(1);
                this.messageElement.textContent =
                    `Switching to ${modeName} mode will log you out. Your highlights won't sync to the cloud.`;
            }

            // Show panel with slide-up animation
            this.panelElement.classList.add('visible');
            this.isVisible = true;

            this.logger.debug('[CautionPanel] Panel shown');
        } catch (error) {
            this.logger.error('[CautionPanel] Failed to show panel', error as Error);
        }
    }

    /**
     * Hide caution panel with slide-down animation
     */
    hide(): void {
        if (!this.panelElement || !this.isVisible) return;

        try {
            this.logger.debug('[CautionPanel] Hiding caution panel');

            // Hide panel with slide-down animation
            this.panelElement.classList.remove('visible');
            this.isVisible = false;
            this.currentTargetMode = null;

            this.logger.debug('[CautionPanel] Panel hidden');
        } catch (error) {
            this.logger.error('[CautionPanel] Failed to hide panel', error as Error);
        }
    }

    /**
     * Register confirm callback
     */
    onConfirm(callback: () => void): void {
        this.confirmCallback = callback;
    }

    /**
     * Register cancel callback
     */
    onCancel(callback: () => void): void {
        this.cancelCallback = callback;
    }

    /**
     * Setup button click handlers
     */
    private setupButtonHandlers(): void {
        if (this.confirmButton) {
            this.confirmButton.addEventListener('click', () => {
                this.handleConfirm();
            });
        }

        if (this.cancelButton) {
            this.cancelButton.addEventListener('click', () => {
                this.handleCancel();
            });
        }

        this.logger.debug('[CautionPanel] Button handlers setup');
    }

    /**
     * Handle confirm button click
     */
    private handleConfirm(): void {
        try {
            this.logger.info('[CautionPanel] Confirm clicked', {
                targetMode: this.currentTargetMode
            });

            // Call confirm callback
            if (this.confirmCallback) {
                this.confirmCallback();
            }

            // Hide panel
            this.hide();
        } catch (error) {
            this.logger.error('[CautionPanel] Confirm failed', error as Error);
        }
    }

    /**
     * Handle cancel button click
     */
    private handleCancel(): void {
        try {
            this.logger.info('[CautionPanel] Cancel clicked');

            // Call cancel callback
            if (this.cancelCallback) {
                this.cancelCallback();
            }

            // Hide panel
            this.hide();
        } catch (error) {
            this.logger.error('[CautionPanel] Cancel failed', error as Error);
        }
    }

    /**
     * Setup click outside to cancel
     */
    private setupClickOutsideHandler(): void {
        document.addEventListener('click', (event) => {
            if (!this.isVisible) return;

            const target = event.target as HTMLElement;

            // Check if click is outside panel
            if (
                this.panelElement &&
                !this.panelElement.contains(target)
            ) {
                this.handleCancel();
            }
        });

        this.logger.debug('[CautionPanel] Click outside handler setup');
    }
}
