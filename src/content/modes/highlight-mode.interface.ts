/**
 * Highlight Mode Interface
 *
 * Defines contract for all highlight modes (Sprint, Vault, Gen)
 */

import type { SerializedRange } from '@/shared/schemas/highlight-schema';

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

export interface IHighlightMode {
  /** Mode identifier */
  readonly name: 'sprint' | 'vault' | 'gen';

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

  /** Restore highlights for current page */
  restore(url: string): Promise<void>;

  /** Get highlight by ID */
  getHighlight(id: string): HighlightData | null;

  /** Get all highlights */
  getAllHighlights(): HighlightData[];

  /** Clear all highlights */
  clearAll(): Promise<void>;
}
