/**
 * @file range-algebra.ts
 * @description Range algebra utilities for highlight manipulation
 * 
 * Provides core functions for:
 * - Detecting range overlaps
 * - Subtracting ranges (splitting)
 * - Merging adjacent ranges
 * - Boundary calculations
 */

/**
 * Check if two ranges overlap
 */
export function rangesOverlap(range1: Range, range2: Range): boolean {
    try {
        // Ranges must be in same document
        if (range1.commonAncestorContainer.ownerDocument !== range2.commonAncestorContainer.ownerDocument) {
            return false;
        }

        // Collapsed ranges (empty selections) don't meaningfully overlap
        if (range1.collapsed || range2.collapsed) {
            return false;
        }

        // Use compareBoundaryPoints for precise comparison
        // Overlap if: range1 ends after range2 starts AND range1 starts before range2 ends
        const r1EndsAfterR2Starts = range1.compareBoundaryPoints(Range.END_TO_START, range2) > 0;
        const r1StartsBeforeR2Ends = range1.compareBoundaryPoints(Range.START_TO_END, range2) < 0;

        return r1EndsAfterR2Starts && r1StartsBeforeR2Ends;
    } catch (_e) {
        // Comparison failed (e.g., detached nodes)
        return false;
    }
}

/**
 * Determine overlap type between two ranges
 */
export enum OverlapType {
    NONE = 'none',                    // No overlap
    EQUAL = 'equal',                  // Exact same range
    CONTAINS = 'contains',            // range1 fully contains range2
    CONTAINED_BY = 'contained_by',    // range1 fully contained by range2
    PARTIAL_LEFT = 'partial_left',    // range1 overlaps left side of range2
    PARTIAL_RIGHT = 'partial_right',  // range1 overlaps right side of range2
}

export function getOverlapType(range1: Range, range2: Range): OverlapType {
    if (!rangesOverlap(range1, range2)) {
        return OverlapType.NONE;
    }

    try {
        const startCmp = range1.compareBoundaryPoints(Range.START_TO_START, range2);
        const endCmp = range1.compareBoundaryPoints(Range.END_TO_END, range2);

        // Exact match
        if (startCmp === 0 && endCmp === 0) {
            return OverlapType.EQUAL;
        }

        // range1 contains range2
        if (startCmp <= 0 && endCmp >= 0) {
            return OverlapType.CONTAINS;
        }

        // range1 contained by range2
        if (startCmp >= 0 && endCmp <= 0) {
            return OverlapType.CONTAINED_BY;
        }

        // Partial overlaps
        if (startCmp < 0) {
            return OverlapType.PARTIAL_LEFT;
        } else {
            return OverlapType.PARTIAL_RIGHT;
        }
    } catch (_e) {
        return OverlapType.NONE;
    }
}

/**
 * Subtract one range from another, returning the remaining portions
 * 
 * @param existing - The range to subtract from
 * @param toRemove - The range to subtract
 * @returns Array of remaining ranges (0, 1, or 2 ranges)
 * 
 * Examples:
 * - Existing: [0-10], Remove: [3-7] → [[0-3], [7-10]]
 * - Existing: [0-10], Remove: [0-10] → []
 * - Existing: [0-10], Remove: [5-15] → [[0-5]]
 */
export function subtractRange(existing: Range, toRemove: Range): Range[] {
    const overlapType = getOverlapType(existing, toRemove);

    // No overlap - return existing as-is
    if (overlapType === OverlapType.NONE) {
        return [existing.cloneRange()];
    }

    // Complete overlap - existing is entirely removed
    if (overlapType === OverlapType.EQUAL || overlapType === OverlapType.CONTAINED_BY) {
        return [];
    }

    // Partial overlaps - keep non-overlapping portions
    if (overlapType === OverlapType.PARTIAL_LEFT) {
        // toRemove overlaps left side, keep right portion
        const rightPortion = existing.cloneRange();
        rightPortion.setStart(toRemove.endContainer, toRemove.endOffset);
        return rightPortion.collapsed ? [] : [rightPortion];
    }

    if (overlapType === OverlapType.PARTIAL_RIGHT) {
        // toRemove overlaps right side, keep left portion
        const leftPortion = existing.cloneRange();
        leftPortion.setEnd(toRemove.startContainer, toRemove.startOffset);
        return leftPortion.collapsed ? [] : [leftPortion];
    }

    // existing CONTAINS toRemove - split into before and after
    if (overlapType === OverlapType.CONTAINS) {
        const results: Range[] = [];

        // Before portion
        const before = existing.cloneRange();
        before.setEnd(toRemove.startContainer, toRemove.startOffset);
        if (!before.collapsed) {
            results.push(before);
        }

        // After portion
        const after = existing.cloneRange();
        after.setStart(toRemove.endContainer, toRemove.endOffset);
        if (!after.collapsed) {
            results.push(after);
        }

        return results;
    }

    // Shouldn't reach here
    return [existing.cloneRange()];
}

/**
 * Check if two ranges are adjacent (touching but not overlapping)
 */
export function rangesAdjacent(range1: Range, range2: Range): boolean {
    try {
        // Check if range1.end == range2.start
        const r1EndVsR2Start = range1.compareBoundaryPoints(Range.END_TO_START, range2);
        if (r1EndVsR2Start === 0) {
            return true;
        }

        // Check if range2.end == range1.start
        const r2EndVsR1Start = range2.compareBoundaryPoints(Range.END_TO_START, range1);
        if (r2EndVsR1Start === 0) {
            return true;
        }

        return false;
    } catch (_e) {
        return false;
    }
}

/**
 * Merge two adjacent or overlapping ranges
 */
export function mergeRanges(range1: Range, range2: Range): Range | null {
    if (!rangesOverlap(range1, range2) && !rangesAdjacent(range1, range2)) {
        return null;
    }

    try {
        const merged = range1.cloneRange();

        // Extend to cover both ranges
        const startCmp = range1.compareBoundaryPoints(Range.START_TO_START, range2);
        if (startCmp > 0) {
            // range2 starts before range1
            merged.setStart(range2.startContainer, range2.startOffset);
        }

        const endCmp = range1.compareBoundaryPoints(Range.END_TO_END, range2);
        if (endCmp < 0) {
            // range2 ends after range1
            merged.setEnd(range2.endContainer, range2.endOffset);
        }

        return merged;
    } catch (_e) {
        return null;
    }
}

/**
 * Merge all adjacent/overlapping ranges in an array
 * Returns sorted, non-overlapping ranges
 */
export function mergeAdjacentRanges(ranges: Range[]): Range[] {
    if (ranges.length <= 1) {
        return ranges;
    }

    // Sort ranges by start position
    const sorted = [...ranges].sort((a, b) => {
        try {
            return a.compareBoundaryPoints(Range.START_TO_START, b);
        } catch (_e) {
            return 0;
        }
    });

    const first = sorted[0];
    if (!first) return [];  // Safety check

    const merged: Range[] = [first.cloneRange()];

    for (let i = 1; i < sorted.length; i++) {
        const last = merged[merged.length - 1];
        const current = sorted[i];

        if (!last || !current) continue;  // Safety check

        const mergedRange = mergeRanges(last, current);
        if (mergedRange) {
            // Replace last with merged
            merged[merged.length - 1] = mergedRange;
        } else {
            // Not adjacent/overlapping, add as separate
            merged.push(current.cloneRange());
        }
    }

    return merged;
}

/**
 * Get the length of text in a range
 */
export function getRangeLength(range: Range): number {
    try {
        return range.toString().length;
    } catch (_e) {
        return 0;
    }
}

/**
 * Filter out tiny ranges below minimum length
 */
export function filterTinyRanges(ranges: Range[], minLength: number = 3): Range[] {
    return ranges.filter(range => getRangeLength(range) >= minLength);
}

/**
 * Check if a point (from mouse event) is within a range
 */
export function rangeContainsPoint(range: Range, x: number, y: number): boolean {
    try {
        const rects = range.getClientRects();

        for (let i = 0; i < rects.length; i++) {
            const rect = rects[i];
            if (rect &&
                x >= rect.left &&
                x <= rect.right &&
                y >= rect.top &&
                y <= rect.bottom
            ) {
                return true;
            }
        }

        return false;
    } catch (_e) {
        return false;
    }
}
