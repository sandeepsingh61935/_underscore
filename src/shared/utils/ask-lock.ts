/**
 * Pure resolver for Ask tab commercial / setup locks.
 * UI never grants Paid features from client mode alone — entitlement + model required.
 */

export type AskLockReason = 'guest' | 'free' | 'past_due' | 'no_model' | null;

export interface ResolveAskLockInput {
  isAuthenticated: boolean;
  /** Entitlement: plan paid + active/trialing (not past_due). */
  isPaidActive: boolean;
  /** Polar/billing status when known. */
  billingStatus?: string | null;
  /** Active LLM provider selected (API key + model). */
  hasModel: boolean;
  /**
   * Optional capability gate (mode pro_xai + ai flag).
   * When false and authenticated, treat as Free lock (Upgrade path).
   */
  aiCapability?: boolean;
}

/**
 * Resolve Ask lock reason from auth, entitlement, and model state.
 * Priority: guest → past_due → free → no_model → unlocked (null).
 */
export function resolveAskLockReason(input: ResolveAskLockInput): AskLockReason {
  if (!input.isAuthenticated) return 'guest';

  if (input.billingStatus === 'past_due') return 'past_due';

  const capabilityOk = input.aiCapability !== false;
  if (!input.isPaidActive || !capabilityOk) return 'free';

  if (!input.hasModel) return 'no_model';

  return null;
}
