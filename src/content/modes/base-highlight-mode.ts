/**
 * Base Highlight Mode
 *
 * Common runtime tracking + paint via HighlightPainter.
 * Concrete modes implement persistence (Basic / Pro / Pro-xAI).
 */

import type { HighlightData, DeletionConfig } from './highlight-mode.interface';

import { getHighlightPainter } from '@/content/paint/range-overlay-painter';
import { resolveColorRoleForPaint } from '@/content/styles/highlight-styles';
import type { IStorage } from '@/shared/interfaces/i-storage';
import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { HighlightCreatedEvent, HighlightRemovedEvent } from '@/shared/types/events';
import type { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';
import { generateHighlightId } from '@/shared/utils/generate-highlight-id';

export abstract class BaseHighlightMode {
  /** Session highlights with optional liveRanges for paint / undo. */
  protected data = new Map<string, HighlightData>();
  /**
   * The RepositoryFacade: synchronous read/write API over the in-memory
   * cache. Per ADR-006, the facade is the only seam between modes and
   * storage.
   */
  protected readonly facade: RepositoryFacade;
  protected storage?: IStorage;

  constructor(
    protected readonly eventBus: EventBus,
    protected readonly logger: ILogger,
    facade: RepositoryFacade
  ) {
    this.facade = facade;
  }

  abstract get name(): 'basic' | 'pro' | 'pro_xai';

  async onActivate(): Promise<void> {
    this.logger.info(`${this.name} mode activated`);
  }

  async onDeactivate(): Promise<void> {
    this.logger.info(`${this.name} mode deactivated`);
    for (const id of [...this.data.keys()]) {
      await this.removeHighlight(id);
    }
  }

  /**
   * Unified paint + session track. Every create/restore path goes here.
   */
  protected async renderAndRegister(data: HighlightData): Promise<void> {
    const colorRole = resolveColorRoleForPaint(data.colorRole, data.color);
    const normalized: HighlightData = {
      ...data,
      type: 'underscore',
      colorRole,
    };

    if (normalized.liveRanges && normalized.liveRanges.length > 0) {
      const live = normalized.liveRanges.filter((r) => r && !r.collapsed);
      if (live.length > 0) {
        getHighlightPainter().paint(normalized.id, live, colorRole);
      } else {
        this.logger.warn('Highlight has only collapsed ranges — no paint', {
          id: normalized.id,
        });
      }
    } else {
      this.logger.debug('Highlight registered without liveRanges — no page paint', {
        id: normalized.id,
      });
    }

    this.data.set(normalized.id, normalized);
  }

  async removeHighlight(id: string): Promise<void> {
    const data = this.data.get(id);
    if (!data) {
      this.logger.warn('Highlight not found', { id });
      return;
    }

    getHighlightPainter().unpaint(id);
    this.data.delete(id);
    this.logger.info('Highlight removed', { id });
  }

  /**
   * Remove paint + session state without persisting removal.
   * Caller must have already deleted via background HighlightDeleteService.
   */
  async detachFromPage(id: string): Promise<void> {
    await this.removeHighlight(id);
    this.facade.evict(id);
  }

  /**
   * Clear all session paint (and optionally leave persistence to the mode).
   * Modes should call this from clearAll after durable wipe.
   */
  protected clearPaint(): void {
    getHighlightPainter().clear();
    this.data.clear();
  }

  getHighlight(id: string): HighlightData | null {
    return this.data.get(id) || null;
  }

  getAllHighlights(): HighlightData[] {
    return Array.from(this.data.values());
  }

  protected generateId(): string {
    return generateHighlightId();
  }

  abstract createHighlight(selection: Selection, colorRole: string): Promise<string>;
  abstract createFromData(data: HighlightData): Promise<void>;
  abstract updateHighlight(id: string, updates: Partial<HighlightData>): Promise<void>;
  abstract clearAll(): Promise<void>;

  async onHighlightCreated(_event: HighlightCreatedEvent): Promise<void> {
    return Promise.resolve();
  }

  async onHighlightRemoved(_event: HighlightRemovedEvent): Promise<void> {
    return Promise.resolve();
  }

  shouldRestore(): boolean {
    return false;
  }

  getDeletionConfig(): DeletionConfig {
    return {
      showDeleteIcon: true,
      requireConfirmation: false,
      allowUndo: true,
      iconType: 'trash',
    };
  }
}
