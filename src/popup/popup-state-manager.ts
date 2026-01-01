/**
 * @file popup-state-manager.ts
 * @description Reactive state management for popup UI
 * 
 * Implements Observer Pattern + Immutable State:
 * - Single source of truth for popup state
 * - Subscriber notifications on state changes
 * - Optimistic updates with rollback capability
 * - State transition validation
 * 
 * @author Phase 4 Implementation Team
 * @version 2.0
 */

import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type { ILogger } from '@/shared/interfaces/i-logger';
import type { MessageResponse } from '@/shared/schemas/message-schemas';
import type { ModeType } from '@/content/modes/mode-state-manager';
import { AppError } from '@/shared/errors/app-error';

/**
 * Popup UI state structure
 */
export interface PopupState {
    /** Current active mode */
    currentMode: ModeType;

    /** Loading indicator */
    loading: boolean;

    /** Current error (if any) */
    error: AppError | null;

    /** Highlight statistics */
    stats: {
        /** Total highlights across all pages */
        totalHighlights: number;

        /** Highlights on current page */
        highlightsOnCurrentPage: number;
    };
}

/**
 * State change subscriber function type
 */
export type StateSubscriber = (state: PopupState) => void;

/**
 * Default initial state
 */
const DEFAULT_STATE: PopupState = {
    currentMode: 'walk',
    loading: false,
    error: null,
    stats: {
        totalHighlights: 0,
        highlightsOnCurrentPage: 0,
    },
};

/**
 * Popup State Manager
 * 
 * Manages reactive state for popup UI with observer pattern.
 * Implements optimistic updates for better UX.
 * 
 * Design Patterns:
 * - Observer: Notifies subscribers on state changes
 * - Immutable State: All updates create new state objects
 * - Optimistic UI: Update UI immediately, rollback on error
 */
export class PopupStateManager {
    private state: PopupState;
    private subscribers: Set<StateSubscriber> = new Set();
    private currentTabId: number | null = null;

    constructor(
        private readonly messageBus: IMessageBus,
        private readonly logger: ILogger
    ) {
        this.state = { ...DEFAULT_STATE };
        this.logger.debug('[PopupStateManager] Initialized');
    }

    /**
     * Initialize state from background script
     * 
     * @param tabId - Current tab ID
     */
    async initialize(tabId: number): Promise<void> {
        this.currentTabId = tabId;
        this.setState({ loading: true });

        try {
            // Get current mode
            const modeResponse = await this.messageBus.send<MessageResponse<{ mode: ModeType }>>(
                'background',
                {
                    type: 'GET_CURRENT_MODE',
                    payload: { tabId },
                    timestamp: Date.now(),
                }
            );

            if (!modeResponse.success) {
                throw new Error(modeResponse.error);
            }

            // Get stats
            const statsResponse = await this.messageBus.send<MessageResponse<{
                total: number;
                currentPage: number;
            }>>(
                'background',
                {
                    type: 'GET_HIGHLIGHT_STATS',
                    payload: { tabId },
                    timestamp: Date.now(),
                }
            );

            if (!statsResponse.success) {
                throw new Error(statsResponse.error);
            }

            // Update state
            this.setState({
                currentMode: modeResponse.data.mode,
                stats: {
                    totalHighlights: statsResponse.data.total,
                    highlightsOnCurrentPage: statsResponse.data.currentPage,
                },
                loading: false,
                error: null,
            });

            this.logger.info('[PopupStateManager] Initialized successfully', {
                mode: modeResponse.data.mode,
                total: statsResponse.data.total,
            });
        } catch (error) {
            this.logger.error('[PopupStateManager] Initialization failed', error as Error);
            this.setState({
                loading: false,
                error: new AppError(
                    'Failed to load popup state',
                    { code: 'POPUP_INIT_ERROR', cause: (error as Error).message },
                    true
                ),
            });
            throw error;
        }
    }

    /**
     * Switch mode with optimistic update
     * 
     * Flow:
     * 1. Save previous state
     * 2. Update UI immediately (optimistic)
     * 3. Send IPC message
     * 4. On success: confirm
     * 5. On error: rollback to previous state
     * 
     * @param newMode - Mode to switch to
     */
    async switchModeOptimistically(newMode: ModeType): Promise<void> {
        if (!this.currentTabId) {
            throw new Error('No tab ID set');
        }

        // Save previous state for rollback
        const previousState = { ...this.state };

        try {
            this.logger.debug('[PopupStateManager] Optimistic mode switch', { mode: newMode });

            // 1. Update UI immediately (optimistic)
            this.setState({ currentMode: newMode, loading: true });

            // 2. Send IPC message to background
            const response = await this.messageBus.send<MessageResponse>(
                'background',
                {
                    type: 'SWITCH_MODE',
                    payload: { mode: newMode, tabId: this.currentTabId },
                    timestamp: Date.now(),
                }
            );

            // Validate response structure
            if (!response || typeof response !== 'object' || typeof response.success !== 'boolean') {
                throw new AppError(
                    'Invalid response from background script',
                    { code: 'INVALID_RESPONSE', expected: 'MessageResponse', received: response },
                    true
                );
            }

            // Validate MessageResponse contract: success=true requires data, success=false requires error
            if (response.success && !('data' in response)) {
                throw new AppError(
                    'Malformed success response: missing data field',
                    { code: 'MALFORMED_RESPONSE', response },
                    true
                );
            }

            if (!response.success) {
                throw new Error(response.error || 'Mode switch failed');
            }

            // 3. Confirm success
            this.setState({ loading: false, error: null });

            this.logger.info('[PopupStateManager] Mode switched successfully', { mode: newMode });
        } catch (error) {
            this.logger.error('[PopupStateManager] Mode switch failed, rolling back', error as Error);

            // 4. Rollback to previous state (restore completely, then add error)
            this.state = {
                ...previousState,
                error: new AppError(
                    `Failed to switch to ${newMode} mode`,
                    { code: 'MODE_SWITCH_ERROR', mode: newMode, cause: (error as Error).message },
                    true
                ),
                loading: false,
            };

            // Notify subscribers of rollback
            this.notifySubscribers();

            // Re-throw for controller to handle
            throw error;
        }
    }

    /**
     * Refresh statistics from background
     */
    async refreshStats(): Promise<void> {
        if (!this.currentTabId) return;

        try {
            const response = await this.messageBus.send<MessageResponse<{
                total: number;
                currentPage: number;
            }>>(
                'background',
                {
                    type: 'GET_HIGHLIGHT_STATS',
                    payload: { tabId: this.currentTabId },
                    timestamp: Date.now(),
                }
            );

            if (!response.success) {
                throw new Error(response.error);
            }

            this.setState({
                stats: {
                    totalHighlights: response.data.total,
                    highlightsOnCurrentPage: response.data.currentPage,
                },
            });
        } catch (error) {
            this.logger.error('[PopupStateManager] Failed to refresh stats', error as Error);
        }
    }

    /**
     * Subscribe to state changes
     * 
     * @param callback - Function to call on state changes
     * @returns Unsubscribe function
     */
    subscribe(callback: StateSubscriber): () => void {
        this.subscribers.add(callback);

        // Call immediately with current state
        callback(this.state);

        // Return unsubscribe function
        return () => {
            this.subscribers.delete(callback);
        };
    }

    /**
     * Update state and notify subscribers
     * 
     * Uses immutable update pattern (spread operator)
     * 
     * @param update - Partial state update
     */
    private setState(update: Partial<PopupState>): void {
        // Create new state object (immutable)
        this.state = { ...this.state, ...update };

        // Notify all subscribers
        this.notifySubscribers();
    }

    /**
     * Notify all subscribers of state change
     */
    private notifySubscribers(): void {
        this.subscribers.forEach((subscriber) => {
            try {
                subscriber(this.state);
            } catch (error) {
                this.logger.error('[PopupStateManager] Subscriber error', error as Error);
            }
        });
    }

    /**
     * Get current state (read-only)
     */
    getState(): Readonly<PopupState> {
        // Deep copy to prevent external mutation
        return {
            ...this.state,
            stats: { ...this.state.stats },
        };
    }

    /**
     * Cleanup resources
     */
    cleanup(): void {
        this.subscribers.clear();
        this.logger.debug('[PopupStateManager] Cleaned up');
    }
}
