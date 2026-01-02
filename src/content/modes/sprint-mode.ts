/**
 * Sprint Mode
 *
 * Philosophy: "Use and forget" - Zero commitment, minimal trace
 *
 * Features:
 * - 4-hour TTL (auto-delete after 4 hours)
 * - Local storage with per-domain encryption
 * - In-memory undo/redo
 * - Adaptive theming (Material Design colors)
 * - No account required
 * 
 * Architectural Compliance:
 * - Implements IBasicMode only (Interface Segregation Principle)
 * - Encapsulates persistence logic (Single Responsibility Principle)
 * - No restore() method needed (uses event sourcing instead)
 * 
 * @see docs/05-quality-framework/03-architecture-principles.md#interface-segregation
 */

import { BaseHighlightMode } from './base-highlight-mode';
import type { HighlightData } from './highlight-mode.interface';
import type { IBasicMode, ModeCapabilities } from './mode-interfaces';

import { serializeRange } from '@/content/utils/range-converter';
import type { IStorage } from '@/shared/interfaces/i-storage';
import type { IHighlightRepository } from '@/shared/repositories/i-highlight-repository';
import type { HighlightCreatedEvent, HighlightRemovedEvent } from '@/shared/types/events';
import { EventName } from '@/shared/types/events';
import { generateContentHash } from '@/shared/utils/content-hash';
import type { EventBus } from '@/shared/utils/event-bus';
import type { ILogger } from '@/shared/utils/logger';

export class SprintMode extends BaseHighlightMode implements IBasicMode {
  private static readonly TTL_HOURS = 4;

  constructor(
    repository: IHighlightRepository,
    storage: IStorage,
    eventBus: EventBus,
    logger: ILogger
  ) {
    super(eventBus, logger, repository);
    this.storage = storage; // Explicitly set storage for Sprint Mode (uses event sourcing)
  }

  get name(): 'sprint' {
    return 'sprint' as const;
  }

  readonly capabilities: ModeCapabilities = {
    persistence: 'local',
    undo: true,
    sync: false,
    collections: false,
    tags: false,
    export: false,
    ai: false,
    search: false,
    multiSelector: false,
  };

  /**
   * Override onActivate to clean expired highlights after restoration
   */
  override async onActivate(): Promise<void> {
    await super.onActivate();

    // Clean any highlights that expired while mode was inactive
    const cleaned = await this.cleanExpiredHighlights();
    if (cleaned > 0) {
      this.logger.info(`Sprint Mode activated: cleaned ${cleaned} expired highlights`);
    }
  }

  async createHighlight(selection: Selection, colorRole: string): Promise<string> {
    if (selection.rangeCount === 0) {
      throw new Error('No range in selection');
    }

    const range = selection.getRangeAt(0);
    const text = range.toString().trim();

    if (!text) {
      throw new Error('Empty text selection');
    }

    // ============================================
    // DEDUPLICATION: Check for existing highlight
    // ============================================
    const contentHash = await generateContentHash(text);
    const existing = await this.repository.findByContentHash(contentHash);

    if (existing && existing.id) {
      this.logger.info('Duplicate content detected - returning existing highlight', {
        existingId: existing.id,
        text: text.substring(0, 50) + '...',
      });
      return existing.id; // [OK] Return existing instead of creating duplicate
    }

    const id = this.generateId();
    const serializedRange = serializeRange(range);

    if (!serializedRange) {
      throw new Error('Failed to serialize range');
    }

    const data: HighlightData = {
      id,
      text,
      contentHash, // [OK] Store hash for future dedup
      colorRole, // [OK] Semantic token
      type: 'underscore',
      ranges: [serializedRange],
      liveRanges: [range],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + SprintMode.TTL_HOURS * 60 * 60 * 1000), // 4 hours from now
    };

    // 1. Create Custom Highlight API highlight
    const highlight = new Highlight(range);

    // 2. Add to CSS.highlights (DOM)
    CSS.highlights.set(id, highlight);
    this.logger.info('Added to CSS.highlights', { id });

    // 3. Add to internal maps (mode state)
    this.highlights.set(id, highlight);
    this.data.set(id, data);
    this.logger.info('Added to mode internal maps', { id });

    // 4. Add to repository (persistence)
    // CRITICAL: Add to repository cache and storage
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repository.add(data as any);

    this.logger.info('Added to repository', { id });

    // Unified rendering - ALWAYS registers properly!
    await this.renderAndRegister(data);

    // Emit event
    this.eventBus.emit(EventName.HIGHLIGHT_CREATED, {
      type: EventName.HIGHLIGHT_CREATED,
      highlight: {
        id: data.id,
        text: data.text,
        colorRole: data.colorRole,
        ranges: data.ranges,
      },
    });

    return id;
  }

  async createFromData(data: HighlightData): Promise<void> {
    // Used by undo/redo and range subtraction
    // CRITICAL: Goes through same renderAndRegister path!
    await this.renderAndRegister(data);

    // CRITICAL FIX: Populate repository cache during restore
    // This ensures hover detector can find highlights after page reload
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repository.add(data as any);

    this.eventBus.emit(EventName.HIGHLIGHT_CREATED, {
      type: EventName.HIGHLIGHT_CREATED,
      highlight: {
        id: data.id,
        text: data.text,
        colorRole: data.colorRole,
        ranges: data.ranges,
      },
    });
  }

  async updateHighlight(id: string, updates: Partial<HighlightData>): Promise<void> {
    const existing = this.data.get(id);
    if (!existing) {
      throw new Error(`Highlight ${id} not found`);
    }

    const updated = { ...existing, ...updates };
    this.data.set(id, updated);

    // Re-inject CSS if colorRole changed
    if (updates.colorRole) {
      const { injectHighlightCSS } = await import('@/content/styles/highlight-styles');
      injectHighlightCSS(updated.type, id, updates.colorRole);
    }
  }

  override async removeHighlight(id: string): Promise<void> {
    this.logger.info('Removing highlight', { id });

    // [OK] Remove from Custom Highlight API (DOM)
    // 1. Remove BARE ID (Manual registration)
    if (CSS.highlights.has(id)) {
      CSS.highlights.delete(id);
      this.logger.info('Removed from CSS.highlights (bare)', { id });
    }

    // 2. Remove PREFIXED ID (Unified renderAndRegister)
    // CRITICAL: This was missing!
    const { getHighlightName } = await import('@/content/styles/highlight-styles');
    const highlightName = getHighlightName('underscore', id);
    if (CSS.highlights.has(highlightName)) {
      CSS.highlights.delete(highlightName);
      this.logger.info('Removed from CSS.highlights (prefixed)', { highlightName });
    }

    // [OK] Remove from internal maps (state)
    this.highlights.delete(id);
    this.data.delete(id);

    // [OK] Remove from repository (persistence)
    await this.repository.remove(id);

    this.logger.info('Highlight removed completely', { id });
  }

  async clearAll(): Promise<void> {
    const count = this.data.size;
    this.logger.info('Clearing all highlights in sprint mode', { count });

    // [OK] Clear Custom Highlight API (DOM)
    CSS.highlights.clear();

    // [OK] Clear internal maps (state)
    this.highlights.clear();
    this.data.clear();

    // [OK] Clear repository (persistence)
    await this.repository.clear();

    // [OK] Emit storage event for event sourcing (CRITICAL FIX!)
    if (this.storage) {
      await this.storage.saveEvent({
        type: 'highlights.cleared',
        timestamp: Date.now(),
        eventId: crypto.randomUUID(),
        count,
      });
    }

    this.logger.info('All highlights cleared (with storage event)', { count });
  }

  /**
   * Event Handler: Highlight Created
   * Sprint Mode: Persists to event store with TTL
   */
  override async onHighlightCreated(event: HighlightCreatedEvent): Promise<void> {
    this.logger.debug('Sprint Mode: Persisting highlight to event store');

    // Convert event data to storage format (HighlightDataV2)
    const { toStorageFormat } = await import('@/content/highlight-type-bridge');
    const storageData = await toStorageFormat({
      ...event.highlight,
      type: event.highlight.type || 'underscore',
      createdAt: event.highlight.createdAt || new Date(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    if (this.storage) {
      await this.storage.saveEvent({
        type: 'highlight.created',
        timestamp: Date.now(),
        eventId: crypto.randomUUID(),
        data: storageData,
      });
    }
  }

  /**
   * Event Handler: Highlight Removed
   * Sprint Mode: Persists removal event
   */
  override async onHighlightRemoved(event: HighlightRemovedEvent): Promise<void> {
    this.logger.debug('Sprint Mode: Removing highlight and persisting removal event');

    // CRITICAL FIX: Actually remove the highlight!
    await this.removeHighlight(event.highlightId);

    // Also persist the removal event for event sourcing
    if (this.storage) {
      await this.storage.saveEvent({
        type: 'highlight.removed',
        timestamp: Date.now(),
        eventId: crypto.randomUUID(),
        highlightId: event.highlightId,
      });
    }
  }

  /**
   * Clean Expired Highlights (TTL Enforcement)
   * Removes highlights older than 4 hours
   * Called on restore and can be called periodically
   * 
   * @returns Number of highlights cleaned
   */
  async cleanExpiredHighlights(): Promise<number> {
    const now = Date.now();
    const expiredIds: string[] = [];

    // Find all expired highlights
    for (const [id, data] of this.data.entries()) {
      if (data.expiresAt && data.expiresAt.getTime() < now) {
        expiredIds.push(id);
        this.logger.debug('Highlight expired (TTL)', {
          id,
          createdAt: data.createdAt,
          expiresAt: data.expiresAt,
          age: Math.round((now - (data.createdAt?.getTime() || now)) / 1000 / 60 / 60) + 'h'
        });
      }
    }

    // Remove expired highlights
    for (const id of expiredIds) {
      await this.removeHighlight(id);
    }

    if (expiredIds.length > 0) {
      this.logger.info('Cleaned expired highlights', { count: expiredIds.length });

      // Persist cleanup event
      if (this.storage) {
        await this.storage.saveEvent({
          type: 'highlights.ttl_cleanup',
          timestamp: now,
          eventId: crypto.randomUUID(),
          count: expiredIds.length,
          ids: expiredIds,
        } as any); // Custom event type for TTL cleanup
      }
    }

    return expiredIds.length;
  }

  /**
   * Restoration Control
   * Sprint Mode: Restores from event sourcing
   */
  override shouldRestore(): boolean {
    return true; // Sprint Mode restores via event sourcing
  }

  /**
   * Deletion Configuration  
   * Sprint Mode: Requires confirmation (persistent highlights)
   */
  override getDeletionConfig(): import('./highlight-mode.interface').DeletionConfig {
    return {
      showDeleteIcon: true,
      requireConfirmation: true,  // Persistent, ask before deleting
      confirmationMessage: 'Delete this highlight? (Undo available with Ctrl+Z)',
      allowUndo: true,
      iconType: 'trash'
    };
  }
}
