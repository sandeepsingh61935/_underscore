/**
 * Unified paid-active resolution for web product pages.
 * Matches Settings/Ask gate: never demote paid while billing is not ready.
 */

export type WebPaidActiveSnapshot = {
  loadState: string;
  isPaidActive: boolean;
  entitlement?: { isPaidActive?: boolean } | null;
};

/**
 * Resolve whether the user should be treated as paid-active for web caps.
 *
 * - null/undefined billing → false
 * - loadState === 'ready' → snapshot.isPaidActive
 * - otherwise → entitlement.isPaidActive || snapshot.isPaidActive (never demote)
 */
export function resolveWebPaidActive(
  snapshot: WebPaidActiveSnapshot | null | undefined,
): boolean {
  if (!snapshot) return false;
  if (snapshot.loadState === 'ready') {
    return Boolean(snapshot.isPaidActive);
  }
  return Boolean(
    snapshot.entitlement?.isPaidActive || snapshot.isPaidActive,
  );
}
