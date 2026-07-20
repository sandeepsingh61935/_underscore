/**
 * Delete Icon Overlay
 *
 * Click-to-toggle: icon stays pinned until the user clicks the highlight again
 * (or clicks elsewhere). Not hover-driven — hovering off the wash to reach the
 * exterior icon must not dismiss it.
 */

import type { DeletionConfig } from '@/content/modes/highlight-mode.interface';
import type { ModeManager } from '@/content/modes/mode-manager';
import { ContentHighlightDeleteClient } from '@/content/services/content-highlight-delete';
import { performContentHighlightDelete } from '@/content/services/content-highlight-delete-flow';
import { positionExteriorIcon } from '@/content/paint/first-line-geometry';
import { getHighlightPainter } from '@/content/paint/range-overlay-painter';
import type { IMessageBus } from '@/shared/interfaces/i-message-bus';
import type { RepositoryFacade } from '@/shared/repositories';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import type { ILogger } from '@/shared/utils/logger';

export class DeleteIconOverlay {
  private activeIcons = new Map<string, HTMLElement>();
  private selectedHighlights = new Set<string>();
  private pinnedId: string | null = null;
  private readonly deleteClient: ContentHighlightDeleteClient;
  private scrollListening = false;

  constructor(
    private modeManager: ModeManager,
    private repositoryFacade: RepositoryFacade,
    private logger: ILogger,
    messageBus: IMessageBus
  ) {
    this.deleteClient = new ContentHighlightDeleteClient(messageBus);
  }

  /**
   * Toggle pin for a highlight. Second click on the same highlight dismisses.
   * Switching to another highlight moves the pin.
   */
  togglePin(highlightId: string): void {
    if (this.pinnedId === highlightId) {
      this.dismissPin();
      return;
    }
    this.pin(highlightId);
  }

  /** Pin and show icon (replaces any previous pin). */
  pin(highlightId: string): void {
    const config = this.modeManager.getCurrentMode().getDeletionConfig();
    if (!config?.showDeleteIcon) {
      this.logger.debug('Delete icon disabled for current mode');
      return;
    }

    if (this.pinnedId && this.pinnedId !== highlightId) {
      this.hideIcon(this.pinnedId);
    }

    this.pinnedId = highlightId;
    this.renderPinnedIcon(highlightId);
    this.ensureScrollListener();
    this.logger.info('Delete icon pinned', { id: highlightId });
  }

  /** Hide pinned icon and clear pin state. */
  dismissPin(): void {
    if (!this.pinnedId) return;
    const id = this.pinnedId;
    this.pinnedId = null;
    this.hideIcon(id);
    this.teardownScrollListener();
    this.logger.info('Delete icon dismissed', { id });
  }

  getPinnedId(): string | null {
    return this.pinnedId;
  }

  /**
   * Show delete icon (legacy / non-pin). Prefer togglePin / pin for UX.
   */
  showIcon(highlightId: string, boundingRect: DOMRect): void {
    const config = this.modeManager.getCurrentMode().getDeletionConfig();
    if (!config?.showDeleteIcon) return;

    this.hideIcon(highlightId);
    const highlight = this.repositoryFacade.get(highlightId);
    if (!highlight) return;

    const icon = this.createIconElement(highlightId, highlight, config);
    this.applyExteriorPosition(icon, boundingRect, boundingRect);
    document.body.appendChild(icon);
    this.activeIcons.set(highlightId, icon);
  }

  showIconWithFirstLine(
    highlightId: string,
    firstLineStart: DOMRect,
    firstLineEnd: DOMRect
  ): void {
    const config = this.modeManager.getCurrentMode().getDeletionConfig();
    if (!config?.showDeleteIcon) return;

    this.hideIcon(highlightId);
    const highlight = this.repositoryFacade.get(highlightId);
    if (!highlight) return;

    const icon = this.createIconElement(highlightId, highlight, config);
    this.applyExteriorPosition(icon, firstLineStart, firstLineEnd);
    document.body.appendChild(icon);
    this.activeIcons.set(highlightId, icon);
  }

  hideIcon(highlightId: string): void {
    const icon = this.activeIcons.get(highlightId);
    if (icon) {
      icon.remove();
      this.activeIcons.delete(highlightId);
    }
    if (this.pinnedId === highlightId) {
      this.pinnedId = null;
      this.teardownScrollListener();
    }
  }

  hideAllIcons(): void {
    for (const icon of this.activeIcons.values()) {
      icon.remove();
    }
    this.activeIcons.clear();
    this.pinnedId = null;
    this.teardownScrollListener();
  }

  clearSelection(): void {
    this.selectedHighlights.clear();
    for (const [_id, icon] of this.activeIcons) {
      icon.classList.remove('underscore-delete-icon--selected');
      icon.removeAttribute('data-selection-count');
    }
  }

  private renderPinnedIcon(highlightId: string): void {
    const config = this.modeManager.getCurrentMode().getDeletionConfig();
    if (!config?.showDeleteIcon) return;

    const highlight = this.repositoryFacade.get(highlightId);
    if (!highlight) {
      this.logger.warn('Cannot pin icon for non-existent highlight', { highlightId });
      this.pinnedId = null;
      return;
    }

    this.hideIconOnly(highlightId);

    const edges = getHighlightPainter().getFirstLineEdges(highlightId);
    const icon = this.createIconElement(highlightId, highlight, config);
    if (edges) {
      this.applyExteriorPosition(icon, edges.start, edges.end);
    } else {
      const fallback = getHighlightPainter().getBoundingClientRect(highlightId);
      if (!fallback) {
        this.logger.warn('No geometry for pinned delete icon', { highlightId });
        return;
      }
      this.applyExteriorPosition(icon, fallback, fallback);
    }
    document.body.appendChild(icon);
    this.activeIcons.set(highlightId, icon);
  }

  /** Hide without clearing pin bookkeeping (used before re-render). */
  private hideIconOnly(highlightId: string): void {
    const icon = this.activeIcons.get(highlightId);
    if (icon) {
      icon.remove();
      this.activeIcons.delete(highlightId);
    }
  }

  private createIconElement(
    id: string,
    highlight: HighlightDataV2,
    config: DeletionConfig
  ): HTMLElement {
    const button = document.createElement('button');
    button.className = 'underscore-delete-icon';
    button.setAttribute('aria-label', 'Delete highlight');
    button.setAttribute('data-highlight-id', id);

    const colorClass = this.getColorClass(highlight.colorRole);
    if (colorClass) {
      button.classList.add(colorClass);
    }

    const modeName = this.modeManager.getCurrentMode().name;
    button.classList.add(`underscore-mode-${modeName}`);
    button.innerHTML = this.getIconSVG(config.iconType || 'trash');

    button.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      await this.handleIconClick(id, config, e);
    });

    button.addEventListener('mousedown', (e) => {
      // Prevent document click from treating this as outside dismiss.
      e.stopPropagation();
    });

    button.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        await this.handleIconClick(id, config, e);
      } else if (e.key === 'Escape') {
        this.clearSelection();
        this.dismissPin();
      }
    });

    return button;
  }

  private async handleIconClick(
    id: string,
    config: DeletionConfig,
    event: MouseEvent | KeyboardEvent
  ): Promise<void> {
    if (event.shiftKey && event instanceof MouseEvent) {
      this.toggleSelection(id);
      return;
    }

    if (this.selectedHighlights.size > 0) {
      await this.batchDelete(config);
      return;
    }

    await this.handleDelete(id, config);
  }

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

    const count = this.selectedHighlights.size;
    for (const selectedId of this.selectedHighlights) {
      const selectedIcon = this.activeIcons.get(selectedId);
      if (selectedIcon) {
        selectedIcon.setAttribute('data-selection-count', count.toString());
      }
    }

    this.logger.info('Selection toggled', { id, selectedCount: count });
  }

  private async batchDelete(config: DeletionConfig): Promise<void> {
    const count = this.selectedHighlights.size;
    const ids = Array.from(this.selectedHighlights);

    for (const id of ids) {
      await this.handleDelete(id, { ...config, requireConfirmation: false });
    }

    this.logger.info('Batch delete completed', { count });
    this.clearSelection();
  }

  private async handleDelete(id: string, config: DeletionConfig): Promise<void> {
    try {
      if (config.beforeDelete) {
        const proceed = await config.beforeDelete(id);
        if (!proceed) {
          this.logger.info('Deletion cancelled by beforeDelete hook', { id });
          return;
        }
      }

      if (config.requireConfirmation) {
        this.logger.info('Deletion requires confirmation but window.confirm is disabled', {
          id,
        });
        return;
      }

      const outcome = await performContentHighlightDelete(id, {
        deleteClient: this.deleteClient,
        modeManager: this.modeManager,
        getSnapshot: (highlightId) => this.modeManager.getHighlight(highlightId),
        allowUndo: config.allowUndo,
      });

      if (outcome === 'deleted') {
        this.hideIcon(id);
      }

      this.logger.info('Highlight deleted via icon', {
        id,
        allowUndo: config.allowUndo,
        outcome,
      });
    } catch (error) {
      this.logger.error('Delete icon handler failed', error as Error);
    }
  }

  private applyExteriorPosition(
    icon: HTMLElement,
    firstLineStart: DOMRect,
    firstLineEnd: DOMRect
  ): void {
    const pos = positionExteriorIcon(firstLineStart, firstLineEnd, {
      iconSize: 20,
      gap: 4,
      scrollX: window.scrollX || window.pageXOffset || 0,
      scrollY: window.scrollY || window.pageYOffset || 0,
      viewportWidth: window.innerWidth,
    });
    icon.style.top = `${pos.top}px`;
    icon.style.left = `${pos.left}px`;
  }

  private ensureScrollListener(): void {
    if (this.scrollListening) return;
    window.addEventListener('scroll', this.onScrollOrResize, true);
    window.addEventListener('resize', this.onScrollOrResize, true);
    this.scrollListening = true;
  }

  private teardownScrollListener(): void {
    if (!this.scrollListening) return;
    window.removeEventListener('scroll', this.onScrollOrResize, true);
    window.removeEventListener('resize', this.onScrollOrResize, true);
    this.scrollListening = false;
  }

  private onScrollOrResize = (): void => {
    if (!this.pinnedId) return;
    this.renderPinnedIcon(this.pinnedId);
  };

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
