/**
 * @file highlight-type-bridge.ts
 * @description Type conversion utilities between renderer and storage types
 * 
 * Maintains separation of concerns:
 * - Renderer types (Highlight, HighlightWithRange) for DOM/UI
 * - Storage types (HighlightDataV2) for persistence
 * 
 * Architecture:
 * - Single source of truth for type conversions
 * - Prevents duplication and type errors
 * - Makes refactoring easier
 */

import type { HighlightWithRange } from '@/content/highlight-renderer';
import type { HighlightDataV2, ColorRole, SerializedRange } from '@/shared/schemas/highlight-schema';
import { generateContentHash } from '@/shared/utils/content-hash';

/**
 * Extended HighlightDataV2 with runtime properties for click detection
 * These properties are added at runtime but not persisted
 */
export interface HighlightDataV2WithRuntime extends HighlightDataV2 {
    liveRanges?: Range[];
}

/**
 * Common interface for runtime highlights (compatible with both DOM and CSS Highlight API)
 */
export interface RuntimeHighlight {
    id: string;
    text: string;
    color: string;
    type: 'underscore' | 'highlight' | 'box';
    createdAt: Date;
    range?: SerializedRange; // SerializedRange (Legacy Renderer)
    ranges?: SerializedRange[]; // SerializedRange[] (New HighlightManager)
    element?: HTMLElement; // Optional (DOM Renderer only)
}

/**
 * Convert runtime highlight (Renderer or Manager) to storage HighlightDataV2
 * 
 * @param highlight - The highlight from renderer (DOM or CSS)
 * @returns Storage-compatible highlight data
 */
export async function toStorageFormat(highlight: RuntimeHighlight): Promise<HighlightDataV2> {
    const contentHash = await generateContentHash(highlight.text);

    // Normalize ranges: Support both 'range' (legacy) and 'ranges' (new)
    const ranges = highlight.ranges || (highlight.range ? [highlight.range] : []);

    if (ranges.length === 0) {
        throw new Error('Highlight must have at least one range');
    }

    return {
        version: 2,
        id: highlight.id,
        text: highlight.text,
        contentHash,
        colorRole: (highlight.color || 'yellow') as ColorRole,
        color: highlight.color,
        type: 'underscore' as const,
        ranges: ranges,
        createdAt: highlight.createdAt
    };
}

/**
 * Convert array of HighlightWithRange to HighlightDataV2
 * Useful for batch operations
 */
export async function toStorageFormatBatch(highlights: HighlightWithRange[]): Promise<HighlightDataV2[]> {
    return Promise.all(highlights.map(h => toStorageFormat(h)));
}

/**
 * Type guard to check if a value is HighlightWithRange
 */
export function isHighlightWithRange(value: unknown): value is HighlightWithRange {
    return !!value &&
        typeof value === 'object' &&
        'id' in value &&
        'text' in value &&
        'color' in value &&
        'type' in value &&
        'element' in value &&
        'createdAt' in value &&
        'range' in value;
}

/**
 * Convert storage HighlightDataV2 to partial HighlightWithRange
 * Note: Does not recreate the live DOM range (needs deserialization)
 */
export function fromStorageFormat(data: HighlightDataV2): Partial<HighlightWithRange> {
    const range = data.ranges[0]; // V2 supports multiple, but V1 renderer assumes single
    return {
        id: data.id,
        text: data.text,
        color: data.color || 'yellow', // Default fallback
        type: 'underscore',
        createdAt: data.createdAt,
        range: range
    };
}
