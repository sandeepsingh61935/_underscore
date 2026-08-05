/**
 * Pure entitlement helpers — no I/O.
 */

import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import type {
  BillingEntitlement,
  BillingEntitlementRow,
  BillingPlan,
  BillingSnapshot,
  BillingStatus,
  EntitlementLoadState,
} from './types';

const PAID_ACTIVE_STATUSES: ReadonlySet<BillingStatus> = new Set([
  'active',
  'trialing',
]);

export function isPaidActiveStatus(status: BillingStatus): boolean {
  return PAID_ACTIVE_STATUSES.has(status);
}

export function computeIsPaidActive(
  plan: BillingPlan,
  status: BillingStatus
): boolean {
  return plan === 'paid' && isPaidActiveStatus(status);
}

export function freeEntitlement(): BillingEntitlement {
  return {
    plan: 'free',
    status: 'none',
    isPaidActive: false,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    provider: null,
    manageUrlAvailable: false,
  };
}

export function rowToEntitlement(
  row: BillingEntitlementRow | null | undefined
): BillingEntitlement {
  if (!row) return freeEntitlement();

  const plan = row.plan;
  const status = row.status;
  const isPaidActive = computeIsPaidActive(plan, status);
  const provider = row.provider;

  return {
    plan,
    status,
    isPaidActive,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    provider,
    manageUrlAvailable:
      provider === 'polar' &&
      Boolean(row.provider_customer_id || isPaidActive || status === 'canceled'),
  };
}

export function emptyBillingSnapshot(
  loadState: EntitlementLoadState = 'idle'
): BillingSnapshot {
  return {
    loadState,
    entitlement: freeEntitlement(),
    error: null,
    isPaidActive: false,
  };
}

export function snapshotFromEntitlement(
  entitlement: BillingEntitlement,
  options?: { loadState?: EntitlementLoadState; error?: string | null; forcePaid?: boolean }
): BillingSnapshot {
  const loadState = options?.loadState ?? 'ready';
  const isPaidActive =
    loadState === 'ready' &&
    (Boolean(options?.forcePaid) || entitlement.isPaidActive);

  return {
    loadState,
    entitlement,
    error: options?.error ?? null,
    isPaidActive,
  };
}

/**
 * Default mode from auth + paid (no user preference).
 * Prefer {@link clampModeToEntitlement} / {@link resolveBillingModeWrite} when
 * respecting paid-user Free↔Paid preference.
 */
export function computeEffectiveMode(
  isAuthenticated: boolean,
  isPaidActive: boolean
): ModeType {
  if (!isAuthenticated) return 'basic';
  if (isPaidActive) return 'pro_xai';
  return 'pro';
}

/**
 * Whether we may rewrite stored mode from a billing snapshot.
 * Never demote/promote when load failed or still loading.
 */
export function shouldSyncModeFromBilling(
  loadState: EntitlementLoadState
): boolean {
  return loadState === 'ready';
}
