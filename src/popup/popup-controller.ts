/**
 * @file popup-controller.ts
 * @description TypeScript-based popup controller following SOLID principles
 * 
 * Implements Phase 4 architecture:
 * - DI-based construction (IMessageBus, ILogger, IModeManager)
 * - State management with optimistic updates
 * - Error boundaries and graceful degradation
 * - IPC integration via Phase 3 MessageBus
 * 
 * @author Phase 4 Implementation Team
 * @version 2.0
 */

import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { MessageResponse } from '@/shared/schemas/message-schemas';
import type { ModeType } from '@/content/modes/mode-state-manager';
import { PopupStateManager, type PopupState } from './popup-state-manager';
import { ErrorDisplay } from './components/error-display';

import { debounce } from '@/shared/utils/async-utils';

/**
 * Popup UI Controller
 * 
 * Responsibilities:
 * - Initialize UI from background state
 * - Handle user interactions (mode switching, settings)
 * - Communicate with background/content via IPC
 * - Manage UI state transitions (loading → success/error)
 * - Implement optimistic updates with rollback
 * 
 * Design Patterns:
 * - MVC: Separates UI logic from view
 * - Observer: Subscribes to state changes
 * - Error Boundary: Graceful error handling
 */
export class PopupController {
    private stateManager: PopupStateManager;
    private errorDisplay: ErrorDisplay;

    // DOM Elements
    private modeSelector: HTMLSelectElement | null = null;
    private highlightCount: HTMLElement | null = null;
    private loadingIndicator: HTMLElement | null = null;
    private errorContainer: HTMLElement | null = null;
    private mainUI: HTMLElement | null = null;

    // State
    private currentTabId: number | null = null;

    /**
     * Constructor with Dependency Injection
     * 
     * @param messageBus - IPC message bus (from Phase 3)
     * @param logger - Structured logger
     * @param stateManager - Optional state manager (for testing)
     * @param errorDisplay - Optional error display (for testing)
     */
    constructor(
        private readonly messageBus: IMessageBus,
        private readonly logger: ILogger,
        stateManager?: PopupStateManager,
        errorDisplay?: ErrorDisplay
    ) {
        this.stateManager = stateManager || new PopupStateManager(messageBus, logger);
        this.errorDisplay = errorDisplay || new ErrorDisplay(logger);

        // Debounce mode switching (prevent race conditions)
        // 300ms is standard UI debounce time
        this.handleModeChange = debounce(this.handleModeChange.bind(this), 300);

        this.logger.debug('[PopupController] Initialized with DI');
    }

    /**
     * Initialize the popup UI
     * 
     * Flow:
     * 1. Show loading state
     * 2. Get current tab
     * 3. Load mode state from background
     * 4. Setup event listeners
     * 5. Subscribe to state changes
     * 6. Show main UI
     */
    async initialize(): Promise<void> {
        try {
            this.logger.info('[PopupController] Initializing');

            // Get DOM elements
            this.bindDOMElements();

            // Show loading state
            this.showLoadingState();

            // Get current tab
            const tab = await this.getCurrentTab();
            if (!tab?.id) {
                throw new Error('No active tab found');
            }
            this.currentTabId = tab.id;

            // Initialize state manager
            await this.stateManager.initialize(this.currentTabId);

            // Setup event listeners
            this.setupEventListeners();

            // Subscribe to state changes
            this.subscribeToStateChanges();

            // Show main UI
            this.showMainUI();

            this.logger.info('[PopupController] Initialized successfully');
        } catch (error) {
            this.logger.error('[PopupController] Initialization failed', error as Error);
            try {
                this.showErrorState(error as Error);
            } catch (displayError) {
                this.logger.error('[PopupController] ErrorDisplay crashed', displayError as Error);
            }
        }
    }

    /**
     * Bind DOM elements
     */
    private bindDOMElements(): void {
        this.modeSelector = document.getElementById('mode-selector') as HTMLSelectElement;
        this.highlightCount = document.getElementById('highlight-count');
        this.loadingIndicator = document.getElementById('loading-state');
        this.errorContainer = document.getElementById('error-state');
        this.mainUI = document.getElementById('main-ui');

        if (!this.modeSelector || !this.highlightCount) {
            throw new Error('Required DOM elements not found');
        }
    }

    /**
     * Get current active tab
     */
    private async getCurrentTab(): Promise<chrome.tabs.Tab | null> {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return tab ?? null;
    }

    /**
     * Setup event listeners for user interactions
     */
    private setupEventListeners(): void {
        // Mode selector change
        this.modeSelector?.addEventListener('change', async () => {
            await this.handleModeChange();
        });

        // Clear all button
        const clearAllBtn = document.getElementById('clear-all');
        clearAllBtn?.addEventListener('click', async () => {
            await this.handleClearAll();
        });

        // Retry button (error state)
        const retryBtn = document.querySelector('[data-action="retry"]');
        retryBtn?.addEventListener('click', async () => {
            await this.initialize();
        });
    }

    /**
     * Subscribe to state changes from state manager
     */
    private subscribeToStateChanges(): void {
        this.stateManager.subscribe((state: PopupState) => {
            this.updateUIFromState(state);
        });
    }

    /**
     * Handle mode change from user
     */
    private async handleModeChange(): Promise<void> {
        if (!this.modeSelector) return;

        const newMode = this.modeSelector.value as ModeType;

        try {
            this.logger.debug('[PopupController] Mode change requested', { mode: newMode });

            // Use optimistic update (UI changes immediately, rolls back on error)
            await this.stateManager.switchModeOptimistically(newMode);

            this.logger.info('[PopupController] Mode switched successfully', { mode: newMode });
        } catch (error) {
            this.logger.error('[PopupController] Mode switch failed', error as Error);
            this.showErrorNotification('Failed to switch mode. Please try again.');
        }
    }

    /**
     * Handle clear all highlights
     */
    private async handleClearAll(): Promise<void> {
        if (!this.currentTabId) return;

        // Prevent spam clicking while loading
        if (this.stateManager.getState().loading) {
            this.logger.warn('[PopupController] Ignored Clear All - Loading in progress');
            return;
        }

        try {
            this.logger.debug('[PopupController] Clear all requested');

            const response = await this.messageBus.send<MessageResponse>(
                'content',
                {
                    type: 'CLEAR_ALL_HIGHLIGHTS',
                    payload: {},
                    timestamp: Date.now(),
                }
            );

            if (!response.success) {
                throw new Error(response.error);
            }

            // Refresh stats
            await this.stateManager.refreshStats();

            this.logger.info('[PopupController] All highlights cleared');
        } catch (error) {
            this.logger.error('[PopupController] Clear all failed', error as Error);
            this.showErrorNotification('Failed to clear highlights. Please try again.');
        }
    }

    /**
     * Update UI from state
     */
    private updateUIFromState(state: PopupState): void {
        // Update mode selector
        if (this.modeSelector && this.modeSelector.value !== state.currentMode) {
            this.modeSelector.value = state.currentMode;
        }

        // Update highlight count
        if (this.highlightCount) {
            this.highlightCount.textContent = state.stats.totalHighlights.toString();
        }

        // Update loading state
        if (state.loading) {
            this.showLoadingState();
        } else {
            this.hideLoadingState();
        }

        // Update error state
        if (state.error) {
            this.showErrorNotification(state.error.toUserMessage());
        }
    }

    /**
     * Show loading state
     */
    private showLoadingState(): void {
        this.loadingIndicator?.classList.remove('hidden');
        this.mainUI?.classList.add('hidden');
        this.errorContainer?.classList.add('hidden');
    }

    /**
     * Hide loading state
     */
    private hideLoadingState(): void {
        this.loadingIndicator?.classList.add('hidden');
    }

    /**
     * Show main UI
     */
    private showMainUI(): void {
        this.loadingIndicator?.classList.add('hidden');
        this.mainUI?.classList.remove('hidden');
        this.errorContainer?.classList.add('hidden');
    }

    /**
     * Show error state
     */
    private showErrorState(error: Error): void {
        this.loadingIndicator?.classList.add('hidden');
        this.mainUI?.classList.add('hidden');

        if (this.errorContainer) {
            this.errorDisplay.show(this.errorContainer, error, async () => {
                await this.initialize();
            });
        }
    }

    /**
     * Show error notification (toast-style)
     */
    private showErrorNotification(message: string): void {
        // TODO: Implement proper notification system
        // For now, use browser notification or console
        this.logger.warn('[PopupController] Error notification', { message });

        // Could use browser notifications API
        // Or implement a toast UI component
    }

    /**
     * Cleanup resources
     */
    cleanup(): void {
        this.stateManager.cleanup();
        this.logger.debug('[PopupController] Cleaned up');
    }
}
