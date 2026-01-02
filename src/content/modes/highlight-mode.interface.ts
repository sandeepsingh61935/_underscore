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

import type { IBasicMode, ModeCapabilities } from './mode-interfaces';

import type { SerializedRange } from '@/shared/schemas/highlight-schema';
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

  /** 
   * Expiration timestamp for Sprint Mode TTL (4-hour auto-delete)
   * Only used in Sprint Mode. Null/undefined for Walk and Vault modes.
   */
  expiresAt?: Date;
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

  onHighlightCreated(event: HighlightCreatedEvent): Promise<void>;
  onHighlightRemoved(event: HighlightRemovedEvent): Promise<void>;
  shouldRestore(): boolean;

  /**
   * Get deletion configuration for this mode
   * Controls hover delete icon behavior, confirmation, undo, etc.
   * @returns Configuration object, or null to disable delete icon
   */
  getDeletionConfig(): DeletionConfig | null;

  /**
   * @deprecated Only IPersistentMode modes need this
   * For basic modes (Walk, Sprint), check shouldRestore() instead
   */
  restore?(url: string): Promise<void>;
}

/**
 * Mode-aware deletion configuration
 * Controls how the hover delete icon behaves for each mode
 */
export interface DeletionConfig {
  /** Show delete icon on highlight hover */
  showDeleteIcon: boolean;

  /** Require confirmation dialog before deletion */
  requireConfirmation: boolean;

  /** Custom confirmation message (if requireConfirmation is true) */
  confirmationMessage?: string;

  /** Icon type to display */
  iconType?: 'trash' | 'remove' | 'clear';

  /** Allow undo after deletion (uses command stack) */
  allowUndo: boolean;

  /**
   * Custom hook to run before deletion
   * Return false to cancel deletion
   * Useful for mode-specific validation (e.g., Vault sync check, Gen AI suggestions)
   */
  beforeDelete?: (highlightId: string) => Promise<boolean>;
}
