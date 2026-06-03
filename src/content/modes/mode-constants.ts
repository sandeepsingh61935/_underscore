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
    EPHEMERAL: 'ephemeral',
    LOCAL: 'local',
    CLOUD: 'cloud',
    AI: 'ai',
} as const;

/**
 * Display names for modes (Business/User facing)
 */
export const MODE_DISPLAY_NAMES = {
    [MODE_NAMES.EPHEMERAL]: 'Ephemeral',
    [MODE_NAMES.LOCAL]: 'Local',
    [MODE_NAMES.CLOUD]: 'Cloud',
    [MODE_NAMES.AI]: 'AI',
} as const;

/**
 * Type for valid mode names
 */
export type ModeName = typeof MODE_NAMES[keyof typeof MODE_NAMES];
