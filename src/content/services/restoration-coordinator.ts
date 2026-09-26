/**
 * RestorationCoordinator
 *
 * Classifies highlights on the current page into anchored and unanchored (orphaned),
 * collects restoration reports, and coordinates re-anchoring when a page drifts.
 *
 * @see docs/superpowers/specs/2026-09-03-anchor-drift-and-orphan-recovery-prd.md
 */

import {
  deserializeRange as defaultDeserializeRange,
  serializeRange as defaultSerializeRange,
} from '@/content/utils/range-converter';
import type { HighlightDataV2, SerializedRange } from '@/shared/schemas/highlight-schema';
import type { ILogger } from '@/shared/utils/logger';

export interface RestorationReport {
  url: string;
  anchoredIds: string[];
  unanchoredIds: string[];
  totalCount: number;
}

export interface RestorationCoordinatorDeps {
  logger: ILogger;
  deserializeRange?: (sr: SerializedRange) => Range | null;
  serializeRange?: (range: Range) => SerializedRange | null;
  renderAndRegister?: (
    highlight: HighlightDataV2 & { liveRanges?: Range[] }
  ) => Promise<void>;
  onUpdateHighlight?: (id: string, updates: Partial<HighlightDataV2>) => Promise<void>;
  url?: string;
}

export class RestorationCoordinator {
  private readonly logger: ILogger;
  private readonly deserializeRange: (sr: SerializedRange) => Range | null;
  private readonly serializeRange: (range: Range) => SerializedRange | null;
  private readonly renderAndRegister?: (
    highlight: HighlightDataV2 & { liveRanges?: Range[] }
  ) => Promise<void>;
  private readonly onUpdateHighlight?: (
    id: string,
    updates: Partial<HighlightDataV2>
  ) => Promise<void>;
  private url: string;
  private anchoredIds = new Set<string>();
  private unanchoredIds = new Set<string>();
  private totalCount = 0;

  constructor(deps: RestorationCoordinatorDeps) {
    this.logger = deps.logger;
    this.deserializeRange = deps.deserializeRange ?? defaultDeserializeRange;
    this.serializeRange = deps.serializeRange ?? defaultSerializeRange;
    this.renderAndRegister = deps.renderAndRegister;
    this.onUpdateHighlight = deps.onUpdateHighlight;
    this.url = deps.url ?? '';
  }

  setUrl(url: string): void {
    this.url = url;
  }

  /**
   * Classifies each highlight as anchored or unanchored by resolving its DOM ranges.
   */
  async restorePageHighlights(highlights: HighlightDataV2[]): Promise<RestorationReport> {
    this.anchoredIds.clear();
    this.unanchoredIds.clear();
    this.totalCount = highlights.length;

    for (const highlight of highlights) {
      try {
        const legacyData = highlight as unknown as Record<string, unknown>;
        const serializedRanges: SerializedRange[] =
          highlight.ranges ||
          (legacyData['range'] ? [legacyData['range'] as SerializedRange] : []);

        if (serializedRanges.length === 0) {
          this.logger.warn('[RestorationCoordinator] No ranges found for highlight', {
            id: highlight.id,
          });
          this.unanchoredIds.add(highlight.id);
          continue;
        }

        const liveRanges: Range[] = [];
        for (const sr of serializedRanges) {
          try {
            const range = this.deserializeRange(sr);
            if (range) {
              liveRanges.push(range);
            }
          } catch (rangeError) {
            this.logger.warn('[RestorationCoordinator] Range deserialization failed', {
              id: highlight.id,
              error:
                rangeError instanceof Error ? rangeError.message : String(rangeError),
            });
          }
        }

        if (liveRanges.length === 0) {
          this.logger.warn(
            '[RestorationCoordinator] Highlight could not be located in DOM (unanchored)',
            { id: highlight.id, text: highlight.text }
          );
          this.unanchoredIds.add(highlight.id);
          continue;
        }

        if (this.renderAndRegister) {
          await this.renderAndRegister({
            ...highlight,
            liveRanges,
          });
        }

        this.anchoredIds.add(highlight.id);
      } catch (error) {
        this.logger.error(
          '[RestorationCoordinator] Error evaluating highlight',
          error as Error,
          {
            id: highlight.id,
          }
        );
        this.unanchoredIds.add(highlight.id);
      }
    }

    return this.getReport();
  }

  getReport(): RestorationReport {
    return {
      url: this.url,
      anchoredIds: Array.from(this.anchoredIds),
      unanchoredIds: Array.from(this.unanchoredIds),
      totalCount: this.totalCount,
    };
  }

  markAnchored(id: string): void {
    this.unanchoredIds.delete(id);
    this.anchoredIds.add(id);
  }

  markUnanchored(id: string): void {
    this.anchoredIds.delete(id);
    this.unanchoredIds.add(id);
  }

  isUnanchored(id: string): boolean {
    return this.unanchoredIds.has(id);
  }

  /**
   * Re-anchors an unanchored highlight to a new DOM Range.
   * Recomputes range/selector, updates persistence, paints stroke, and marks as anchored.
   */
  async reanchorHighlight(
    highlight: HighlightDataV2,
    newRange: Range
  ): Promise<HighlightDataV2> {
    if (!newRange || newRange.collapsed || !newRange.toString().trim()) {
      throw new Error('Cannot re-anchor to an empty or collapsed range');
    }

    const serializedRange = this.serializeRange(newRange);
    if (!serializedRange) {
      throw new Error('Failed to serialize new range for re-anchoring');
    }

    const now = new Date();
    const updatedHighlight: HighlightDataV2 = {
      ...highlight,
      text: newRange.toString(),
      ranges: [serializedRange],
      updatedAt: now,
    };

    if (this.renderAndRegister) {
      await this.renderAndRegister({
        ...updatedHighlight,
        liveRanges: [newRange],
      });
    }

    if (this.onUpdateHighlight) {
      await this.onUpdateHighlight(highlight.id, {
        text: updatedHighlight.text,
        ranges: updatedHighlight.ranges,
        updatedAt: updatedHighlight.updatedAt,
      });
    }

    this.markAnchored(highlight.id);
    this.logger.info('[RestorationCoordinator] Successfully re-anchored highlight', {
      id: highlight.id,
      text: updatedHighlight.text,
    });

    return updatedHighlight;
  }
}
