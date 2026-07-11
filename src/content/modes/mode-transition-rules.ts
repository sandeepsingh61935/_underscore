/**
 * @file mode-transition-rules.ts
 * @description Defines valid mode transitions and their rules
 *
 * State machine rules for mode switching:
 * - Basic:   On-device highlighting, configurable TTL (default 24h)
 * - Pro:     Signed-in, synced highlighting (permanent, no expiry)
 * - Pro-XAI: Everything in Pro, plus AI summaries/synthesis/Q&A
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
 * - Destructive/auth-gated transitions require confirmation
 * - Same-mode transitions are no-ops
 * - Basic -> Pro / Pro-XAI requires authentication (enforced by guard +
 *   AUTH_REQUIRED_MODES elsewhere; login always lands on Pro)
 */
export const TRANSITION_MATRIX: Record<ModeType, Record<ModeType, TransitionRule>> = {
  basic: {
    basic: {
      from: 'basic',
      to: 'basic',
      allowed: true,
      requiresConfirmation: false,
      reason: 'Already in Basic mode (on-device highlighting)',
    },
    pro: {
      from: 'basic',
      to: 'pro',
      allowed: true,
      requiresConfirmation: true,
      reason: 'Your Basic highlights will be synced to Pro. Requires sign-in.',
      guard: async () => {
        // Future: Check authentication status
        return true;
      },
    },
    pro_xai: {
      from: 'basic',
      to: 'pro_xai',
      allowed: true,
      requiresConfirmation: true,
      reason: 'Switching to 10x-Pro enables AI-powered organization. Requires sign-in.',
      guard: async () => {
        // Future: Check authentication status
        return true;
      },
    },
  },
  pro: {
    basic: {
      from: 'pro',
      to: 'basic',
      allowed: true,
      requiresConfirmation: true,
      reason: 'Your Pro highlights will be copied into Basic (on-device) mode',
      guard: async () => {
        // Future: Warn about losing sync
        return true;
      },
    },
    pro: {
      from: 'pro',
      to: 'pro',
      allowed: true,
      requiresConfirmation: false,
      reason: 'Already in Pro mode (synced highlighting)',
    },
    pro_xai: {
      from: 'pro',
      to: 'pro_xai',
      allowed: true,
      requiresConfirmation: false,
      reason: 'Switching to 10x-Pro adds AI summaries, synthesis, and Q&A',
    },
  },
  pro_xai: {
    basic: {
      from: 'pro_xai',
      to: 'basic',
      allowed: true,
      requiresConfirmation: true,
      reason: 'Switching to Basic mode will disable sync and AI features. Data will be preserved.',
      guard: async () => {
        return true;
      },
    },
    pro: {
      from: 'pro_xai',
      to: 'pro',
      allowed: true,
      requiresConfirmation: false,
      reason: 'Switching to Pro mode will disable AI features. Sync is preserved.',
    },
    pro_xai: {
      from: 'pro_xai',
      to: 'pro_xai',
      allowed: true,
      requiresConfirmation: false,
      reason: 'Already in 10x-Pro mode (synced + AI-powered organization)',
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
