/**
 * @file selection-detector.ts
 * @description Detects user text selections via double-click or keyboard shortcuts
 */

import { EventBus } from '@/shared/utils/event-bus';
import { EventName, createEvent, SelectionCreatedEvent } from '@/shared/types/events';
import { LoggerFactory } from '@/shared/utils/logger';
import type { ILogger } from '@/shared/utils/logger';

/**
 * Detects user text selections and emits events
 * 
 * Supports:
 * - Double-click detection (300ms window)
 * - Keyboard shortcut (Ctrl+U)
 * 
 * @example
 * ```typescript
 * const detector = new SelectionDetector(eventBus);
 * detector.init();
 * 
 * // Listen for selections
 * eventBus.on(EventName.SELECTION_CREATED, (event) => {
 *   console.log('Selection:', event.selection.toString());
 * });
 * ```
 */
export class SelectionDetector {
    private lastClickTime = 0;
    private readonly doubleClickThreshold = 300; // ms
    private logger: ILogger;
    private initialized = false;

    constructor(private readonly eventBus: EventBus) {
        this.logger = LoggerFactory.getLogger('SelectionDetector');
    }

    /**
     * Initialize selection detection listeners
     */
    init(): void {
        if (this.initialized) {
            this.logger.warn('SelectionDetector already initialized');
            return;
        }

        // Double-click detection
        document.addEventListener('mouseup', this.handleMouseUp);

        // Keyboard shortcut (Ctrl+U)
        document.addEventListener('keydown', this.handleKeyDown);

        this.initialized = true;
        this.logger.info('SelectionDetector initialized');
    }

    /**
     * Clean up event listeners
     */
    destroy(): void {
        document.removeEventListener('mouseup', this.handleMouseUp);
        document.removeEventListener('keydown', this.handleKeyDown);

        this.initialized = false;
        this.logger.info('SelectionDetector destroyed');
    }

    /**
     * Handle mouse up event for double-click detection
     */
    private handleMouseUp = (): void => {
        const now = Date.now();
        const timeSinceLastClick = now - this.lastClickTime;

        // Check if this is a double-click (within threshold)
        if (timeSinceLastClick < this.doubleClickThreshold && timeSinceLastClick > 0) {
            this.logger.debug('Double-click detected', { timeSinceLastClick });
            this.checkAndEmitSelection();
        }

        this.lastClickTime = now;
    };

    /**
     * Handle keyboard shortcut (Ctrl+U)
     */
    private handleKeyDown = (event: KeyboardEvent): void => {
        // Ctrl+U (or Cmd+U on Mac)
        const isShortcut = (event.ctrlKey || event.metaKey) &&
            event.key.toLowerCase() === 'u' &&
            !event.shiftKey;

        if (isShortcut) {
            event.preventDefault(); // Prevent default browser behavior
            this.logger.debug('Keyboard shortcut detected (Ctrl+U)');
            this.checkAndEmitSelection();
        }
    };

    /**
     * Check if there's a valid selection and emit event
     */
    private checkAndEmitSelection(): void {
        const selection = window.getSelection();

        if (!this.isValidSelection(selection)) {
            this.logger.debug('Invalid or empty selection, ignoring');
            return;
        }

        const text = selection.toString().trim();
        this.logger.info('Valid selection detected', {
            text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
            length: text.length
        });

        // Emit selection event
        const event: SelectionCreatedEvent = createEvent({
            type: EventName.SELECTION_CREATED,
            selection: selection!,
        });

        this.eventBus.emit(EventName.SELECTION_CREATED, event);
    }

    /**
     * Validate if selection is usable for highlighting
     */
    private isValidSelection(selection: Selection | null): selection is Selection {
        if (!selection) {
            return false;
        }

        // Check if selection is collapsed (just a cursor, no text)
        if (selection.isCollapsed) {
            return false;
        }

        // Check if there's actual text content
        const text = selection.toString().trim();
        if (text.length === 0) {
            return false;
        }

        // Check if we have a valid range
        if (selection.rangeCount === 0) {
            return false;
        }

        return true;
    }

    /**
     * Get current selection (for testing)
     */
    getCurrentSelection(): Selection | null {
        return window.getSelection();
    }

    /**
     * Check if detector is initialized
     */
    isInitialized(): boolean {
        return this.initialized;
    }
}
