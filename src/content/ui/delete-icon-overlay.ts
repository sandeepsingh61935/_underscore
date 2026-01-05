/**
 * Delete Icon Overlay
 *
 * Purpose: Manages delete icon rendering and deletion logic with mode-aware behavior
 * Architecture: Mode-agnostic UI that delegates to mode configs for behavior
 */

import type { DeletionConfig } from '@/content/modes/highlight-mode.interface';
import type { ModeManager } from '@/content/modes/mode-manager';
import type { RepositoryFacade } from '@/shared/repositories';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import { EventName } from '@/shared/types/events';
import type { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';

export class DeleteIconOverlay {
    private activeIcons = new Map<string, HTMLElement>();
    private selectedHighlights = new Set<string>();

    constructor(
        private modeManager: ModeManager,
        private repositoryFacade: RepositoryFacade,
        private eventBus: EventBus,
        private logger: ILogger
    ) { }

    /**
     * Show delete icon for a highlight
     */
    showIcon(highlightId: string, boundingRect: DOMRect): void {
        const config = this.modeManager.getCurrentMode().getDeletionConfig();

        if (!config?.showDeleteIcon) {
            this.logger.debug('Delete icon disabled for current mode');
            return;
        }

        // Remove existing icon if present
        this.hideIcon(highlightId);

        // Get highlight for color information
        const highlight = this.repositoryFacade.get(highlightId);
        if (!highlight) {
            this.logger.warn('Cannot show icon for non-existent highlight', { highlightId });
            return;
        }

        // Create new icon
        const icon = this.createIconElement(highlightId, highlight, config);
        this.positionIcon(icon, boundingRect);

        // Add to DOM
        document.body.appendChild(icon);
        this.activeIcons.set(highlightId, icon);
    }

    /**
     * Hide delete icon
     */
    hideIcon(highlightId: string): void {
        const icon = this.activeIcons.get(highlightId);
        if (icon) {
            icon.remove();
            this.activeIcons.delete(highlightId);
        }
    }

    /**
     * Hide all icons
     */
    hideAllIcons(): void {
        for (const icon of this.activeIcons.values()) {
            icon.remove();
        }
        this.activeIcons.clear();
    }

    /**
     * Clear selection
     */
    clearSelection(): void {
        this.selectedHighlights.clear();
        // Update all visible icons to remove selection badges
        for (const [_id, icon] of this.activeIcons) {
            icon.classList.remove('underscore-delete-icon--selected');
            icon.removeAttribute('data-selection-count');
        }
    }

    /**
     * Create icon element with event handlers
     */
    private createIconElement(
        id: string,
        highlight: HighlightDataV2,
        config: DeletionConfig
    ): HTMLElement {
        const button = document.createElement('button');
        button.className = 'underscore-delete-icon';
        button.setAttribute('aria-label', 'Delete highlight');
        button.setAttribute('data-highlight-id', id);

        // Add color class based on highlight color
        const colorClass = this.getColorClass(highlight.colorRole);
        if (colorClass) {
            button.classList.add(colorClass);
        }

        // Add mode class
        const modeName = this.modeManager.getCurrentMode().name;
        button.classList.add(`underscore-mode-${modeName}`);

        // Icon SVG
        button.innerHTML = this.getIconSVG(config.iconType || 'trash');

        // Click handler
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.handleIconClick(id, config, e);
        });

        // Keyboard handler
        button.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                await this.handleIconClick(id, config, e);
            } else if (e.key === 'Escape') {
                this.clearSelection();
                this.hideIcon(id);
            }
        });

        return button;
    }

    /**
     * Handle icon click (supports Shift for batch selection)
     */
    private async handleIconClick(
        id: string,
        config: DeletionConfig,
        event: MouseEvent | KeyboardEvent
    ): Promise<void> {
        // Batch selection: Shift+Click
        if (event.shiftKey && event instanceof MouseEvent) {
            this.toggleSelection(id);
            return;
        }

        // Batch delete: If items are selected, delete all
        if (this.selectedHighlights.size > 0) {
            await this.batchDelete(config);
            return;
        }

        // Single delete
        await this.handleDelete(id, config);
    }

    /**
     * Toggle highlight selection for batch delete
     */
    private toggleSelection(id: string): void {
        const icon = this.activeIcons.get(id);
        if (!icon) return;

        if (this.selectedHighlights.has(id)) {
            this.selectedHighlights.delete(id);
            icon.classList.remove('underscore-delete-icon--selected');
            icon.removeAttribute('data-selection-count');
        } else {
            this.selectedHighlights.add(id);
            icon.classList.add('underscore-delete-icon--selected');
        }

        // Update badge count on all selected icons
        const count = this.selectedHighlights.size;
        for (const selectedId of this.selectedHighlights) {
            const selectedIcon = this.activeIcons.get(selectedId);
            if (selectedIcon) {
                selectedIcon.setAttribute('data-selection-count', count.toString());
            }
        }

        this.logger.info('Selection toggled', { id, selectedCount: count });
    }

    /**
     * Delete all selected highlights
     */
    private async batchDelete(config: DeletionConfig): Promise<void> {
        const count = this.selectedHighlights.size;

        // Confirmation
        if (config.requireConfirmation) {
            const message = `Delete ${count} selected highlights?${config.allowUndo ? ' (Undo available with Ctrl+Z)' : ' This cannot be undone.'}`;
            if (!window.confirm(message)) {
                return;
            }
        }

        // Delete each highlight
        const ids = Array.from(this.selectedHighlights);
        for (const id of ids) {
            this.eventBus.emit(EventName.HIGHLIGHT_CLICKED, {
                type: EventName.HIGHLIGHT_CLICKED,
                highlightId: id,
                timestamp: Date.now(),
            });
        }

        this.logger.info('Batch delete completed', { count });
        this.clearSelection();
    }

    /**
     * Handle single highlight deletion
     */
    private async handleDelete(id: string, config: DeletionConfig): Promise<void> {
        try {
            // 1. Run beforeDelete hook (mode-specific logic)
            if (config.beforeDelete) {
                const proceed = await config.beforeDelete(id);
                if (!proceed) {
                    this.logger.info('Deletion cancelled by beforeDelete hook', { id });
                    return;
                }
            }

            // 2. Confirmation dialog (if required)
            if (config.requireConfirmation) {
                const message = config.confirmationMessage || 'Delete this highlight?';
                const confirmed = window.confirm(message);
                if (!confirmed) {
                    this.logger.info('Deletion cancelled by user', { id });
                    return;
                }
            }

            // 3. Remove the highlight from the mode
            // This triggers visual removal (CSS.highlights.delete), repository update,
            // and emits HIGHLIGHT_REMOVED event internally
            // NOTE: Do NOT emit HIGHLIGHT_REMOVED here - it creates infinite recursion
            // The mode's removeHighlight() will emit it after successful removal
            await this.modeManager.removeHighlight(id);

            // 4. Hide icon
            this.hideIcon(id);

            this.logger.info('Highlight deleted via icon', { id, allowUndo: config.allowUndo });
        } catch (error) {
            this.logger.error('Delete icon handler failed', error as Error);
        }
    }

    /**
     * Position icon at top-right of bounding box
     */
    private positionIcon(icon: HTMLElement, rect: DOMRect): void {
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;

        // Top-right corner of highlight, adjusted for scroll
        icon.style.top = `${rect.top + scrollY + 4}px`;
        icon.style.left = `${rect.right + scrollX - 24}px`; // 20px icon + 4px offset
    }

    /**
     * Get color class based on highlight colorRole
     */
    private getColorClass(colorRole: string): string | null {
        const colorMap: Record<string, string> = {
            yellow: 'underscore-delete-icon--yellow',
            blue: 'underscore-delete-icon--blue',
            green: 'underscore-delete-icon--green',
            orange: 'underscore-delete-icon--orange',
            purple: 'underscore-delete-icon--purple',
        };

        return colorMap[colorRole] || null;
    }

    /**
     * Get SVG icon based on type
     */
    private getIconSVG(iconType: 'trash' | 'remove' | 'clear'): string {
        const icons = {
            trash: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
      </svg>`,
            remove: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>`,
            clear: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 13H5v-2h14v2z"/>
      </svg>`,
        };

        return icons[iconType] || icons.trash;
    }
}
