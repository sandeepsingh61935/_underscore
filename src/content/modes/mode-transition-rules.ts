/**
 * @file mode-transition-rules.ts
 * @description Defines valid mode transitions and their rules
 *
 * State machine rules for mode switching:
 * - Walk: Ephemeral highlighting (default)
 * - Sprint: Persistent highlighting
 * - Vault: Archived/permanent highlighting
 *
 * Transition matrix enforces business rules and user experience.
 */

import type { ModeType } from '@/shared/schemas/mode-state-schemas';

/**
 * Represents a transition rule between two modes
 */
export interface TransitionRule {
  /** Source mode */
  from: ModeType;
  /** Target mode */
  to: ModeType;
  /** Whether this transition is allowed */
  allowed: boolean;
  /** Whether user confirmation is required */
  requiresConfirmation: boolean;
  /** Human-readable reason/description */
  reason: string;
  /** Optional guard function to execute before transition */
  guard?: () => Promise<boolean>;
}

/**
 * Complete transition matrix (3x3 = 9 transitions)
 *
 * Design decisions:
 * - All transitions are allowed (UX flexibility)
 * - Destructive transitions require confirmation
 * - Same-mode transitions are no-ops
 */
export const TRANSITION_MATRIX: Record<ModeType, Record<ModeType, TransitionRule>> = {
  walk: {
    walk: {
      from: 'walk',
      to: 'walk',
      allowed: true,
      requiresConfirmation: false,
      reason: 'Already in Walk mode (ephemeral highlighting)',
    },
    sprint: {
      from: 'walk',
      to: 'sprint',
      allowed: true,
      requiresConfirmation: false,
      reason: 'Switching to Sprint mode will enable persistent highlighting',
    },
    vault: {
      from: 'walk',
      to: 'vault',
      allowed: true,
      requiresConfirmation: true,
      reason:
        'Switching to Vault mode will permanently archive highlights. This action persists data.',
      guard: async () => {
        // Future: Check if user has unsaved highlights
        return true;
      },
    },
  },
  sprint: {
    walk: {
      from: 'sprint',
      to: 'walk',
      allowed: true,
      requiresConfirmation: true,
      reason:
        'Switching to Walk mode will stop persisting new highlights. Existing highlights will remain.',
      guard: async () => {
        // Future: Warn about pending highlights
        return true;
      },
    },
    sprint: {
      from: 'sprint',
      to: 'sprint',
      allowed: true,
      requiresConfirmation: false,
      reason: 'Already in Sprint mode (persistent highlighting)',
    },
    vault: {
      from: 'sprint',
      to: 'vault',
      allowed: true,
      requiresConfirmation: true,
      reason:
        'Switching to Vault mode will archive all highlights permanently. Data will persist.',
      guard: async () => {
        // Future: Confirm vault archival
        return true;
      },
    },
  },
  vault: {
    walk: {
      from: 'vault',
      to: 'walk',
      allowed: true,
      requiresConfirmation: true,
      reason:
        'Switching to Walk mode may result in highlight data being lost if not saved',
      guard: async () => {
        // Future: Warn about data loss
        return true;
      },
    },
    sprint: {
      from: 'vault',
      to: 'sprint',
      allowed: true,
      requiresConfirmation: false,
      reason: 'Switching to Sprint mode will maintain persistent highlighting',
    },
    vault: {
      from: 'vault',
      to: 'vault',
      allowed: true,
      requiresConfirmation: false,
      reason: 'Already in Vault mode (archived highlighting)',
    },
  },
};

/**
 * Get the transition rule for a specific mode change
 *
 * @param from - Current mode
 * @param to - Target mode
 * @returns Transition rule with allowed status and reason
 */
export function getTransitionRule(from: ModeType, to: ModeType): TransitionRule {
  return TRANSITION_MATRIX[from][to];
}

/**
 * Check if a transition is allowed (simple boolean check)
 *
 * @param from - Current mode
 * @param to - Target mode
 * @returns true if transition is allowed, false otherwise
 */
export function canTransition(from: ModeType, to: ModeType): boolean {
  return getTransitionRule(from, to).allowed;
}

/**
 * Get all possible transitions from a given mode
 *
 * @param from - Current mode
 * @returns Array of all transition rules from this mode
 */
export function getAllTransitions(from: ModeType): TransitionRule[] {
  return Object.values(TRANSITION_MATRIX[from]);
}

/**
 * Execute guard function for a transition (if defined)
 *
 * @param from - Current mode
 * @param to - Target mode
 * @returns Promise<boolean> - true if guard passes, false otherwise
 */
export async function executeTransitionGuard(
  from: ModeType,
  to: ModeType
): Promise<boolean> {
  const rule = getTransitionRule(from, to);

  if (!rule.guard) {
    return true; // No guard = pass by default
  }

  return await rule.guard();
}
