/**
 * @file i-tag-repository.ts
 * @description Repository contract for normalized highlight labels (tags).
 */

import type { TagEntity } from '@/shared/types/tag-entity';

export interface ITagRepository {
  /** All tags in the active storage scope, sorted by name. */
  listAll(): Promise<TagEntity[]>;

  /** Label names attached to a single highlight via the junction table. */
  getLabelsForHighlight(highlightId: string): Promise<string[]>;

  /** Batch lookup: highlight id -> sorted label names. */
  getLabelsForHighlights(highlightIds: string[]): Promise<Map<string, string[]>>;

  /**
   * Replace a highlight's labels atomically: find-or-create tag rows,
   * then replace junction rows for that highlight.
   */
  setHighlightLabels(highlightId: string, names: string[]): Promise<void>;
}
