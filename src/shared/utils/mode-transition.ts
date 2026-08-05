/**
 * @file mode-transition.ts
 * @description Entitlement-aware mode transition decisions for the extension.
 *
 * Rules:
 * - Guest (local): only basic; Free/Paid require sign-in.
 * - Free (signed-in, not paid): stay on pro; Free→Paid is upgrade (billing), not mode write.
 * - Paid (isPaidActive): free choice between Free (pro) and Paid (pro_xai).
 * - Guest while signed-in: sign-out path (cannot remain authenticated on basic).
 */

import type { ModeType } from '@/shared/schemas/mode-state-schemas';

export type ModeTransitionKind =
  | 'noop'
  | 'persist'
  | 'sign_in'
  | 'upgrade'
  | 'sign_out'
  | 'blocked';

export interface ModeTransitionInput {
  from: ModeType;
  to: ModeType;
  isAuthenticated: boolean;
  /** Polar/entitlement paid-active (not merely mode id). */
  isPaidActive: boolean;
}

export interface ModeTransitionResult {
  kind: ModeTransitionKind;
  /** Mode to persist when kind === 'persist'. */
  mode?: ModeType;
  reason: string;
}

/**
 * Resolve what the UI / setMode should do for a requested mode change.
 */
export function resolveModeTransition(input: ModeTransitionInput): ModeTransitionResult {
  const { from, to, isAuthenticated, isPaidActive } = input;

  if (from === to) {
    return { kind: 'noop', reason: 'Already on this plan mode' };
  }

  // ── Guest session (local) ──────────────────────────────────────────
  if (!isAuthenticated) {
    if (to === 'basic') {
      return { kind: 'noop', reason: 'Already local Guest' };
    }
    if (to === 'pro' || to === 'pro_xai') {
      return {
        kind: 'sign_in',
        mode: to,
        reason: 'Sign in to use Account Free or Paid',
      };
    }
  }

  // ── Signed-in ──────────────────────────────────────────────────────
  if (to === 'basic') {
    return {
      kind: 'sign_out',
      reason: 'Guest is only available when signed out',
    };
  }

  if (to === 'pro') {
    // Paid → Free allowed; Free → Free noop already handled
    return {
      kind: 'persist',
      mode: 'pro',
      reason: isPaidActive
        ? 'Paid account using Free mode (AI features off until Paid mode)'
        : 'Account (Free)',
    };
  }

  if (to === 'pro_xai') {
    if (isPaidActive) {
      // Free → Paid when entitlement already paid
      return {
        kind: 'persist',
        mode: 'pro_xai',
        reason: 'Paid account using Paid mode (AI unlocked)',
      };
    }
    // Free user cannot mode-switch into Paid
    return {
      kind: 'upgrade',
      reason: 'Upgrade to Account (Paid) to use AI mode',
    };
  }

  return { kind: 'blocked', reason: 'Unknown mode transition' };
}

/**
 * Whether setMode may write `to` given auth + entitlement.
 * Does not perform sign-in / upgrade / sign-out side effects.
 */
export function canPersistMode(input: ModeTransitionInput): boolean {
  return resolveModeTransition(input).kind === 'persist'
    || (input.from === input.to);
}

/**
 * Clamp stored mode to what entitlement allows (billing demotion / auth).
 * Respects paid-user preference of pro vs pro_xai.
 */
export function clampModeToEntitlement(
  isAuthenticated: boolean,
  isPaidActive: boolean,
  currentMode: ModeType,
): ModeType {
  if (!isAuthenticated) return 'basic';
  if (!isPaidActive) {
    // Free signed-in: never pro_xai, never basic
    return 'pro';
  }
  // Paid: keep Free or Paid preference
  if (currentMode === 'pro' || currentMode === 'pro_xai') return currentMode;
  return 'pro_xai';
}

/**
 * Whether billing should force a mode write on this snapshot.
 * - Always clamp invalid states (guest while authed, AI while unpaid).
 * - Rising edge unpaid→paid: default to pro_xai once.
 * - Paid users already on pro or pro_xai: do not force (preference preserved).
 */
export function resolveBillingModeWrite(input: {
  isAuthenticated: boolean;
  isPaidActive: boolean;
  currentMode: ModeType;
  /** Previous paid-active; null on first ready sample. */
  previousIsPaidActive: boolean | null;
}): { write: boolean; mode: ModeType } {
  const { isAuthenticated, isPaidActive, currentMode, previousIsPaidActive } = input;
  const clamped = clampModeToEntitlement(isAuthenticated, isPaidActive, currentMode);

  if (clamped !== currentMode) {
    return { write: true, mode: clamped };
  }

  // First time we learn user is paid while sitting on Free → default to Paid mode
  if (
    isAuthenticated
    && isPaidActive
    && previousIsPaidActive === false
    && currentMode === 'pro'
  ) {
    return { write: true, mode: 'pro_xai' };
  }

  // First ready sample while paid with no prior: if somehow not on AI, leave preference
  // unless mode is invalid (already handled by clamp).
  return { write: false, mode: currentMode };
}
