/**
 * Overlap detection for selection vs existing highlights.
 * Must use runtime liveRanges (mode maps), not facade storage rows that strip them.
 */

export interface HighlightWithLiveRanges {
  id: string;
  liveRanges?: Range[];
  color?: string;
  colorRole?: string;
  type?: string;
  text?: string;
  url?: string;
}

export function getHighlightsInRange<T extends HighlightWithLiveRanges>(
  selection: Selection,
  highlights: T[]
): T[] {
  if (selection.rangeCount === 0) return [];

  const userRange = selection.getRangeAt(0);

  return highlights.filter((hl) => {
    const ranges = hl.liveRanges || [];
    if (ranges.length === 0) return false;

    for (const liveRange of ranges) {
      try {
        const hlEndsAfterSelectionStarts =
          liveRange.compareBoundaryPoints(Range.END_TO_START, userRange) > 0;
        const hlStartsBeforeSelectionEnds =
          liveRange.compareBoundaryPoints(Range.START_TO_END, userRange) < 0;

        if (hlEndsAfterSelectionStarts && hlStartsBeforeSelectionEnds) {
          return true;
        }
      } catch {
        continue;
      }
    }
    return false;
  });
}
