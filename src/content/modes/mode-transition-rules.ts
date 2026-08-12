/**
 * @file mode-transition-rules.ts
 * @description Defines valid mode transitions and their rules
 *
 * State machine rules for mode switching:
 * - Basic:   On-device highlighting, permanent local storage
 * - Pro:     Signed-in, synced highlighting (permanent, no expiry)
 * - Pro-XAI: Everything in Pro, plus AI summaries/synthesis/Q&A
 *
 * Transition matrix enforces business rules and user experience.
 */

import type { ModeType } from '@/shared/schemas/mode-state-schemas';

/**
 * Runtime context for transition guard evaluation.
 */
export interface TransitionGuardContext {
  isAuthenticated: boolean;
  /** When false, Free→Paid mode write is blocked (use billing upgrade). */
  isPaidActive?: boolean;
}

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
  guard?: (ctx: TransitionGuardContext) => Promise<boolean>;
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
      reason: 'Already in Guest mode (on-device highlighting)',
    },
    pro: {
      from: 'basic',
      to: 'pro',
      allowed: true,
      requiresConfirmation: true,
      reason: 'Your Guest highlights will sync with Account (Free). Requires sign-in.',
      guard: async (ctx) => ctx.isAuthenticated,
    },
    pro_xai: {
      from: 'basic',
      to: 'pro_xai',
      allowed: true,
      requiresConfirmation: true,
      reason: 'Switching to Account (Paid) enables Integrations and in-app chat. Requires sign-in.',
      guard: async (ctx) => ctx.isAuthenticated,
    },
  },
  pro: {
    basic: {
      from: 'pro',
      to: 'basic',
      allowed: true,
      requiresConfirmation: true,
      reason: 'Your Account (Free) highlights will be copied into Guest (on-device) mode',
      guard: async (ctx) => !ctx.isAuthenticated,
    },
    pro: {
      from: 'pro',
      to: 'pro',
      allowed: true,
      requiresConfirmation: false,
      reason: 'Already in Account (Free) (synced highlighting)',
    },
    pro_xai: {
      from: 'pro',
      to: 'pro_xai',
      allowed: true,
      requiresConfirmation: false,
      reason:
        'Switching to Account (Paid) adds Integrations — requires active Paid entitlement',
      // Free users must upgrade via Polar; entitled users may re-enable Paid mode.
      guard: async (ctx) => Boolean(ctx.isPaidActive),
    },
  },
  pro_xai: {
    basic: {
      from: 'pro_xai',
      to: 'basic',
      allowed: true,
      requiresConfirmation: true,
      reason: 'Switching to Guest mode will disable sync and AI features. Data will be preserved.',
      guard: async (ctx) => !ctx.isAuthenticated,
    },
    pro: {
      from: 'pro_xai',
      to: 'pro',
      allowed: true,
      requiresConfirmation: false,
      reason: 'Switching to Account (Free) will disable AI features. Sync is preserved.',
    },
    pro_xai: {
      from: 'pro_xai',
      to: 'pro_xai',
      allowed: true,
      requiresConfirmation: false,
      reason: 'Already in Account (Paid) (synced + AI)',
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
  to: ModeType,
  ctx: TransitionGuardContext,
): Promise<boolean> {
  const rule = getTransitionRule(from, to);

  if (!rule.guard) {
    return true; // No guard = pass by default
  }

  return await rule.guard(ctx);
}
