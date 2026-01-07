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
 * Serialized Range Schema - Base Definition
 * Extended below with TextQuoteSelector after its definition
 */
const SerializedRangeSchemaBase = z.object({
  xpath: z.string().min(1, 'xpath cannot be empty'),
  startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().nonnegative(),
  text: z.string(),
  textBefore: z.string(),
  textAfter: z.string(),
});

/**
 * W3C TextQuoteSelector Schema
 * Spec: https://www.w3.org/TR/annotation-model/#text-quote-selector
 *
 * Provides robust text anchoring via exact text + context (prefix/suffix)
 * Security: Max lengths prevent DoS attacks
 * Validation: Refinements ensure data quality
 */
export const TextQuoteSelectorSchema = z.object({
  type: z.literal('TextQuoteSelector'),
  exact: z
    .string()
    .min(1, 'Selected text cannot be empty')
    .max(5000, 'Selected text too long (max 5000 chars)'),
  prefix: z.string().max(64, 'Prefix context too long (max 64 chars)').optional(),
  suffix: z.string().max(64, 'Suffix context too long (max 64 chars)').optional(),
});

export type TextQuoteSelector = z.infer<typeof TextQuoteSelectorSchema>;

/**
 * Serialized Range Schema V2 - Extended with TextQuoteSelector
 *
 * Backward Compatible: V1 data (no selector) validates ✓
 * Forward Compatible: V2 data (with selector) validates ✓
 */
export const SerializedRangeSchema = SerializedRangeSchemaBase.extend({
  selector: TextQuoteSelectorSchema.optional(),
});

export type SerializedRange = z.infer<typeof SerializedRangeSchema>;

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
  'teal',
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
  userId: z.string().uuid().optional(), // Added for RLS
  text: z.string().min(1).max(10000),
  url: z.string().optional(),

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
  metadata: z
    .object({
      source: z.enum(['user', 'migration', 'sync']).default('user'),
      tags: z.array(z.string()).optional(),
      notes: z.string().optional(),
    })
    .optional(),
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
  createdAt: z.coerce.date().optional(),
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
  HighlightDataSchemaV1,
]);

export type HighlightData = z.infer<typeof HighlightDataSchema>;

// ============================================
// EVENT SCHEMAS
// ============================================

/**
 * Highlight event schema
 */
export const HighlightEventSchema = z.object({
  type: z.enum(['highlight.created', 'highlight.updated', 'highlight.removed']),
  timestamp: z.number().int().positive(),
  eventId: z.string().uuid(),
  data: HighlightDataSchemaV2,
});

export type HighlightEvent = z.infer<typeof HighlightEventSchema>;
