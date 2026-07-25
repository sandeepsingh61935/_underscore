/** Local QA only — allows selecting Account (Paid) without a Polar sub. */
export function isBillingDevOverrideEnabled(): boolean {
  try {
    const env = (import.meta as ImportMeta & { env?: Record<string, string> })
      .env;
    return env?.['VITE_BILLING_DEV_OVERRIDE'] === 'true';
  } catch {
    return false;
  }
}
