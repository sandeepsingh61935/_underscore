/** Local QA only — treat user as paid without a Polar sub. Never enable in production. */
export function isBillingDevOverrideEnabled(): boolean {
  try {
    const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> })
      .env;
    return env?.['VITE_BILLING_DEV_OVERRIDE'] === 'true';
  } catch {
    return false;
  }
}
