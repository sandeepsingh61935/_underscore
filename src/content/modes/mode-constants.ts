/**
 * @file mode-constants.ts
 * @description Constants for mode names and types
 * 
 * Quality Framework Compliance:
 * - Single Source of Truth for mode identifiers
 * - Type-safe mode name references
 * - Eliminates magic strings
 */

/**
 * Mode names as constants
 * Use these instead of string literals
 */
export const MODE_NAMES = {
    WALK: 'walk',
    SPRINT: 'sprint',
    VAULT: 'vault',
    GEN: 'gen',
} as const;

/**
 * Type for valid mode names
 */
export type ModeName = typeof MODE_NAMES[keyof typeof MODE_NAMES];
