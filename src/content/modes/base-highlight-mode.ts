/**
 * Base Highlight Mode
 *
 * Provides common functionality for all modes
 * Note: Does NOT implement IHighlightMode (removed for ISP compliance)
 * Concrete modes implement IBasicMode (and optionally IPersistentMode, etc.)
 */

import type { HighlightData, DeletionConfig } from './highlight-mode.interface';

import { getHighlightName } from '@/content/styles/highlight-styles';
import type { IStorage } from '@/shared/interfaces/i-storage';
import type { IHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import type { HighlightCreatedEvent, HighlightRemovedEvent } from '@/shared/types/events';
import type { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';

export abstract class BaseHighlightMode {
  // Internal tracking (replaces HighlightManager.highlights)
  protected highlights = new Map<string, Highlight>();
  protected data = new Map<string, HighlightData>();
  protected repository: IHighlightRepository;
  protected storage?: IStorage; // Optional, strict DI for modes that need it

  constructor(
    protected readonly eventBus: EventBus,
    protected readonly logger: ILogger,
    repository: IHighlightRepository // [OK] Interface-based DI
  ) {
    this.repository = repository;
  }

  abstract get name(): 'ephemeral' | 'local' | 'cloud' | 'ai';

  async onActivate(): Promise<void> {
    this.logger.info(`${this.name} mode activated`);

    // CRITICAL FIX: Sync mode.data to repository cache
    // This ensures hover detector can find highlights after mode activation/restore
    // Sync with repository (FIXME: This causes infinite recursion if add() triggers events)
    // Modes should trust the repository is the source of truth, or sync one-way only
    /*
    for (const [, highlight] of this.data.entries()) {
      await this.repository.add({ ...highlight, version: 2 } as any);
    }
    */
  }

  async onDeactivate(): Promise<void> {
    this.logger.info(`${this.name} mode deactivated`);
    // Clear all highlights
    for (const id of this.highlights.keys()) {
      await this.removeHighlight(id);
    }
  }

  /**
   * CRITICAL: Unified creation method
   * This ensures EVERY highlight goes through same path → always registers!
   */
  protected async renderAndRegister(data: HighlightData): Promise<void> {
    const highlightName = getHighlightName(data.type, data.colorRole);

    // Get existing semantic highlight group or create new one
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let semanticHighlight = (CSS as any).highlights.get(highlightName);
    if (!semanticHighlight) {
      semanticHighlight = new Highlight();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (CSS as any).highlights.set(highlightName, semanticHighlight);
    }

    // Add ranges to semantic highlight group
    for (const range of data.liveRanges) {
      semanticHighlight.add(range);
    }

    // Track internally
    // We don't store a Highlight object anymore, just keep the data for ranges
    this.data.set(data.id, data);

    this.logger.debug('Highlight rendered and registered', { id: data.id });
  }

  async removeHighlight(id: string): Promise<void> {
    const data = this.data.get(id);
    if (!data) {
      this.logger.warn('Highlight not found', { id });
      return;
    }

    const highlightName = getHighlightName(data.type, data.colorRole);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const semanticHighlight = (CSS as any).highlights.get(highlightName);

    if (semanticHighlight) {
      for (const range of data.liveRanges) {
        if (semanticHighlight.has(range)) {
          semanticHighlight.delete(range);
        }
      }
    }

    // Remove from tracking
    this.highlights.delete(id);
    this.data.delete(id);

    this.logger.info('Highlight removed', { id });
  }

  getHighlight(id: string): HighlightData | null {
    return this.data.get(id) || null;
  }

  getAllHighlights(): HighlightData[] {
    return Array.from(this.data.values());
  }

  protected generateId(): string {
    return `hl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Abstract methods - mode-specific
  abstract createHighlight(selection: Selection, colorRole: string): Promise<string>;
  abstract createFromData(data: HighlightData): Promise<void>;
  abstract updateHighlight(id: string, updates: Partial<HighlightData>): Promise<void>;
  abstract clearAll(): Promise<void>;

  // Note: restore() removed - only IPersistentMode needs it (Interface Segregation Principle)
  // Modes use shouldRestore() to indicate if they want restoration

  /**
   * Default implementations for IBasicMode
   * Modes can override these if they need to handle events or persistence
   */
  async onHighlightCreated(_event: HighlightCreatedEvent): Promise<void> {
    // Default: No-op. Override in IPersistentMode implementation (like Vault/Sprint)
    // if you want to handle event-sourced creation.
    return Promise.resolve();
  }

  async onHighlightRemoved(_event: HighlightRemovedEvent): Promise<void> {
    // Default: No-op.
    return Promise.resolve();
  }

  shouldRestore(): boolean {
    // Default: false (Privacy-First / ephemeral).
    // Override to return true in persistent modes.
    return false;
  }

  /**
   * Default deletion configuration
   * Modes can override to customize deletion behavior
   */
  getDeletionConfig(): DeletionConfig {
    return {
      showDeleteIcon: true,
      requireConfirmation: false,
      allowUndo: true,
      iconType: 'trash',
    };
  }
}
