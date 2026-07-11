/**
 * @file mode-state-schemas.ts
 * @description Zod validation schemas for mode state management
 *
 * Provides type-safe validation for:
 * - Mode types (basic, pro, pro_xai)
 * - Persisted state structure
 * - Mode transitions
 */

import { z } from 'zod';

/**
 * Mode Type Schema
 *
 * Validates mode names. Currently supports:
 * - basic: Local-only highlighting with a configurable TTL (see basic-ttl.ts).
 *   Replaces the former `ephemeral` + `local` modes.
 * - pro: Persistent, synced highlighting (IndexedDB + cloud sync). Replaces `cloud`.
 * - pro_xai: Pro capabilities plus AI-powered features. Replaces `ai`.
 *
 * Legacy string values (`ephemeral`, `local`, `cloud`, `ai`, and the older
 * `walk`/`sprint`/`vault`/`neural` motif names) are translated forward via
 * `normalizeMode()` (@/shared/utils/normalize-mode) at storage/IPC read
 * boundaries — they are intentionally NOT accepted by this schema so that
 * new code always operates on the current vocabulary.
 *
 * @example
 * ModeTypeSchema.parse('basic'); // Valid
 * ModeTypeSchema.parse('invalid'); // Throws ZodError
 */
export const ModeTypeSchema = z.enum(['basic', 'pro', 'pro_xai']);

/**
 * Inferred TypeScript type from schema
 */
export type ModeType = z.infer<typeof ModeTypeSchema>;

/**
 * State Metadata Schema
 *
 * Metadata attached to persisted state for versioning and migration.
 *
 * @property version - State schema version (for migration)
 * @property lastModified - Last modification timestamp
 * @property flags - Optional feature flags or configuration
 */
export const StateMetadataSchema = z.object({
  version: z.number().int().positive().default(2),
  lastModified: z.number().int().positive(),
  flags: z.record(z.string(), z.boolean()).optional(),
});

export type StateMetadata = z.infer<typeof StateMetadataSchema>;

/**
 * Mode State Schema
 *
 * Complete persisted state structure.
 *
 * @property currentMode - Active mode
 * @property version - Schema version (for backward compatibility)
 * @property metadata - Additional state metadata
 */
export const ModeStateSchema = z.object({
  currentMode: ModeTypeSchema,
  version: z.number().int().positive().default(2),
  metadata: StateMetadataSchema.optional(),
});

export type ModeState = z.infer<typeof ModeStateSchema>;

/**
 * Mode Transition Schema
 *
 * Defines allowed mode transitions for state machine validation.
 *
 * @property from - Source mode
 * @property to - Target mode
 * @property allowed - Whether transition is permitted
 * @property requiresConfirmation - Whether user confirmation is needed
 * @property reason - Optional reason if transition is blocked
 */
export const ModeTransitionSchema = z.object({
  from: ModeTypeSchema,
  to: ModeTypeSchema,
  allowed: z.boolean(),
  requiresConfirmation: z.boolean().optional(),
  reason: z.string().optional(),
});

export type ModeTransition = z.infer<typeof ModeTransitionSchema>;
