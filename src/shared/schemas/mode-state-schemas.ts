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
export const ModeTypeSchema = z.enum(['walk', 'sprint', 'vault', 'neural']);

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

/**
 * State Metrics
 *
 * Analytics data for state transitions and mode usage.
 * Used for debugging, observability, and user behavior analysis.
 *
 * @property transitionCounts - Count of each transition (e.g., "walk→sprint": 5)
 * @property failureCounts - Count of blocked transitions (e.g., "sprint→vault": 2)
 * @property timeInMode - Total milliseconds spent in each mode
 */
export interface StateMetrics {
  transitionCounts: Record<string, number>; // "walk→sprint": 5
  failureCounts: Record<string, number>; // "sprint→vault": 2 (blocked)
  timeInMode: Partial<Record<ModeType, number>>; // "walk": 5000ms (partial - not all modes may have time tracked)
}

/**
 * Debug State Snapshot
 *
 * Comprehensive state dump for debugging purposes.
 * Aggregates current state, history, and metrics.
 */
export interface DebugState {
  currentMode: ModeType;
  metadata: StateMetadata;
  history: readonly StateChangeEvent[];
  metrics: StateMetrics;
  timestamp: number;
}
