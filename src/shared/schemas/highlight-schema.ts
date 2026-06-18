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
 * Backward Compatible: V1 data (no selector) validates [OK]
 * Forward Compatible: V2 data (with selector) validates [OK]
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
// HIGHLIGHT DATA SCHEMA
// ============================================

/**
 * Encrypted highlight text envelope
 *
 * Per ADR-013, the content script is a courier (sends plaintext) and the
 * background is the vault (encrypts before persisting). The on-disk /
 * on-cloud shape carries the ciphertext in `textEncrypted`; `text` itself
 * is dropped at the persistence boundary.
 *
 * Shape mirrors the ADR's example: { ciphertext, iv, keyId }.
 *
 * Encryption algorithm is master-key symmetric AES-GCM (Option B in the
 * task plan): the same passphrase-derived master key (ADR-012) that wraps
 * the user's RSA private key also wraps each highlight's text. See
 * `src/background/services/highlight-encryptor.ts` for the encrypt/decrypt
 * implementation and `IKeyManager.withMasterKey` for key access.
 */
export const EncryptedTextSchema = z.object({
  ciphertext: z.string().min(1, 'ciphertext cannot be empty'), // base64
  iv: z.string().min(1, 'iv cannot be empty'), // base64, 12-byte AES-GCM IV
  keyId: z.string().min(1, 'keyId cannot be empty'), // identifier for the key that encrypted this
});

export type EncryptedText = z.infer<typeof EncryptedTextSchema>;

/**
 * Highlight Data Schema - Core highlight data structure
 */
export const HighlightDataSchemaV2 = z.object({
  // Core fields
  id: z.string().uuid(),
  userId: z.string().uuid().optional(), // Added for RLS
  text: z.string().min(1).max(10000),
  // ADR-013: ciphertext envelope written by the background after the
  // plaintext `text` is encrypted under the user's master key. Set by
  // `BackgroundHighlightOrchestrator`; absent for in-flight payloads.
  textEncrypted: EncryptedTextSchema.optional(),
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
      source: z.enum(['user', 'sync']).default('user'),
      tags: z.array(z.string()).optional(),
      notes: z.string().optional(),
    })
    .optional(),
});

export type HighlightDataV2 = z.infer<typeof HighlightDataSchemaV2>;

// Alias for backward compatibility during transition
export const HighlightDataSchema = HighlightDataSchemaV2;
export type HighlightData = HighlightDataV2;

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
