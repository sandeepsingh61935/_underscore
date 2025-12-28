/**
 * @file highlight-schema.ts
 * @description Zod schemas for highlight data validation
 * 
 * Provides runtime type safety and migration support
 */

import { z } from 'zod';

// ============================================
// PRIMITIVE SCHEMAS
// ============================================

/**
 * Serialized range schema
 */
/**
 * Serialized Range Schema V2
 * 
 * Backward Compatible: V1 data (no selector) validates ✓
 * Forward Compatible: V2 data (with selector) validates ✓
 * 
 * Pattern: Optional Field Extension (graceful upgrade)
 */
export const SerializedRangeSchema = z.object({
    // ========================================
    // V1 Fields (REQUIRED - backward compat)
    // ========================================
    startContainer: z.string()
        .min(1, 'startContainer cannot be empty'),

    startOffset: z.number()
        .int('Offset must be integer')
        .nonnegative('Offset cannot be negative'),

    endContainer: z.string()
        .min(1, 'endContainer cannot be empty'),

    endOffset: z.number()
        .int('Offset must be integer')
        .nonnegative('Offset cannot be negative'),

    commonAncestor: z.string()
        .min(1, 'commonAncestor cannot be empty'),

    // ========================================
    // V2 Field (OPTIONAL - graceful upgrade)
    // ========================================
    // Note: Defined below after TextQuoteSelectorSchema
    // Will be added via .extend() after schema definition
});

export type SerializedRange = z.infer<typeof SerializedRangeSchema>;

/**
 * W3C TextQuoteSelector Schema
 * Spec: https://www.w3.org/TR/annotation-model/#text-quote-selector
 * 
 * Provides robust text anchoring via exact text + context (prefix/suffix)
 * Security: Max lengths prevent DoS attacks
 * Validation: Refinements ensure data quality
 */
export const TextQuoteSelectorSchema = z.object({
    // Type discriminator (enables future union types)
    type: z.literal('TextQuoteSelector'),

    // Selected text (required)
    exact: z.string()
        .min(1, 'Selected text cannot be empty')
        .max(5000, 'Selected text too long (max 5000 chars)'),

    // Context before selection (optional but recommended)
    prefix: z.string()
        .max(64, 'Prefix context too long (max 64 chars)')
        .optional(),

    // Context after selection (optional but recommended)
    suffix: z.string()
        .max(64, 'Suffix context too long (max 64 chars)')
        .optional()
}).refine(
    // Business rule: Need context for disambiguation
    (data) => data.prefix !== undefined || data.suffix !== undefined,
    {
        message: 'At least one of prefix or suffix required for robust matching',
        path: ['prefix']
    }
);

export type TextQuoteSelector = z.infer<typeof TextQuoteSelectorSchema>;

/**
 * Extend SerializedRangeSchema with TextQuoteSelector
 * Pattern: Schema Extension for backward compatibility
 */
const SerializedRangeSchemaExtended = SerializedRangeSchema.extend({
    selector: TextQuoteSelectorSchema.optional()
});

// Re-export extended schema as main schema
export { SerializedRangeSchemaExtended as SerializedRangeSchema };

export type SerializedRange = z.infer<typeof SerializedRangeSchemaExtended>;

/**
 * Color role enum - maps to CSS design tokens
 */
export const ColorRoleSchema = z.enum([
    'yellow',
    'orange',
    'blue',
    'green',
    'purple',
    'pink',
    'teal'
]);

export type ColorRole = z.infer<typeof ColorRoleSchema>;

// ============================================
// VERSION 2 SCHEMA (CURRENT)
// ============================================

/**
 * Highlight Data V2 - Current version with semantic color roles
 */
export const HighlightDataSchemaV2 = z.object({
    // Version marker
    version: z.literal(2).default(2),

    // Core fields
    id: z.string().uuid(),
    text: z.string().min(1).max(10000),

    // Content hash for deduplication
    contentHash: z.string().length(64), // SHA-256 = 64 hex chars

    // Semantic color role (CSS design token)
    colorRole: ColorRoleSchema,

    // Deprecated but kept for backward compatibility
    color: z.string().optional(),

    // Type marker
    type: z.literal('underscore'),

    // Range data
    ranges: z.array(SerializedRangeSchema).min(1),

    // Timestamps
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),

    // Optional metadata
    metadata: z.object({
        source: z.enum(['user', 'migration', 'sync']).default('user'),
        tags: z.array(z.string()).optional(),
        notes: z.string().optional()
    }).optional()
});

export type HighlightDataV2 = z.infer<typeof HighlightDataSchemaV2>;

// ============================================
// VERSION 1 SCHEMA (LEGACY)
// ============================================

/**
 * Highlight Data V1 - Legacy version with hex colors
 * Used for migration only
 */
export const HighlightDataSchemaV1 = z.object({
    version: z.literal(1).optional(),
    id: z.string(),
    text: z.string(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i), // Hex color
    type: z.literal('underscore'),
    ranges: z.array(SerializedRangeSchema),
    createdAt: z.coerce.date().optional()
});

export type HighlightDataV1 = z.infer<typeof HighlightDataSchemaV1>;

// ============================================
// UNION SCHEMA (FOR MIGRATION)
// ============================================

/**
 * Union of all versions for migration support
 */
export const HighlightDataSchema = z.union([
    HighlightDataSchemaV2,
    HighlightDataSchemaV1
]);

export type HighlightData = z.infer<typeof HighlightDataSchema>;

// ============================================
// EVENT SCHEMAS
// ============================================

/**
 * Highlight event schema
 */
export const HighlightEventSchema = z.object({
    type: z.enum([
        'highlight.created',
        'highlight.updated',
        'highlight.removed'
    ]),
    timestamp: z.number().int().positive(),
    eventId: z.string().uuid(),
    data: HighlightDataSchemaV2
});

export type HighlightEvent = z.infer<typeof HighlightEventSchema>;
