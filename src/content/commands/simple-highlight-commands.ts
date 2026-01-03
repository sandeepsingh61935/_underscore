/**
 * @file simple-highlight-commands.ts
 * @description Simplified commands for Custom Highlight API
 *
 * These commands work with both HighlightManager (Custom API) and HighlightRenderer (legacy)
 */

import type { HighlightData as ModeHighlightData } from '@/content/modes/highlight-mode.interface';
import { deserializeRange, serializeRange } from '@/content/utils/range-converter';
import type { IModeManager } from '@/shared/interfaces/i-mode-manager';
import type { Command } from '@/shared/patterns/command';
import type { SerializedRange } from '@/shared/schemas/highlight-schema';
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
          colorRole: this.colorRole,
        });
      } else {
        // Redo - recreate from serialized range
        if (!this.serializedRange) {
          this.logger.warn('Cannot redo: No serialized range stored');
          return;
        }

        const range = deserializeRange(this.serializedRange);
        if (!range) {
          this.logger.warn(
            'Cannot redo: Range deserialization failed (content may have changed)'
          );
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
          id: this.createdHighlightId,
        });
      }
    } catch (error) {
      this.logger.error('Command execute failed', error as Error, {
        highlightId: this.createdHighlightId,
        colorRole: this.colorRole,
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
        id: this.createdHighlightId,
      });
    } catch (error) {
      this.logger.error('Command undo failed', error as Error, {
        highlightId: this.createdHighlightId,
      });
      throw error;
    }
  }
}

/**
 * Remove highlight command
 *
 * **Responsibility**: Manage undo/redo state for highlight removal
 *
 * **Design Pattern**: Command Pattern with Dependency Inversion Principle
 * - Depends on IModeManager interface
 * - Delegates ALL removal/restoration to modes
 * - Stores minimal snapshot for undo
 *
 * @remarks
 * Commands do NOT access repository or storage directly.
 * All persistence is delegated to modes via IModeManager.
 *
 * @see Phase 1.1.3: Refactor RemoveHighlightCommand
 */
export class RemoveHighlightCommand implements Command {
  private highlightSnapshot: ModeHighlightData | null = null;

  /**
   * @param highlightId - ID of highlight to remove
   * @param modeManager - Mode manager interface (DI)
   * @param logger - Logger interface (DI)
   */
  constructor(
    private readonly highlightId: string,
    private readonly modeManager: IModeManager,
    private readonly logger: ILogger
  ) {}

  /**
   * Execute: Remove highlight via mode manager
   * Snapshots data before removal for undo capability
   */
  async execute(): Promise<void> {
    try {
      // Snapshot highlight data if not already captured
      if (!this.highlightSnapshot) {
        const data = this.modeManager.getHighlight(this.highlightId);

        if (!data) {
          this.logger.warn('Cannot remove: Highlight not found', {
            id: this.highlightId,
          });
          return;
        }

        // Store snapshot for undo
        this.highlightSnapshot = { ...data };
      }

      // Delegate removal to mode
      await this.modeManager.removeHighlight(this.highlightId);

      this.logger.debug('Highlight removed', { id: this.highlightId });
    } catch (error) {
      this.logger.error('Remove command failed', error as Error, {
        id: this.highlightId,
      });
      throw error;
    }
  }

  /**
   * Undo: Restore highlight via mode manager
   */
  async undo(): Promise<void> {
    if (!this.highlightSnapshot) {
      this.logger.warn('Cannot undo: No snapshot stored');
      return;
    }

    try {
      // Delegate restoration to mode
      const mode = this.modeManager.getCurrentMode();
      await mode.createFromData(this.highlightSnapshot);

      this.logger.debug('Highlight restored (undo)', {
        id: this.highlightId,
      });
    } catch (error) {
      this.logger.error('Undo remove failed', error as Error, {
        id: this.highlightId,
      });
      throw error;
    }
  }
}
