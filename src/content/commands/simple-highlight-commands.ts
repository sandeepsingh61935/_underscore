/**
 * @file simple-highlight-commands.ts
 * @description Simplified commands for Custom Highlight API
 *
 * These commands work with both HighlightManager (Custom API) and HighlightRenderer (legacy)
 */

import type { HighlightManager, HighlightData } from '@/content/highlight-manager';
import type { HighlightRenderer } from '@/content/highlight-renderer';
import type { ModeManager } from '@/content/modes';
import type { HighlightData as ModeHighlightData } from '@/content/modes/highlight-mode.interface';
import { getHighlightName, injectHighlightCSS } from '@/content/styles/highlight-styles';
import { deserializeRange, serializeRange } from '@/content/utils/range-converter';
import type { Command } from '@/shared/patterns/command';
import type { RepositoryFacade } from '@/shared/repositories';
import { RepositoryFactory } from '@/shared/repositories';
import type { SerializedRange } from '@/shared/schemas/highlight-schema';
import type { StorageService } from '@/shared/services/storage-service';
import type { IModeManager } from '@/shared/interfaces/i-mode-manager';
import type { ILogger } from '@/shared/utils/logger';

/**
 * Create highlight command - works with both APIs
 * FIXED: Stores serialized range so redo works even after selection is lost
 */
/**
 * Create highlight command
 * 
 * **Responsibility**: Manage undo/redo state for highlight creation
 * 
 * **Design Pattern**: Command Pattern with Dependency Inversion Principle
 * - Depends on IModeManager interface (not concrete classes)
 * - Delegates ALL persistence to modes (Single Responsibility)
 * - Stores minimal state for undo/redo operations
 * 
 * @remarks
 * Commands do NOT:
 * - Access repository directly (violates SRP)
 * - Save events to storage (mode handles this)
 * - Emit events (mode handles this)
 * 
 * Commands ONLY:
 * - Store state for undo/redo
 * - Delegate operations to IModeManager
 * - Log operations for debugging
 * 
 * @see Phase 1.1.2: Refactor CreateHighlightCommand
 * @see IModeManager interface for delegation contract
 */
export class CreateHighlightCommand implements Command {
  private createdHighlightId: string | null = null;
  private serializedRange: SerializedRange | null = null;

  /**
   * @param selection - Browser Selection object to create highlight from
   * @param colorRole - Semantic color role (e.g., 'yellow', 'blue')
   * @param modeManager - Mode manager interface (DI - follows DIP)
   * @param logger - Logger interface for debugging (DI - follows DIP)
   */
  constructor(
    private readonly selection: Selection,
    private readonly colorRole: string,
    private readonly modeManager: IModeManager,
    private readonly logger: ILogger
  ) {
    // Store serialized range for redo operations
    if (selection.rangeCount > 0) {
      this.serializedRange = serializeRange(selection.getRangeAt(0));
    }
  }

  /**
   * Execute command: Create highlight via mode manager
   * 
   * On first execution: Creates new highlight
   * On redo: Recreates highlight from stored range
   */
  async execute(): Promise<void> {
    try {
      if (!this.createdHighlightId) {
        // First execution - create new highlight
        this.createdHighlightId = await this.modeManager.createHighlight(
          this.selection,
          this.colorRole
        );

        this.logger.debug('Highlight created via mode', {
          id: this.createdHighlightId,
          colorRole: this.colorRole
        });
      } else {
        // Redo - recreate from serialized range
        if (!this.serializedRange) {
          this.logger.warn('Cannot redo: No serialized range stored');
          return;
        }

        const range = deserializeRange(this.serializedRange);
        if (!range) {
          this.logger.warn('Cannot redo: Range deserialization failed (content may have changed)');
          return;
        }

        // Get current mode and recreate highlight
        const mode = this.modeManager.getCurrentMode();
        const text = range.toString();

        // Generate content hash for deduplication
        const { generateContentHash } = await import('@/shared/utils/content-hash');
        const contentHash = await generateContentHash(text);

        // Recreate via mode's createFromData - this handles ALL persistence
        await mode.createFromData({
          id: this.createdHighlightId,
          text,
          contentHash,
          colorRole: this.colorRole,
          type: 'underscore' as const,
          ranges: [this.serializedRange],
          liveRanges: [range],
          createdAt: new Date(),
        });

        this.logger.debug('Highlight recreated (redo)', {
          id: this.createdHighlightId
        });
      }
    } catch (error) {
      this.logger.error('Command execute failed', error as Error, {
        highlightId: this.createdHighlightId,
        colorRole: this.colorRole
      });
      throw error;
    }
  }

  /**
   * Undo command: Remove highlight via mode manager
   */
  async undo(): Promise<void> {
    if (!this.createdHighlightId) {
      this.logger.warn('Cannot undo: No highlight ID stored');
      return;
    }

    try {
      // Delegate removal to mode - it handles ALL cleanup
      await this.modeManager.removeHighlight(this.createdHighlightId);

      this.logger.debug('Highlight removed (undo)', {
        id: this.createdHighlightId
      });
    } catch (error) {
      this.logger.error('Command undo failed', error as Error, {
        highlightId: this.createdHighlightId
      });
      throw error;
    }
  }
}

/**
 * Remove highlight command
 */
export class RemoveHighlightCommand implements Command {
  private serializedRanges: SerializedRange[] = [];

  constructor(
    private highlight: Highlight,
    private manager: ModeManager | HighlightManager | HighlightRenderer, // Accept all types
    private repositoryFacade: RepositoryFacade,
    private storage: StorageService
  ) {
    // Store ALL ranges for undo (multi-range support!)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const h = highlight as any;
    const liveRanges = h.liveRanges || [];
    this.serializedRanges = liveRanges.map((r: Range) => serializeRange(r));
  }

  async execute(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const h = this.highlight as any;

    // Remove
    if ('removeHighlight' in this.manager) {
      this.manager.removeHighlight(h.id);
    }

    this.repositoryFacade.remove(h.id);

    // Save event (SPRINT MODE ONLY)
    if (RepositoryFactory.getMode() !== 'walk') {
      await this.storage.saveEvent({
        type: 'highlight.removed',
        timestamp: Date.now(),
        eventId: crypto.randomUUID(),
        highlightId: h.id,
      });
    }
  }

  async undo(): Promise<void> {
    if (this.serializedRanges.length === 0) return;

    // Recreate ALL ranges from serialized data
    const liveRanges: Range[] = [];
    for (const sr of this.serializedRanges) {
      const range = deserializeRange(sr);
      if (range) {
        liveRanges.push(range);
      }
    }

    if (liveRanges.length === 0) return;

    // Check if manager is ModeManager
    if ('createFromData' in this.manager) {
      // Type cast for property access
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const h = this.highlight as any;

      // Generate contentHash
      const text = liveRanges.map((r) => r.toString()).join('');
      const { generateContentHash } = await import('@/shared/utils/content-hash');
      const contentHash = await generateContentHash(text);

      // [OK] Use mode's unified path (fixes registration!)
      await (this.manager as ModeManager).createFromData({
        id: h.id,
        text: h.text,
        contentHash,
        colorRole: h.color || 'yellow',
        type: 'underscore' as const,
        ranges: this.serializedRanges,
        liveRanges: liveRanges,
        createdAt: new Date(),
      });
    } else {
      // Legacy path
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const h = this.highlight as any;
      const highlightName = getHighlightName(h.type, h.id);
      injectHighlightCSS(h.type, h.id, h.color);
      const nativeHighlight = new Highlight(...liveRanges);
      CSS.highlights.set(highlightName, nativeHighlight);
    }

    // Re-add to store with ORIGINAL data + liveRanges for click detection!
    this.repositoryFacade.addFromData({
      ...this.highlight,
      ranges: this.serializedRanges,
      liveRanges: liveRanges, // CRITICAL for click detection!
    });

    // Save event (SPRINT MODE ONLY)
    if (RepositoryFactory.getMode() !== 'walk') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const h = this.highlight as any;
      await this.storage.saveEvent({
        type: 'highlight.created',
        timestamp: Date.now(),
        eventId: crypto.randomUUID(),
        data: h,
      });
    }
  }
}

/**
 * Clear selection command
 */
export class ClearSelectionCommand implements Command {
  private serializedHighlights: Array<{
    id: string;
    color: string;
    type: string; // Changed from AnnotationType
    range: SerializedRange | null;
  }> = [];

  constructor(
    private highlights: Highlight[],
    private manager: HighlightManager | HighlightRenderer,
    private repositoryFacade: RepositoryFacade,
    private storage: StorageService
  ) {
    // Store data for undo
    this.serializedHighlights = highlights.map((hl) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const h = hl as any; // Type cast for property access
      return {
        id: h.id,
        color: h.color,
        type: h.type,
        range: h.liveRange ? serializeRange(h.liveRange) : null,
      };
    });
  }

  async execute(): Promise<void> {
    for (const hl of this.highlights) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const h = hl as any; // Type cast for property access

      if ('removeHighlight' in this.manager) {
        this.manager.removeHighlight(h.id);
      }

      this.repositoryFacade.remove(h.id);

      await this.storage.saveEvent({
        type: 'highlight.removed',
        timestamp: Date.now(),
        eventId: crypto.randomUUID(),
        highlightId: h.id,
      });
    }
  }

  async undo(): Promise<void> {
    for (const data of this.serializedHighlights) {
      if (!data.range) continue;

      const range = deserializeRange(data.range);
      if (!range) continue;

      const selection = window.getSelection();
      if (!selection) continue;

      selection.removeAllRanges();
      selection.addRange(range);

      const highlightData = this.manager.createHighlight(
        selection,
        data.color,
        'underscore' as const
      );

      if (highlightData) {
        this.repositoryFacade.addFromData(highlightData);

        await this.storage.saveEvent({
          type: 'highlight.created',
          timestamp: Date.now(),
          eventId: crypto.randomUUID(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: highlightData as any,
        });
      }

      selection.removeAllRanges();
    }
  }
}

/**
 * Clear all command
 */
export class ClearAllCommand implements Command {
  private serializedHighlights: Array<{
    id: string;
    color: string;
    type: string; // Changed from AnnotationType
    range: SerializedRange | null;
  }> = [];

  constructor(
    private highlights: Highlight[],
    private manager: HighlightManager | HighlightRenderer,
    private repositoryFacade: RepositoryFacade,
    private storage: StorageService
  ) {
    // Store data for undo
    this.serializedHighlights = highlights.map((hl) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const h = hl as any; // Type cast for property access
      return {
        id: h.id,
        color: h.color,
        type: h.type,
        range: h.liveRange ? serializeRange(h.liveRange) : null,
      };
    });
  }

  async execute(): Promise<void> {
    for (const hl of this.highlights) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const h = hl as any; // Type cast for property access

      if ('removeHighlight' in this.manager) {
        this.manager.removeHighlight(h.id);
      }

      this.repositoryFacade.remove(h.id);

      await this.storage.saveEvent({
        type: 'highlight.removed',
        timestamp: Date.now(),
        eventId: crypto.randomUUID(),
        highlightId: h.id,
      });
    }
  }

  async undo(): Promise<void> {
    for (const data of this.serializedHighlights) {
      if (!data.range) continue;

      const range = deserializeRange(data.range);
      if (!range) continue;

      const selection = window.getSelection();
      if (!selection) continue;

      selection.removeAllRanges();
      selection.addRange(range);

      const highlightData = this.manager.createHighlight(
        selection,
        data.color,
        'underscore' as const
      );

      if (highlightData) {
        this.repositoryFacade.addFromData(highlightData);

        await this.storage.saveEvent({
          type: 'highlight.created',
          timestamp: Date.now(),
          eventId: crypto.randomUUID(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: highlightData as any,
        });
      }

      selection.removeAllRanges();
    }
  }
}
