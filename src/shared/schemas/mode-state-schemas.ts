/**
 * @file mode-state-schemas.ts
 * @description Zod validation schemas for mode state management
 * 
 * Provides type-safe validation for:
 * - Mode types (walk, sprint, vault)
 * - State change events
 * - Persisted state structure
 * - Mode transitions
 */

import { z } from 'zod';

/**
 * Mode Type Schema
 * 
 * Validates mode names. Currently supports:
 * - walk: Ephemeral highlighting (no persistence)
 * - sprint: Session-based highlighting (tab-scoped)
 * - vault: Persistent highlighting (IndexedDB)
 * 
 * @example
 * ModeTypeSchema.parse('walk'); // ✅ Valid
 * ModeTypeSchema.parse('invalid'); // ❌ Throws ZodError
 */
export const ModeTypeSchema = z.enum(['walk', 'sprint', 'vault']);

/**
 * Inferred TypeScript type from schema
 */
export type ModeType = z.infer<typeof ModeTypeSchema>;

/**
 * State Change Event Schema
 * 
 * Validates state transition events for observability and debugging.
 * 
 * @property from - Previous mode
 * @property to - New mode
 * @property timestamp - Unix timestamp (milliseconds)
 * @property reason - Optional reason for transition (user action, system event, etc.)
 */
export const StateChangeEventSchema = z.object({
    from: ModeTypeSchema,
    to: ModeTypeSchema,
    timestamp: z.number().int().positive(),
    reason: z.string().optional(),
});

export type StateChangeEvent = z.infer<typeof StateChangeEventSchema>;

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
