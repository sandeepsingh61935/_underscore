/**
 * @file mode-transition-rules.ts
 * @description Defines valid mode transitions and their rules
 *
 * State machine rules for mode switching:
 * - Walk (Focus):   Ephemeral highlighting (default)
 * - Sprint (Capture): Persistent highlighting
 * - Vault (Memory):  Archived/permanent highlighting
 * - Neural:         AI-powered connections across highlights
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
 * Complete transition matrix (4x4 = 16 transitions)
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
      reason: 'Already in Focus mode (session-only highlighting)',
    },
    sprint: {
      from: 'walk',
      to: 'sprint',
      allowed: true,
      requiresConfirmation: false,
      reason: 'Your Focus highlights will be saved to Capture',
    },
    vault: {
      from: 'walk',
      to: 'vault',
      allowed: true,
      requiresConfirmation: true,
      reason: 'Your Focus highlights will be saved to Memory for long-term recall',
      guard: async () => {
        // Future: Check if user has unsaved highlights
        return true;
      },
    },
    neural: {
      from: 'walk',
      to: 'neural',
      allowed: true,
      requiresConfirmation: true,
      reason: 'Your Focus highlights will be saved to Neural for smart, connected notes',
      guard: async () => {
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
      reason: 'Your Capture collections will be copied into this Focus session',
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
      reason: 'Already in Capture mode (persistent highlighting)',
    },
    vault: {
      from: 'sprint',
      to: 'vault',
      allowed: true,
      requiresConfirmation: true,
      reason: 'Your Capture highlights will be saved to Memory for long-term recall',
      guard: async () => {
        // Future: Confirm vault archival
        return true;
      },
    },
    neural: {
      from: 'sprint',
      to: 'neural',
      allowed: true,
      requiresConfirmation: true,
      reason: 'Your Capture highlights will be saved to Neural for smart, connected notes',
      guard: async () => {
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
      reason: 'Your Memory highlights will be copied into this Focus session',
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
      reason: 'Your Memory highlights will be copied into Capture mode',
    },
    vault: {
      from: 'vault',
      to: 'vault',
      allowed: true,
      requiresConfirmation: false,
      reason: 'Already in Memory mode (long-term knowledge base)',
    },
    neural: {
      from: 'vault',
      to: 'neural',
      allowed: true,
      requiresConfirmation: false,
      reason: 'Switching to Neural will connect your Memory highlights with AI-powered insights',
    },
  },
  neural: {
    walk: {
      from: 'neural',
      to: 'walk',
      allowed: true,
      requiresConfirmation: true,
      reason: 'Your Neural highlights will be copied into this Focus session',
      guard: async () => {
        return true;
      },
    },
    sprint: {
      from: 'neural',
      to: 'sprint',
      allowed: true,
      requiresConfirmation: false,
      reason: 'Your Neural highlights will be copied into Capture mode',
    },
    vault: {
      from: 'neural',
      to: 'vault',
      allowed: true,
      requiresConfirmation: false,
      reason: 'Your Neural highlights will become a personal knowledge base in Memory',
    },
    neural: {
      from: 'neural',
      to: 'neural',
      allowed: true,
      requiresConfirmation: false,
      reason: 'Already in Neural mode (AI-powered connections)',
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
