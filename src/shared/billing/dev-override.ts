/**
 * Local QA only — treat user as paid without a Polar sub.
 * Ignored when import.meta.env.PROD is true (WP-8).
 */
export function isBillingDevOverrideEnabled(): boolean {
  try {
    const env = (import.meta as ImportMeta & {
      env?: Record<string, string | boolean | undefined>;
    }).env;
    if (env?.['PROD'] === true || env?.['MODE'] === 'production') {
      return false;
    }
    return env?.['VITE_BILLING_DEV_OVERRIDE'] === 'true';
  } catch {
    return false;
  }
}
