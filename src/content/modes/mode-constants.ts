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
  BASIC: 'basic',
  PRO: 'pro',
  PRO_XAI: 'pro_xai',
} as const;

/**
 * Display names for modes (Business/User facing)
 * @deprecated Prefer MODE_BRANDING (@/shared/constants/mode-branding) which
 * decouples marketing copy from internal IDs. Kept for backward compatibility.
 */
export const MODE_DISPLAY_NAMES = {
  [MODE_NAMES.BASIC]: 'Guest',
  [MODE_NAMES.PRO]: 'Account (Free)',
  [MODE_NAMES.PRO_XAI]: 'Account (Paid)',
} as const;

/**
 * Type for valid mode names
 */
export type ModeName = (typeof MODE_NAMES)[keyof typeof MODE_NAMES];
