/**
 * Runtime paid-active gate for setMode (BillingProvider publishes; setMode reads).
 * Avoids circular AppContext ↔ BillingProvider dependencies.
 */

let paidActive = false;

export function setEntitlementPaidActive(value: boolean): void {
  paidActive = value;
}

export function getEntitlementPaidActive(): boolean {
  return paidActive;
}
