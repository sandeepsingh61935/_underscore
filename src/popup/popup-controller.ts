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

import { ErrorDisplay } from './components/error-display';
import { PopupStateManager, type PopupState } from './popup-state-manager';

import type { ModeType } from '@/content/modes/mode-state-manager';
import { AppError } from '@/shared/errors/app-error';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type { MessageResponse } from '@/shared/schemas/message-schemas';
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
    // DOM Elements (bound during initialize)
    private modeSelector!: HTMLSelectElement;
    private highlightCount!: HTMLElement;
    private loadingIndicator!: HTMLElement;
    private errorContainer!: HTMLElement;
    private mainUI!: HTMLElement;

    // Event listener registry for cleanup
    private eventListeners: Array<{
        element: Element | Window;
        event: string;
        handler: EventListener;
    }> = [];

    // Dependencies (injected)
    private readonly stateManager: PopupStateManager;
    private readonly errorDisplay: ErrorDisplay;

    // Debounced event handlers (created in constructor)
    private debouncedModeChange!: () => Promise<void>;

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

        // Create debounced event handlers (prevent race conditions)
        // 300ms is standard UI debounce time
        this.debouncedModeChange = debounce(this.handleModeChange.bind(this), 300);

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

            // Enhance error message with step context if possible
            const enhancedError = error instanceof Error ? error : new Error(String(error));
            if (!enhancedError.message) {
                enhancedError.message = `Empty error during initialization (${enhancedError.name})`;
            }

            try {
                this.showErrorState(enhancedError);
            } catch (displayError) {
                this.logger.error('[PopupController] ErrorDisplay crashed', displayError as Error);
            }
        }
    }

    /**
     * Helper to run init steps with context
     */
    private async runInitStep<T>(stepName: string, operation: () => Promise<T> | T): Promise<T> {
        try {
            return await operation();
        } catch (error) {
            const wrapped = error instanceof Error ? error : new Error(String(error));
            wrapped.message = `[${stepName}] ${wrapped.message}`;
            throw wrapped;
        }
    }

    // Rewrite initialize using steps
    async initializeDebug(): Promise<void> {
        try {
            this.logger.info('[PopupController] Initializing');

            await this.runInitStep('Bind DOM', () => this.bindDOMElements());
            await this.runInitStep('Show Loading', () => this.showLoadingState());

            const tab = await this.runInitStep('Get Tab', () => this.getCurrentTab());
            if (!tab?.id) throw new Error('No active tab found');
            this.currentTabId = tab.id;

            await this.runInitStep('Init State', () => this.stateManager.initialize(this.currentTabId!));
            await this.runInitStep('Setup Events', () => this.setupEventListeners());
            await this.runInitStep('Subscribe', () => this.subscribeToStateChanges());
            await this.runInitStep('Show UI', () => this.showMainUI());

            this.logger.info('[PopupController] Initialized successfully');
        } catch (error) {
            this.showErrorState(error as Error);
        }
    }

    /**
     * Bind DOM elements with defensive null checks
     *
     * Verifies all required DOM elements exist before proceeding.
     * Missing critical elements indicate a template/build issue that prevents the popup from functioning.
     *
     * @throws {AppError} If critical DOM elements are missing
     * @private
     */
    private bindDOMElements(): void {
        this.logger.debug('[PopupController] Binding DOM elements');

        // Critical elements (must exist for popup to function)
        const criticalSelectors = {
            'mode-selector': 'Mode selection dropdown',
            'highlight-count': 'Statistics display',
            'loading-state': 'Loading indicator',
            'error-state': 'Error state container',
            'main-ui': 'Main UI container',
        };

        // Verify all critical elements exist
        for (const [id, description] of Object.entries(criticalSelectors)) {
            const element = document.getElementById(id);
            if (!element) {
                const error = new AppError(
                    `Critical DOM element missing: #${id} (${description})`,
                    {
                        code: 'DOM_ELEMENT_MISSING',
                        selector: `#${id}`,
                        description,
                    },
                    false // Not operational - indicates build/template issue
                );
                this.logger.error('[PopupController] DOM binding failed', error);
                throw error;
            }
        }

        // Assign elements (we know they exist now)
        this.modeSelector = document.getElementById('mode-selector') as HTMLSelectElement;
        this.highlightCount = document.getElementById('highlight-count')!;
        this.loadingIndicator = document.getElementById('loading-state')!;
        this.errorContainer = document.getElementById('error-state')!;
        this.mainUI = document.getElementById('main-ui')!;

        // Optional elements (warn if missing but don't throw)
        const clearAllButton = document.getElementById('clear-all');
        if (!clearAllButton) {
            this.logger.warn('[PopupController] Optional element missing: #clear-all (Clear all button)');
        }

        this.logger.debug('[PopupController] DOM elements bound successfully');
    }

    /**
     * Get current active tab with context invalidation handling
     * 
     * Chrome extensions can have their context invalidated during:
     * - Extension updates
     * - Extension reload
     * - Extension disable/enable
     * 
     * @returns Current tab or null if not found or context invalidated
     * @private
     */
    private async getCurrentTab(): Promise<chrome.tabs.Tab | null> {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            return tab ?? null;
        } catch (error) {
            // Check for context invalidation
            if (
                error instanceof Error &&
                (error.message.includes('Extension context invalidated') ||
                    error.message.includes('Cannot access') ||
                    error.message.includes('Extension has been reloaded'))
            ) {
                this.logger.error('[PopupController] Extension context invalidated', error);

                // Show user-friendly message
                this.showErrorState(
                    new AppError(
                        'Extension was updated or reloaded. Please close and reopen this popup.',
                        { code: 'CONTEXT_INVALIDATED', originalError: error.message },
                        false // Not retryable without closing popup
                    )
                );

                return null;
            }

            // Re-throw other errors
            throw error;
        }
    }

    /**
     * Add event listener and track for cleanup
     * 
     * @param element - DOM element or window
     * @param event - Event name
     * @param handler - Event handler function
     * @private
     */
    private addEventListener(
        element: Element | Window,
        event: string,
        handler: EventListener
    ): void {
        element.addEventListener(event, handler);
        this.eventListeners.push({ element, event, handler });
    }

    /**
     * Setup event listeners for user interactions with cleanup tracking
     * @private
     */
    private setupEventListeners(): void {
        this.logger.debug('[PopupController] Setting up event listeners');
        // Mode selector change
        if (this.modeSelector) {
            this.addEventListener(
                this.modeSelector,
                'change',
                this.debouncedModeChange as EventListener
            );
        }

        // Clear all button
        const clearAllBtn = document.getElementById('clear-all');
        if (clearAllBtn) {
            this.addEventListener(
                clearAllBtn,
                'click',
                (async () => {
                    await this.handleClearAll();
                }) as EventListener
            );
        }

        // Retry button (error state)
        const retryBtn = document.querySelector('[data-action="retry"]');
        if (retryBtn) {
            this.addEventListener(
                retryBtn,
                'click',
                (async () => {
                    await this.initialize();
                }) as EventListener
            );
        }

        this.logger.debug(
            `[PopupController] Registered ${this.eventListeners.length} event listeners`
        );
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
            const message = error instanceof Error ? error.message : 'Failed to switch mode. Please try again.';
            this.showErrorNotification(message);
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
     * 
     * Orchestrates the UI state transitions:
     * 1. Updates data bindings (selector, counts)
     * 2. Handles view switching (Loading -> Error -> Main)
     * 
     * @param state - New state to render
     * @private
     */
    private updateUIFromState(state: PopupState): void {
        // 1. Update data bindings
        if (this.modeSelector && this.modeSelector.value !== state.currentMode) {
            this.modeSelector.value = state.currentMode;
        }

        if (this.highlightCount) {
            this.highlightCount.textContent = state.stats.totalHighlights.toString();
        }

        // 2. Handle View State (Mutually Exclusive)
        if (state.loading) {
            this.showLoadingState();
            return;
        }

        if (state.error) {
            // Note: We're showing a notification/toast here, not a full error screen,
            // to allow the user to see the previous valid state if possible.
            // If the error is catastrophic, the blocking error boundary would have caught it.
            this.showErrorNotification(state.error.toUserMessage());

            // Ensure main UI is visible even with error toast
            this.showMainUI();
            return;
        }

        // Default: Show main UI
        this.showMainUI();
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
     * Show main UI
     */
    private showMainUI(): void {
        this.loadingIndicator?.classList.add('hidden');
        this.mainUI?.classList.remove('hidden');
        this.errorContainer?.classList.add('hidden');
    }

    /**
     * Show error state with ErrorDisplay component
     * 
     * Handles both Error and AppError instances.
     * Uses error boundary pattern to prevent ErrorDisplay crashes.
     * 
     * @param error - Error to display
     * @private
     */
    private showErrorState(error: Error): void {
        this.loadingIndicator?.classList.add('hidden');
        this.mainUI?.classList.add('hidden');

        if (this.errorContainer) {
            this.errorContainer.classList.remove('hidden');

            try {
                // ErrorDisplay component handles retry callback
                this.errorDisplay.show(this.errorContainer, error, async () => {
                    await this.initialize();
                });
            } catch (displayError) {
                // Safety net: If ErrorDisplay crashes, show basic error
                this.logger.error('[PopupController] ErrorDisplay failed', displayError as Error);
                this.errorContainer.innerHTML = `
                    <div class="error-card" role="alert">
                        <div class="error-icon">⚠️</div>
                        <p class="error-message">An error occurred</p>
                        <p style="font-size: 12px; margin-top: 8px;">
                            ${this.escapeHtml(error.message)}
                        </p>
                    </div>
                `;
            }
        }
    }

    /**
     * Escape HTML to prevent XSS (fallback)
     * @private
     */
    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show error notification (toast-style)
     * 
     * Creates a temporary toast notification at the bottom of the popup.
     * Auto-dismisses after 5 seconds.
     */
    private showErrorNotification(message: string): void {
        this.logger.warn('[PopupController] Showing error notification', { message });

        // Remove existing toast if any
        const existingToast = document.getElementById('error-toast');
        if (existingToast) {
            existingToast.remove();
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.id = 'error-toast';
        toast.className = 'error-card'; // Reuse error card styling but position differently
        toast.style.position = 'absolute';
        toast.style.bottom = '16px';
        toast.style.left = '16px';
        toast.style.right = '16px';
        toast.style.zIndex = '100';
        toast.style.boxShadow = 'var(--md-sys-shadow-level3)';
        toast.style.animation = 'slideUp 0.3s ease-out';
        toast.role = 'alert';

        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; text-align: left;">
                <span class="error-icon" style="font-size: 24px; margin: 0;">⚠️</span>
                <span style="font-size: 14px; color: var(--md-sys-color-on-surface);">${this.escapeHtml(message)}</span>
            </div>
        `;

        // Add to main UI
        this.mainUI.appendChild(toast);

        // Auto-dismiss
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    /**
     * Cleanup resources and remove event listeners
     * 
     * Removes all tracked event listeners to prevent memory leaks.
     * Can be called multiple times safely (idempotent).
     */
    cleanup(): void {
        this.logger.debug('[PopupController] Cleaning up resources');

        // Remove all tracked event listeners
        for (const { element, event, handler } of this.eventListeners) {
            element.removeEventListener(event, handler);
        }
        this.eventListeners = [];

        // Cleanup state manager
        this.stateManager.cleanup();

        this.logger.debug('[PopupController] Cleanup complete');
    }
}
