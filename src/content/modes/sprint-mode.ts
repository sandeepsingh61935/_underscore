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
import type { HighlightData, DeletionConfig } from './highlight-mode.interface';
import type { IBasicMode, ModeCapabilities } from './mode-interfaces';

import { getHighlightName, injectHighlightCSS } from '@/content/styles/highlight-styles';
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

  /**
   * Creates a new highlight in Sprint Mode (4-hour TTL, encrypted persistence)
   *
   * @param selection - The browser Selection object containing the text to highlight
   * @param colorRole - The color role to apply (e.g., 'yellow', 'blue', 'green')
   * @returns Promise resolving to the unique highlight ID
   *
   * @throws {Error} If selection has no ranges
   * @throws {Error} If selected text is empty
   * @throws {Error} If range serialization fails
   *
   * @remarks
   * Sprint Mode features:
   * - Deduplicates via content hash (returns existing ID if duplicate)
   * - Sets 4-hour TTL (auto-deletion after 4 hours)
   * - Persists to chrome.storage.local with domain-based encryption
   * - Uses event sourcing for restoration
   * - Emits HIGHLIGHT_CREATED event for persistence
   *
   * Persistence flow:
   * 1. Register with CSS Custom Highlight API
   * 2. Add to internal maps (highlights, data)
   * 3. Add to repository (triggers storage)
   * 4. Emit event for event sourcing
   *
   * @example
   * ```typescript
   * const selection = window.getSelection();
   * const id = await sprintMode.createHighlight(selection, 'yellow');
   * console.log('Created highlight with 4-hour TTL:', id);
   * ```
   */
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

    // FIXED: renderAndRegister() handles CSS.highlights registration
    // Removed duplicate: CSS.highlights.set(id, highlight)
    // Removed duplicate: this.highlights.set(id, highlight)
    // Removed duplicate: this.data.set(id, data)

    // 1. Render and register with CSS Custom Highlight API
    await this.renderAndRegister(data);

    // 2. Add to repository (persistence)
    // CRITICAL: Add to repository cache and storage
    // CRITICAL: Add to repository cache and storage
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repository.add({ ...data, version: 2 } as any);

    this.logger.info('Added to repository', { id });

    // 3. Emit event for event sourcing
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

  /**
   * Creates a highlight from existing HighlightData (restoration/undo)
   *
   * @param data - Complete HighlightData object
   * @returns Promise that resolves when highlight is rendered
   *
   * @remarks
   * Used for:
   * - Restoring highlights from storage (event replay)
   * - Undo/redo operations
   * - Range subtraction operations
   *
   * Critical: Populates repository cache to enable hover detection
   * Emits HIGHLIGHT_CREATED event for consistency
   */
  async createFromData(data: HighlightData): Promise<void> {
    // Used by undo/redo and range subtraction
    // CRITICAL: Goes through same renderAndRegister path!
    await this.renderAndRegister(data);

    // CRITICAL FIX: Populate repository cache during restore
    // This ensures hover detector can find highlights after page reload
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repository.add({ ...data, version: 2 } as any);

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

  /**
   * Updates an existing highlight's properties
   *
   * @param id - The highlight ID to update
   * @param updates - Partial HighlightData with fields to update
   * @returns Promise that resolves when update is complete
   *
   * @throws {Error} If highlight doesn't exist
   *
   * @remarks
   * - Updates in-memory data
   * - If colorRole changes, re-injects CSS
   * - Does NOT emit storage event (updates not persisted via event sourcing)
   *
   * @example
   * ```typescript
   * await sprintMode.updateHighlight('abc123', { colorRole: 'blue' });
   * ```
   */
  async updateHighlight(id: string, updates: Partial<HighlightData>): Promise<void> {
    const existing = this.data.get(id);
    if (!existing) {
      throw new Error(`Highlight ${id} not found`);
    }

    const updated = { ...existing, ...updates };
    this.data.set(id, updated);

    // Re-inject CSS if colorRole changed
    if (updates.colorRole) {
      injectHighlightCSS(updated.type, id, updates.colorRole);
    }
  }

  /**
   * Removes a highlight from Sprint Mode (persistent deletion)
   *
   * @param id - The highlight ID to remove
   * @returns Promise that resolves when removal is complete
   *
   * @remarks
   * Cleanup steps:
   * 1. Remove from CSS Custom Highlight API (both bare and prefixed IDs)
   * 2. Clear from internal maps (highlights, data)
   * 3. Remove from repository (triggers storage deletion)
   *
   * Repository removal triggers event sourcing persistence
   *
   * @example
   * ```typescript
   * await sprintMode.removeHighlight('abc123');
   * ```
   */
  override async removeHighlight(id: string): Promise<void> {
    this.logger.info('Removing highlight', { id });

    // FIXED: Only prefixed key needed after removing double-registration
    const highlightName = getHighlightName('underscore', id);
    if (CSS.highlights.has(highlightName)) {
      CSS.highlights.delete(highlightName);
      this.logger.info('Removed from CSS.highlights', { highlightName });
    }

    // [OK] Remove from internal maps (state)
    this.highlights.delete(id);
    this.data.delete(id);

    // [OK] Remove from repository (persistence)
    await this.repository.remove(id);

    this.logger.info('Highlight removed completely', { id });
  }

  /**
   * Clears ALL highlights from Sprint Mode
   *
   * @returns Promise that resolves when all highlights are cleared
   *
   * @remarks
   * Complete cleanup:
   * - Clears CSS.highlights (all DOM highlights)
   * - Clears internal highlight maps
   * - Clears internal data maps
   * - Clears repository (persistent storage)
   * - Emits 'highlights.cleared' event for event sourcing
   *
   * CRITICAL: Emits storage event to persist the clear operation
   *
   * @example
   * ```typescript
   * await sprintMode.clearAll();
   * console.log('All Sprint Mode highlights cleared and persisted');
   * ```
   */
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
    });

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
    this.logger.debug('Sprint Mode: Persisting removal event');

    // Persist the removal event for event sourcing
    // NOTE: Do NOT call this.removeHighlight() here - it would cause infinite recursion
    // The actual removal is already handled by the event emitter
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
          age:
            Math.round((now - (data.createdAt?.getTime() || now)) / 1000 / 60 / 60) + 'h',
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          type: 'highlights.ttl_cleanup' as any,
          timestamp: now,
          eventId: crypto.randomUUID(),
          count: expiredIds.length,
          ids: expiredIds,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  override getDeletionConfig(): DeletionConfig {
    return {
      showDeleteIcon: true,
      requireConfirmation: true, // Persistent, ask before deleting
      confirmationMessage: 'Delete this highlight?',
      allowUndo: true,
      iconType: 'remove', // Cross icon for consistency across modes
    };
  }
}
