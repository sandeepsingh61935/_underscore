/**
 * Highlight Mode Interface
 *
 * Defines contract for all highlight modes (Sprint, Vault, Gen)
 *
 * @deprecated This interface will be replaced by IBasicMode in future.
 * For now, it extends IBasicMode for backward compatibility during Phase 0 refactoring.
 *
 * @see mode-interfaces.ts for new segregated interfaces
 */

import type { SerializedRange } from '@/shared/schemas/highlight-schema';
import type { IBasicMode, ModeCapabilities } from './mode-interfaces';
import type { HighlightCreatedEvent, HighlightRemovedEvent } from '@/shared/types/events';

export interface HighlightData {
  id: string;
  text: string;
  contentHash: string; // SHA-256 hash for deduplication

  /** Semantic color role (e.g., 'yellow', 'blue') - maps to CSS design tokens */
  colorRole: string;

  /** @deprecated Legacy field - use colorRole with CSS variables instead */
  color?: string;

  type: 'underscore';
  ranges: SerializedRange[];
  liveRanges: Range[];
  createdAt?: Date;
}

/**
 * @deprecated Use IBasicMode instead (with IPersistentMode, etc. as needed)
 * This interface is kept for backward compatibility during Phase 0 refactoring.
 */
export interface IHighlightMode extends IBasicMode {
  /** Mode identifier */
  readonly name: 'walk' | 'sprint' | 'vault' | 'gen';

  /** Mode capabilities */
  readonly capabilities: ModeCapabilities;

  /** Initialize mode (called on activation) */
  onActivate(): Promise<void>;

  /** Cleanup mode (called on deactivation) */
  onDeactivate(): Promise<void>;

  /** Create highlight from selection */
  createHighlight(selection: Selection, color: string): Promise<string>;

  /** Create highlight from pre-built data (for undo/range subtraction) */
  createFromData(data: HighlightData): Promise<void>;

  /** Remove highlight by ID */
  removeHighlight(id: string): Promise<void>;

  /** Update highlight properties */
  updateHighlight(id: string, updates: Partial<HighlightData>): Promise<void>;

  /** Get highlight by ID */
  getHighlight(id: string): HighlightData | null;

  /** Get all highlights */
  getAllHighlights(): HighlightData[];

  /** Clear all highlights */
  clearAll(): Promise<void>;

  // New methods from IBasicMode
  onHighlightCreated(event: HighlightCreatedEvent): Promise<void>;
  onHighlightRemoved(event: HighlightRemovedEvent): Promise<void>;
  shouldRestore(): boolean;

  /**
   * @deprecated Only IPersistentMode modes need this
   * For basic modes (Walk, Sprint), check shouldRestore() instead
   */
  restore?(url: string): Promise<void>;
}
