/**
 * @file mode-selector.ts
 * @description Mode selector with sliding underline animation
 * Follows project standards: DI pattern, error handling, logging
 */

import type { ILogger } from '@/shared/interfaces/i-logger';
import type { IEventBus } from '@/shared/interfaces/i-event-bus';
import type { ModeType } from '@/content/modes/mode-state-manager';

/**
 * Mode Selector Interface
 */
export interface IModeSelector {
    setActiveMode(mode: ModeType): void;
    lockMode(mode: ModeType): void;
    unlockMode(mode: ModeType): void;
    initialize(): void;
    onModeChange(callback: (mode: ModeType) => void): void;
}

/**
 * Mode Selector - Sliding underline animation for mode selection
 */
export class ModeSelector implements IModeSelector {
    private modeButtons: NodeListOf<HTMLElement> | null = null;
    private underlineElement: HTMLElement | null = null;
    private activeMode: ModeType = 'walk';
    private lockedModes: Set<ModeType> = new Set(['vault']); // Vault locked by default
    private changeCallback: ((mode: ModeType) => void) | null = null;

    constructor(
        private readonly logger: ILogger,
        private readonly eventBus: IEventBus
    ) {
        this.logger.debug('[ModeSelector] Initialized');
    }

    /**
     * Initialize mode selector (bind DOM, setup handlers)
     */
    initialize(): void {
        try {
            this.logger.debug('[ModeSelector] Initializing');

            // Bind DOM elements
            this.modeButtons = document.querySelectorAll('.mode-option');
            this.underlineElement = document.querySelector('.mode-underline');

            if (!this.modeButtons || this.modeButtons.length === 0) {
                this.logger.warn('[ModeSelector] Mode buttons not found');
                return;
            }

            if (!this.underlineElement) {
                this.logger.warn('[ModeSelector] Underline element not found');
                return;
            }

            // Setup click handlers
            this.setupClickHandlers();

            // Set initial underline position
            const activeButton = this.findButtonByMode(this.activeMode);
            if (activeButton) {
                this.updateUnderlinePosition(activeButton);
            }

            this.logger.debug('[ModeSelector] Initialization complete');
        } catch (error) {
            this.logger.error('[ModeSelector] Initialization failed', error as Error);
            throw error;
        }
    }

    /**
     * Set active mode and update UI
     */
    setActiveMode(mode: ModeType): void {
        try {
            this.logger.debug('[ModeSelector] Setting active mode', { mode });

            this.activeMode = mode;

            // Update button states
            this.modeButtons?.forEach((button) => {
                const buttonMode = button.dataset['mode'] as ModeType;
                if (buttonMode === mode) {
                    button.classList.add('active');
                    this.updateUnderlinePosition(button);
                } else {
                    button.classList.remove('active');
                }
            });

            this.logger.info('[ModeSelector] Active mode set', { mode });
        } catch (error) {
            this.logger.error('[ModeSelector] Failed to set active mode', error as Error);
        }
    }

    /**
     * Lock a mode (disable selection)
     */
    lockMode(mode: ModeType): void {
        this.logger.debug('[ModeSelector] Locking mode', { mode });
        this.lockedModes.add(mode);

        const button = this.findButtonByMode(mode);
        if (button) {
            button.classList.add('locked');
            button.setAttribute('aria-disabled', 'true');
        }
    }

    /**
     * Unlock a mode (enable selection)
     */
    unlockMode(mode: ModeType): void {
        this.logger.debug('[ModeSelector] Unlocking mode', { mode });
        this.lockedModes.delete(mode);

        const button = this.findButtonByMode(mode);
        if (button) {
            button.classList.remove('locked');
            button.setAttribute('aria-disabled', 'false');
        }
    }

    /**
     * Register callback for mode changes
     */
    onModeChange(callback: (mode: ModeType) => void): void {
        this.changeCallback = callback;
    }

    /**
     * Setup click handlers for mode buttons
     */
    private setupClickHandlers(): void {
        this.modeButtons?.forEach((button) => {
            button.addEventListener('click', () => {
                const mode = button.dataset['mode'] as ModeType;

                // Check if mode is locked
                if (this.lockedModes.has(mode)) {
                    this.logger.warn('[ModeSelector] Attempted to select locked mode', { mode });
                    this.eventBus.emit('mode:locked', { mode });
                    return;
                }

                // Handle mode change
                this.handleModeClick(mode);
            });
        });

        this.logger.debug('[ModeSelector] Click handlers setup');
    }

    /**
     * Handle mode button click
     */
    private handleModeClick(mode: ModeType): void {
        try {
            this.logger.info('[ModeSelector] Mode clicked', { mode });

            // Update active mode
            this.setActiveMode(mode);

            // Emit event
            this.eventBus.emit('mode:changed', { mode });

            // Call callback
            if (this.changeCallback) {
                this.changeCallback(mode);
            }
        } catch (error) {
            this.logger.error('[ModeSelector] Mode click failed', error as Error);
        }
    }

    /**
     * Update underline position to match active button
     */
    private updateUnderlinePosition(button: HTMLElement): void {
        if (!this.underlineElement) return;

        try {
            // Calculate position relative to parent
            const parent = button.parentElement;
            if (!parent) return;

            const parentRect = parent.getBoundingClientRect();
            const buttonRect = button.getBoundingClientRect();

            const left = buttonRect.left - parentRect.left;
            const width = buttonRect.width;

            // Apply position with smooth transition
            this.underlineElement.style.left = `${left}px`;
            this.underlineElement.style.width = `${width}px`;

            this.logger.debug('[ModeSelector] Underline position updated', { left, width });
        } catch (error) {
            this.logger.error('[ModeSelector] Failed to update underline position', error as Error);
        }
    }

    /**
     * Find button element by mode
     */
    private findButtonByMode(mode: ModeType): HTMLElement | null {
        if (!this.modeButtons) return null;

        for (const button of Array.from(this.modeButtons)) {
            if (button.dataset['mode'] === mode) {
                return button;
            }
        }

        return null;
    }
}
