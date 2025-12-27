/**
 * @file annotation-mode-manager.ts
 * @description Manages annotation mode switching (underscore, highlight, box)
 */

import { EventBus } from '@/shared/utils/event-bus';
import { LoggerFactory } from '@/shared/utils/logger';
import type { AnnotationType } from '@/shared/types/annotation';

const logger = LoggerFactory.getLogger('AnnotationModeManager');

/**
 * Manages current annotation mode state
 */
export class AnnotationModeManager {
    private currentMode: AnnotationType = 'underscore';

    constructor(private eventBus: EventBus) { }

    /**
     * Get current annotation mode
     */
    getCurrentMode(): AnnotationType {
        return this.currentMode;
    }

    /**
     * Set annotation mode
     */
    setMode(mode: AnnotationType): void {
        if (this.currentMode === mode) return;

        const previousMode = this.currentMode;
        this.currentMode = mode;

        logger.info(`Mode changed: ${previousMode} → ${mode}`);

        // Emit mode change event for UI updates
        this.eventBus.emit('ANNOTATION_MODE_CHANGED', {
            mode,
            previousMode,
        });
    }

    /**
     * Cycle through modes (for future Ctrl+M shortcut)
     */
    cycleMode(): void {
        const modes: AnnotationType[] = ['underscore', 'highlight', 'box'];
        const currentIndex = modes.indexOf(this.currentMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        this.setMode(modes[nextIndex]);
    }
}
