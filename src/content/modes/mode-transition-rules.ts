/**
 * @file mode-transition-rules.ts
 * @description Defines valid mode transitions and their rules
 *
 * State machine rules for mode switching:
 * - Ephemeral (Focus):   Ephemeral highlighting (default)
 * - Local (Capture): Persistent highlighting
 * - Cloud (Memory):  Archived/permanent highlighting
 * - AI:         AI-powered connections across highlights
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
  ephemeral: {
    ephemeral: {
      from: 'ephemeral',
      to: 'ephemeral',
      allowed: true,
      requiresConfirmation: false,
      reason: 'Already in Focus mode (session-only highlighting)',
    },
    local: {
      from: 'ephemeral',
      to: 'local',
      allowed: true,
      requiresConfirmation: false,
      reason: 'Your Focus highlights will be saved to Capture',
    },
    cloud: {
      from: 'ephemeral',
      to: 'cloud',
      allowed: true,
      requiresConfirmation: true,
      reason: 'Your Focus highlights will be saved to Memory for long-term recall',
      guard: async () => {
        // Future: Check if user has unsaved highlights
        return true;
      },
    },
    ai: {
      from: 'ephemeral',
      to: 'ai',
      allowed: true,
      requiresConfirmation: true,
      reason: 'Switching to AI mode enables AI-powered organization. Requires authentication.',
      guard: async () => {
        // Future: Check authentication status
        return true;
      },
    },
  },
  local: {
    ephemeral: {
      from: 'local',
      to: 'ephemeral',
      allowed: true,
      requiresConfirmation: true,
      reason: 'Your Capture collections will be copied into this Focus session',
      guard: async () => {
        // Future: Warn about pending highlights
        return true;
      },
    },
    local: {
      from: 'local',
      to: 'local',
      allowed: true,
      requiresConfirmation: false,
      reason: 'Already in Capture mode (persistent highlighting)',
    },
    cloud: {
      from: 'local',
      to: 'cloud',
      allowed: true,
      requiresConfirmation: true,
      reason: 'Your Capture highlights will be saved to Memory for long-term recall',
      guard: async () => {
        // Future: Confirm cloud archival
        return true;
      },
    },
    ai: {
      from: 'local',
      to: 'ai',
      allowed: true,
      requiresConfirmation: true,
      reason: 'Switching to AI mode enables AI-powered organization.',
      guard: async () => {
        return true;
      },
    },
  },
  cloud: {
    ephemeral: {
      from: 'cloud',
      to: 'ephemeral',
      allowed: true,
      requiresConfirmation: true,
      reason: 'Your Memory highlights will be copied into this Focus session',
      guard: async () => {
        // Future: Warn about data loss
        return true;
      },
    },
    local: {
      from: 'cloud',
      to: 'local',
      allowed: true,
      requiresConfirmation: false,
      reason: 'Your Memory highlights will be copied into Capture mode',
    },
    cloud: {
      from: 'cloud',
      to: 'cloud',
      allowed: true,
      requiresConfirmation: false,
      reason: 'Already in Memory mode (long-term knowledge base)',
    },
    ai: {
      from: 'cloud',
      to: 'ai',
      allowed: true,
      requiresConfirmation: false,
      reason: 'Switching to AI will connect your Memory highlights with AI-powered insights',
    },
  },
  ai: {
    ephemeral: {
      from: 'ai',
      to: 'ephemeral',
      allowed: true,
      requiresConfirmation: true,
      reason: 'Switching to Ephemeral mode will disable AI features. Data will be preserved.',
      guard: async () => {
        return true;
      },
    },
    local: {
      from: 'ai',
      to: 'local',
      allowed: true,
      requiresConfirmation: false,
      reason: 'Switching to Local mode for persistent highlighting',
    },
    cloud: {
      from: 'ai',
      to: 'cloud',
      allowed: true,
      requiresConfirmation: false,
      reason: 'Switching to Cloud mode for archived storage',
    },
    ai: {
      from: 'ai',
      to: 'ai',
      allowed: true,
      requiresConfirmation: false,
      reason: 'Already in AI mode (AI-powered organization)',
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
