/**
 * @file i-mode-manager.ts
 * @description Mode Manager interface for coordinating highlight modes
 *
 * Implements Strategy Pattern - manages and delegates to different modes
 */

import type { IHighlightMode, HighlightData } from '../../content/modes/highlight-mode.interface';

/**
 * Mode Manager interface
 *
 * Coordinates mode switching and delegates operations to active mode
 * Implements Strategy Pattern from quality framework
 *
 * @remarks
 * - Manages mode lifecycle (register, activate, deactivate)
 * - Delegates operations to current  active mode
 * - Ensures only one mode active at a time
 * - Emits events on mode transitions
 */
export interface IModeManager {
    /**
     * Register a mode with the manager
     *
     * @param mode - The mode to register
     *
     * @remarks
     * - Can register multiple modes
     * - Mode name must be unique
     * - Registration does NOT activate the mode
     */
    registerMode(mode: IHighlightMode): void;

    /**
     * Activate a registered mode by name
     *
     * @param modeName - Name of the mode to activate
     * @returns Promise that resolves when mode is activated
     *
     * @throws Error if mode not registered
     *
     * @remarks
     * - Deactivates current mode first
     * - Calls mode's onActivate() lifecycle hook
     * - Emits 'mode:switched' event
     * - Safe to call if mode already active (no-op)
     */
    activateMode(modeName: string): Promise<void>;

    /**
     * Get the currently active mode
     *
     * @returns The active mode instance
     *
     * @throws Error if no mode is activated
     */
    getCurrentMode(): IHighlightMode;

    /**
     * Create highlight using current mode
     *
     * @param selection - Browser Selection object
     * @param color - Color to apply to highlight
     * @returns Promise resolving to highlight ID
     *
     * @remarks
     * Convenience method - delegates to current mode's createHighlight()
     * Throws if no mode active
     */
    createHighlight(selection: Selection, color: string): Promise<string>;

    /**
     * Remove highlight using current mode
     *
     * @param id - ID of highlight to remove
     * @returns Promise that resolves when highlight is removed
     *
     * @remarks
     * Convenience method - delegates to current mode's removeHighlight()
     */
    removeHighlight(id: string): Promise<void>;

    /**
     * Get highlight using current mode
     *
     * @param id - ID of highlight to retrieve
     * @returns Highlight data or null if not found
     *
     * @remarks
     * Convenience method - delegates to current mode's getHighlight()
     */
    getHighlight(id: string): HighlightData | null;
}
